import { SubtitleLine, WordToken } from '../types';
import { THAI_OFFLINE_DICTIONARY, parseSRTToSubtitles } from './lrFormatParser';
import { transliterateThaiSyllableToChulaIPA } from './chulaIpaDict';

/**
 * 将时间字符串解析为总秒数
 * 支持格式：
 * - "00:00:01,219" (SRT 毫秒格式)
 * - "1s", "15s"
 * - "1:02", "01:02" (分:秒)
 * - "1:15:30", "01:15:30" (时:分:秒)
 * - 纯数字 "15"
 */
export function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr) return null;
  const str = timeStr.trim().replace(/^\[|\]$/g, '');
  
  // 1. SRT 格式 "00:00:01,219" 或 "00:00:01.219"
  const srtMatch = str.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (srtMatch) {
    const hr = parseInt(srtMatch[1], 10);
    const min = parseInt(srtMatch[2], 10);
    const sec = parseInt(srtMatch[3], 10);
    const ms = parseInt(srtMatch[4], 10) / 1000;
    return hr * 3600 + min * 60 + sec + ms;
  }

  // 2. "15s" 格式
  const sMatch = str.match(/^(\d+(?:\.\d+)?)s$/i);
  if (sMatch) return Math.floor(parseFloat(sMatch[1]));

  // 3. "时:分:秒" 或 "分:秒"
  const colonParts = str.split(':');
  if (colonParts.length === 2) {
    const min = parseInt(colonParts[0], 10);
    const sec = parseInt(colonParts[1], 10);
    if (!isNaN(min) && !isNaN(sec)) {
      return min * 60 + sec;
    }
  } else if (colonParts.length === 3) {
    const hr = parseInt(colonParts[0], 10);
    const min = parseInt(colonParts[1], 10);
    const sec = parseInt(colonParts[2], 10);
    if (!isNaN(hr) && !isNaN(min) && !isNaN(sec)) {
      return hr * 3600 + min * 60 + sec;
    }
  }

  // 4. 纯整数秒
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  return null;
}

/**
 * 将总秒数格式化为 "MM:SS" 或 "HH:MM:SS"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * 依据朱拉隆功音标与常用词典进行泰语分词
 */
export function tokenizeThaiWithChula(thaiText: string, sentenceZh?: string): WordToken[] {
  const clean = thaiText.trim();
  if (!clean) return [];

  const dictKeys = Object.keys(THAI_OFFLINE_DICTIONARY).sort((a, b) => b.length - a.length);
  const tokens: WordToken[] = [];
  let remaining = clean;
  let wordIndex = 0;

  while (remaining.length > 0) {
    const leadSpaceMatch = remaining.match(/^[\s,，、.。!！?？:：;；-]+/);
    if (leadSpaceMatch) {
      remaining = remaining.slice(leadSpaceMatch[0].length);
      continue;
    }

    let matchedWord: string | null = null;
    for (const key of dictKeys) {
      if (remaining.startsWith(key)) {
        matchedWord = key;
        break;
      }
    }

    if (matchedWord) {
      const info = THAI_OFFLINE_DICTIONARY[matchedWord];
      tokens.push({
        id: `tok_${wordIndex++}`,
        thai: matchedWord,
        romanization: info.ipa,
        chinese: info.cn,
        tip: info.tip,
        isCore: info.isCore
      });
      remaining = remaining.slice(matchedWord.length);
    } else {
      // 提取单个泰文字符/音节并进行朱拉隆功音标推导
      const charMatch = remaining.match(/^[ก-๙][ัิีึืฺุู็์่้๊๋]*[ก-๙]?/);
      const piece = charMatch ? charMatch[0] : remaining[0];
      tokens.push({
        id: `tok_${wordIndex++}`,
        thai: piece,
        romanization: transliterateThaiSyllableToChulaIPA(piece),
        chinese: '助词'
      });
      remaining = remaining.slice(piece.length);
    }
  }

  if (tokens.length === 0) {
    tokens.push({
      id: `tok_0`,
      thai: thaiText,
      romanization: transliterateThaiSyllableToChulaIPA(thaiText),
      chinese: sentenceZh || '经教'
    });
  }

  return tokens;
}

/**
 * 解析用户直接从 Language Reactor / Excel / SRT 复制出来的纯文本内容
 */
