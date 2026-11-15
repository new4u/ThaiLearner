import { CuratedLesson, SubtitleLine } from '../types';

export const BOUND_SUBTITLES_STORAGE_KEY = 'taixue_bound_subtitles_by_media_v1';

export interface BoundMediaSubtitleRecord {
  mediaKey: string;
  mediaKind: 'thai_video' | 'thai_audio';
  thaiVideoId?: string;
  thaiVideoUrl?: string;
  chineseVideoUrl?: string;
  thaiAudioUrl?: string;
  thaiAudioFileName?: string;
  date?: string;
  title?: string;
  subtitles: SubtitleLine[];
  updatedAt: number;
}

/**
 * 提取 YouTube 11 位 Video ID（支持 watch?v= / youtu.be / embed / live / shorts / 裸ID）
 */
export function extractYouTubeVideoId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return '';
}

/**
 * 从音频日期标签、佛历编号（如 691017A / 681225）、文件名或 MP3 URL 中推断公历 YYYY-MM-DD。
 * 无法确定时返回 null，绝不胡乱猜成别的日期。
 */
export function inferGregorianDateFromAudio(params: {
  dateLabel?: string;
  fileCode?: string;
  fileName?: string;
  rawMp3Url?: string;
}): string | null {
  const candidates = [
    params.dateLabel || '',
    params.fileCode || '',
    params.fileName || '',
    params.rawMp3Url || '',
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      text = raw;
    }

    // 1. 显式公历 YYYY-MM-DD / YYYY年M月D日 / YYYY_MM_DD
    const explicit = text.match(/(20\d{2})[-_./年](\d{1,2})[-_./月](\d{1,2})/);
    if (explicit) {
      const y = Number(explicit[1]);
      const m = Number(explicit[2]);
      const d = Number(explicit[3]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }

    // 2. 紧凑 8 位公历 YYYYMMDD
    const compact = text.match(/(?:^|[^\d])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[^\d]|$)/);
    if (compact) {
      return `${compact[1]}-${compact[2]}-${compact[3]}`;
    }
  }

  // 3. 佛历 6 位编码 YYMMDD（如 691017 / 691017A -> 2569-543 = 2026-10-17）
  for (const raw of candidates) {
    if (!raw) continue;
    let text = raw;
    try {
      text = decodeURIComponent(raw);
    } catch {
      text = raw;
    }
    const beMatch = text.match(/(?:^|[^\d])(6[5-9]|7\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:[a-zA-Z]|[^\d]|$)/);
    if (beMatch) {
      const beYear = 2500 + Number(beMatch[1]);
      const gregorianYear = beYear - 543;
      return `${gregorianYear}-${beMatch[2]}-${beMatch[3]}`;
    }
  }

  return null;
}

export function getVideoMediaKey(thaiVideoUrl: string): string {
  const id = extractYouTubeVideoId(thaiVideoUrl);
  if (id) return `yt:${id}`;
  const trimmed = (thaiVideoUrl || '').trim();
  if (trimmed) return `vurl:${trimmed}`;
  return '';
}

export function getAudioMediaKey(params: {
  rawMp3Url?: string;
  fileName?: string;
}): string {
  const url = (params.rawMp3Url || '').trim().split('#')[0];
  if (url) return `aurl:${url}`;
  const fn = (params.fileName || '').trim();
  if (fn) return `afile:${fn}`;
  return '';
}

export function readAllBoundSubtitles(): Record<string, BoundMediaSubtitleRecord> {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(BOUND_SUBTITLES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, BoundMediaSubtitleRecord>;
    }
  } catch {}
  return {};
}

export function getBoundSubtitlesForMedia(mediaKey: string): BoundMediaSubtitleRecord | null {
  if (!mediaKey) return null;
  const map = readAllBoundSubtitles();
  const hit = map[mediaKey];
  if (hit && Array.isArray(hit.subtitles) && hit.subtitles.length > 0) {
    return hit;
  }
  return null;
}

