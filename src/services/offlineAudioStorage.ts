export type OfflineTrackType = 'thai_audio' | 'chinese_audio' | 'user_recording';

export type OfflineSourceKind = 'local_file' | 'recording' | 'official_archive';

export interface OfflineAudioMeta {
  id: string; // `${lessonId}::${trackType}`
  lessonId: string;
  trackType: OfflineTrackType;
  lessonTitle: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  offsetSeconds: number;
  sourceKind: OfflineSourceKind;
  updatedAt: number;
}

export interface OfflineAudioRecord extends OfflineAudioMeta {
  blob: Blob;
}

export interface OfficialAudioArchiveItem {
  id: string;
  title: string;
  subtitle: string;
  speaker: string;
  date: string;
  fileCode: string;
  trackType: 'thai_audio' | 'chinese_audio';
  suggestedLessonId: string;
  isExcerptMatch?: boolean;
  mp3Url: string;
  fileName: string;
  sourceDomain: string;
}

export interface DhammaCatalogItem {
  id: string;
  fileCode: string;
  fileName: string;
  title: string;
  gregorianDate?: string;
  buddhistYear?: string;
  mp3Url: string;
  wikiUrl?: string;
  sizeBytes?: number;
  trackType: 'thai_audio' | 'chinese_audio';
  sourceDomain: string;
  matchedLessonId?: string;
}

export interface DhammaCatalogResponse {
  source: '2569' | '2568' | 'cn2026' | 'cn2025';
  officialPageUrl: string;
  fetchedAt: number;
  total: number;
  items: DhammaCatalogItem[];
}

export interface LuangporPairedItem {
  id: string;
  date: string;
  sessionSuffix: 'A' | 'B' | '';
  matchedLessonId?: string;
  thai: DhammaCatalogItem | null;
  chinese: DhammaCatalogItem | null;
}

export interface LuangporPairedCatalogResponse {
  year: '2026' | '2025';
  buddhistYear: '2569' | '2568';
  fetchedAt: number;
  total: number;
  thaiCount: number;
  chineseCount: number;
  thaiCatalogUrl: string;
  chineseCatalogUrl: string;
  items: LuangporPairedItem[];
  isSolidified?: boolean;
  solidifiedAt?: string;
}

export const OFFICIAL_DIRECTORY_LINKS = [
  {
    id: 'dir_2569',
    label: 'dhamma.com 泰语原声 2569 (2026年)',
    url: 'https://www.dhamma.com/download/2569/',
    note: '泰语编号：69 + 月日（如 691017.mp3）',
  },
  {
    id: 'dir_cn_2026',
    label: 'dhamma.cn 中文开示 2026目录',
    url: 'https://www.dhamma.cn/luangpor/2026%E5%B9%B4%E5%BA%A6%E6%97%A5%E5%B8%B8%E5%BC%80%E7%A4%BA',
    note: '中文站收录隆波帕默尊者 D26.xx 系列中文 MP3',
  },
  {
    id: 'dir_2568',
    label: 'dhamma.com 泰语 2568 (2025年)',
    url: 'https://www.dhamma.com/download/2568/',
    note: '泰语编号：68 + 月日',
  },
];