export function parseLanguageReactorText(rawText: string): {
  subtitles: SubtitleLine[];
  detectedTitle?: string;
  totalParsed: number;
} {
  if (!rawText || !rawText.trim()) {
    return { subtitles: [], totalParsed: 0 };
  }

  const trimmed = rawText.trim();

  // 1. 如果包含 "-->"，按通用增强型/标准 SRT 格式解析
  if (trimmed.includes('-->')) {
    try {
      const srtRes = parseSRTToSubtitles(trimmed);
      if (srtRes.subtitles.length > 0) {
        return {
          subtitles: srtRes.subtitles,
          detectedTitle: srtRes.subtitles[0]?.thai?.slice(0, 30),
          totalParsed: srtRes.count
        };
      }
    } catch (e) {
      console.warn('SRT parsing attempt error:', e);
    }
  }

  // 2. 否则按 Language Reactor / Excel 逐行模式或块模式解析
  const lines = rawText.split(/\r?\n/);
  let detectedTitle = '';
  
  if (lines[0] && (lines[0].includes('::') || lines[0].includes('หลวง') || lines[0].includes('法谈') || lines[0].includes('开示'))) {
    detectedTitle = lines[0].trim();
  }

  const rawItems: Array<{
    secondsStart: number;
    romanization: string;
    thai: string;
    chinese: string;
  }> = [];

  // 当前累积的句子块
  let currentBlock: {
    secondsStart: number;
    romanization: string;
    thai: string;
    chinese: string;
  } | null = null;

  const flushCurrentBlock = () => {
    if (currentBlock && (currentBlock.thai || currentBlock.chinese)) {
      rawItems.push({
        secondsStart: currentBlock.secondsStart,
        romanization: currentBlock.romanization.trim(),
        thai: currentBlock.thai.trim(),
        chinese: currentBlock.chinese.trim()
      });
    }
    currentBlock = null;
  };

  const hasThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);
  const hasChinese = (s: string) => /[\u4E00-\u9FFF]/.test(s);
  const isTimeHeader = (s: string) => {
    const t = parseTimeToSeconds(s);
    return t !== null && !s.includes('\t') && s.length <= 12;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // 过滤表头
    if (line.toLowerCase().includes('time') && (line.toLowerCase().includes('subtitle') || line.toLowerCase().includes('translation'))) {
      continue;
    }

    // A. 制表符 Excel / TSV 行处理 (优先快速通道)
    if (line.includes('\t')) {
      flushCurrentBlock();
      const parts = rawLine.split('\t').map(p => p.trim());
      let parsedSec: number | null = null;
      let thaiText = '';
      let zhText = '';
      let romanText = '';

      const col0Time = parseTimeToSeconds(parts[0]);
      if (col0Time !== null) {
        parsedSec = col0Time;
        // 识别后续列
        for (let c = 1; c < parts.length; c++) {
          const colContent = parts[c];
          if (!colContent) continue;
          if (hasThai(colContent)) {
            thaiText = colContent;
          } else if (hasChinese(colContent)) {
            zhText = colContent;
          } else if (/^[a-zA-Z0-9\sːʔʰɛɔəɯɤ́̀̂̌̄.,!?-]+$/.test(colContent)) {
            romanText = colContent;
          } else if (!thaiText) {
            thaiText = colContent;
          } else if (!zhText) {
            zhText = colContent;
          }
        }
      } else {
        // 无时间列，按内容推断
        for (let c = 0; c < parts.length; c++) {
          const colContent = parts[c];
          if (hasThai(colContent)) thaiText = colContent;
          else if (hasChinese(colContent)) zhText = colContent;
        }
      }

      if (thaiText || zhText) {
        const lastSec = rawItems.length > 0 ? rawItems[rawItems.length - 1].secondsStart + 5 : 0;
        rawItems.push({
          secondsStart: parsedSec !== null ? parsedSec : lastSec,
          romanization: romanText,
          thai: thaiText,
          chinese: zhText
        });
      }
      continue;
    }

    // B. 新时间标头触发 (例如 "1s", "00:07", "1:15")
    if (isTimeHeader(line)) {
      flushCurrentBlock();
      currentBlock = {
        secondsStart: parseTimeToSeconds(line) || 0,
        romanization: '',
        thai: '',
        chinese: ''
      };
      continue;
    }

    // C. 如果在时间块内
    if (currentBlock) {
      if (hasThai(line)) {
        currentBlock.thai = currentBlock.thai ? `${currentBlock.thai} ${line}` : line;
      } else if (hasChinese(line)) {
        currentBlock.chinese = currentBlock.chinese ? `${currentBlock.chinese} ${line}` : line;
      } else {
        // 纯字母行，认定为罗马拼音
        currentBlock.romanization = currentBlock.romanization ? `${currentBlock.romanization} ${line}` : line;
      }
    } else {
      // D. 无时间标头的散行
      if (hasThai(line) || hasChinese(line)) {
        const lastSec = rawItems.length > 0 ? rawItems[rawItems.length - 1].secondsStart + 5 : 0;
        currentBlock = {
          secondsStart: lastSec,
          romanization: '',
          thai: hasThai(line) ? line : '',
          chinese: hasChinese(line) ? line : ''
        };
      }
    }
  }

  // 刷新末尾块
  flushCurrentBlock();

  const subtitles: SubtitleLine[] = rawItems.map((item, index) => {
    const nextItem = rawItems[index + 1];
    const secStart = item.secondsStart;
    const secEnd = nextItem ? Math.max(nextItem.secondsStart, secStart + 2) : (secStart + 5);

    const words = tokenizeThaiWithChula(item.thai, item.chinese);
    const romanization = item.romanization || words.map(w => w.romanization).filter(Boolean).join(' ') || item.thai;

    return {
      id: index + 1,
      timeStart: formatSecondsToTime(secStart),
      timeEnd: formatSecondsToTime(secEnd),
      secondsStart: secStart,
      secondsEnd: secEnd,
      thai: item.thai,
      romanization,
      chinese: item.chinese,
      words
    };
  });

  return {
    subtitles,
    detectedTitle: detectedTitle || undefined,
    totalParsed: subtitles.length
  };
}