export function saveBoundSubtitlesForMedia(record: BoundMediaSubtitleRecord): void {
  if (!record.mediaKey || !Array.isArray(record.subtitles) || record.subtitles.length === 0) return;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const map = readAllBoundSubtitles();
    map[record.mediaKey] = {
      ...record,
      updatedAt: record.updatedAt || Date.now(),
    };
    localStorage.setItem(BOUND_SUBTITLES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

export function removeBoundSubtitlesForMedia(mediaKey: string): void {
  if (!mediaKey) return;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const map = readAllBoundSubtitles();
    if (map[mediaKey]) {
      delete map[mediaKey];
      localStorage.setItem(BOUND_SUBTITLES_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {}
}

/**
 * 严格按「泰文视频源」查找对应的预设或共学课件。
 * 绝不因为标题或中文链接相似而把别的泰文视频课件误套过来。
 */
export function findCuratedLessonByThaiVideo(
  lessons: CuratedLesson[],
  thaiVideoUrl: string
): CuratedLesson | undefined {
  const thaiId = extractYouTubeVideoId(thaiVideoUrl);
  if (thaiId) {
    return lessons.find((l) => {
      const lessonThaiId = l.thaiVideoId ? extractYouTubeVideoId(l.thaiVideoId) || l.thaiVideoId : extractYouTubeVideoId(l.thaiVideoUrl);
      return Boolean(lessonThaiId && lessonThaiId === thaiId);
    });
  }
  const normalizedUrl = (thaiVideoUrl || '').trim();
  if (!normalizedUrl) return undefined;
  return lessons.find((l) => (l.thaiVideoUrl || '').trim() === normalizedUrl);
}

/**
 * 按音频元数据严格匹配对应课件。
 */
export function findCuratedLessonByAudioMeta(
  lessons: CuratedLesson[],
  params: {
    matchedLessonId?: string;
    dateLabel?: string;
    fileCode?: string;
    fileName?: string;
    rawMp3Url?: string;
  }
): CuratedLesson | undefined {
  if (params.matchedLessonId) {
    const byId = lessons.find((l) => l.id === params.matchedLessonId);
    if (byId) return byId;
  }
  const inferredDate = inferGregorianDateFromAudio(params);
  if (inferredDate) {
    return lessons.find((l) => l.date === inferredDate);
  }
  return undefined;
}

export interface VideoSubtitleResolution {
  isMatched: boolean;
  source: 'curated' | 'custom_bound' | 'none';
  matchedLesson?: CuratedLesson;
  boundRecord?: BoundMediaSubtitleRecord | null;
  subtitles: SubtitleLine[];
  thaiVideoId: string;
  mediaKey: string;
}

/**
 * 视频字幕严格解析器：
 * 1. 先检查当前泰文视频是否命中本地自定义绑定的字幕；
 * 2. 再检查是否严格命中精校/共学课件库中的某节泰文视频；
 * 3. 若均未命中，返回 isMatched: false 与 subtitles: []（绝不出其他视频的字幕）。
 */
export function resolveVideoSubtitlesBinding(params: {
  thaiVideoUrl: string;
  lessons: CuratedLesson[];
  customMapOverride?: Record<string, BoundMediaSubtitleRecord>;
}): VideoSubtitleResolution {
  const thaiVideoId = extractYouTubeVideoId(params.thaiVideoUrl);
  const mediaKey = getVideoMediaKey(params.thaiVideoUrl);
  const matchedLesson = findCuratedLessonByThaiVideo(params.lessons, params.thaiVideoUrl);

  const boundRecord = params.customMapOverride
    ? (mediaKey ? params.customMapOverride[mediaKey] || null : null)
    : getBoundSubtitlesForMedia(mediaKey);

  if (boundRecord && Array.isArray(boundRecord.subtitles) && boundRecord.subtitles.length > 0) {
    return {
      isMatched: true,
      source: 'custom_bound',
      matchedLesson,
      boundRecord,
      subtitles: boundRecord.subtitles,
      thaiVideoId,
      mediaKey,
    };
  }

  if (matchedLesson && Array.isArray(matchedLesson.subtitles) && matchedLesson.subtitles.length > 0) {
    return {
      isMatched: true,
      source: 'curated',
      matchedLesson,
      boundRecord: null,
      subtitles: matchedLesson.subtitles,
      thaiVideoId,
      mediaKey,
    };
  }

  return {
    isMatched: false,
    source: 'none',
    matchedLesson,
    boundRecord: null,
    subtitles: [],
    thaiVideoId,
    mediaKey,
  };
}
