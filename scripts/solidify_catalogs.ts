import fs from 'fs';
import path from 'path';

export async function solidifyCatalogs(existingData?: {
  ytCatalog?: any;
  audio2026?: any;
  audio2025?: any;
}): Promise<{
  success: boolean;
  ytCount: number;
  audio2026Count: number;
  audio2025Count: number;
  solidifiedAt: string;
  ytCatalog?: any;
  audio2026?: any;
}> {
  console.log('[Solidify] 开始固化官方双频道视频目录与音频目录...');

  // 1. 获取 YouTube 双频道目录
  let ytCatalog: any = existingData?.ytCatalog || null;
  if (!ytCatalog) {
    try {
      const res = await fetch('http://localhost:3000/api/luangpor-youtube-catalog', {
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        ytCatalog = await res.json();
        console.log(`[Solidify] YouTube 目录获取成功: 总计 ${ytCatalog.total} 场, 双语配对 ${ytCatalog.pairedCount} 场`);
      } else {
        console.warn(`[Solidify] YouTube 目录请求返回 ${res.status}`);
      }
    } catch (err: any) {
      console.warn('[Solidify] 无法从本地服务获取 YouTube 目录，使用现有缓存或重试:', err?.message);
    }
  }

  // 2. 获取 2026 音频目录
  let audio2026: any = existingData?.audio2026 || null;
  if (!audio2026) {
    try {
      const res = await fetch('http://localhost:3000/api/luangpor-catalog?year=2026', {
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        audio2026 = await res.json();
        console.log(`[Solidify] 2026 音频目录获取成功: 总计 ${audio2026.total} 场`);
      }
    } catch (err: any) {
      console.warn('[Solidify] 2026 音频获取失败:', err?.message);
    }
  }

  // 3. 获取 2025 音频目录
  let audio2025: any = existingData?.audio2025 || null;
  if (!audio2025) {
    try {
      const res = await fetch('http://localhost:3000/api/luangpor-catalog?year=2025', {
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        audio2025 = await res.json();
        console.log(`[Solidify] 2025 音频目录获取成功: 总计 ${audio2025.total} 场`);
      }
    } catch (err: any) {
      console.warn('[Solidify] 2025 音频获取失败:', err?.message);
    }
  }

  const rootDir = process.cwd();
  const srcDataDir = path.join(rootDir, 'src', 'data');
  const publicDataDir = path.join(rootDir, 'public', 'data');

  if (!fs.existsSync(srcDataDir)) fs.mkdirSync(srcDataDir, { recursive: true });
  if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });

  const nowIso = new Date().toISOString();

  // 写入 YouTube 固化数据
  if (ytCatalog && ytCatalog.items && ytCatalog.items.length > 0) {
    const ytPayload = {
      ...ytCatalog,
      isSolidified: true,
      solidifiedAt: nowIso,
    };

    const tsContent = `// 由主理人同步固化的 YouTube 官方双频道视频目录 (静态部署零网络依赖，永无 JSON 报错)
// 固化时间: ${nowIso}
import { YouTubePairedCatalogResponse } from '../types';

export const SOLIDIFIED_YOUTUBE_CATALOG: YouTubePairedCatalogResponse = ${JSON.stringify(ytPayload, null, 2)};
`;
    fs.writeFileSync(path.join(srcDataDir, 'solidifiedYouTubeCatalog.ts'), tsContent, 'utf-8');
    fs.writeFileSync(path.join(publicDataDir, 'luangpor-youtube-catalog.json'), JSON.stringify(ytPayload, null, 2), 'utf-8');
    console.log(`[Solidify] 成功固化 YouTube 目录 -> src/data/solidifiedYouTubeCatalog.ts (${ytCatalog.items.length} 场)`);
  }

  // 写入 2026 音频固化数据
  if (audio2026 && audio2026.items && audio2026.items.length > 0) {
    const a26Payload = {
      ...audio2026,
      isSolidified: true,
      solidifiedAt: nowIso,
    };
    const tsContent26 = `// 固化 2026 (佛历 2569) 官方开示音频目录
import { LuangporPairedCatalogResponse } from '../services/offlineAudioStorage';

export const SOLIDIFIED_AUDIO_CATALOG_2026: LuangporPairedCatalogResponse = ${JSON.stringify(a26Payload, null, 2)};
`;
    fs.writeFileSync(path.join(srcDataDir, 'solidifiedAudioCatalog2026.ts'), tsContent26, 'utf-8');
    fs.writeFileSync(path.join(publicDataDir, 'luangpor-catalog-2026.json'), JSON.stringify(a26Payload, null, 2), 'utf-8');
    console.log(`[Solidify] 成功固化 2026 音频目录 -> src/data/solidifiedAudioCatalog2026.ts (${audio2026.items.length} 场)`);
  }

  // 写入 2025 音频固化数据
  if (audio2025 && audio2025.items && audio2025.items.length > 0) {
    const a25Payload = {
      ...audio2025,
      isSolidified: true,
      solidifiedAt: nowIso,
    };
    const tsContent25 = `// 固化 2025 (佛历 2568) 官方开示音频目录
import { LuangporPairedCatalogResponse } from '../services/offlineAudioStorage';

export const SOLIDIFIED_AUDIO_CATALOG_2025: LuangporPairedCatalogResponse = ${JSON.stringify(a25Payload, null, 2)};
`;
    fs.writeFileSync(path.join(srcDataDir, 'solidifiedAudioCatalog2025.ts'), tsContent25, 'utf-8');
    fs.writeFileSync(path.join(publicDataDir, 'luangpor-catalog-2025.json'), JSON.stringify(a25Payload, null, 2), 'utf-8');
    console.log(`[Solidify] 成功固化 2025 音频目录 -> src/data/solidifiedAudioCatalog2025.ts (${audio2025.items.length} 场)`);
  }

  console.log('[Solidify] 固化完成！所有目录数据已安全嵌入代码库与静态资源目录。');
  return {
    success: true,
    ytCount: ytCatalog?.items?.length || 0,
    audio2026Count: audio2026?.items?.length || 0,
    audio2025Count: audio2025?.items?.length || 0,
    solidifiedAt: nowIso,
    ytCatalog,
    audio2026,
  };
}

if (process.argv[1] && process.argv[1].endsWith('solidify_catalogs.ts')) {
  solidifyCatalogs().catch((err) => {
    console.error('[Solidify Error]', err);
    process.exit(1);
  });
}
