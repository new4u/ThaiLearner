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
        chinese: '（待校释义）'
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

function decodeHtmlEntitiesClient(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : '';
    });
}

export function isLikelyHtmlContent(raw: string): boolean {
  return /<(?:!doctype|html|head|body|div|span|p|tr|td|th|li|ul|ol|br|table|style|script|a|font)\b[^>]*>/i.test(raw);
}

/**
 * 将 Language Reactor 导出的 HTML 文件/片段清洗为干净的逐行文本（保留时间戳与原文边界）
 */
export function extractCleanTextFromHtml(raw: string): string {
  if (!raw) return '';
  if (!isLikelyHtmlContent(raw)) return raw;

  let text = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '\n')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
    // 若 DOM 上带有 data-time 属性但内部可能隐藏，保留边界
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:tr|div|p|li|h[1-6]|section|article|blockquote|header|footer|dd|dt)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, '\t')
    .replace(/<\/(?:span|a|strong|em|b|i|small|label)>/gi, ' ')
    .replace(/<[^>]+>/g, '');

  text = decodeHtmlEntitiesClient(text);

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false;
      // 过滤 LR 导出页面常见无用页眉页脚文案
      if (/^(language reactor|exported with|subtitle|translation|machine translation|human translation)$/i.test(line)) {
        return false;
      }
      return true;
    })
    .join('\n');
}

function matchInlineTimestampPrefix(line: string): { seconds: number; timeLabel: string; rest: string } | null {
  const m = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?(?:\s+|[\t|]+)(.+)$/);
  if (!m) return null;
  const sec = parseTimeToSeconds(m[1]);
  if (sec === null) return null;
  return {
    seconds: sec,
    timeLabel: m[1],
    rest: m[2].trim(),
  };
}

function stripMixedMachineTranslation(text: string): { text: string; changed: boolean } {
  const cleaned = text
    .replace(/(?:机翻|機翻|机器翻译|翻譯|翻译|译文|譯文)\s*[:：]?/g, ' ')
    .replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3000-\u303F\uFF00-\uFFEF]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { text: cleaned, changed: cleaned !== text.trim() };
}

/**
 * 清洗 HTML 并仅保留「时间戳 + 泰文原文」，彻底剔除机器翻译与非泰文杂项
 * 适配工作流：LR 导出 HTML -> 剔除机翻 -> 复制进 AI Studio / AI 提示词生成朱拉音标与逐词释义
 */
export function extractThaiAndTimestampsOnly(raw: string): {
  cleanedText: string;
  blockCount: number;
  removedLinesCount: number;
} {
  const normalized = isLikelyHtmlContent(raw) ? extractCleanTextFromHtml(raw) : raw;
  const rawLines = normalized.replace(/^\uFEFF/, '').split(/\r?\n/);
  const hasThai = (s: string) => /[\u0E00-\u0E7F]/.test(s);
  const srtRangeRegex = /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/;

  const outLines: string[] = [];
  let removedLinesCount = 0;
  let blockCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // 保留标准 SRT 序号（仅当下一行是时间戳）
    if (/^\d+$/.test(line) && i + 1 < rawLines.length && srtRangeRegex.test(rawLines[i + 1].trim())) {
      outLines.push(line);
      continue;
    }

    // 保留标准 SRT 时间区间行
    if (srtRangeRegex.test(line)) {
      if (outLines.length > 0 && !/^\d+$/.test(outLines[outLines.length - 1])) {
        outLines.push('');
      }
      outLines.push(line);
      blockCount++;
      continue;
    }

    // 处理制表符分隔的 LR / Excel 行：提取时间列与泰文列
    if (line.includes('\t')) {
      const cols = line.split('\t').map((c) => c.trim()).filter(Boolean);
      const timeCol = cols.find((c) => parseTimeToSeconds(c) !== null);
      const thaiCols = cols
        .filter((c) => hasThai(c))
        .map((c) => stripMixedMachineTranslation(c).text)
        .filter((c) => hasThai(c));
      if (thaiCols.length > 0) {
        if (timeCol) {
          outLines.push(timeCol);
          blockCount++;
        }
        outLines.push(thaiCols.join(' '));
        outLines.push('');
      } else {
        removedLinesCount++;
      }
      continue;
    }

    // 独立时间标头 ("0:15", "01:23", "1:05:30", "15s")
    const soloTime = line.length <= 14 ? parseTimeToSeconds(line) : null;
    if (soloTime !== null && !hasThai(line)) {
      if (outLines.length > 0 && outLines[outLines.length - 1] !== '') {
        outLines.push('');
      }
      outLines.push(formatSecondsToTime(soloTime));
      blockCount++;
      continue;
    }

    // 同行 "01:23 泰文..."
    const inlineMatch = matchInlineTimestampPrefix(line);
    if (inlineMatch) {
      if (hasThai(inlineMatch.rest)) {
        const cleaned = stripMixedMachineTranslation(inlineMatch.rest);
        if (cleaned.changed) removedLinesCount++;
        if (hasThai(cleaned.text)) {
          if (outLines.length > 0 && outLines[outLines.length - 1] !== '') {
            outLines.push('');
          }
          outLines.push(formatSecondsToTime(inlineMatch.seconds));
          outLines.push(cleaned.text);
          blockCount++;
        }
      } else {
        removedLinesCount++;
      }
      continue;
    }

    // 保留含泰文的行；若同一行内混有中文机翻片段，剔除中文机翻仅留泰文
    if (hasThai(line)) {
      const cleaned = stripMixedMachineTranslation(line);
      if (cleaned.changed) removedLinesCount++;
      if (hasThai(cleaned.text)) {
        outLines.push(cleaned.text);
      }
    } else {
      removedLinesCount++;
    }
  }

  // 清除末尾无泰文随后的悬空时间标头
  const finalLines: string[] = [];
  for (let i = 0; i < outLines.length; i++) {
    const cur = outLines[i];
    const isSoloTime = cur.length <= 14 && parseTimeToSeconds(cur) !== null;
    if (isSoloTime) {
      let hasFollowingThai = false;
      for (let j = i + 1; j < outLines.length; j++) {
        if (outLines[j] === '') break;
        if (hasThai(outLines[j])) {
          hasFollowingThai = true;
          break;
        }
      }
      if (!hasFollowingThai) {
        removedLinesCount++;
        continue;
      }
    }
    finalLines.push(cur);
  }

  return {
    cleanedText: finalLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    blockCount: Math.max(blockCount, finalLines.filter((l) => hasThai(l)).length),
    removedLinesCount,
  };
}

