import React, { useState, useEffect } from 'react';
import { 
  Search, X, Sparkles, Play, Headphones, Video, 
  RotateCw, Layers, Wand2, Info, CheckCircle2, 
  Link2, RefreshCw, Clock, ExternalLink
} from 'lucide-react';
import { 
  searchDhammaDiscourses, 
  sniffPageMedia, 
  DhammaMediaItem, 
  DhammaSearchResult 
} from '../utils/dhammaLookup';

interface DhammaExplorerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentThaiVideoUrl?: string;
  currentThaiTitle?: string;
  onSelectForDualPlayback: (config: {
    thaiVideoUrl: string;
    chineseVideoUrl: string;
    title: string;
  }) => void;
  onSelectForStudio?: (prefill: {
    title: string;
    thaiVideoUrl: string;
    chineseVideoUrl: string;
    snippet?: string;
    pageId?: number;
  }) => void;
}

const PRESET_TOPIC_TAGS = [
  '2026年10月',
  '四念处',
  '知者心',
  '从奢摩他到毗婆舍那',
  '日常生活',
  '阿姜给',
  '身念处',
  '正定与邪定',
];

export const DhammaExplorerDrawer: React.FC<DhammaExplorerDrawerProps> = ({
  isOpen,
  onClose,
  currentThaiVideoUrl = 'https://www.youtube.com/watch?v=F4-tJNYDpss',
  currentThaiTitle = '泰文原音母带',
  onSelectForDualPlayback,
  onSelectForStudio,
}) => {
  const [keyword, setKeyword] = useState('2026年10月');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DhammaSearchResult | null>(null);
  const [activeMediaSnippet, setActiveMediaSnippet] = useState<{
    type: 'audio' | 'video';
    url: string;
    title: string;
  } | null>(null);
  const [sniffingMap, setSniffingMap] = useState<Record<number, boolean>>({});
  const [snippetMediaError, setSnippetMediaError] = useState<boolean>(false);

  useEffect(() => {
    setSnippetMediaError(false);
  }, [activeMediaSnippet?.url]);

  // 泰文主控轨自定义输入（默认为当前播放器的泰文主视频）
  const [customThaiUrl, setCustomThaiUrl] = useState(currentThaiVideoUrl);
  const [isEditingThaiUrl, setIsEditingThaiUrl] = useState(false);

  useEffect(() => {
    setCustomThaiUrl(currentThaiVideoUrl);
  }, [currentThaiVideoUrl]);

  // 初始自动载入推荐开示 (2026年10月完整开示)
  useEffect(() => {
    if (isOpen && !searchResult) {
      handleSearch(keyword);
    }
  }, [isOpen]);

  const handleSearch = async (kw: string, force: boolean = false) => {
    setIsSearching(true);
    try {
      const res = await searchDhammaDiscourses(kw, force);
      setSearchResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSniff = async (item: DhammaMediaItem) => {
    if (item.mp4Url && item.mp3Url) return;
    setSniffingMap((prev) => ({ ...prev, [item.pageId]: true }));
    try {
      const media = await sniffPageMedia(item.pageId, item.title);
      if (searchResult) {
        setSearchResult({
          ...searchResult,
          items: searchResult.items.map((it) =>
            it.pageId === item.pageId
              ? {
                  ...it,
                  mp4Url: media.mp4Url || it.mp4Url,
                  mp3Url: media.mp3Url || it.mp3Url,
                }
              : it
          ),
        });
      }
    } finally {
      setSniffingMap((prev) => ({ ...prev, [item.pageId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* 遮罩背景 */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* 滑出抽屉面板 */}
      <div className="relative w-full max-w-2xl bg-[#faf7f2] h-full shadow-2xl flex flex-col z-10 border-l border-[#d9c8a9]">
        {/* 抽屉头部 */}
        <div className="p-4 sm:p-5 border-b border-[#e6d3ac] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Search className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  dhamma.cn 中文开示档案检索
                </h2>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                  官方中文库
                </span>
              </div>
              <p className="text-xs text-stone-500">
                借鉴 satipatthana.life 架构：7天持久缓存与 MP4/MP3 真实直链嗅探
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 关键规则警示与双轨配对说明条 */}
        <div className="p-3 bg-amber-50/90 border-b border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-amber-900 font-bold">双视频源配对说明：</strong>
              <span>
                <code className="text-amber-800 bg-amber-100/70 px-1 py-0.5 rounded font-mono">dhamma.cn</code> 是纯正的
                <strong>中文开示与同传译制档案库</strong>（提供官方中文 MP4 视频、MP3 音频与文稿），绝不含泰文原版。
                双播时以<strong>泰文原音视频为主控轨</strong>，以在此检索到的<strong>官方中文译制媒体为随动轨</strong>。
              </span>
            </div>
          </div>

          {/* 泰文原版主控轨配对器 */}
          <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[11px] font-bold text-stone-700 shrink-0 flex items-center gap-1">
                🇹🇭 主控轨 (泰文原音):
              </span>
              {!isEditingThaiUrl ? (
                <span className="text-xs font-mono text-stone-600 truncate max-w-xs" title={customThaiUrl}>
                  {customThaiUrl}
                </span>
              ) : (
                <input
                  type="text"
                  value={customThaiUrl}
                  onChange={(e) => setCustomThaiUrl(e.target.value)}
                  placeholder="输入泰文 YouTube 链接或 ID"
                  className="text-xs px-2 py-1 rounded border border-amber-300 font-mono w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              {!isEditingThaiUrl ? (
                <button
                  onClick={() => setIsEditingThaiUrl(true)}
                  className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition cursor-pointer"
                >
                  更换泰文源
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingThaiUrl(false)}
                  className="text-[11px] px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition cursor-pointer"
                >
                  确认
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 快捷搜索法题 Tags */}
        <div className="px-4 py-2.5 bg-[#f5ede0]/60 border-b border-[#e6d3ac]/70">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-bold text-stone-700">精选法题与归档：</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TOPIC_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setKeyword(tag);
                  handleSearch(tag);
                }}
                className={`text-xs px-2.5 py-1 rounded-full transition cursor-pointer font-medium ${
                  keyword === tag
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white text-stone-700 border border-[#e6d3ac] hover:bg-amber-50 hover:border-amber-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索输入栏 */}
        <div className="p-4 bg-white border-b border-[#e6d3ac]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(keyword);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索经论法题、日期（例如：2026年10月、四念处、心、觉知）"
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-stone-800"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {isSearching ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>检索中...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>搜索开示</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSearch(keyword, true)}
              title="穿透本地与内存缓存，强制刷新"
              className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:text-amber-800 hover:bg-stone-50 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </form>

          {/* 状态指示条 */}
          {searchResult && (
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  找到 <strong>{searchResult.totalHits}</strong> 篇开示
                  {searchResult.sourceNotice && (
                    <span className="text-stone-400 ml-1">({searchResult.sourceNotice})</span>
                  )}
                </span>
              </span>

              {searchResult.ttlRemaining && (
                <span className="flex items-center gap-1 text-amber-700 font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Clock className="w-3 h-3" />
                  <span>缓存: {searchResult.ttlRemaining}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 媒体试看/试听浮层条 */}
        {activeMediaSnippet && (
          <div className="p-3 bg-stone-900 text-white flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                {activeMediaSnippet.type === 'video' ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Headphones className="w-4 h-4" />
                )}
              </span>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate">{activeMediaSnippet.title}</p>
                <p className="text-[10px] font-mono text-stone-400 truncate">{activeMediaSnippet.url}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {snippetMediaError ? (
                <div className="flex items-center gap-1.5 text-xs text-amber-300">
                  <span className="text-[11px] text-amber-400">受源站策略限制无法内嵌:</span>
                  <a
                    href={activeMediaSnippet.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    在新标签页播放
                  </a>
                </div>
              ) : activeMediaSnippet.type === 'video' ? (
                <video
                  key={activeMediaSnippet.url}
                  src={encodeURI(activeMediaSnippet.url)}
                  controls
                  autoPlay
                  playsInline
                  referrerPolicy="no-referrer"
                  onError={() => setSnippetMediaError(true)}
                  className="h-10 rounded border border-stone-700 bg-black"
                />
              ) : (
                <audio
                  key={activeMediaSnippet.url}
                  src={encodeURI(activeMediaSnippet.url)}
                  controls
                  autoPlay
                  referrerPolicy="no-referrer"
                  onError={() => setSnippetMediaError(true)}
                  className="h-8 max-w-[200px]"
                />
              )}
              <button
                onClick={() => {
                  setActiveMediaSnippet(null);
                  setSnippetMediaError(false);
                }}
                className="p-1 text-stone-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 搜索结果列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isSearching && (
            <div className="py-20 text-center space-y-3">
              <RotateCw className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
              <p className="text-xs text-stone-500 font-medium">
                正在通过 satipatthana.life 缓存及 MediaWiki API 检索开示...
              </p>
            </div>
          )}

          {!isSearching && searchResult && searchResult.items.length === 0 && (
            <div className="py-16 text-center text-stone-500 text-xs">
              未搜到相关法谈，请尝试更换关键词（例如：四念处、知者、2026年10月、身念处）。
            </div>
          )}

          {!isSearching &&
            searchResult &&
            searchResult.items.map((item, idx) => {
              const hasMedia = !!(item.mp4Url || item.mp3Url);
              const isSniffing = !!sniffingMap[item.pageId];

              return (
                <div
                  key={item.pageId || idx}
                  className="p-4 rounded-2xl bg-white border border-[#e6d3ac] hover:border-amber-400 shadow-xs hover:shadow-md transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                          🇨🇳 中文译制
                        </span>
                        {item.mp4Url && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">
                            MP4 视频
                          </span>
                        )}
                        {item.mp3Url && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded">
                            MP3 音频
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    {item.timestamp && (
                      <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                        {item.timestamp.slice(0, 10)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed bg-stone-50/80 p-2 rounded-xl border border-stone-100">
                    {item.snippet}
                  </p>

                  {/* 媒体嗅探与操作栏 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      {/* 嗅探直链按钮 */}
                      {!hasMedia && (
                        <button
                          onClick={() => handleSniff(item)}
                          disabled={isSniffing}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          {isSniffing ? (
                            <RotateCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{isSniffing ? '正在提取直链...' : '✨ 嗅探 MP4/MP3 直链'}</span>
                        </button>
                      )}

                      {/* 视频试看 */}
                      {item.mp4Url && (
                        <button
                          onClick={() => {
                            setActiveMediaSnippet({
                              type: 'video',
                              url: item.mp4Url!,
                              title: item.title,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Video className="w-3 h-3" />
                          <span>▶ 试看中文MP4</span>
                        </button>
                      )}

                      {/* 音频试听 */}
                      {item.mp3Url && (
                        <button
                          onClick={() => {
                            setActiveMediaSnippet({
                              type: 'audio',
                              url: item.mp3Url!,
                              title: item.title,
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Headphones className="w-3 h-3" />
                          <span>🎧 试听中文MP3</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* 一键导入课件制作 */}
                      {onSelectForStudio && (
                        <button
                          onClick={() => {
                            const cnMedia = item.mp4Url || item.mp3Url || '';
                            onSelectForStudio({
                              title: item.title,
                              thaiVideoUrl: customThaiUrl,
                              chineseVideoUrl: cnMedia,
                              snippet: item.snippet,
                              pageId: item.pageId,
                            });
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="将本篇中文直链与泰文主控视频带入课件工坊制作"
                        >
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>🛠️ 导入制作</span>
                        </button>
                      )}

                      {/* 配对载入双播播放器 */}
                      <button
                        onClick={() => {
                          const cnMedia = item.mp4Url || item.mp3Url || '';
                          onSelectForDualPlayback({
                            thaiVideoUrl: customThaiUrl,
                            chineseVideoUrl: cnMedia,
                            title: item.title,
                          });
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
                        title="将此篇中文媒体装载到随动轨，与泰文原音视频同步双播"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>⚡ 配对载入双播</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* 抽屉底栏 */}
        <div className="p-3 bg-white border-t border-[#e6d3ac] flex items-center justify-between text-xs text-stone-500">
          <span>提示：泰文主控轨与中文随动轨自动双向对齐，支持毫秒级时间轴偏移调节</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