// 官方公开免费 MP3 音频档案馆（与当前课程公历/佛历日期严格 1:1 核验对应，涵盖泰语 dhamma.com 与中文 dhamma.cn）
export const OFFICIAL_FREE_AUDIO_ARCHIVES: OfficialAudioArchiveItem[] = [
  {
    id: 'archive_2569_691017',
    title: '2026-10-17 泰语原声 MP3 (691017)',
    subtitle: 'ปฏิบัติในที่ทุกสถานในกาลทุกเมื่อ · dhamma.com 泰语完整录音，对应本课 1,198 句字幕',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    date: '2026-10-17',
    fileCode: '691017',
    trackType: 'thai_audio',
    suggestedLessonId: 'lesson_20261017',
    mp3Url: 'https://media.dhamma.com/pramote/cd/2569/691017.mp3',
    fileName: '691017.mp3',
    sourceDomain: 'media.dhamma.com/pramote/cd/2569',
  },
  {
    id: 'archive_cn_20261017',
    title: '2026-10-17 中文同传 MP3 (D26.83)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年10月17日中文口译音频',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-10-17',
    fileCode: 'D26.83',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261017',
    mp3Url: 'https://media.dhamma.cn/6/6f/D26.83%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8817%E6%97%A5.mp3',
    fileName: 'D26.83_2026-10-17_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
  {
    id: 'archive_2569_691018',
    title: '2026-10-18 泰语原声 MP3 (691018)',
    subtitle: 'แก้มิจฉาทิฎฐิด้วยสติปัฏฐาน · dhamma.com 泰语完整录音，对应本课 746 句字幕',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    date: '2026-10-18',
    fileCode: '691018',
    trackType: 'thai_audio',
    suggestedLessonId: 'lesson_20261018',
    mp3Url: 'https://media.dhamma.com/pramote/cd/2569/691018.mp3',
    fileName: '691018.mp3',
    sourceDomain: 'media.dhamma.com/pramote/cd/2569',
  },
  {
    id: 'archive_cn_20261018',
    title: '2026-10-18 中文同传 MP3 (D26.84)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年10月18日中文口译音频',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-10-18',
    fileCode: 'D26.84',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261018',
    mp3Url: 'https://media.dhamma.cn/4/41/D26.84%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8818%E6%97%A5.mp3',
    fileName: 'D26.84_2026-10-18_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
  {
    id: 'archive_cn_20261031',
    title: '2026-10-31 中文同传 MP3 (D26.87)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年10月31日中文音频（dhamma.com 泰语版待上架）',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-10-31',
    fileCode: 'D26.87',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261031',
    mp3Url: 'https://media.dhamma.cn/0/09/D26.87%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8831%E6%97%A5.mp3',
    fileName: 'D26.87_2026-10-31_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
  {
    id: 'archive_cn_20261101',
    title: '2026-11-01 中文同传 MP3 (D26.88)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年11月1日中文音频（含 543 句功德衣法会全篇字幕）',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-11-01',
    fileCode: 'D26.88',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261101',
    mp3Url: 'https://media.dhamma.cn/d/da/D26.88%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%881%E6%97%A5.mp3',
    fileName: 'D26.88_2026-11-01_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
  {
    id: 'archive_cn_20261108',
    title: '2026-11-08 中文同传 MP3 (D26.90)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年11月8日中文音频（含 1,179 句全篇精准字幕）',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-11-08',
    fileCode: 'D26.90',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261108',
    mp3Url: 'https://media.dhamma.cn/7/77/D26.90%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B411%E6%9C%888%E6%97%A5.mp3',
    fileName: 'D26.90_2026-11-08_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
  {
    id: 'archive_2569_691010',
    title: '2026-10-10 泰语原声全程 MP3 (691010 · 字幕为节选)',
    subtitle: 'น้อมเข้ามาเรียนรู้ตัวเอง · 全场完整录音，本课字幕为 29 句节选，可点“对齐起点”匹配时间',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    date: '2026-10-10',
    fileCode: '691010',
    trackType: 'thai_audio',
    suggestedLessonId: 'lesson_20261010',
    isExcerptMatch: true,
    mp3Url: 'https://media.dhamma.com/pramote/cd/2569/691010.mp3',
    fileName: '691010.mp3',
    sourceDomain: 'media.dhamma.com/pramote/cd/2569',
  },
  {
    id: 'archive_cn_20261010',
    title: '2026-10-10 中文同传 MP3 (D26.81 · 字幕为节选)',
    subtitle: 'dhamma.cn 收录《隆波帕默尊者开示》2026年10月10日中文音频',
    speaker: 'dhamma.cn 隆波帕默尊者中文存档',
    date: '2026-10-10',
    fileCode: 'D26.81',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261010',
    isExcerptMatch: true,
    mp3Url: 'https://media.dhamma.cn/7/76/D26.81%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8810%E6%97%A5.mp3',
    fileName: 'D26.81_2026-10-10_CN.mp3',
    sourceDomain: 'media.dhamma.cn',
  },
];

import { SOLIDIFIED_AUDIO_CATALOG_2026 } from '../data/solidifiedAudioCatalog2026';
import { SOLIDIFIED_AUDIO_CATALOG_2025 } from '../data/solidifiedAudioCatalog2025';

export async function fetchLuangporPairedCatalog(
  year: '2026' | '2025',
  forceRefresh = false
): Promise<LuangporPairedCatalogResponse> {
  const fallback = year === '2026' ? SOLIDIFIED_AUDIO_CATALOG_2026 : SOLIDIFIED_AUDIO_CATALOG_2025;
  try {
    const qs = new URLSearchParams({ year });
    if (forceRefresh) qs.set('refresh', '1');
    const res = await fetch(`/api/luangpor-catalog?${qs.toString()}`);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok || !contentType.includes('application/json')) {
      return fallback;
    }
    const data = await res.json();
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      return data;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function fetchDhammaCatalog(
  source: '2569' | '2568' | 'cn2026' | 'cn2025',
  forceRefresh = false
): Promise<DhammaCatalogResponse> {
  const qs = new URLSearchParams({ source });
  if (forceRefresh) qs.set('refresh', '1');
  const res = await fetch(`/api/dhamma-catalog?${qs.toString()}`);
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!res.ok || !contentType.includes('application/json')) {
    let errMsg = `当前静态环境不支持在线拉取该源目录 (${res.status})`;
    if (contentType.includes('application/json')) {
      try {
        const json = await res.json();
        if (json?.error) errMsg = json.error;
      } catch {}
    }
    throw new Error(errMsg);
  }
  return res.json();
}

const DB_NAME = 'taixue_offline_audio_v1';
const DB_VERSION = 1;
const STORE_NAME = 'audio_tracks';

export function makeTrackId(lessonId: string, trackType: OfflineTrackType): string {
  return `${lessonId}::${trackType}`;
}

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('当前浏览器不支持 IndexedDB 离线音频存储'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('lessonId', 'lessonId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开离线音频库失败'));
  });
}

function stripBlob(record: OfflineAudioRecord): OfflineAudioMeta {
  const { blob: _blob, ...meta } = record;
  return meta;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `taixue_audio_${Date.now()}.webm`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

let cachedAudioProxySupport: boolean | null = null;
let audioProxyProbePromise: Promise<boolean> | null = null;

export function isAudioProxyAvailableSync(): boolean | null {
  return cachedAudioProxySupport;
}

export async function probeAudioProxySupport(): Promise<boolean> {
  if (cachedAudioProxySupport !== null) return cachedAudioProxySupport;
  if (audioProxyProbePromise) return audioProxyProbePromise;

  audioProxyProbePromise = (async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.status === 404 || ct.includes('text/html')) {
        cachedAudioProxySupport = false;
        return false;
      }
      if (!res.ok || !ct.includes('application/json')) {
        return false;
      }
      const data = await res.json();
      const ok = Boolean(data?.ok && data?.audioOnlyProxy);
      cachedAudioProxySupport = ok;
      return ok;
    } catch {
      return false;
    } finally {
      audioProxyProbePromise = null;
    }
  })();

  return audioProxyProbePromise;
}

