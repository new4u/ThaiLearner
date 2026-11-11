/**
 * 轻量浏览器与时间指纹生成器 (纯前端原生无感提取，无需外部大体积依赖)
 */
export interface DeviceFingerprint {
  fingerprintId: string; // 唯一指纹 ID，如 fp_9a8b7c6d5e4f
  deviceLabel: string;    // 设备可读摘要，如 "Mac Chrome (电脑端)"
  registeredTimeStr: string; // "2026-11-11 18:07:35"
  defaultDisplayName: string; // "新学友 1111-1807"
}

// 简易稳定哈希算法 (MurmurHash-like 32bit)
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 提取 Canvas 特征哈希
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocanvas';
    
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 5, 60, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Dhamma,สติ,รู้,2026', 15, 8);
    return hashString(canvas.toDataURL());
  } catch {
    return 'canvas_err';
  }
}

/**
 * 获取设备可读摘要
 */
export function getReadableDeviceName(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return '网页客户端';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone Safari (手机端)';
  if (/iPad/i.test(ua)) return 'iPad (平板端)';
  if (/Android/i.test(ua)) return 'Android Chrome (手机端)';
  if (/Mac/i.test(ua)) return 'Mac (电脑端)';
  if (/Win/i.test(ua)) return 'Windows PC (电脑端)';
  return 'Web 客户端';
}

/**
 * 生成或读取当前浏览器独一无二的设备指纹与时间戳
 */
export function getOrCreateDeviceFingerprint(): DeviceFingerprint {
  const STORAGE_KEY = 'taixue_device_fingerprint_v1';
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.fingerprintId) return parsed;
    }
  } catch {}

  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const shortDateStr = `${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  // 综合环境指纹特征
  const screenInfo = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}` : '0x0';
  const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  const languages = typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]).join(',') : 'zh';
  const canvasHash = getCanvasFingerprint();
  const rawSeed = `${navigator?.userAgent || ''}_${screenInfo}_${timezone}_${languages}_${canvasHash}`;
  const fpHash = hashString(rawSeed);

  const fp: DeviceFingerprint = {
    fingerprintId: `fp_${fpHash}_${Date.now().toString(36)}`,
    deviceLabel: getReadableDeviceName(),
    registeredTimeStr: timeStr,
    defaultDisplayName: `新学友 ${shortDateStr}`
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fp));
  } catch {}

  return fp;
}
