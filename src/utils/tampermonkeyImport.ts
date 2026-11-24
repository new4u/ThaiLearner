import { SubtitleLine } from '../types';
import { SOLIDIFIED_YOUTUBE_CATALOG } from '../data/solidifiedYouTubeCatalog';
import { parseLanguageReactorText } from './languageReactorParser';
import { exportToEnhancedSRT } from './lrFormatParser';
import { extractYouTubeVideoId } from './mediaSubtitleBinding';

export interface TampermonkeyLinkedMetadata {
  videoId?: string;
  date?: string;
  title?: string;
  thaiTitle?: string;
  chineseTitle?: string;
  thaiVideoUrl?: string;
  chineseVideoUrl?: string;
  thaiMp3Url?: string;
  chineseMp3Url?: string;
  captionLang?: string;
  isManualCC?: boolean;
  engineUsed?: string;
  sentenceCount?: number;
  matchedFromCatalog?: boolean;
}

export interface TampermonkeyBundleEntry {
  videoId: string;
  date: string;
  title: string;
  captionLang?: string;
  isManualCC?: boolean;
  sentenceCount: number;
  thaiVideoUrl: string;
  chineseVideoUrl: string;
  thaiMp3Url?: string;
  chineseMp3Url?: string;
  rawItem: Record<string, any>;
}

export interface SubtitleImportInspectionResult {
  kind: 'archive_bundle' | 'linked_json' | 'srt_or_text';
  subtitles: SubtitleLine[];
  totalParsed: number;
  detectedTitle?: string;
  meta: TampermonkeyLinkedMetadata;
  normalizedSrtText?: string;
  bundleItems?: TampermonkeyBundleEntry[];
}

function lookupCatalogRelationship(params: { videoId?: string; date?: string }): {
  date?: string;
  title?: string;
  thaiVideoUrl?: string;
  chineseVideoUrl?: string;
  videoId?: string;
} | null {
  const items = SOLIDIFIED_YOUTUBE_CATALOG?.items || [];
  if (params.videoId) {
    const vid = extractYouTubeVideoId(params.videoId) || params.videoId;
    const hitByVid = items.find((it) => {
      if (it.thai?.videoId === vid || it.chinese?.videoId === vid) return true;
      if (it.thaiCandidates?.some((c) => c.videoId === vid)) return true;
      if (it.chineseCandidates?.some((c) => c.videoId === vid)) return true;
      return false;
    });
    if (hitByVid) {
      return {
        date: hitByVid.date,
        title: hitByVid.thai?.title || hitByVid.chinese?.title,
        thaiVideoUrl: hitByVid.thai?.url || (hitByVid.thai?.videoId ? `https://www.youtube.com/watch?v=${hitByVid.thai.videoId}` : ''),
        chineseVideoUrl: hitByVid.chinese?.url || (hitByVid.chinese?.videoId ? `https://www.youtube.com/watch?v=${hitByVid.chinese.videoId}` : ''),
        videoId: hitByVid.thai?.videoId || vid,
      };
    }
  }
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    const hitByDate = items.find((it) => it.date === params.date);
    if (hitByDate) {
      return {
        date: hitByDate.date,
        title: hitByDate.thai?.title || hitByDate.chinese?.title,
        thaiVideoUrl: hitByDate.thai?.url || (hitByDate.thai?.videoId ? `https://www.youtube.com/watch?v=${hitByDate.thai.videoId}` : ''),
        chineseVideoUrl: hitByDate.chinese?.url || (hitByDate.chinese?.videoId ? `https://www.youtube.com/watch?v=${hitByDate.chinese.videoId}` : ''),
        videoId: hitByDate.thai?.videoId,
      };
    }
  }
  return null;
}

