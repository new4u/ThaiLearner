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

  // 官方公开纯音频透传代理（解决浏览器跨域限制，支持流式播放与缓存入库）
  app.get('/api/audio-proxy', async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const downloadName = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';

    const targetUrl = isSafePublicAudioUrl(rawUrl);
    if (!targetUrl) {
      res.status(400).json({
        error: '仅支持官方公开音频域名白名单内的 MP3/M4A/AAC/OGG 音频直链（不支持视频链接）',
      });
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (compatible; TaixueOfflineAudio/1.0)',
        'Accept': 'audio/*,application/octet-stream,*/*',
      };
      if (typeof req.headers.range === 'string') {
        forwardHeaders['Range'] = req.headers.range;
      }

      const upstream = await fetch(targetUrl.toString(), {
        headers: forwardHeaders,
        redirect: 'follow',
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

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType.includes('audio') ? contentType : 'audio/mpeg');
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const acceptRanges = upstream.headers.get('accept-ranges');
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      if (downloadName) {
        const safeName = downloadName.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`);
      }

      if (!upstream.body) {
        res.end();
        return;
      }

      const nodeStream = Readable.fromWeb(upstream.body as any);
      nodeStream.on('error', (err) => {
        console.error('Audio proxy stream error:', err);
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      nodeStream.pipe(res);
    } catch (err: any) {
      console.error('Audio proxy fetch error:', err);
      if (!res.headersSent) {
        res.status(502).json({ error: err?.message || '拉取公开音频失败' });
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
