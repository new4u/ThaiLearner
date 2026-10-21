import { SubtitleLine, WordToken, WordStatus } from '../types';
import { CHULA_IPA_DICTIONARY, transliterateThaiSyllableToChulaIPA } from './chulaIpaDict';

// 导出与朱拉隆功大学标准音标库完全同步的离线词典
export const THAI_OFFLINE_DICTIONARY = CHULA_IPA_DICTIONARY;

/**
 * 离线快速对泰文分词（基于离线词库最大前缀匹配算法 + 动态朱拉隆功音标推导）
 */
export function offlineTokenizeThaiText(thaiText: string): WordToken[] {
  const clean = thaiText.trim();
  if (!clean) return [];

  // 获取所有已知词条，按长度降序排序
  const dictKeys = Object.keys(THAI_OFFLINE_DICTIONARY).sort((a, b) => b.length - a.length);
  const tokens: WordToken[] = [];
  let remaining = clean;
  let wordIndex = 0;

  while (remaining.length > 0) {
    // 去除开头空格标点
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
        id: `tok_${Date.now()}_${wordIndex++}`,
        thai: matchedWord,
        romanization: info.ipa,
        chinese: info.cn,
        tip: info.tip || '朱拉 Adapted IPA 标音',
        isCore: info.isCore || false,
        rootBreakdown: info.root || '',
        status: 'unmarked' as WordStatus,
        startOffset: wordIndex * 0.8,
        endOffset: (wordIndex + 1) * 0.8
      });
      remaining = remaining.slice(matchedWord.length);
    } else {
      // 未命中词库：提取单个泰文字符/音节并进行朱拉隆功音标推导
      const charMatch = remaining.match(/^[ก-๙][ัิีึืฺุู็์่้๊๋]*[ก-๙]?/);
      const piece = charMatch ? charMatch[0] : remaining[0];
      tokens.push({
        id: `tok_${Date.now()}_${wordIndex++}`,
        thai: piece,
        romanization: transliterateThaiSyllableToChulaIPA(piece),
        chinese: '助词',
        tip: '朱拉 Adapted IPA 标音',
        status: 'unmarked' as WordStatus,
        startOffset: wordIndex * 0.8,
        endOffset: (wordIndex + 1) * 0.8
      });
      remaining = remaining.slice(piece.length);
    }
  }

  return tokens;
}

/**
 * 辅助函数：秒数转 SRT 标准时间戳格式 (00:00:01,200)
 */
