import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CuratedLesson,
  YouTubePairedCatalogResponse,
  YouTubePairedTalkItem,
} from '../types';
import {
  OFFICIAL_DIRECTORY_LINKS,
  LuangporPairedCatalogResponse,
  LuangporPairedItem,
  fetchLuangporPairedCatalog,
} from '../services/offlineAudioStorage';
import { OFFICIAL_THAI_STREAMS_URL } from '../data/officialChannels';
import {
  Headphones,
  Video,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Upload,
  Link2,
  Play,
  ExternalLink,
  FolderOpen,
  Mic,
  Library,
  FileText,
} from 'lucide-react';

interface UnifiedMediaSelectorBarProps {
  mode: 'audio' | 'video';
  onSwitchMode: (mode: 'audio' | 'video') => void;
  lessons: CuratedLesson[];
  currentLessonId: string;
  currentDate?: string;
  isUnmatchedCustomMedia?: boolean;
  unmatchedMediaLabel?: string;
  onSelectLesson: (lesson: CuratedLesson) => void;

  // 官方音频目录（若父级未传，组件也可自行拉取共享）
  pairedAudioCatalog?: LuangporPairedCatalogResponse | null;
  isAudioCatalogLoading?: boolean;
  audioCatalogError?: string | null;
  audioCatalogYear?: '2026' | '2025';
  onChangeAudioCatalogYear?: (year: '2026' | '2025') => void;
  onRefreshAudioCatalog?: () => void;

  // 选源动作
  onSelectAudioTrack: (params: {
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    dateLabel?: string;
    trackType: 'thai_audio' | 'chinese_audio';
  }) => void;
  onCacheAudioTrack?: (params: {
    key: string;
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    trackType: 'thai_audio' | 'chinese_audio';
  }) => void;
  cachingKey?: string | null;
  cachingProgress?: string;
  onSelectYouTubePair: (item: YouTubePairedTalkItem) => void;
  onLoadCustomMediaPair: (params: {
    thaiUrl: string;
    chineseUrl?: string;
    title?: string;
    mediaType: 'audio' | 'video';
  }) => void;
  onPickLocalAudioFile?: (trackType: 'thai_audio' | 'chinese_audio') => void;
  onOpenOfflineModal: () => void;
  hasOfflineActive?: boolean;
  onOpenSubtitleImporter?: () => void;

  // 外部触发展开（例如点击播放器卡片上的「换音频 / 换链接」）
  externalExpandSignal?: {
    tab?: 'catalog' | 'link';
    sourceKind?: 'audio' | 'video';
    focusTrack?: 'thai_audio' | 'chinese_audio';
    nonce: number;
  } | null;
}

