import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// 严格白名单：仅允许合法公开佛教音频站点透传（纯音频 Audio-Only，绝不代理视频下载）
const ALLOWED_AUDIO_HOSTS = new Set([
  'media.dhamma.com',
  'www.dhamma.com',
  'dhamma.com',
  's3-ap-southeast-1.amazonaws.com',
  'media.dhamma.cn',
  'www.dhamma.cn',
  'dhamma.cn',
  'www.satipatthana.life',
  'satipatthana.life',
  'www.jietuoyuan.com',
  'jietuoyuan.com',
  'www.ganluyu.net',
  'ganluyu.net',
]);

function isSafePublicAudioUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (!ALLOWED_AUDIO_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    // 禁止任何视频后缀与非音频路径
    const lowerPath = parsed.pathname.toLowerCase();
    if (lowerPath.endsWith('.mp4') || lowerPath.endsWith('.mkv') || lowerPath.endsWith('.webm') && lowerPath.includes('video')) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function createAppServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 健康检查
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, mode: IS_PROD ? 'production' : 'development', audioOnlyProxy: true });
  });

  // 官网公开音频目录实时抓取（带 15 分钟内存缓存：dhamma.com 泰语 + dhamma.cn MediaWiki 中文隆波帕默开示）
  const catalogCache = new Map<string, { fetchedAt: number; payload: any }>();

  const LESSON_DATE_MAP: Record<string, string> = {
    '2026-10-10': 'lesson_20261010',
    '2026-10-17': 'lesson_20261017',
    '2026-10-18': 'lesson_20261018',
    '2026-10-31': 'lesson_20261031',
  };

  function parseCodeToGregorian(fileCode: string): string | null {
    const m = fileCode.match(/^(\d{2})(\d{2})(\d{2})/);
    if (!m) return null;
    const beShort = parseInt(m[1], 10);
    const gregYear = 2500 + beShort - 543;
    return `${gregYear}-${m[2]}-${m[3]}`;
  }

  function parseChineseDate(title: string): string | null {
    const m = title.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!m) return null;
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }

  function extractSessionSuffix(str: string): 'A' | 'B' | '' {
    const upper = str.toUpperCase();
    if (/[0-9]A(?:\.|$|[^A-Z])|上午|早|ช่วงเช้า|晨/.test(upper)) return 'A';
    if (/[0-9]B(?:\.|$|[^A-Z])|下午|ช่วงบ่าย/.test(upper)) return 'B';
    return '';
  }

  function decodeHtmlEntities(str: string): string {
    return str
      .replace(/&#038;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8211;|&ndash;/g, '–')
      .replace(/&#8217;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  async function fetchDhammaComThaiList(beYear: '2569' | '2568') {
    const targetPage = `https://www.dhamma.com/download/${beYear}/`;
    const upstream = await fetch(targetPage, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TaixueCatalogBot/1.0)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) {
      throw new Error(`读取 dhamma.com/${beYear} 目录失败 (${upstream.status})`);
    }
    const html = await upstream.text();
    const items: any[] = [];
    const seen = new Set<string>();
    const rowRegex = /<tr><td>([^<]+)<\/td>[\s\S]*?filename=([^&'"]+\.mp3)/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRegex.exec(html)) !== null) {
      const rawTitle = decodeHtmlEntities(m[1]);
      const fileName = decodeHtmlEntities(m[2]);
      const fileCode = fileName.replace(/\.mp3$/i, '');
      const mp3Url = `https://media.dhamma.com/pramote/cd/${beYear}/${fileName}`;
      if (seen.has(mp3Url)) continue;
      seen.add(mp3Url);

      const gregorianDate = parseCodeToGregorian(fileCode) || undefined;
      items.push({
        id: `th_${beYear}_${fileCode}`,
        fileCode,
        fileName,
        title: rawTitle,
        gregorianDate,
        buddhistYear: beYear,
        mp3Url,
        trackType: 'thai_audio',
        sourceDomain: `media.dhamma.com/pramote/cd/${beYear}`,
        matchedLessonId: gregorianDate ? LESSON_DATE_MAP[gregorianDate] : undefined,
      });
    }
    return { officialPageUrl: targetPage, items };
  }

  async function fetchDhammaCnLuangporList(gregYear: '2026' | '2025') {
    const templateTitle = `模板:${gregYear}年度日常开示-隆波帕默尊者`;
    const tplRes = await fetch(
      `https://www.dhamma.cn/api.php?action=parse&page=${encodeURIComponent(templateTitle)}&prop=wikitext&format=json&formatversion=2`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (!tplRes.ok) {
      throw new Error(`读取 dhamma.cn 模板失败 (${tplRes.status})`);
    }
    const tplJson: any = await tplRes.json();
    const wt: string = tplJson?.parse?.wikitext || '';
    const pageTitles = Array.from(
      new Set(
        [...wt.matchAll(/\[\[([^\]]+)\]\]/g)]
          .map((match) => match[1].split('|')[0].trim())
          .filter(Boolean)
      )
    );

    const pageToMp3File = new Map<string, string>();
    for (let i = 0; i < pageTitles.length; i += 45) {
      const chunk = pageTitles.slice(i, i + 45).join('|');
      const imgRes = await fetch('https://www.dhamma.cn/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'query',
          titles: chunk,
          prop: 'images',
          imlimit: '500',
          format: 'json',
          formatversion: '2',
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!imgRes.ok) continue;
      const imgJson: any = await imgRes.json();
      for (const p of imgJson?.query?.pages || []) {
        const mp3Img = (p.images || []).find((img: any) => /\.mp3$/i.test(img.title));
        if (mp3Img) {
          pageToMp3File.set(p.title, mp3Img.title);
        }
      }
    }

    const fileTitles = [...new Set([...pageToMp3File.values()])];
    const fileInfoMap = new Map<string, { url: string; size?: number }>();
    for (let i = 0; i < fileTitles.length; i += 45) {
      const infoRes = await fetch('https://www.dhamma.cn/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'query',
          titles: fileTitles.slice(i, i + 45).join('|'),
          prop: 'imageinfo',
          iiprop: 'url|size',
          format: 'json',
          formatversion: '2',
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!infoRes.ok) continue;
      const infoJson: any = await infoRes.json();
      for (const fp of infoJson?.query?.pages || []) {
        const info = fp.imageinfo?.[0];
        if (info?.url) {
          fileInfoMap.set(fp.title, { url: info.url, size: info.size });
        }
      }
    }

    const items = pageTitles.map((title) => {
      const fileTitle = pageToMp3File.get(title);
      const fileInfo = fileTitle ? fileInfoMap.get(fileTitle) : undefined;
      const gregorianDate = parseChineseDate(title) || undefined;
      const codeMatch = title.match(/^(D\d+\.\d+)/i);
      const fileCode = codeMatch ? codeMatch[1] : gregorianDate || 'dhamma.cn';
      const fileName = fileTitle
        ? fileTitle.replace(/^(?:文件|檔案|File):/i, '')
        : `${title}.mp3`;
      return {
        id: `cn_${gregYear}_${fileCode}_${gregorianDate || title.slice(0, 12)}`,
        fileCode,
        fileName,
        title,
        gregorianDate,
        mp3Url: fileInfo?.url || '',
        sizeBytes: fileInfo?.size,
        wikiUrl: `https://www.dhamma.cn/luangpor/${encodeURIComponent(title)}`,
        trackType: 'chinese_audio',
        sourceDomain: 'media.dhamma.cn',
        matchedLessonId: gregorianDate ? LESSON_DATE_MAP[gregorianDate] : undefined,
      };
    }).filter((item) => Boolean(item.mp3Url));

    return {
      officialPageUrl: `https://www.dhamma.cn/luangpor/${encodeURIComponent(`${gregYear}年度日常开示`)}`,
      items,
    };
  }

  // 第一步主接口：隆波帕默尊者开示 · 按日期将 dhamma.com (泰语) 与 dhamma.cn (中文) 精准合并对齐
  app.get('/api/luangpor-catalog', async (req: Request, res: Response) => {
    const year = req.query.year === '2025' ? '2025' : '2026';
    const beYear = year === '2025' ? '2568' : '2569';
    const cacheKey = `luangpor_paired_${year}`;
    const forceRefresh = req.query.refresh === '1';

    const cached = catalogCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < 15 * 60 * 1000) {
      res.json(cached.payload);
      return;
    }

    try {
      const [thaiRes, cnRes] = await Promise.allSettled([
        fetchDhammaComThaiList(beYear),
        fetchDhammaCnLuangporList(year),
      ]);

      const thaiItems = thaiRes.status === 'fulfilled' ? thaiRes.value.items : [];
      const cnItems = cnRes.status === 'fulfilled' ? cnRes.value.items : [];

      const byKey = new Map<string, any>();
      const ensureSlot = (dateStr: string, suffix: 'A' | 'B' | '') => {
        const key = `${dateStr}${suffix}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: `lp_${key}`,
            date: dateStr,
            sessionSuffix: suffix,
            matchedLessonId: LESSON_DATE_MAP[dateStr],
            thai: null,
            chinese: null,
          });
        }
        return byKey.get(key);
      };

      for (const t of thaiItems) {
        if (!t.gregorianDate) continue;
        const suffix = extractSessionSuffix(t.fileCode);
        const slot = ensureSlot(t.gregorianDate, suffix);
        if (!slot.thai) slot.thai = t;
      }

      for (const c of cnItems) {
        if (!c.gregorianDate) continue;
        const suffix = extractSessionSuffix(c.title);
        let slot = byKey.get(`${c.gregorianDate}${suffix}`);
        if (!slot && suffix === '' && byKey.has(`${c.gregorianDate}A`)) {
          slot = byKey.get(`${c.gregorianDate}A`);
        }
        if (!slot) {
          slot = ensureSlot(c.gregorianDate, suffix);
        }
        if (!slot.chinese) slot.chinese = c;
      }

      const items = [...byKey.values()].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.sessionSuffix.localeCompare(a.sessionSuffix);
      });

      const payload = {
        year,
        buddhistYear: beYear,
        fetchedAt: Date.now(),
        total: items.length,
        thaiCount: thaiItems.length,
        chineseCount: cnItems.length,
        thaiCatalogUrl: `https://www.dhamma.com/download/${beYear}/`,
        chineseCatalogUrl: `https://www.dhamma.cn/luangpor/${encodeURIComponent(`${year}年度日常开示`)}`,
        items,
      };
      catalogCache.set(cacheKey, { fetchedAt: Date.now(), payload });
      res.json(payload);
    } catch (err: any) {
      console.error('Failed to build Luangpor paired catalog:', err);
      res.status(502).json({ error: err?.message || '同步隆波帕默尊者开示目录失败' });
    }
  });

  // 官方 YouTube 双频道按日对照目录（@luangpupramote/streams 泰语原声 + @JieTuoYuan/streams 中文同传）
  const THAI_MONTH_MAP: Record<string, number> = {
    'ม.ค.': 1, 'มกราคม': 1,
    'ก.พ.': 2, 'กุมภาพันธ์': 2,
    'มี.ค.': 3, 'มีนาคม': 3,
    'เม.ย.': 4, 'เมษายน': 4,
    'พ.ค.': 5, 'พฤษภาคม': 5,
    'มิ.ย.': 6, 'มิถุนายน': 6,
    'ก.ค.': 7, 'กรกฎาคม': 7,
    'ส.ค.': 8, 'สิงหาคม': 8,
    'ก.ย.': 9, 'กันยายน': 9,
    'ต.ค.': 10, 'ตุลาคม': 10,
    'พ.ย.': 11, 'พฤศจิกายน': 11,
    'ธ.ค.': 12, 'ธันวาคม': 12,
  };

  function parseThaiBeTitleDate(title: string): string | null {
    const m = title.match(
      /(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{4})/
    );
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = THAI_MONTH_MAP[m[2]];
    const beYear = parseInt(m[3], 10);
    if (!month || !day || !beYear) return null;
    const gregYear = beYear > 2400 ? beYear - 543 : beYear;
    return `${gregYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function extractJsonAfterMarker(html: string, marker: string): any | null {
    const idx = html.indexOf(marker);
    if (idx === -1) return null;
    const startBrace = html.indexOf('{', idx + marker.length);
    if (startBrace === -1) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = startBrace; i < html.length; i++) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try {
              return JSON.parse(html.slice(startBrace, i + 1));
            } catch {
              return null;
            }
          }
        }
      }
    }
    return null;
  }

  interface RawYouTubeVideoEntry {
    videoId: string;
    title: string;
    url: string;
    publishedText?: string;
    durationText?: string;
    thumbnailUrl?: string;
    isLiveNow?: boolean;
    isUpcoming?: boolean;
    sourceTab?: 'videos' | 'streams';
  }

  function collectYouTubeVideosFromNode(
    root: any,
    videos: RawYouTubeVideoEntry[],
    seenIds: Set<string>,
    continuations: string[],
    sourceTab: 'videos' | 'streams'
  ) {
    if (!root || typeof root !== 'object') return;
    if (Array.isArray(root)) {
      for (const item of root) {
        collectYouTubeVideosFromNode(item, videos, seenIds, continuations, sourceTab);
      }
      return;
    }

    if (root.lockupViewModel && typeof root.lockupViewModel === 'object') {
      const lv = root.lockupViewModel;
      const videoId: string | undefined = lv.contentId;
      const title: string = lv.metadata?.lockupMetadataViewModel?.title?.content || '';
      if (videoId && /^[\w-]{11}$/.test(videoId) && title && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const rows = lv.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
        const parts: string[] = [];
        for (const row of rows) {
          for (const part of row?.metadataParts || []) {
            const txt = part?.text?.content;
            if (txt) parts.push(txt);
          }
        }
        const publishedText = parts.find((p) => /ago|Streamed|直播|前|day|week|month|year/i.test(p)) || parts[parts.length - 1];
        const isWatchingLive = parts.some((p) => /watching|正在观看|กำลังดู/i.test(p));
        const isUpcomingMeta = parts.some((p) => /Scheduled|Premieres|首播|即将开始/i.test(p));

        let durationText = '';
        let hasLiveBadge = false;
        const overlays = lv.contentImage?.thumbnailViewModel?.overlays || [];
        for (const ov of overlays) {
          const badges = ov?.thumbnailOverlayBadgeViewModel?.thumbnailBadges || [];
          for (const b of badges) {
            const vm = b?.thumbnailBadgeViewModel;
            const txt = vm?.text || '';
            const style = String(vm?.badgeStyle || '');
            if (style.includes('LIVE') || /^(LIVE|直播)$/i.test(txt.trim())) {
              hasLiveBadge = true;
            }
            if (txt && /\d:\d/.test(txt)) {
              durationText = txt;
            }
          }
        }
        videos.push({
          videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedText,
          durationText: durationText || undefined,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          isLiveNow: Boolean(hasLiveBadge || isWatchingLive),
          isUpcoming: Boolean(isUpcomingMeta),
          sourceTab,
        });
      }
    }

    if (root.videoRenderer && typeof root.videoRenderer === 'object') {
      const vr = root.videoRenderer;
      const videoId: string | undefined = vr.videoId;
      const title: string =
        vr.title?.runs?.map((r: any) => r.text).join('') ||
        vr.title?.simpleText ||
        '';
      if (videoId && /^[\w-]{11}$/.test(videoId) && title && !seenIds.has(videoId)) {
        seenIds.add(videoId);
        const publishedText =
          vr.publishedTimeText?.simpleText ||
          vr.publishedTimeText?.runs?.map((r: any) => r.text).join('') ||
          undefined;
        const durationText =
          vr.lengthText?.simpleText ||
          vr.lengthText?.runs?.map((r: any) => r.text).join('') ||
          undefined;
        const hasLiveOverlay = Array.isArray(vr.thumbnailOverlays) && vr.thumbnailOverlays.some(
          (o: any) => o?.thumbnailOverlayTimeStatusRenderer?.style === 'LIVE'
        );
        const hasLiveBadge = Array.isArray(vr.badges) && vr.badges.some(
          (b: any) => /LIVE|直播/i.test(String(b?.metadataBadgeRenderer?.label || b?.metadataBadgeRenderer?.style || ''))
        );
        const isUpcoming = Boolean(vr.upcomingEventData);
        videos.push({
          videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedText,
          durationText,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          isLiveNow: Boolean(hasLiveOverlay || hasLiveBadge),
          isUpcoming,
          sourceTab,
        });
      }
    }

    if (root.continuationCommand?.token && typeof root.continuationCommand.token === 'string') {
      continuations.push(root.continuationCommand.token);
    }

    for (const val of Object.values(root)) {
      if (val && typeof val === 'object') {
        collectYouTubeVideosFromNode(val, videos, seenIds, continuations, sourceTab);
      }
    }
  }

  async function fetchYouTubeChannelStreams(
    channelUrl: string,
    maxExtraPages: number,
    sourceTab: 'videos' | 'streams'
  ): Promise<RawYouTubeVideoEntry[]> {
    const fetchInitialChannelPage = async () => {
      let lastErr: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 250 * attempt));
        }
        try {
          const res = await fetch(channelUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(14000),
          });
          if (!res.ok) throw new Error(`读取频道 ${channelUrl} 失败 (${res.status})`);
          const html = await res.text();
          const initialData = extractJsonAfterMarker(html, 'var ytInitialData =');
          if (!initialData) {
            throw new Error(`解析频道 ${channelUrl} 初始数据为空`);
          }
          const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
          return { initialData, apiKey: apiKeyMatch?.[1] };
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error(`读取频道 ${channelUrl} 失败`);
    };

    const { initialData, apiKey } = await fetchInitialChannelPage();

    const videos: RawYouTubeVideoEntry[] = [];
    const seenIds = new Set<string>();
    const continuations: string[] = [];

    collectYouTubeVideosFromNode(initialData, videos, seenIds, continuations, sourceTab);

    let nextToken = continuations[0];
    for (let page = 0; page < maxExtraPages && nextToken && apiKey; page++) {
      try {
        const contRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20250101.00.00',
                hl: 'en',
                gl: 'US',
              },
            },
            continuation: nextToken,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!contRes.ok) break;
        const contJson = await contRes.json();
        const nextTokens: string[] = [];
        collectYouTubeVideosFromNode(contJson, videos, seenIds, nextTokens, sourceTab);
        nextToken = nextTokens[0];
      } catch {
        break;
      }
    }

    return videos;
  }

  async function detectThaiCaptionViaOfficialApi(
    videoId: string,
    apiKey: string
  ): Promise<'manual' | 'asr' | 'none' | 'client_check_needed'> {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return 'client_check_needed';
      const json: any = await res.json();
      const tracks: any[] = json?.items || [];
      const thaiTracks = tracks.filter((t) => {
        const lang = String(t?.snippet?.language || '').toLowerCase();
        return lang === 'th' || lang.startsWith('th-');
      });
      if (thaiTracks.length === 0) return 'none';
      const hasManual = thaiTracks.some((t) => String(t?.snippet?.trackKind || '').toLowerCase() !== 'asr');
      return hasManual ? 'manual' : 'asr';
    } catch {
      return 'client_check_needed';
    }
  }

  function classifyYouTubeStreamState(
    v: RawYouTubeVideoEntry,
    isRerun: boolean
  ): 'live_now' | 'upcoming' | 'formal_vod' | 'stream_archive' | 'rerun' {
    if (isRerun) return 'rerun';
    const hasStreamedPast = Boolean(v.publishedText && /Streamed|ago|前/i.test(v.publishedText));
    const looksActiveLiveFromTitle = /^(LIVE|ไลฟ์สด)\b/i.test(v.title.trim()) && !v.durationText && !hasStreamedPast;
    if (v.isLiveNow || looksActiveLiveFromTitle) return 'live_now';
    if (v.isUpcoming) return 'upcoming';
    if (v.sourceTab === 'videos') return 'formal_vod';
    return 'stream_archive';
  }

  function scoreThaiCandidate(v: any): number {
    if (v.isRerun) return 10;
    if (v.streamState === 'formal_vod') return 90;
    if (v.streamState === 'stream_archive') return 80;
    if (v.streamState === 'live_now') return 70;
    return 40;
  }

  function scoreChineseCandidate(v: any): number {
    const hasMandarinTag = /(中文同聲翻譯|中文同声翻译|國語|国语|普通話|普通话)/.test(v.title);
    if (v.isRerun) return 10;
    const base =
      v.streamState === 'formal_vod'
        ? 90
        : v.streamState === 'stream_archive'
        ? 85
        : v.streamState === 'live_now'
        ? 75
        : 45;
    return base + (hasMandarinTag ? 8 : 0);
  }

  // 解析任意 YouTube 链接（包括 @handle/live 直播入口与 /live/ID），还原为唯一永久 11 位 Video ID
  app.get('/api/youtube-resolve', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: '缺少 url 参数' });
      return;
    }

    const directMatch = rawUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    const directId = directMatch?.[1] || (/^[\w-]{11}$/.test(rawUrl) ? rawUrl : '');

    if (directId) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${directId}`)}&format=json`,
          { signal: AbortSignal.timeout(6000) }
        );
        const oembedJson: any = oembedRes.ok ? await oembedRes.json() : null;
        res.json({
          videoId: directId,
          canonicalUrl: `https://www.youtube.com/watch?v=${directId}`,
          title: oembedJson?.title || '',
          channelName: oembedJson?.author_name || '',
          wasLiveAlias: false,
        });
        return;
      } catch {
        res.json({
          videoId: directId,
          canonicalUrl: `https://www.youtube.com/watch?v=${directId}`,
          title: '',
          channelName: '',
          wasLiveAlias: false,
        });
        return;
      }
    }

    // 处理 https://www.youtube.com/@JieTuoYuan/live 等动态直播入口
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: '无效的 YouTube 链接' });
      return;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(hostname)) {
      res.status(400).json({ error: '仅支持 youtube.com 官方网址解析' });
      return;
    }

    try {
      // @JieTuoYuan 同时开启英语/粤语/普通话三路直播，/live 易误命中英语路，优先从 /streams 精确筛选普通话直播
      if (/jietuoyuan/i.test(parsed.pathname) && /\/live\/?$/i.test(parsed.pathname)) {
        const streams = await fetchYouTubeChannelStreams('https://www.youtube.com/@JieTuoYuan/streams', 0, 'streams');
        const mandarin = streams.find((v) => {
          const isLp = /隆波帕默/.test(v.title);
          const isMandarin = /(中文同聲翻譯|中文同声翻译|中文|普通話|普通话|國語|国语)/.test(v.title);
          const isExcluded = /(Cantonese|粵語|粤语|English|Rerun|重播)/i.test(v.title);
          return isLp && isMandarin && !isExcluded;
        });
        if (mandarin) {
          const streamState = classifyYouTubeStreamState(mandarin, /rerun|重播/i.test(mandarin.title));
          res.json({
            videoId: mandarin.videoId,
            canonicalUrl: `https://www.youtube.com/watch?v=${mandarin.videoId}`,
            title: mandarin.title,
            streamState,
            isLiveNow: streamState === 'live_now',
            wasLiveAlias: true,
          });
          return;
        }
      }

      const pageRes = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!pageRes.ok) {
        res.status(502).json({ error: `读取 YouTube 直播入口失败 (${pageRes.status})` });
        return;
      }
      const html = await pageRes.text();
      const resolvedId = html.match(/"videoId":"([\w-]{11})"/)?.[1] || '';
      const isLiveNow = /"isLiveNow":true/.test(html);
      const titleMatch = html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/\s*-\s*YouTube\s*$/, '') || '';
      if (!resolvedId) {
        res.status(404).json({ error: '该频道当前未开播，请改用上方日期目录或具体的 watch?v= 视频链接' });
        return;
      }
      res.json({
        videoId: resolvedId,
        canonicalUrl: `https://www.youtube.com/watch?v=${resolvedId}`,
        title: titleMatch,
        isLiveNow,
        wasLiveAlias: true,
      });
    } catch (err: any) {
      res.status(502).json({ error: err?.message || '解析 YouTube 直播链接失败' });
    }
  });

  app.get('/api/luangpor-youtube-catalog', async (req: Request, res: Response) => {
    const cacheKey = 'luangpor_youtube_paired_v2';
    const forceRefresh = req.query.refresh === '1';

    const cached = catalogCache.get(cacheKey);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < 20 * 60 * 1000) {
      res.json(cached.payload);
      return;
    }

    const thaiVideosTabUrl = 'https://www.youtube.com/@luangpupramote/videos';
    const thaiChannelUrl = 'https://www.youtube.com/@luangpupramote/streams';
    const chineseChannelUrl = 'https://www.youtube.com/@JieTuoYuan/streams';
    const chineseVideosTabUrl = 'https://www.youtube.com/@JieTuoYuan/videos';

    try {
      const [thaiVideosTabSettled, thaiStreamsSettled, cnStreamsSettled, cnVideosTabSettled] = await Promise.allSettled([
        fetchYouTubeChannelStreams(thaiVideosTabUrl, 1, 'videos'),
        fetchYouTubeChannelStreams(thaiChannelUrl, 1, 'streams'),
        fetchYouTubeChannelStreams(chineseChannelUrl, 2, 'streams'),
        fetchYouTubeChannelStreams(chineseVideosTabUrl, 1, 'videos'),
      ]);

      if (thaiVideosTabSettled.status === 'rejected') {
        console.warn('[YouTube Catalog] @luangpupramote/videos fetch rejected:', thaiVideosTabSettled.reason);
      }
      if (thaiStreamsSettled.status === 'rejected') {
        console.warn('[YouTube Catalog] @luangpupramote/streams fetch rejected:', thaiStreamsSettled.reason);
      }
      if (cnStreamsSettled.status === 'rejected') {
        console.warn('[YouTube Catalog] @JieTuoYuan/streams fetch rejected:', cnStreamsSettled.reason);
      }
      if (cnVideosTabSettled.status === 'rejected') {
        console.warn('[YouTube Catalog] @JieTuoYuan/videos fetch rejected:', cnVideosTabSettled.reason);
      }

      const rawThaiEdited = (thaiVideosTabSettled.status === 'fulfilled' ? thaiVideosTabSettled.value : [])
        .filter((v) => /หลวงปู่ปราโมทย์/.test(v.title));
      let rawThaiStreams = thaiStreamsSettled.status === 'fulfilled' ? thaiStreamsSettled.value : [];
      if (rawThaiStreams.length === 0) {
        try {
          rawThaiStreams = await fetchYouTubeChannelStreams(thaiChannelUrl, 1, 'streams');
        } catch (retryErr) {
          console.warn('[YouTube Catalog] fallback retry @luangpupramote/streams failed:', retryErr);
        }
      }

      let rawCnStreams = cnStreamsSettled.status === 'fulfilled' ? cnStreamsSettled.value : [];
      if (rawCnStreams.length === 0) {
        try {
          rawCnStreams = await fetchYouTubeChannelStreams(chineseChannelUrl, 2, 'streams');
        } catch (retryErr) {
          console.warn('[YouTube Catalog] fallback retry @JieTuoYuan/streams failed:', retryErr);
        }
      }

      const rawCn = [
        ...rawCnStreams,
        ...(cnVideosTabSettled.status === 'fulfilled' ? cnVideosTabSettled.value : []),
      ];

      const thaiVideosMap = new Map<string, any>();
      for (const v of [...rawThaiEdited, ...rawThaiStreams]) {
        if (thaiVideosMap.has(v.videoId)) continue;
        const gregorianDate = parseThaiBeTitleDate(v.title) || undefined;
        if (!gregorianDate) continue;
        const isRerun = /รีรัน|rerun/i.test(v.title);
        const streamState = classifyYouTubeStreamState(v, isRerun);
        thaiVideosMap.set(v.videoId, {
          ...v,
          gregorianDate,
          isRerun,
          streamState,
        });
      }
      const thaiVideos = [...thaiVideosMap.values()];

      const cnVideosMap = new Map<string, any>();
      for (const v of rawCn) {
        if (cnVideosMap.has(v.videoId)) continue;
        const isLuangpor = /隆波帕默/.test(v.title);
        const isMandarinOrLive = /(中文同聲翻譯|中文同声翻译|中文|普通話|普通话|國語|国语|網路直播|网络直播|法谈开示|法談開示)/.test(v.title);
        const isExcluded = /(Cantonese|粵語|粤语|English|Rerun|重播)/i.test(v.title);
        if (!isLuangpor || !isMandarinOrLive || isExcluded) continue;
        const gregorianDate = parseChineseDate(v.title) || undefined;
        if (!gregorianDate) continue;
        const isRerun = /rerun|重播/i.test(v.title);
        const streamState = classifyYouTubeStreamState(v, isRerun);
        cnVideosMap.set(v.videoId, {
          ...v,
          gregorianDate,
          isRerun,
          streamState,
        });
      }
      const cnVideos = [...cnVideosMap.values()];

      const slotMap = new Map<string, {
        id: string;
        date: string;
        isRerun: boolean;
        matchedLessonId?: string;
        thaiCaptionStatus: 'manual' | 'asr' | 'none' | 'client_check_needed';
        thai: any;
        chinese: any;
        thaiCandidates: any[];
        chineseCandidates: any[];
      }>();

      const ensureDateSlot = (dateKey: string) => {
        let slot = slotMap.get(dateKey);
        if (!slot) {
          slot = {
            id: `yt_${dateKey}`,
            date: dateKey,
            isRerun: false,
            matchedLessonId: LESSON_DATE_MAP[dateKey],
            thaiCaptionStatus: 'client_check_needed',
            thai: null,
            chinese: null,
            thaiCandidates: [],
            chineseCandidates: [],
          };
          slotMap.set(dateKey, slot);
        }
        return slot;
      };

      for (const t of thaiVideos) {
        if (!t.gregorianDate) continue;
        const slot = ensureDateSlot(t.gregorianDate);
        if (!slot.thaiCandidates.some((x) => x.videoId === t.videoId)) {
          slot.thaiCandidates.push(t);
        }
      }

      for (const c of cnVideos) {
        if (!c.gregorianDate) continue;
        const slot = ensureDateSlot(c.gregorianDate);
        if (!slot.chineseCandidates.some((x) => x.videoId === c.videoId)) {
          slot.chineseCandidates.push(c);
        }
      }

      for (const slot of slotMap.values()) {
        slot.thaiCandidates.sort((a, b) => scoreThaiCandidate(b) - scoreThaiCandidate(a));
        slot.chineseCandidates.sort((a, b) => scoreChineseCandidate(b) - scoreChineseCandidate(a));
        slot.thai = slot.thaiCandidates[0] || null;
        slot.chinese = slot.chineseCandidates[0] || null;
        slot.isRerun = Boolean(slot.thai?.isRerun && !slot.thaiCandidates.some((x) => !x.isRerun));
      }

      const items = [...slotMap.values()].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return Number(a.isRerun) - Number(b.isRerun);
      });

      const ytApiKey = process.env.YOUTUBE_API_KEY?.trim() || '';
      if (ytApiKey) {
        const targets = items.filter((item) => item.thai?.videoId).slice(0, 20);
        await Promise.allSettled(
          targets.map(async (item) => {
            item.thaiCaptionStatus = await detectThaiCaptionViaOfficialApi(item.thai.videoId, ytApiKey);
          })
        );
      }

      const pairedCount = items.filter((i) => i.thai && i.chinese).length;
      const payload = {
        fetchedAt: Date.now(),
        total: items.length,
        pairedCount,
        thaiCount: thaiVideos.length,
        chineseCount: cnVideos.length,
        captionApiEnabled: Boolean(ytApiKey),
        thaiChannelUrl,
        chineseChannelUrl,
        items,
      };

      // 仅当泰/中双频道的 videos 与 streams 主源均有有效抓回数据时才写入 20 分钟缓存，避免单边超时污染缓存
      if (thaiVideos.length > 0 && cnVideos.length > 0 && rawThaiStreams.length > 0 && rawCnStreams.length > 0) {
        catalogCache.set(cacheKey, { fetchedAt: Date.now(), payload });
      }
      res.json(payload);
    } catch (err: any) {
      console.error('Failed to build Luangpor YouTube paired catalog:', err);
      res.status(502).json({ error: err?.message || '读取 YouTube 官方双频道目录失败' });
    }
  });

  app.get('/api/dhamma-catalog', async (req: Request, res: Response) => {
    const source = typeof req.query.source === 'string' ? req.query.source.trim() : '2569';
    if (!['2569', '2568', 'cn2026', 'cn2025'].includes(source)) {
      res.status(400).json({ error: '仅支持目录参数: 2569, 2568, cn2026, cn2025' });
      return;
    }

    const forceRefresh = req.query.refresh === '1';
    const cached = catalogCache.get(source);
    if (!forceRefresh && cached && Date.now() - cached.fetchedAt < 15 * 60 * 1000) {
      res.json(cached.payload);
      return;
    }

    try {
      const result =
        source === 'cn2026' || source === 'cn2025'
          ? await fetchDhammaCnLuangporList(source === 'cn2026' ? '2026' : '2025')
          : await fetchDhammaComThaiList(source as '2569' | '2568');

      const payload = {
        source,
        officialPageUrl: result.officialPageUrl,
        fetchedAt: Date.now(),
        total: result.items.length,
        items: result.items,
      };
      catalogCache.set(source, { fetchedAt: Date.now(), payload });
      res.json(payload);
    } catch (err: any) {
      console.error('Failed to fetch dhamma catalog:', err);
      res.status(502).json({ error: err?.message || '读取官网录音目录超时或失败' });
    }
  });

  // 官方公开纯音频透传代理（支持 4MB 分片 Range 流式播放，兼容 Cloud Run 32MB 单次响应限制）
  const PROXY_MAX_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB per chunk

  app.get('/api/audio-proxy', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const downloadName = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';

    const targetUrl = isSafePublicAudioUrl(rawUrl);
    if (!targetUrl) {
      res.status(400).json({
        error: '仅支持官方公开音频域名白名单内的 MP3/M4A/AAC/OGG 音频网址（不支持视频链接）',
      });
      return;
    }

    const upstreamAbort = new AbortController();
    req.on('close', () => {
      if (!res.writableEnded) {
        upstreamAbort.abort();
      }
    });

    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (compatible; TaixueOfflineAudio/1.0)',
        'Accept': 'audio/*,application/octet-stream,*/*',
      };

      const rawRange = typeof req.headers.range === 'string' ? req.headers.range.trim() : '';
      if (rawRange) {
        const rangeMatch = rawRange.match(/^bytes=(\d+)-(\d*)$/i);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const requestedEnd = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : null;
          const cappedEnd =
            requestedEnd !== null && requestedEnd >= start && requestedEnd - start + 1 <= PROXY_MAX_CHUNK_BYTES
              ? requestedEnd
              : start + PROXY_MAX_CHUNK_BYTES - 1;
          forwardHeaders['Range'] = `bytes=${start}-${cappedEnd}`;
        } else {
          forwardHeaders['Range'] = rawRange;
        }
      }

      const upstreamMethod = req.method === 'HEAD' ? 'HEAD' : 'GET';
      let upstream = await fetch(targetUrl.toString(), {
        method: upstreamMethod,
        headers: forwardHeaders,
        redirect: 'follow',
        signal: upstreamAbort.signal,
      });

      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).json({
          error: `源站返回状态 ${upstream.status}，请确认音频链接是否有效`,
        });
        return;
      }

      const contentType = (upstream.headers.get('content-type') || 'audio/mpeg').toLowerCase();
      // 严守纯音频安全策略：如果源站返回 HTML（如 Cloudflare 验证页）或视频流，直接拒绝
      if (contentType.includes('text/html') || contentType.startsWith('video/')) {
        res.status(415).json({
          error: `目标链接返回内容类型为 ${contentType}，非纯音频流，已拦截`,
        });
        return;
      }

      // 若未带 Range 头且音频大于 20MB（非强制文件下载），转为首段 4MB 206 流，避免超出 Cloud Run 32MB 响应上限
      const rawContentLen = Number(upstream.headers.get('content-length') || 0);
      if (!rawRange && upstreamMethod === 'GET' && !downloadName && rawContentLen > 20 * 1024 * 1024) {
        try {
          await upstream.body?.cancel();
        } catch {}
        upstream = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: {
            ...forwardHeaders,
            Range: `bytes=0-${PROXY_MAX_CHUNK_BYTES - 1}`,
          },
          redirect: 'follow',
          signal: upstreamAbort.signal,
        });
      }

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType.includes('audio') ? contentType : 'audio/mpeg');
      res.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (downloadName) {
        const safeName = downloadName.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
      }

      if (upstreamMethod === 'HEAD' || !upstream.body) {
        res.end();
        return;
      }

      const nodeStream = Readable.fromWeb(upstream.body as any);
      nodeStream.on('error', (err: any) => {
        if (err?.name === 'AbortError' || upstreamAbort.signal.aborted) return;
        console.error('Audio proxy stream error:', err);
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      if (err?.name === 'AbortError' || upstreamAbort.signal.aborted) return;
      console.error('Audio proxy fetch error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: err?.message || '拉取公开音频失败' });
      }
    }
  });

  // 泰语词句语音合成代理（当浏览器本地无 th-TH 语音包或网络受限时提供稳定泰语 MP3 朗读）
  app.get('/api/thai-tts', async (req: Request, res: Response) => {
    const rawText = typeof req.query.text === 'string' ? req.query.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: '缺少朗读文本' });
      return;
    }

    // 拆分为 <= 150 字符片段，避免长泰文句子触发 400
    const safeText = rawText.slice(0, 600);
    const words = safeText.split(/\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const w of words) {
      if ((current + ' ' + w).trim().length <= 150) {
        current = (current + ' ' + w).trim();
      } else {
        if (current) chunks.push(current);
        if (w.length <= 150) {
          current = w;
        } else {
          for (let i = 0; i < w.length; i += 150) {
            chunks.push(w.slice(i, i + 150));
          }
          current = '';
        }
      }
    }
    if (current) chunks.push(current);

    try {
      const buffers: Buffer[] = [];
      for (const chunk of chunks) {
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const upstream = await fetch(ttsUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TaixueThaiTTS/1.0)',
            Referer: 'https://translate.google.com/',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!upstream.ok) {
          throw new Error(`TTS upstream status ${upstream.status}`);
        }
        const ab = await upstream.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }

      const merged = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(merged.length));
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(merged);
    } catch (err: any) {
      console.error('Thai TTS proxy error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: err?.message || '泰语语音合成失败' });
      }
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Taixue server running on http://0.0.0.0:${PORT} (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