/**
 * 解析用户直接从 Language Reactor / Excel / SRT / HTML 导出的内容
 */
export function parseLanguageReactorText(rawText: string): {
  subtitles: SubtitleLine[];
  detectedTitle?: string;
  totalParsed: number;
} {
  if (!rawText || !rawText.trim()) {
    return { subtitles: [], totalParsed: 0 };
  }

  // 去除 UTF-8 BOM 标记，防止大文件读取时首字符异常
  const trimmedRaw = rawText.replace(/^\uFEFF/, '').trim();

  // 0. 支持导入 JSON 课件文件
  if ((trimmedRaw.startsWith('[') && trimmedRaw.endsWith(']')) || (trimmedRaw.startsWith('{') && trimmedRaw.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmedRaw);
      const list = Array.isArray(parsed) ? parsed : (parsed.subtitles || parsed.lines || parsed.data || []);
      if (Array.isArray(list) && list.length > 0) {
        const subtitles: SubtitleLine[] = list.map((item: any, idx: number) => {
          const thai = item.thai || item.text || item.original || '';
          const chinese = item.chinese || item.translation || item.cn || '';
          const secStart = typeof item.secondsStart === 'number' ? item.secondsStart : (parseTimeToSeconds(item.timeStart) || idx * 4);
          const secEnd = typeof item.secondsEnd === 'number' ? item.secondsEnd : (parseTimeToSeconds(item.timeEnd) || secStart + 4);
          const words = item.words && item.words.length > 0 ? item.words : tokenizeThaiWithChula(thai, chinese);
          return {
            id: item.id || idx + 1,
            timeStart: item.timeStart || formatSecondsToTime(secStart),
            timeEnd: item.timeEnd || formatSecondsToTime(secEnd),
            secondsStart: secStart,
            secondsEnd: secEnd,
            thai,
            romanization: item.romanization || words.map((w: any) => w.romanization).filter(Boolean).join(' ') || thai,
            chinese,
            words
          };
        });
        return {
          subtitles,
          detectedTitle: parsed.title || parsed.thaiTitle || parsed.chineseTitle || subtitles[0]?.thai?.slice(0, 30),
          totalParsed: subtitles.length
        };
      }
    } catch {
      // 容错继续往下按文本解析
    }
  }

  // 若是 HTML 导出格式，自动剥离 HTML 标签转为带时间戳纯文本
  const trimmed = isLikelyHtmlContent(trimmedRaw) ? extractCleanTextFromHtml(trimmedRaw) : trimmedRaw;

  // 1. 如果包含 "-->"，按通用增强型/标准 SRT/VTT 格式解析
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
  const lines = trimmed.split(/\r?\n/);
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
    return t !== null && !s.includes('\t') && s.length <= 14;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // 过滤表头
    if (line.toLowerCase().includes('time') && (line.toLowerCase().includes('subtitle') || line.toLowerCase().includes('translation'))) {
      continue;
    }

    // A0. 同行前置时间戳（例如 "01:23 เวลาของพวกเรา..." 或 "[0:15] สมาธิ"）
    const inlineTimeMatch = !line.includes('\t') ? matchInlineTimestampPrefix(line) : null;
    if (inlineTimeMatch) {
      flushCurrentBlock();
      const rest = inlineTimeMatch.rest;
      currentBlock = {
        secondsStart: inlineTimeMatch.seconds,
        romanization: !hasThai(rest) && !hasChinese(rest) ? rest : '',
        thai: hasThai(rest) ? rest : '',
        chinese: !hasThai(rest) && hasChinese(rest) ? rest : '',
      };
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