export function formatSecondsToSRT(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.min(999, Math.round(((totalSeconds % 1) + Number.EPSILON) * 1000));
  const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * 辅助函数：秒数转 00:00 简短时间格式
 */
export function formatSecondsToTime(sec: number): string {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${mm}:${ss}`;
}

/**
 * 通用增强型泰汉逐词对齐 SRT (Enhanced Thai-Gloss SRT / SRT-GLOSS) 解析引擎
 * 创新特性：
 * 1. 兼容 [GLOSS] 词级释义行（`[GLOSS] 词:释义 | 词:释义`）
 * 2. 兼容内联中括号标注（`เวลา[时间] ของ[的]`）
 * 3. 兼容传统生肉双语/单语 SRT（仅有原文与整句翻译）：自动触发离线 1120+ 佛学词典与朱拉音标引擎进行智能分词与注音
 * 4. 容忍 [ROMAN] / [IPA] 标签行缺失或简写
 */
export function parseSRTToSubtitles(rawContent: string): { subtitles: SubtitleLine[]; format: string; count: number } {
  const content = rawContent.trim();
  if (!content) {
    throw new Error('SRT 文本内容为空');
  }

  const blocks = content.split(/\r?\n\r?\n+/);
  const resultSubs: SubtitleLine[] = [];
  let isEnhanced = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    // 查找时间戳行 (包含 -->)
    let timeLineIdx = -1;
    let timeMatch: RegExpMatchArray | null = null;
    for (let j = 0; j < Math.min(lines.length, 3); j++) {
      const match = lines[j].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (match) {
        timeLineIdx = j;
        timeMatch = match;
        break;
      }
    }

    if (timeLineIdx === -1 || !timeMatch) continue;

    const id = timeLineIdx > 0 ? (parseInt(lines[0], 10) || (resultSubs.length + 1)) : (resultSubs.length + 1);
    const startSec = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseInt(timeMatch[3], 10) + parseInt(timeMatch[4], 10) / 1000;
    const endSec = parseInt(timeMatch[5], 10) * 3600 + parseInt(timeMatch[6], 10) * 60 + parseInt(timeMatch[7], 10) + parseInt(timeMatch[8], 10) / 1000;
    const timeStart = `${timeMatch[2]}:${timeMatch[3]}`;
    const timeEnd = `${timeMatch[6]}:${timeMatch[7]}`;

    // 时间戳后所有的文本行
    const textLines = lines.slice(timeLineIdx + 1);
    if (textLines.length === 0) continue;

    let thai = '';
    let romanization = '';
    let chinese = '';
    let extractedWords: WordToken[] = [];

    for (const line of textLines) {
      if (/^\[GLOSS\]/i.test(line)) {
        isEnhanced = true;
        // 解析 [GLOSS] 词:释义 | 词:释义 ...
        const rawGloss = line.replace(/^\[GLOSS\]\s*/i, '').trim();
        const items = rawGloss.split(/\s*\|\s*/);
        items.forEach((item, wIdx) => {
          const colonIdx = item.search(/[:：]/);
          if (colonIdx > 0) {
            const th = item.slice(0, colonIdx).trim();
            const cn = item.slice(colonIdx + 1).trim();
            if (th) {
              const dictEntry = THAI_OFFLINE_DICTIONARY[th];
              extractedWords.push({
                id: `tok_${id}_${wIdx}`,
                thai: th,
                romanization: dictEntry?.ipa || transliterateThaiSyllableToChulaIPA(th),
                chinese: cn,
                isCore: dictEntry?.isCore || false
              });
            }
          }
        });
      } else if (/^\[ROMAN\]|^\[IPA\]/i.test(line)) {
        romanization = line.replace(/^\[(ROMAN|IPA)\]\s*/i, '').trim();
      } else if (/^\[(ZH|CN|TRANS|中文)\]/i.test(line)) {
        chinese = line.replace(/^\[(ZH|CN|TRANS|中文)\]\s*/i, '').trim();
      } else if (/^\[THAI\]/i.test(line)) {
        thai = line.replace(/^\[THAI\]\s*/i, '').trim();
      } else {
        // 未带标记的普通行，进行内容特征探测
        const hasThai = /[\u0E00-\u0E7F]/.test(line);
        const hasChinese = /[\u4e00-\u9fa5]/.test(line);
        const hasInlineBrackets = /[\u0E00-\u0E7F]+\s*[\[\(【（][^\]\)】）]+[\]\)】）]/.test(line);
        const hasPipes = line.includes('|') && line.includes(':');

        if (hasInlineBrackets) {
          isEnhanced = true;
          // 提取内联标注：คำ[释义]
          const regex = /([ก-๙\w\s]+?)[\[\(【（]([^\]\)】）]+)[\]\)】）]/g;
          let m;
          let wIdx = 0;
          const plainThaiParts: string[] = [];
          while ((m = regex.exec(line)) !== null) {
            const th = m[1].trim();
            const cn = m[2].trim();
            if (th) {
              plainThaiParts.push(th);
              const dictEntry = THAI_OFFLINE_DICTIONARY[th];
              extractedWords.push({
                id: `tok_${id}_${wIdx++}`,
                thai: th,
                romanization: dictEntry?.ipa || transliterateThaiSyllableToChulaIPA(th),
                chinese: cn,
                isCore: dictEntry?.isCore || false
              });
            }
          }
          if (!thai && plainThaiParts.length > 0) {
            thai = plainThaiParts.join('');
          }
        } else if (hasPipes && hasThai && hasChinese) {
          isEnhanced = true;
          // 竖线冒号格式
          const items = line.split(/\s*\|\s*/);
          items.forEach((item, wIdx) => {
            const colonIdx = item.search(/[:：]/);
            if (colonIdx > 0) {
              const th = item.slice(0, colonIdx).trim();
              const cn = item.slice(colonIdx + 1).trim();
              if (th) {
                const dictEntry = THAI_OFFLINE_DICTIONARY[th];
                extractedWords.push({
                  id: `tok_${id}_${wIdx}`,
                  thai: th,
                  romanization: dictEntry?.ipa || transliterateThaiSyllableToChulaIPA(th),
                  chinese: cn,
                  isCore: dictEntry?.isCore || false
                });
              }
            }
          });
        } else if (hasThai && !hasChinese) {
          if (!thai) thai = line;
          else thai += ' ' + line;
        } else if (hasChinese) {
          if (!chinese) chinese = line;
          else chinese += ' ' + line;
        } else if (!hasThai && !hasChinese && /[a-zA-Z]/.test(line)) {
          // 罗马音/IPA
          if (!romanization) romanization = line;
        }
      }
    }

    // 若未显式提供逐词注释（例如传统生肉 SRT），则自动调用内置 1120+ 佛学大词典与朱拉隆功音标分词引擎
    if (extractedWords.length === 0 && thai) {
      extractedWords = offlineTokenizeThaiText(thai);
    }

    if (!romanization && extractedWords.length > 0) {
      romanization = extractedWords.map(w => w.romanization).filter(Boolean).join(' ');
    }

    if (!chinese && extractedWords.length > 0) {
      chinese = extractedWords.map(w => w.chinese).join(' ');
    }

    resultSubs.push({
      id,
      timeStart,
      timeEnd,
      secondsStart: Math.round(startSec * 10) / 10,
      secondsEnd: Math.round(endSec * 10) / 10,
      thai: thai || (extractedWords.map(w => w.thai).join('') || '泰文句子'),
      romanization: romanization || thai,
      chinese: chinese || '（法义翻译）',
      words: extractedWords
    });
  }

  if (resultSubs.length === 0) {
    throw new Error('未识别到有效的 SRT 时间戳 (形如 00:00:01,000 --> 00:00:05,000)');
  }

  const formatName = isEnhanced 
    ? '增强型泰汉逐词对齐 SRT (带 [GLOSS] 词级释义)' 
    : '传统双语 SRT (已自动智能分词与注音)';

  return {
    subtitles: resultSubs,
    format: formatName,
    count: resultSubs.length
  };
}

/**
 * 智能解析 Language Reactor (LR) 导出文本（SRT / TSV / CSV / JSON / 纯文本）
 */
export function parseLRExportData(rawContent: string): { subtitles: SubtitleLine[]; format: string; count: number } {
  const content = rawContent.trim();
  if (!content) {
    throw new Error('导入内容为空，请粘贴或上传课件数据');
  }

  // 0. 优先检测标准或增强型 SRT 格式 (包含 -->)
  if (content.includes('-->')) {
    try {
      return parseSRTToSubtitles(content);
    } catch {
      // 若 SRT 解析失败，继续尝试后续降级逻辑
    }
  }

  // 1. 尝试 JSON 格式
  if (content.startsWith('[') && content.endsWith(']')) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const subs: SubtitleLine[] = parsed.map((item: any, idx: number) => {
          const thai = item.thai || item.phrase || item.text || item.original || '';
          const chinese = item.chinese || item.translation || item.cn || item.meaning || '';
          const romanization = item.romanization || item.ipa || item.pronunciation || '';
          const words: WordToken[] = Array.isArray(item.words) && item.words.length > 0
            ? item.words
            : offlineTokenizeThaiText(thai);

          return {
            id: idx + 1,
            timeStart: item.timeStart || formatSecondsToTime(idx * 8),
            timeEnd: item.timeEnd || formatSecondsToTime((idx + 1) * 8),
            secondsStart: item.secondsStart !== undefined ? item.secondsStart : idx * 8,
            secondsEnd: item.secondsEnd !== undefined ? item.secondsEnd : (idx + 1) * 8,
            thai: thai,
            romanization: romanization || words.map(w => w.romanization).join(' '),
            chinese: chinese || '（法义翻译）',
            dhammaNote: item.dhammaNote || '开示声闻精要片段',
            words
          };
        });
        return { subtitles: subs, format: 'JSON 课件包', count: subs.length };
      }
    } catch {
      // 继续按文本解析
    }
  }

  // 2. 按行分割处理 TSV (LR 官方 Excel 导出) 或 CSV 或 文本
  const rawLines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length === 0) {
    throw new Error('未检测到有效的文本行');
  }

  const resultSubs: SubtitleLine[] = [];

  // 判断是否为 TSV (包含制表符 \t)
  const isTSV = rawLines.some(l => l.includes('\t'));
  const isCSV = !isTSV && rawLines.some(l => l.includes(',') && !l.includes('\t'));

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // 跳过可能的英文表头
    if (i === 0 && (line.toLowerCase().includes('original') || line.toLowerCase().includes('translation') || line.toLowerCase().includes('phrase\t'))) {
      continue;
    }

    let thaiCol = '';
    let cnCol = '';
    let ipaCol = '';
    let noteCol = '';

    if (isTSV) {
      const parts = line.split('\t').map(p => p.trim());
      thaiCol = parts[0] || '';
      cnCol = parts[1] || '';
      ipaCol = parts[2] || '';
      noteCol = parts[3] || '';
    } else if (isCSV) {
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
      thaiCol = parts[0] || '';
      cnCol = parts[1] || '';
      ipaCol = parts[2] || '';
      noteCol = parts[3] || '';
    } else {
      // 纯文本按行：支持形如 "เราจะฝึกสมาธิ // 我们要练习禅定"
      if (line.includes('//')) {
        const split = line.split('//');
        thaiCol = split[0].trim();
        cnCol = split[1].trim();
      } else if (line.includes('(') && line.endsWith(')')) {
        const match = line.match(/^(.*?)\((.*?)\)$/);
        if (match) {
          thaiCol = match[1].trim();
          cnCol = match[2].trim();
        } else {
          thaiCol = line;
        }
      } else {
        thaiCol = line;
      }
    }

    if (!thaiCol) continue;

    const words = offlineTokenizeThaiText(thaiCol);
    const romanization = ipaCol || words.map(w => w.romanization).join(' ');
    const chinese = cnCol || (words.map(w => w.chinese).join(' ') || '法音开示');

    const lineId = resultSubs.length + 1;
    const startSec = (lineId - 1) * 8;
    const endSec = lineId * 8;

    resultSubs.push({
      id: lineId,
      timeStart: formatSecondsToTime(startSec),
      timeEnd: formatSecondsToTime(endSec),
      secondsStart: startSec,
      secondsEnd: endSec,
      thai: thaiCol,
      romanization: romanization,
      chinese: chinese,
      dhammaNote: noteCol || '泰法语声闻共学要点',
      words
    });
  }

  if (resultSubs.length === 0) {
    throw new Error('未能从文本中解析出有效的泰语句子');
  }

  const formatName = isTSV ? 'LR 官方 TSV (Tab制表符)' : isCSV ? 'CSV 逗号表格' : '纯文本分句';
  return { subtitles: resultSubs, format: formatName, count: resultSubs.length };
}

/**
 * 将声闻课件导出为专为泰汉逐词精读打造的【增强型 SRT (SRT-GLOSS)】格式
 * 完美契合外部视频播放器与 AI 模型交互
 */
export function exportToEnhancedSRT(subtitles: SubtitleLine[]): string {
  return subtitles.map((sub, idx) => {
    const id = sub.id || (idx + 1);
    const startStr = formatSecondsToSRT(sub.secondsStart);
    const endStr = formatSecondsToSRT(sub.secondsEnd);
    const timeLine = `${startStr} --> ${endStr}`;
    
    // 逐词对照行: [GLOSS] 词:释义 | 词:释义 ...
    let glossLine = '';
    if (sub.words && sub.words.length > 0) {
      const glossParts = sub.words.map(w => `${w.thai}:${w.chinese}`);
      glossLine = `[GLOSS] ${glossParts.join(' | ')}`;
    }
    
    // 罗马音标行 (可选)
    const romanLine = sub.romanization ? `[ROMAN] ${sub.romanization}` : '';
    
    const blockLines = [
      id.toString(),
      timeLine,
      sub.thai,
      glossLine,
      romanLine,
      sub.chinese
    ].filter(Boolean);
    
    return blockLines.join('\n');
  }).join('\n\n');
}

/**
 * 将当前声闻课件导出为 Language Reactor 官方标准 TSV 文件内容
 */
export function exportToLRTSV(subtitles: SubtitleLine[]): string {
  const headers = ['Phrase (泰文原文)', 'Translation (中文法义)', 'Transliteration (朱拉Adapted IPA)', 'Dhamma Note (法义剖析与时间戳)'];
  const rows = subtitles.map(sub => [
    sub.thai.replace(/\t/g, ' '),
    sub.chinese.replace(/\t/g, ' '),
    sub.romanization.replace(/\t/g, ' '),
    `[${sub.timeStart}-${sub.timeEnd}] ${sub.dhammaNote || ''}`.replace(/\t/g, ' ')
  ]);

  return [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
}

/**
 * 生成一键发到微信群的极简排版课件文本
 */
export function exportToWeChatGroupText(subtitles: SubtitleLine[], courseTitle: string = '泰法语声闻共学课件'): string {
  const header = `📿【泰语声闻共学 · 官方声闻课件】\n` +
    `📖 主题：${courseTitle}\n` +
    `💡 提示：长按复制本段全文，打开“泰法语声闻共学工作台”，点击【一键导入】即可秒级同步！\n` +
    `═══════════════════════\n`;

  const body = subtitles.map((sub, idx) => {
    return `${idx + 1}. ${sub.thai}\n` +
      `   🗣️ /${sub.romanization}/\n` +
      `   🧘 义：${sub.chinese}` +
      (sub.dhammaNote ? `\n   📌 析：${sub.dhammaNote}` : '');
  }).join('\n\n');

  const footer = `\n═══════════════════════\n` +
    `每周仅需 1 小时，对治“想学泰语又学不动”的困境，把隆波的殊胜法语映入日常生活。`;

  return header + body + footer;
}

/**
 * 通用 AI 批量转换 Prompt 模板 (Universal AI SRT-to-Enhanced-Gloss Prompt)
 * 用户可将此 Prompt 与任意生肉/传统 SRT 一并发送给 ChatGPT / Claude / Gemini / DeepSeek
 */
export const AI_SRT_CONVERSION_PROMPT = `# 任务指令：将传统双语/单语 SRT 字幕批量转换为【增强型泰语学习 SRT (Enhanced Thai-Gloss SRT)】

## 1. 你的角色
你是一位精通泰语语法、佛法经典用语及泰汉高精度对译的资深语言学专家。
用户将为你提供一份【传统的原始 SRT 字幕】（通常包含序号、时间戳、泰语原文整句以及中文整句翻译）。
你的任务是将这些原始字幕升级为专为泰语学习者打造的【增强型逐词对齐 SRT (SRT-GLOSS)】格式。

## 2. 增强型 SRT (SRT-GLOSS) 格式规范
每一个字幕块严格遵循标准 SRT 结构：
- 第 1 行：序号 (如 1, 2, 3...)
- 第 2 行：时间戳行 (如 00:00:01,200 --> 00:00:10,300，必须与输入严格保持 100% 一致，严禁篡改时间)
- 第 3 行：泰语原文整句 (保留原汁原味泰文，严禁擅自增减字符)
- 第 4 行：[GLOSS] 逐词拆解与中文直译 (最核心要求！)
  * 规则 1：泰语书写不使用空格断词，请根据自然语意精准断词为词汇或固定短语；
  * 规则 2：每个泰语词后紧跟英文冒号 \`:\` 及其对应的简短中文直译（通常 1~4 个汉字）；
  * 规则 3：词与词之间严格使用竖线空格 \` | \` 分隔；
  * 规则 4：常见佛法核心词请使用规范佛教汉译（如 สติ:正念/觉知 | สมาธิ:禅定/正定 | ผู้รู้:知者心 | มิจฉาทิฏฐิ:邪见 | สัมมาทิฏฐิ:正见 | สติปัฏฐาน:四念处 | รูป:色蕴 | นาม:名法 等）；
  * 格式范例：\`[GLOSS] เวลา:时间 | ของ:的/属于 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多\`
- 第 5 行（可选）：[ROMAN] 罗马拼音或音标
  * 如果你能提供准确的泰语罗马拼音或音标，请输出此行；
  * 如果无法保证声调准确度，请直接省略此行（系统会自动使用内置朱拉隆功音标引擎补全，切勿编造错误读音）。
- 第 6 行：中文通顺整句翻译 (保留原译或润色为通顺中文)
- 字幕块之间严格保留一行空行。

## 3. 标准示范范例

【输入示例】：
1
00:00:01,200 --> 00:00:10,300
เวลาของพวกเราแต่ละคนมีไม่มากมีโอกาสเรียนธรรมะรีบเรียน
我们每个人的时间都不多，有机会学习佛法就赶紧去学。

2
00:00:10,300 --> 00:00:18,500
สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ
禅定有两种：正定与邪定。

【输出示例】：
1
00:00:01,200 --> 00:00:10,300
เวลาของพวกเราแต่ละคนมีไม่มากมีโอกาสเรียนธรรมะรีบเรียน
[GLOSS] เวลา:时间 | ของ:的/属于 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多 | มี:有 | โอกาส:机会 | เรียน:学习 | ธรรมะ:佛法 | รีบ:赶紧 | เรียน:学
[ROMAN] weː-laa kʰɔ̌ɔŋ pʰûak-raw tɛ̀ɛ-láʔ-kʰon mii mâj mâak mii ʔoo-kàat rian tʰam-máʔ rîip rian
我们每个人的时间都不多，有机会学习佛法就赶紧去学。

2
00:00:10,300 --> 00:00:18,500
สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ
[GLOSS] สมาธิ:禅定 | มี:有 | ๒ อย่าง:两种 | คือ:即是 | สัมมาสมาธิ:正定 | กับ:与 | มิจฉาสมาธิ:邪定
禅定有两种：正定与邪定。

## 4. 执行注意事项
- 输出必须为纯文本 SRT 内容，严禁添加多余的解释、寒暄或代码块外包装；
- 序号和时间戳必须与输入 1:1 精确对应，不得丢句漏句。

---
【请直接转换以下输入的原始 SRT 内容】：
`;
