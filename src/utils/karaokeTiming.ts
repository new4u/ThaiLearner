import { WordToken, SubtitleLine } from '../types';

export interface WordTimeSlot {
  wordId: string;
  wordIndex: number;
  word: WordToken;
  startSec: number; // absolute seconds in video
  endSec: number;   // absolute seconds in video
  durationSec: number;
}

/**
 * 计算句子中每个词的智能时间槽 (音节与字符加权推演算法)
 * 若单词已有预设的 startOffset/endOffset，则优先采用预设；
 * 否则根据泰语字符长度与朱拉音标音节数，在整句时长内进行高保真流式推演。
 */
export function computeSentenceWordSlots(sentence: SubtitleLine): WordTimeSlot[] {
  if (!sentence || !sentence.words || sentence.words.length === 0) {
    return [];
  }

  const sentenceDuration = Math.max(0.6, sentence.secondsEnd - sentence.secondsStart);

  // 1. 计算每个词的相对权重 (音节数占主导，字符长作微调)
  const weights = sentence.words.map(w => {
    const thaiLen = (w.thai || '').trim().length;
    // 根据罗马音中的连字符/空格/句号拆分音节数
    const syllables = w.romanization 
      ? w.romanization.split(/[\s\-.]+/).filter(Boolean).length 
      : 1;
    // 权重模型：每个音节基准 1.6 秒权重，每个泰文字母加 0.35 权重
    return Math.max(1.0, syllables * 1.6 + thaiLen * 0.35);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let accumulated = 0;
  return sentence.words.map((word, idx) => {
    // 若单词具有明确的相对偏移量
    if (typeof word.startOffset === 'number' && typeof word.endOffset === 'number') {
      const startSec = sentence.secondsStart + word.startOffset;
      const endSec = sentence.secondsStart + word.endOffset;
      return {
        wordId: word.id || `word_${idx}`,
        wordIndex: idx,
        word,
        startSec,
        endSec,
        durationSec: Math.max(0.1, endSec - startSec)
      };
    }

    const fraction = totalWeight > 0 ? (weights[idx] / totalWeight) : (1 / sentence.words.length);
    const wordDuration = sentenceDuration * fraction;
    const startSec = sentence.secondsStart + accumulated;
    const endSec = startSec + wordDuration;
    accumulated += wordDuration;

    return {
      wordId: word.id || `word_${idx}`,
      wordIndex: idx,
      word,
      startSec,
      endSec,
      durationSec: Math.max(0.1, wordDuration)
    };
  });
}

export interface WordProgressInfo {
  progress: number; // 0 to 100
  status: 'pending' | 'active' | 'completed';
}

/**
 * 根据当前播放时间戳，获取各个词块的卡拉OK彩色线条进度
 */
export function getKaraokeWordProgress(
  currentTime: number,
  slots: WordTimeSlot[]
): {
  activeSlotIndex: number;
  wordProgressMap: Record<string, WordProgressInfo>;
} {
  const wordProgressMap: Record<string, WordProgressInfo> = {};
  let activeSlotIndex = -1;

  if (!slots || slots.length === 0) {
    return { activeSlotIndex: -1, wordProgressMap };
  }

  const sentenceStart = slots[0].startSec;
  const sentenceEnd = slots[slots.length - 1].endSec;

  // 句前阶段
  if (currentTime < sentenceStart - 0.05) {
    slots.forEach(s => {
      wordProgressMap[s.wordId] = { progress: 0, status: 'pending' };
    });
    return { activeSlotIndex: -1, wordProgressMap };
  }

  // 句后阶段
  if (currentTime >= sentenceEnd) {
    slots.forEach(s => {
      wordProgressMap[s.wordId] = { progress: 100, status: 'completed' };
    });
    return { activeSlotIndex: slots.length - 1, wordProgressMap };
  }

  // 句中推演
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (currentTime < slot.startSec) {
      wordProgressMap[slot.wordId] = { progress: 0, status: 'pending' };
    } else if (currentTime >= slot.endSec) {
      wordProgressMap[slot.wordId] = { progress: 100, status: 'completed' };
    } else {
      // 正在发音当前词
      const rawPct = ((currentTime - slot.startSec) / slot.durationSec) * 100;
      const progress = Math.min(100, Math.max(0, rawPct));
      wordProgressMap[slot.wordId] = { progress, status: 'active' };
      activeSlotIndex = i;
    }
  }

  // 若处于两个词之间的微小气口，保持前一个词高亮
  if (activeSlotIndex === -1 && currentTime >= sentenceStart && currentTime < sentenceEnd) {
    for (let i = 0; i < slots.length; i++) {
      if (currentTime < slots[i].endSec) {
        activeSlotIndex = i;
        if (wordProgressMap[slots[i].wordId]) {
          wordProgressMap[slots[i].wordId].status = 'active';
        }
        break;
      }
    }
  }

  return {
    activeSlotIndex,
    wordProgressMap
  };
}