export function buildAudioProxyUrl(rawUrl: string, downloadFileName?: string): string {
  const params = new URLSearchParams({ url: rawUrl.trim() });
  if (downloadFileName) {
    params.set('filename', downloadFileName);
  }
  return `/api/audio-proxy?${params.toString()}`;
}

export function resolvePreferredAudioStreamUrl(rawUrl: string): string {
  const cleaned = rawUrl.trim();
  if (!cleaned) return '';
  if (cachedAudioProxySupport === false) {
    return cleaned;
  }
  return buildAudioProxyUrl(cleaned);
}

export async function fetchOfficialAudioBlob(
  rawUrl: string,
  onProgress?: (loadedBytes: number, totalBytes: number | null) => void
): Promise<{ blob: Blob; mimeType: string }> {
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunks (safe for Cloud Run 32MB limit)
  const directUrl = rawUrl.trim();
  const proxyAvailable = await probeAudioProxySupport();
  const proxyUrl = buildAudioProxyUrl(directUrl);

  const readSingleResponse = async (
    res: Response,
    offsetBytes: number,
    knownTotal: number | null
  ): Promise<{ part: Uint8Array; contentType: string }> => {
    const contentType = (res.headers.get('content-type') || 'audio/mpeg').toLowerCase();
    if (contentType.includes('text/html') || contentType.startsWith('video/')) {
      throw new Error(`源站返回非纯音频类型 (${contentType})，已拦截`);
    }
    if (!res.body) {
      const ab = await res.arrayBuffer();
      const u8 = new Uint8Array(ab);
      onProgress?.(offsetBytes + u8.byteLength, knownTotal);
      return { part: u8, contentType };
    }
    const reader = res.body.getReader();
    const subChunks: Uint8Array[] = [];
    let subLoaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        subChunks.push(value);
        subLoaded += value.byteLength;
        onProgress?.(offsetBytes + subLoaded, knownTotal);
      }
    }
    const merged = new Uint8Array(subLoaded);
    let pos = 0;
    for (const c of subChunks) {
      merged.set(c, pos);
      pos += c.byteLength;
    }
    return { part: merged, contentType };
  };

  let activeUrl = proxyAvailable ? proxyUrl : directUrl;
  let firstRes = await fetch(activeUrl, {
    headers: { Range: `bytes=0-${CHUNK_SIZE - 1}` },
    ...(activeUrl === directUrl ? { referrerPolicy: 'no-referrer' as ReferrerPolicy } : {}),
  });

  const firstCt = (firstRes.headers.get('content-type') || '').toLowerCase();
  if (activeUrl === proxyUrl && ((!firstRes.ok && firstRes.status !== 206) || firstCt.includes('text/html'))) {
    // 代理端点不可用（如纯静态部署返回 index.html），自动回退直连官网 HTTPS 音频
    activeUrl = directUrl;
    firstRes = await fetch(activeUrl, {
      headers: { Range: `bytes=0-${CHUNK_SIZE - 1}` },
      referrerPolicy: 'no-referrer',
    });
  }

  if (!firstRes.ok && firstRes.status !== 206) {
    let errMsg = `拉取官方音频失败 (${firstRes.status})`;
    try {
      const json = await firstRes.json();
      if (json?.error) errMsg = json.error;
    } catch {}
    throw new Error(errMsg);
  }

  const contentRangeHeader = firstRes.headers.get('content-range') || '';
  const crMatch = contentRangeHeader.match(/bytes\s+(\d+)-(\d+)\/(\d+|\*)/i);
  const totalBytes = crMatch && crMatch[3] !== '*'
    ? parseInt(crMatch[3], 10)
    : firstRes.status === 200
    ? Number(firstRes.headers.get('content-length') || 0) || null
    : null;

  const parts: BlobPart[] = [];
  const firstData = await readSingleResponse(firstRes, 0, totalBytes);
  parts.push(firstData.part.buffer as ArrayBuffer);
  let loaded = firstData.part.byteLength;
  const mimeType = firstData.contentType.includes('audio') ? firstData.contentType : 'audio/mpeg';

  // If 206 and more bytes remain, continue 4MB chunks sequentially
  if (firstRes.status === 206 && totalBytes && loaded < totalBytes) {
    while (loaded < totalBytes) {
      const end = Math.min(loaded + CHUNK_SIZE - 1, totalBytes - 1);
      const nextRes = await fetch(activeUrl, {
        headers: { Range: `bytes=${loaded}-${end}` },
        ...(activeUrl === directUrl ? { referrerPolicy: 'no-referrer' as ReferrerPolicy } : {}),
      });
      if (!nextRes.ok && nextRes.status !== 206) {
        throw new Error(`分片拉取音频失败 (${nextRes.status})`);
      }
      const nextData = await readSingleResponse(nextRes, loaded, totalBytes);
      if (nextData.part.byteLength === 0) break;
      parts.push(nextData.part.buffer as ArrayBuffer);
      loaded += nextData.part.byteLength;
    }
  }

  const blob = new Blob(parts, { type: mimeType });
  return { blob, mimeType: blob.type || mimeType };
}