function extractMetaFromSingleJsonObject(obj: Record<string, any>): TampermonkeyLinkedMetadata {
  const rawThaiUrl =
    obj.thaiVideoUrl ||
    obj.youtubeUrl ||
    obj.sourceYouTube ||
    (obj.videoId ? `https://www.youtube.com/watch?v=${obj.videoId}` : '');
  const rawChineseUrl = obj.chineseVideoUrl || obj.chineseYouTubeUrl || '';
  const vid = extractYouTubeVideoId(rawThaiUrl) || (typeof obj.videoId === 'string' ? obj.videoId : '');
  const dateStr = typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(obj.date) ? obj.date.slice(0, 10) : '';

  const catalogMatch = lookupCatalogRelationship({ videoId: vid, date: dateStr });

  const title =
    (typeof obj.chineseTitle === 'string' && obj.chineseTitle.trim()) ||
    (typeof obj.title === 'string' && obj.title.trim()) ||
    (typeof obj.thaiTitle === 'string' && obj.thaiTitle.trim()) ||
    catalogMatch?.title ||
    undefined;

  return {
    videoId: vid || catalogMatch?.videoId || undefined,
    date: dateStr || catalogMatch?.date || undefined,
    title,
    thaiTitle: typeof obj.thaiTitle === 'string' ? obj.thaiTitle : undefined,
    chineseTitle: typeof obj.chineseTitle === 'string' ? obj.chineseTitle : undefined,
    thaiVideoUrl: rawThaiUrl || catalogMatch?.thaiVideoUrl || undefined,
    chineseVideoUrl: rawChineseUrl || catalogMatch?.chineseVideoUrl || undefined,
    thaiMp3Url: obj.thaiMp3Url || obj.sourceMp3 || obj.thMp3 || undefined,
    chineseMp3Url: obj.chineseMp3Url || obj.cnMp3 || undefined,
    captionLang: typeof obj.captionLang === 'string' ? obj.captionLang : undefined,
    isManualCC: typeof obj.isManualCC === 'boolean' ? obj.isManualCC : undefined,
    engineUsed: typeof obj.engineUsed === 'string' ? obj.engineUsed : undefined,
    matchedFromCatalog: Boolean(catalogMatch),
  };
}

/**
 * 从单个 Tampermonkey/Colab JSON 对象构建可读可编辑的导出结果
 */
export function buildInspectionFromLinkedItem(item: Record<string, any>): SubtitleImportInspectionResult {
  const serialized = JSON.stringify(item);
  const parsed = parseLanguageReactorText(serialized);
  const meta = extractMetaFromSingleJsonObject(item);
  const normalizedSrtText =
    parsed.subtitles.length > 0 ? exportToEnhancedSRT(parsed.subtitles) : '';

  return {
    kind: 'linked_json',
    subtitles: parsed.subtitles,
    totalParsed: parsed.totalParsed,
    detectedTitle: meta.title || parsed.detectedTitle,
    meta: {
      ...meta,
      sentenceCount: parsed.totalParsed,
    },
    normalizedSrtText,
  };
}

/**
 * 智能探测导入内容（支持 Tampermonkey .linked.json / taixue-cc-archive-*.json / Colab .taixue.json / .srt / HTML）
 */
