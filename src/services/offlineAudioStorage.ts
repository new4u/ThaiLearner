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
  trackType: 'thai_audio' | 'chinese_audio';
  suggestedLessonId: string;
  mp3Url: string;
  fileName: string;
  sourceDomain: string;
}

// 官方公开免费 MP3 音频档案馆（纯音频直链，可经 /api/audio-proxy 无跨域缓存到本地或下载保存）
export const OFFICIAL_FREE_AUDIO_ARCHIVES: OfficialAudioArchiveItem[] = [
  {
    id: 'archive_wat_suan_611007A',
    title: 'Wat Suan Santidham 官方泰语开示 MP3 (CD078 · 611007A)',
    subtitle: '隆波帕默尊者官方公开 MP3 音频归档，适合无翻墙环境下离线跟读、倍速精听',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    trackType: 'thai_audio',
    suggestedLessonId: 'lesson_20261010',
    mp3Url: 'https://media.dhamma.com/pramote/cd/078/611007A.mp3',
    fileName: 'WatSuanSantidham_611007A_Thai.mp3',
    sourceDomain: 'media.dhamma.com',
  },
  {
    id: 'archive_zhdhamma_zh260705',
    title: '解脱园 / Wat Suan 官方中文同传 MP3 (zh260705)',
    subtitle: '官方公开中文同步传译 MP3 存档，可缓存后配合泰语原声轨道学习',
    speaker: '解脱园中文同传音频库',
    trackType: 'chinese_audio',
    suggestedLessonId: 'lesson_20261017',
    mp3Url: 'https://s3-ap-southeast-1.amazonaws.com/zhdhamma/zh260705.mp3',
    fileName: 'Luangpor_Chinese_zh260705.mp3',
    sourceDomain: 's3-ap-southeast-1.amazonaws.com/zhdhamma',
  },
];

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

export function buildAudioProxyUrl(rawUrl: string, downloadFileName?: string): string {
  const params = new URLSearchParams({ url: rawUrl.trim() });
  if (downloadFileName) {
    params.set('filename', downloadFileName);
  }
  return `/api/audio-proxy?${params.toString()}`;
}

export async function fetchOfficialAudioBlob(
  rawUrl: string,
  onProgress?: (loadedBytes: number, totalBytes: number | null) => void
): Promise<{ blob: Blob; mimeType: string }> {
  const proxyUrl = buildAudioProxyUrl(rawUrl);
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    let errMsg = `拉取官方音频失败 (${res.status})`;
    try {
      const json = await res.json();
      if (json?.error) errMsg = json.error;
    } catch {
      // ignore non-json
    }
    throw new Error(errMsg);
  }

  const contentType = (res.headers.get('content-type') || 'audio/mpeg').toLowerCase();
  if (contentType.includes('text/html') || contentType.startsWith('video/')) {
    throw new Error(`源站返回非纯音频类型 (${contentType})，已遵循纯音频原则拦截`);
  }

  const totalHeader = res.headers.get('content-length');
  const totalBytes = totalHeader ? parseInt(totalHeader, 10) : null;

  if (!res.body || !onProgress) {
    const blob = await res.blob();
    return { blob, mimeType: blob.type || contentType || 'audio/mpeg' };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, Number.isFinite(totalBytes) ? totalBytes : null);
    }
  }

  const mergedParts: BlobPart[] = chunks.map(chunk => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);
    return copy.buffer;
  });
  const blob = new Blob(mergedParts, { type: contentType.includes('audio') ? contentType : 'audio/mpeg' });
  return { blob, mimeType: blob.type };
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