export async function probeAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    let settled = false;
    const finish = (dur: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(dur) && dur > 0 ? dur : 0);
    };
    const timer = window.setTimeout(() => finish(0), 3500);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      if (audio.duration === Infinity) {
        audio.currentTime = 1e101;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          finish(audio.duration);
        };
      } else {
        finish(audio.duration);
      }
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(0);
    };
    audio.src = url;
  });
}

export const offlineAudioStorage = {
  async saveAudioTrack(params: {
    lessonId: string;
    trackType: OfflineTrackType;
    lessonTitle: string;
    fileName: string;
    blob: Blob;
    durationSec?: number;
    offsetSeconds?: number;
    sourceKind: OfflineSourceKind;
  }): Promise<OfflineAudioMeta> {
    const db = await openAudioDB();
    const id = makeTrackId(params.lessonId, params.trackType);
    const durationSec =
      typeof params.durationSec === 'number' && params.durationSec > 0
        ? params.durationSec
        : await probeAudioDuration(params.blob);

    const record: OfflineAudioRecord = {
      id,
      lessonId: params.lessonId,
      trackType: params.trackType,
      lessonTitle: params.lessonTitle,
      fileName: params.fileName,
      mimeType: params.blob.type || 'audio/mpeg',
      sizeBytes: params.blob.size,
      durationSec,
      offsetSeconds: params.offsetSeconds ?? 0,
      sourceKind: params.sourceKind,
      updatedAt: Date.now(),
      blob: params.blob,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('写入离线音频失败'));
    });
    db.close();

    return stripBlob(record);
  },

  async getAudioTrack(lessonId: string, trackType: OfflineTrackType): Promise<OfflineAudioRecord | null> {
    const db = await openAudioDB();
    const id = makeTrackId(lessonId, trackType);
    const record = await new Promise<OfflineAudioRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as OfflineAudioRecord | undefined) ?? null);
      req.onerror = () => reject(req.error || new Error('读取离线音频失败'));
    });
    db.close();
    return record;
  },

  async getLessonTracks(lessonId: string): Promise<Partial<Record<OfflineTrackType, OfflineAudioRecord>>> {
    const db = await openAudioDB();
    const records = await new Promise<OfflineAudioRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('lessonId');
      const req = idx.getAll(lessonId);
      req.onsuccess = () => resolve((req.result as OfflineAudioRecord[]) || []);
      req.onerror = () => reject(req.error || new Error('查询课程离线音频失败'));
    });
    db.close();

    const result: Partial<Record<OfflineTrackType, OfflineAudioRecord>> = {};
    for (const rec of records) {
      result[rec.trackType] = rec;
    }
    return result;
  },

  async getAllCachedMeta(): Promise<OfflineAudioMeta[]> {
    const db = await openAudioDB();
    const records = await new Promise<OfflineAudioRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OfflineAudioRecord[]) || []);
      req.onerror = () => reject(req.error || new Error('读取离线音频清单失败'));
    });
    db.close();

    return records
      .map(stripBlob)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async updateAudioOffset(lessonId: string, trackType: OfflineTrackType, offsetSeconds: number): Promise<OfflineAudioMeta | null> {
    const db = await openAudioDB();
    const id = makeTrackId(lessonId, trackType);
    const updated = await new Promise<OfflineAudioMeta | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const rec = getReq.result as OfflineAudioRecord | undefined;
        if (!rec) {
          resolve(null);
          return;
        }
        rec.offsetSeconds = parseFloat(offsetSeconds.toFixed(2));
        rec.updatedAt = Date.now();
        const putReq = store.put(rec);
        putReq.onsuccess = () => resolve(stripBlob(rec));
        putReq.onerror = () => reject(putReq.error || new Error('更新偏移校准失败'));
      };
      getReq.onerror = () => reject(getReq.error || new Error('读取记录失败'));
    });
    db.close();
    return updated;
  },

  async deleteAudioTrack(lessonId: string, trackType: OfflineTrackType): Promise<void> {
    const db = await openAudioDB();
    const id = makeTrackId(lessonId, trackType);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('删除离线音频失败'));
    });
    db.close();
  },

  async clearAllAudio(): Promise<void> {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('清空离线音频失败'));
    });
    db.close();
  },
};