export function inspectSubtitleImportPayload(
  rawText: string,
  fileName?: string
): SubtitleImportInspectionResult {
  const trimmed = (rawText || '').replace(/^\uFEFF/, '').trim();
  const emptyResult: SubtitleImportInspectionResult = {
    kind: 'srt_or_text',
    subtitles: [],
    totalParsed: 0,
    meta: {},
  };
  if (!trimmed) return emptyResult;

  // 1. 探测 JSON（单期 .linked.json / .taixue.json / Tampermonkey 批量归档包）
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const json = JSON.parse(trimmed);

      // 1A) Tampermonkey 批量导出包: { exportedAt, totalDone, manifest, items: [...] }
      if (json && !Array.isArray(json) && Array.isArray(json.items) && json.items.length > 0) {
        const bundleItems: TampermonkeyBundleEntry[] = json.items
          .filter((it: any) => it && Array.isArray(it.subtitles) && it.subtitles.length > 0)
          .map((it: any) => {
            const meta = extractMetaFromSingleJsonObject(it);
            return {
              videoId: meta.videoId || String(it.videoId || ''),
              date: meta.date || String(it.date || 'undated'),
              title: meta.title || String(it.title || it.videoId || '未命名法谈'),
              captionLang: meta.captionLang,
              isManualCC: meta.isManualCC,
              sentenceCount: it.subtitles.length,
              thaiVideoUrl: meta.thaiVideoUrl || '',
              chineseVideoUrl: meta.chineseVideoUrl || '',
              thaiMp3Url: meta.thaiMp3Url,
              chineseMp3Url: meta.chineseMp3Url,
              rawItem: it,
            };
          })
          .sort((a: TampermonkeyBundleEntry, b: TampermonkeyBundleEntry) =>
            (b.date || '').localeCompare(a.date || '')
          );

        if (bundleItems.length > 0) {
          const first = buildInspectionFromLinkedItem(bundleItems[0].rawItem);
          return {
            ...first,
            kind: 'archive_bundle',
            bundleItems,
          };
        }
      }

      // 1B) 单期 .linked.json / .taixue.json
      if (json && !Array.isArray(json) && (Array.isArray(json.subtitles) || Array.isArray(json.lines) || Array.isArray(json.data))) {
        return buildInspectionFromLinkedItem(json);
      }

      // 1C) 纯字幕数组 JSON
      if (Array.isArray(json)) {
        const parsed = parseLanguageReactorText(trimmed);
        return {
          kind: 'linked_json',
          subtitles: parsed.subtitles,
          totalParsed: parsed.totalParsed,
          detectedTitle: parsed.detectedTitle,
          meta: { sentenceCount: parsed.totalParsed },
          normalizedSrtText: parsed.subtitles.length > 0 ? exportToEnhancedSRT(parsed.subtitles) : '',
        };
      }
    } catch {
      // 非合法 JSON，继续走文本/SRT 解析
    }
  }

  // 2. 文本 / SRT / HTML 格式，提取可选头部元数据注释 & 文件名元数据关联
  let headerMeta: Partial<TampermonkeyLinkedMetadata> = {};
  const metaHeaderMatch = trimmed.match(/^(?:#|;|\/\/)\s*@?taixue[_-]?meta\s*:\s*(\{[^\r\n]+\})/im);
  if (metaHeaderMatch && metaHeaderMatch[1]) {
    try {
      const parsedHeader = JSON.parse(metaHeaderMatch[1]);
      headerMeta = extractMetaFromSingleJsonObject(parsedHeader);
    } catch {}
  }

  // 从文件名反推日期与 VideoID（兼容 Tampermonkey 命名 `2026-11-21_4j72ImUi_eY.th.srt` 与 Colab `2026-11-21_enhanced.srt`）
  let fnDate = '';
  let fnVid = '';
  if (fileName) {
    const dateVidMatch = fileName.match(/(\d{4}-\d{2}-\d{2})_([A-Za-z0-9_-]{11})(?:[._-]|$)/);
    if (dateVidMatch) {
      fnDate = dateVidMatch[1];
      fnVid = dateVidMatch[2];
    } else {
      const onlyDateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
      if (onlyDateMatch) fnDate = onlyDateMatch[1];
      const onlyVidMatch = fileName.match(/(?:^|[_-])([A-Za-z0-9_-]{11})(?:\.[a-z]{2,5})?\.(?:srt|txt|json)$/i);
      if (onlyVidMatch) fnVid = onlyVidMatch[1];
    }
  }

  const catalogHit = lookupCatalogRelationship({
    videoId: headerMeta.videoId || fnVid,
    date: headerMeta.date || fnDate,
  });

  const parsedText = parseLanguageReactorText(trimmed);
  const resolvedVid = headerMeta.videoId || fnVid || catalogHit?.videoId;
  const resolvedThaiUrl =
    headerMeta.thaiVideoUrl ||
    catalogHit?.thaiVideoUrl ||
    (resolvedVid ? `https://www.youtube.com/watch?v=${resolvedVid}` : undefined);

  return {
    kind: 'srt_or_text',
    subtitles: parsedText.subtitles,
    totalParsed: parsedText.totalParsed,
    detectedTitle: headerMeta.title || catalogHit?.title || parsedText.detectedTitle,
    meta: {
      videoId: resolvedVid,
      date: headerMeta.date || fnDate || catalogHit?.date,
      title: headerMeta.title || catalogHit?.title,
      thaiVideoUrl: resolvedThaiUrl,
      chineseVideoUrl: headerMeta.chineseVideoUrl || catalogHit?.chineseVideoUrl,
      thaiMp3Url: headerMeta.thaiMp3Url,
      chineseMp3Url: headerMeta.chineseMp3Url,
      captionLang: headerMeta.captionLang,
      isManualCC: headerMeta.isManualCC,
      matchedFromCatalog: Boolean(catalogHit),
      sentenceCount: parsedText.totalParsed,
    },
  };
}