export const UnifiedMediaSelectorBar: React.FC<UnifiedMediaSelectorBarProps> = ({
  mode,
  onSwitchMode,
  lessons,
  currentLessonId,
  currentDate,
  isUnmatchedCustomMedia = false,
  unmatchedMediaLabel,
  onSelectLesson,
  pairedAudioCatalog: propAudioCatalog,
  isAudioCatalogLoading: propAudioLoading,
  audioCatalogError: propAudioError,
  audioCatalogYear: propAudioYear,
  onChangeAudioCatalogYear,
  onRefreshAudioCatalog,
  onSelectAudioTrack,
  onCacheAudioTrack,
  cachingKey,
  cachingProgress,
  onSelectYouTubePair,
  onLoadCustomMediaPair,
  onPickLocalAudioFile,
  onOpenOfflineModal,
  hasOfflineActive = false,
  onOpenSubtitleImporter,
  externalExpandSignal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelTab, setPanelTab] = useState<'catalog' | 'link'>('catalog');
  const [catalogSourceKind, setCatalogSourceKind] = useState<'audio' | 'video'>(mode);

  // 本组件内音频目录兜底状态（当在视频页直接查看音频目录时自动拉取）
  const [localAudioYear, setLocalAudioYear] = useState<'2026' | '2025'>('2026');
  const [localAudioCatalog, setLocalAudioCatalog] = useState<LuangporPairedCatalogResponse | null>(null);
  const [localAudioLoading, setLocalAudioLoading] = useState(false);
  const [localAudioError, setLocalAudioError] = useState<string | null>(null);
  const [audioQuery, setAudioQuery] = useState('');

  // 本组件内 YouTube 双频道目录状态
  const [ytCatalog, setYtCatalog] = useState<YouTubePairedCatalogResponse | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytQuery, setYtQuery] = useState('');
  const [ytOnlyPaired, setYtOnlyPaired] = useState(false);

  // 贴链接 / 本地导入输入状态
  const [linkMediaType, setLinkMediaType] = useState<'audio' | 'video'>(mode);
  const [thaiInputUrl, setThaiInputUrl] = useState('');
  const [chineseInputUrl, setChineseInputUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [localTrackFocus, setLocalTrackFocus] = useState<'thai_audio' | 'chinese_audio'>('thai_audio');
  const [isResolvingLinks, setIsResolvingLinks] = useState(false);
  const [linkResolveHint, setLinkResolveHint] = useState<string | null>(null);

  const activeAudioYear = propAudioYear ?? localAudioYear;
  const effectiveAudioCatalog = propAudioCatalog ?? localAudioCatalog;
  const effectiveAudioLoading = propAudioLoading ?? localAudioLoading;
  const effectiveAudioError = propAudioError ?? localAudioError;

  const loadLocalAudioCatalog = useCallback(async (year: '2026' | '2025', refresh = false) => {
    setLocalAudioLoading(true);
    setLocalAudioError(null);
    try {
      const data = await fetchLuangporPairedCatalog(year, refresh);
      setLocalAudioCatalog(data);
    } catch (err: any) {
      setLocalAudioError(err?.message || '同步官方音频目录失败');
    } finally {
      setLocalAudioLoading(false);
    }
  }, []);

  const loadYouTubeCatalog = useCallback(async (refresh = false) => {
    setYtLoading(true);
    setYtError(null);
    try {
      const res = await fetch(`/api/luangpor-youtube-catalog${refresh ? '?refresh=1' : ''}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `请求失败 (${res.status})`);
      }
      const data: YouTubePairedCatalogResponse = await res.json();
      setYtCatalog(data);
    } catch (err: any) {
      setYtError(err?.message || '无法拉取 YouTube 官方双频道目录，请稍后重试');
    } finally {
      setYtLoading(false);
    }
  }, []);

  // 响应外部按钮展开信号（如「换音频」「换视频」）
  useEffect(() => {
    if (!externalExpandSignal?.nonce) return;
    setIsExpanded(true);
    if (externalExpandSignal.tab) setPanelTab(externalExpandSignal.tab);
    if (externalExpandSignal.sourceKind) {
      setCatalogSourceKind(externalExpandSignal.sourceKind);
      setLinkMediaType(externalExpandSignal.sourceKind);
    }
    if (externalExpandSignal.focusTrack) {
      setLocalTrackFocus(externalExpandSignal.focusTrack);
    }
  }, [externalExpandSignal]);

  // 当展开且切换到对应目录标签时按需懒加载
  useEffect(() => {
    if (!isExpanded || panelTab !== 'catalog') return;
    if (catalogSourceKind === 'audio' && !effectiveAudioCatalog && !effectiveAudioLoading) {
      if (onRefreshAudioCatalog) {
        onRefreshAudioCatalog();
      } else {
        loadLocalAudioCatalog(activeAudioYear, false);
      }
    }
    if (catalogSourceKind === 'video' && !ytCatalog && !ytLoading) {
      loadYouTubeCatalog(false);
    }
  }, [
    isExpanded,
    panelTab,
    catalogSourceKind,
    effectiveAudioCatalog,
    effectiveAudioLoading,
    onRefreshAudioCatalog,
    loadLocalAudioCatalog,
    activeAudioYear,
    ytCatalog,
    ytLoading,
    loadYouTubeCatalog,
  ]);

  const filteredAudioItems = useMemo<LuangporPairedItem[]>(() => {
    const list = effectiveAudioCatalog?.items || [];
    if (!audioQuery.trim()) return list;
    const q = audioQuery.toLowerCase().trim();
    return list.filter(
      (row) =>
        row.date.includes(q) ||
        (row.thai && (row.thai.fileCode.toLowerCase().includes(q) || row.thai.title.toLowerCase().includes(q))) ||
        (row.chinese && (row.chinese.fileCode.toLowerCase().includes(q) || row.chinese.title.toLowerCase().includes(q)))
    );
  }, [effectiveAudioCatalog, audioQuery]);

  const filteredYouTubeItems = useMemo<YouTubePairedTalkItem[]>(() => {
    const q = ytQuery.trim().toLowerCase();
    return (ytCatalog?.items || []).filter((item) => {
      if (ytOnlyPaired && !(item.thai && item.chinese)) return false;
      if (!q) return true;
      return (
        item.date.toLowerCase().includes(q) ||
        (item.thai?.title || '').toLowerCase().includes(q) ||
        (item.chinese?.title || '').toLowerCase().includes(q)
      );
    });
  }, [ytCatalog, ytQuery, ytOnlyPaired]);

  const handleLessonSelectChange = (val: string) => {
    if (val === '__unmatched__') return;
    const target = lessons.find((l) => l.id === val);
    if (target) {
      onSelectLesson(target);
    }
  };

  const resolveLiveYoutubeUrlIfNeeded = async (rawUrl: string): Promise<{ url: string; note?: string }> => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return { url: '' };
    // 若已是 11 位标准 ID 或 watch?v= / youtu.be/ / live/ID，直接保留
    if (/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))[\w-]{11}|^[\w-]{11}$/.test(trimmed)) {
      return { url: trimmed };
    }
    // 识别频道动态直播入口（如 https://www.youtube.com/@JieTuoYuan/live），解析出当场唯一永久 ID
    if (/youtube\.com\/.+/i.test(trimmed)) {
      try {
        const res = await fetch(`/api/youtube-resolve?url=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (res.ok && json?.canonicalUrl) {
          return {
            url: json.canonicalUrl,
            note: json.wasLiveAlias ? `已将动态直播入口固定为唯一 ID (${json.videoId})` : undefined,
          };
        }
      } catch {}
    }
    return { url: trimmed };
  };

  const handleSubmitCustomLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thaiInputUrl.trim() && !chineseInputUrl.trim()) return;
    setLinkResolveHint(null);

    let finalThai = thaiInputUrl.trim();
    let finalChinese = chineseInputUrl.trim();

    if (linkMediaType === 'video') {
      setIsResolvingLinks(true);
      try {
        const [rThai, rCn] = await Promise.all([
          resolveLiveYoutubeUrlIfNeeded(finalThai),
          resolveLiveYoutubeUrlIfNeeded(finalChinese),
        ]);
        finalThai = rThai.url;
        finalChinese = rCn.url;
        const notes = [rThai.note, rCn.note].filter(Boolean);
        if (notes.length > 0) {
          setLinkResolveHint(notes.join('；'));
        }
      } finally {
        setIsResolvingLinks(false);
      }
    }

    onLoadCustomMediaPair({
      thaiUrl: finalThai,
      chineseUrl: finalChinese || undefined,
      title: customTitle.trim() || undefined,
      mediaType: linkMediaType,
    });
    setIsExpanded(false);
  };

  const renderStreamStateLabel = (state?: string) => {
    switch (state) {
      case 'live_now':
        return '🔴 直播中';
      case 'formal_vod':
        return '🎬 正式版';
      case 'stream_archive':
        return '📺 直播回放';
      case 'rerun':
        return '🔁 重播';
      case 'upcoming':
        return '⏳ 待开播';
      default:
        return '';
    }
  };

  return (
    <section
      aria-label="选课与音视频源切换"
      className="bg-white rounded-2xl border border-[#e6d3ac]/90 shadow-xs overflow-hidden"
    >
      {/* 主页极简一行控制条 */}
      <div className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* 左：直接选择已有课件（不用弹层） */}
        <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
          <Library className="w-4 h-4 text-[#b58940] shrink-0" />
          <label htmlFor="unified-lesson-select" className="text-xs font-bold text-[#5b3f1e] whitespace-nowrap hidden md:inline">
            当前开示
          </label>
          <select
            id="unified-lesson-select"
            value={isUnmatchedCustomMedia ? '__unmatched__' : currentLessonId}
            onChange={(e) => handleLessonSelectChange(e.target.value)}
            className="min-h-[38px] bg-[#faf7f2] border border-[#d9c8a9] text-[#2d2a26] rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#b58940] min-w-[190px] max-w-full sm:max-w-[320px] truncate cursor-pointer"
          >
            {isUnmatchedCustomMedia && (
              <option value="__unmatched__">
                🔒 未绑定字幕：{unmatchedMediaLabel || '自定义泰语媒体'}
              </option>
            )}
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.date} · {l.chineseTitle} ({l.totalSentences}句)
              </option>
            ))}
          </select>
        </div>

        {/* 中：音频 / 视频 载体直切（紧扣同一套课件进度） */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSwitchMode('audio')}
            className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'audio'
                ? 'bg-[#2d2a26] text-amber-200 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>音频学习</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('video')}
            className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 ${
              mode === 'video'
                ? 'bg-[#2d2a26] text-amber-200 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>视频学习</span>
          </button>
        </div>

        {/* 右：原地展开选源抽屉 + 离线录音库 + 字幕导入 */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-tour-id={mode === 'audio' ? 'tour-ml-audio-player' : 'tour-yt-media-selector'}
            onClick={() => {
              setCatalogSourceKind(mode);
              setLinkMediaType(mode);
              setIsExpanded((v) => !v);
            }}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 border ${
              isExpanded
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-[#faf7f2] hover:bg-amber-50 text-[#5b3f1e] border-[#d9c8a9]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>选音/视频 · 贴链接</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onOpenOfflineModal}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 border ${
              hasOfflineActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
            }`}
            title="管理本机离线缓存音频与跟读录音"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{hasOfflineActive ? '离线已挂载' : '离线与录音'}</span>
          </button>

          {onOpenSubtitleImporter && (
            <button
              type="button"
              onClick={onOpenSubtitleImporter}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-[#5b3f1e] border border-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              title="为当前音/视频导入或校对字幕"
            >
              <FileText className="w-3.5 h-3.5 text-[#b58940]" />
              <span>导入字幕</span>
            </button>
          )}
        </div>
      </div>

      {/* 原地展开面板：合并「按日挑官方音频 / YouTube 视频」与「贴链接 / 本地文件」 */}
      {isExpanded && (
        <div className="border-t border-[#e6d3ac]/70 bg-[#faf7f2]/70 p-3 sm:p-4 space-y-3">
          {/* 二级功能切换：按日目录 vs 贴链接/本地 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#e6d3ac]/80">
              <button
                type="button"
                onClick={() => setPanelTab('catalog')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  panelTab === 'catalog'
                    ? 'bg-[#2d2a26] text-amber-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                按日挑官方源
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('link')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  panelTab === 'link'
                    ? 'bg-[#2d2a26] text-amber-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                贴链接 / 导本地文件
              </button>
            </div>

            {panelTab === 'catalog' && (
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#e6d3ac]/80">
                <button
                  type="button"
                  onClick={() => setCatalogSourceKind('audio')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                    catalogSourceKind === 'audio'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>官方音频 (MP3)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogSourceKind('video')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                    catalogSourceKind === 'video'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>官方视频 (YouTube)</span>
                </button>
              </div>
            )}
          </div>

          {panelTab === 'catalog' ? (
            catalogSourceKind === 'audio' ? (
              <div className="space-y-2.5">
                {/* 音频目录检索行 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['2026', '2025'] as const).map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          if (onChangeAudioCatalogYear) onChangeAudioCatalogYear(y);
                          else {
                            setLocalAudioYear(y);
                            loadLocalAudioCatalog(y, false);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                          activeAudioYear === y
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        {y}年
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={audioQuery}
                        onChange={(e) => setAudioQuery(e.target.value)}
                        placeholder="按日期 (2026-10-17) 或编号 (691017) 检索..."
                        className="w-full min-h-[36px] pl-8 pr-3 py-1 rounded-xl bg-white border border-stone-300 text-xs text-[#2d2a26] focus:outline-none focus:border-[#b58940]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={effectiveAudioLoading}
                      onClick={() => {
                        if (onRefreshAudioCatalog) onRefreshAudioCatalog();
                        else loadLocalAudioCatalog(activeAudioYear, true);
                      }}
                      className="min-h-[36px] px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 flex items-center gap-1 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      title="刷新官方音频目录"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${effectiveAudioLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">刷新</span>
                    </button>
                  </div>
                </div>

                {effectiveAudioError ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {effectiveAudioError}
                  </div>
                ) : effectiveAudioLoading && !effectiveAudioCatalog ? (
                  <div className="py-6 text-center text-xs text-[#7a6f5f]">
                    正在同步 dhamma.com 与 dhamma.cn 官方音频目录...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredAudioItems.slice(0, 40).map((row) => {
                      const isSameDate = currentDate && row.date === currentDate;
                      return (
                        <div
                          key={row.id}
                          className={`p-2.5 rounded-xl border bg-white space-y-2 text-xs ${
                            isSameDate ? 'border-amber-400 ring-1 ring-amber-300/60' : 'border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="font-bold text-[#2d2a26] tabular-nums">
                              {row.date}
                              {row.sessionSuffix ? ` (${row.sessionSuffix})` : ''}
                              {isSameDate ? ' · 当前场次' : ''}
                            </span>
                            <span className="text-stone-400">
                              {row.thai ? `泰:${row.thai.fileCode}` : '泰待传'} · {row.chinese ? `中:${row.chinese.fileCode}` : '中待传'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            {row.thai ? (
                              <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-[#faf7f2] border border-stone-200/80">
                                <span className="text-[11px] font-semibold text-[#2d2a26] truncate">
                                  🇹🇭 {row.thai.fileCode}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectAudioTrack({
                                        mp3Url: row.thai!.mp3Url,
                                        fileName: row.thai!.fileName,
                                        fileCode: row.thai!.fileCode,
                                        dateLabel: row.date,
                                        trackType: 'thai_audio',
                                      });
                                      setIsExpanded(false);
                                    }}
                                    className="px-2 py-1 rounded bg-[#2d2a26] hover:bg-stone-800 text-amber-200 text-[11px] font-bold cursor-pointer"
                                  >
                                    选用
                                  </button>
                                  {onCacheAudioTrack && (
                                    <button
                                      type="button"
                                      disabled={Boolean(cachingKey)}
                                      onClick={() =>
                                        onCacheAudioTrack({
                                          key: row.thai!.id,
                                          mp3Url: row.thai!.mp3Url,
                                          fileName: row.thai!.fileName,
                                          fileCode: row.thai!.fileCode,
                                          trackType: 'thai_audio',
                                        })
                                      }
                                      className="px-1.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold cursor-pointer"
                                    >
                                      {cachingKey === row.thai.id ? cachingProgress || '...' : '存'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-stone-50 text-[11px] text-stone-400">
                                🇹🇭 泰语待传
                              </div>
                            )}

                            {row.chinese ? (
                              <div className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-[#faf7f2] border border-stone-200/80">
                                <span className="text-[11px] font-semibold text-[#2d2a26] truncate">
                                  🇨🇳 {row.chinese.fileCode}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectAudioTrack({
                                        mp3Url: row.chinese!.mp3Url,
                                        fileName: row.chinese!.fileName,
                                        fileCode: row.chinese!.fileCode,
                                        dateLabel: row.date,
                                        trackType: 'chinese_audio',
                                      });
                                      setIsExpanded(false);
                                    }}
                                    className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    选用
                                  </button>
                                  {onCacheAudioTrack && (
                                    <button
                                      type="button"
                                      disabled={Boolean(cachingKey)}
                                      onClick={() =>
                                        onCacheAudioTrack({
                                          key: row.chinese!.id,
                                          mp3Url: row.chinese!.mp3Url,
                                          fileName: row.chinese!.fileName,
                                          fileCode: row.chinese!.fileCode,
                                          trackType: 'chinese_audio',
                                        })
                                      }
                                      className="px-1.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold cursor-pointer"
                                    >
                                      {cachingKey === row.chinese.id ? cachingProgress || '...' : '存'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-stone-50 text-[11px] text-stone-400">
                                🇨🇳 中文待录
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#7a6f5f]">
                  <span>音频源：dhamma.com 与 dhamma.cn 公开归档（选定泰语后自动匹配对应字幕）</span>
                  <div className="flex flex-wrap gap-2">
                    {OFFICIAL_DIRECTORY_LINKS.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#5b3f1e] hover:text-[#b58940] underline underline-offset-2"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 视频目录：YouTube @luangpupramote + @JieTuoYuan 按日配对 */
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={ytQuery}
                        onChange={(e) => setYtQuery(e.target.value)}
                        placeholder="按日期 (如 2026-11) 或开示标题搜索..."
                        className="w-full min-h-[36px] pl-8 pr-3 py-1 rounded-xl bg-white border border-stone-300 text-xs text-[#2d2a26] focus:outline-none focus:border-[#b58940]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setYtOnlyPaired((v) => !v)}
                      className={`min-h-[36px] px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                        ytOnlyPaired
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {ytOnlyPaired ? '✓ 仅双语齐全' : '全部场次'}
                    </button>
                    <button
                      type="button"
                      disabled={ytLoading}
                      onClick={() => loadYouTubeCatalog(true)}
                      className="min-h-[36px] px-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${ytLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">刷新</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-[#7a6f5f]">
                    <a href={OFFICIAL_THAI_STREAMS_URL} target="_blank" rel="noreferrer" className="underline hover:text-[#b58940]">
                      @luangpupramote
                    </a>
                    {' + '}
                    <a href="https://www.youtube.com/@JieTuoYuan/streams" target="_blank" rel="noreferrer" className="underline hover:text-[#b58940]">
                      @JieTuoYuan
                    </a>
                  </div>
                </div>

                {ytLoading && !ytCatalog ? (
                  <div className="py-6 text-center text-xs text-[#7a6f5f]">
                    正在同步 YouTube 官方双频道近期开示并按日配对...
                  </div>
                ) : ytError ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
                    <span>{ytError}</span>
                    <button
                      type="button"
                      onClick={() => loadYouTubeCatalog(true)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer shrink-0"
                    >
                      重试
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredYouTubeItems.slice(0, 40).map((item) => {
                      const matchedLesson = item.matchedLessonId
                        ? lessons.find((l) => l.id === item.matchedLessonId)
                        : undefined;
                      const isSameDate = currentDate && item.date === currentDate;
                      const thaiBadge = renderStreamStateLabel(item.thai?.streamState);
                      const cnBadge = renderStreamStateLabel(item.chinese?.streamState);
                      const extraThai = item.thaiCandidates && item.thaiCandidates.length > 1 ? item.thaiCandidates : null;
                      const extraCn = item.chineseCandidates && item.chineseCandidates.length > 1 ? item.chineseCandidates : null;
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border bg-white space-y-1.5 text-xs ${
                            isSameDate ? 'border-amber-400 ring-1 ring-amber-300/60' : 'border-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-mono text-[#2d2a26] truncate">
                              <span className="font-bold tabular-nums">{item.date}</span>
                              {item.thai && item.chinese ? ' · 泰中双语' : item.thai ? ' · 仅泰语' : ' · 仅中文'}
                              {matchedLesson ? ` · 已有字幕(${matchedLesson.totalSentences}句)` : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectYouTubePair(item);
                                setIsExpanded(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#2d2a26] hover:bg-stone-800 text-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{matchedLesson ? '载入课件' : '载入视频'}</span>
                            </button>
                          </div>
                          <div className="text-[11px] text-[#5b3f1e] truncate flex items-center gap-1">
                            <span className="truncate">
                              🇹🇭 {thaiBadge ? `[${thaiBadge}] ` : ''}{item.thai?.title || '暂无同日泰语视频'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7a6f5f] truncate flex items-center gap-1">
                            <span className="truncate">
                              🇨🇳 {cnBadge ? `[${cnBadge}] ` : ''}{item.chinese?.title || '暂无同日中文视频'}
                            </span>
                          </div>
                          {(extraThai || extraCn) && (
                            <div className="pt-1 border-t border-stone-100 flex flex-wrap items-center gap-1 text-[10px]">
                              {extraThai && extraThai.map((cand, idx) => (
                                <button
                                  key={cand.videoId}
                                  type="button"
                                  onClick={() => {
                                    onSelectYouTubePair({ ...item, thai: cand });
                                    setIsExpanded(false);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-[#faf7f2] hover:bg-amber-100 text-[#5b3f1e] border border-[#e6d3ac] cursor-pointer truncate max-w-[160px]"
                                  title={`${cand.title} (${cand.videoId})`}
                                >
                                  🇹🇭版本{idx + 1}: {renderStreamStateLabel(cand.streamState) || cand.videoId.slice(0, 6)}
                                </button>
                              ))}
                              {extraCn && extraCn.map((cand, idx) => (
                                <button
                                  key={cand.videoId}
                                  type="button"
                                  onClick={() => {
                                    onSelectYouTubePair({ ...item, chinese: cand });
                                    setIsExpanded(false);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-stone-50 hover:bg-emerald-50 text-stone-700 border border-stone-200 cursor-pointer truncate max-w-[160px]"
                                  title={`${cand.title} (${cand.videoId})`}
                                >
                                  🇨🇳版本{idx + 1}: {renderStreamStateLabel(cand.streamState) || cand.videoId.slice(0, 6)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          ) : (
            /* 贴链接 / 导入本地文件（音视频合一） */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <form onSubmit={handleSubmitCustomLinks} className="lg:col-span-2 bg-white p-3 rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#b58940]" />
                    <span>粘贴官方链接直接播</span>
                  </span>
                  <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLinkMediaType('audio')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        linkMediaType === 'audio' ? 'bg-[#2d2a26] text-amber-200' : 'text-stone-600'
                      }`}
                    >
                      音频 MP3
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkMediaType('video')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                        linkMediaType === 'video' ? 'bg-[#2d2a26] text-amber-200' : 'text-stone-600'
                      }`}
                    >
                      YouTube 视频
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={thaiInputUrl}
                    onChange={(e) => setThaiInputUrl(e.target.value)}
                    placeholder={
                      linkMediaType === 'audio'
                        ? '🇹🇭 泰语 MP3 链接 (dhamma.com/.../*.mp3)'
                        : '🇹🇭 泰文 YouTube 链接或 11位 ID'
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-stone-300 text-xs text-[#2d2a26] font-mono focus:outline-none focus:border-[#b58940]"
                  />
                  <input
                    type="text"
                    value={chineseInputUrl}
                    onChange={(e) => setChineseInputUrl(e.target.value)}
                    placeholder={
                      linkMediaType === 'audio'
                        ? '🇨🇳 中文 MP3 链接 (可选)'
                        : '🇨🇳 中文 YouTube / MP4 / MP3 链接 (可选)'
                    }
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-stone-300 text-xs text-[#2d2a26] font-mono focus:outline-none focus:border-[#b58940]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="场次备注标题（可选）"
                    className="flex-1 min-w-[160px] min-h-[36px] px-3 py-1 rounded-xl bg-[#faf7f2] border border-stone-300 text-xs text-[#2d2a26] focus:outline-none focus:border-[#b58940]"
                  />
                  <button
                    type="submit"
                    disabled={isResolvingLinks || (!thaiInputUrl.trim() && !chineseInputUrl.trim())}
                    className="min-h-[36px] px-4 rounded-xl bg-[#2d2a26] hover:bg-stone-800 disabled:opacity-40 text-amber-200 text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    {isResolvingLinks ? '解析唯一ID中...' : '立即载入播放'}
                  </button>
                </div>
                {linkResolveHint && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    {linkResolveHint}
                  </div>
                )}
              </form>

              <div className="bg-white p-3 rounded-xl border border-stone-200 flex flex-col justify-between gap-2">
                <div className="text-xs font-bold text-[#2d2a26] flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-[#b58940]" />
                  <span>导入本地音频文件</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLocalTrackFocus('thai_audio')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border cursor-pointer ${
                      localTrackFocus === 'thai_audio'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-[#faf7f2] text-stone-700 border-stone-200'
                    }`}
                  >
                    🇹🇭 泰语原声
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalTrackFocus('chinese_audio')}
                    className={`flex-1 py-1.5 rounded-lg font-bold border cursor-pointer ${
                      localTrackFocus === 'chinese_audio'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-[#faf7f2] text-stone-700 border-stone-200'
                    }`}
                  >
                    🇨🇳 中文同传
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {onPickLocalAudioFile && (
                    <button
                      type="button"
                      onClick={() => onPickLocalAudioFile(localTrackFocus)}
                      className="flex-1 min-h-[36px] px-3 rounded-xl bg-[#faf7f2] hover:bg-amber-50 text-[#5b3f1e] border border-[#d9c8a9] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>选择本地文件</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenOfflineModal}
                    className="min-h-[36px] px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>离线库</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
