import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CuratedLesson, SubtitleLine, WordToken } from '../types';
import { getAllCuratedLessons, getLessonProvenance, subscribeLessonsUpdate } from '../data/presetLessonsLibrary';
import {
  OFFICIAL_FREE_AUDIO_ARCHIVES,
  OFFICIAL_DIRECTORY_LINKS,
  LuangporPairedItem,
  LuangporPairedCatalogResponse,
  OfflineAudioMeta,
  OfflineTrackType,
  offlineAudioStorage,
  buildAudioProxyUrl,
  fetchOfficialAudioBlob,
  fetchLuangporPairedCatalog,
  formatBytes,
} from '../services/offlineAudioStorage';
import { OfflineAudioModal } from './OfflineAudioModal';
import { CourseStudioModal } from './CourseStudioModal';
import { UnifiedMediaSelectorBar } from './UnifiedMediaSelectorBar';
import { UnmatchedSubtitleBanner } from './UnmatchedSubtitleBanner';
import { UnifiedPlayerDock } from './UnifiedPlayerDock';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { computeSentenceWordSlots, getKaraokeWordProgress } from '../utils/karaokeTiming';
import { useFullscreenStage } from '../hooks/useFullscreenStage';
import {
  inferGregorianDateFromAudio,
  findCuratedLessonByAudioMeta,
  getAudioMediaKey,
  getBoundSubtitlesForMedia,
  saveBoundSubtitlesForMedia,
} from '../utils/mediaSubtitleBinding';
import {
  Headphones,
  Play,
  Pause,
  Volume2,
  Upload,
  Download,
  Save,
  Mic,
  Search,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Compass,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Link2,
  Maximize2,
  Minimize2,
  Sparkles,
  Library,
  X,
  RotateCcw,
  FolderOpen,
} from 'lucide-react';

interface MainlandOfflinePageProps {
  currentLessonId?: string;
  onSelectLessonId?: (lessonId: string) => void;
  subtitles?: SubtitleLine[];
  currentLineIndex?: number;
  onLineIndexChange?: (idx: number) => void;
  onSelectWord?: (word: WordToken) => void;
  onOpenKeyboard?: (thaiText: string) => void;
  onSpeak?: (text: string, rate?: number) => void;
  pendingAudioSelection?: {
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    dateLabel?: string;
    trackType: 'thai_audio' | 'chinese_audio';
    nonce: number;
  } | null;
  onSwitchToYouTubeMode: () => void;
  onOpenVideoWithPair?: (pair: { thaiVideoUrl: string; chineseVideoUrl?: string; title?: string }) => void;
  onStartTour: () => void;
}

interface TrackAudioState {
  srcUrl: string;
  rawMp3Url?: string;
  isBlobUrl: boolean;
  fileName: string;
  sourceLabel: string;
  matchMode: 'cached' | 'auto' | 'manual';
  sizeBytes?: number;
  offsetSeconds: number;
  lessonId: string;
  trackType: OfflineTrackType;
  fileCode?: string;
  dateLabel?: string;
  mediaKey?: string;
  autoPlay?: boolean;
  fallbackTried?: boolean;
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const MainlandOfflinePage: React.FC<MainlandOfflinePageProps> = ({
  currentLessonId: propLessonId,
  onSelectLessonId,
  subtitles: propSubtitles,
  currentLineIndex: propLineIndex,
  onLineIndexChange,
  onSelectWord,
  onOpenKeyboard,
  onSpeak,
  pendingAudioSelection,
  onSwitchToYouTubeMode,
  onOpenVideoWithPair,
  onStartTour,
}) => {
  const [lessonsVersion, setLessonsVersion] = useState(0);
  useEffect(() => {
    return subscribeLessonsUpdate(() => setLessonsVersion((v) => v + 1));
  }, []);
  const lessons = useMemo(() => getAllCuratedLessons(), [lessonsVersion]);

  // 1. 课件与字幕状态（与视频模式实时同步同一套数据）
  const [localLessonId, setLocalLessonId] = useState<string>(() => {
    const exactFull = lessons.find((l) => l.id === 'lesson_20261017');
    return exactFull?.id || lessons[0]?.id || 'lesson_20261017';
  });
  const currentLessonId = propLessonId ?? localLessonId;
  const setCurrentLessonId = useCallback(
    (id: string) => {
      setLocalLessonId(id);
      onSelectLessonId?.(id);
    },
    [onSelectLessonId]
  );

  const currentLesson = useMemo<CuratedLesson>(
    () => lessons.find((l) => l.id === currentLessonId) || lessons[0],
    [lessons, currentLessonId]
  );

  // 2. 双音轨状态（泰语原声框 + 中文同传框）与严格字幕绑定
  const thaiAudioRef = useRef<HTMLAudioElement | null>(null);
  const chineseAudioRef = useRef<HTMLAudioElement | null>(null);
  const thaiBlobUrlRef = useRef<string | null>(null);
  const chineseBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [thaiTrack, setThaiTrack] = useState<TrackAudioState | null>(null);
  const [chineseTrack, setChineseTrack] = useState<TrackAudioState | null>(null);
  const [bindingVersion, setBindingVersion] = useState(0);
  const [showImportSubtitlesModal, setShowImportSubtitlesModal] = useState(false);

  const thaiAudioRefLatest = useRef<TrackAudioState | null>(null);
  thaiAudioRefLatest.current = thaiTrack;
  const chineseAudioRefLatest = useRef<TrackAudioState | null>(null);
  chineseAudioRefLatest.current = chineseTrack;
  const prevAutoLessonIdRef = useRef<string | null>(null);
  const pendingExplicitTrackRef = useRef<{
    lessonId: string;
    trackType: 'thai_audio' | 'chinese_audio';
    trackState: TrackAudioState;
  } | null>(null);

  // 严格校验当前泰语音频与字幕的对应关系：只有严格对应（同场次或显式绑定）才出字幕
  const audioSubtitleBinding = useMemo(() => {
    const lessonSubs = propSubtitles && propSubtitles.length > 0 ? propSubtitles : currentLesson?.subtitles || [];
    if (!thaiTrack) {
      return {
        isMatched: true,
        source: 'no_thai_track' as const,
        inferredDate: null as string | null,
        audioKey: '',
        subtitles: lessonSubs,
      };
    }

    const audioKey =
      thaiTrack.mediaKey ||
      getAudioMediaKey({ rawMp3Url: thaiTrack.rawMp3Url, fileName: thaiTrack.fileName });
    const customBound = getBoundSubtitlesForMedia(audioKey);
    if (customBound && customBound.subtitles.length > 0) {
      return {
        isMatched: true,
        source: 'custom_bound' as const,
        inferredDate: customBound.date || null,
        audioKey,
        subtitles: customBound.subtitles,
      };
    }

    const inferredDate = inferGregorianDateFromAudio({
      dateLabel: thaiTrack.dateLabel,
      fileCode: thaiTrack.fileCode,
      fileName: thaiTrack.fileName,
      rawMp3Url: thaiTrack.rawMp3Url,
    });

    const isLessonIdMatch =
      !thaiTrack.lessonId.startsWith('unmatched::') &&
      thaiTrack.lessonId === currentLesson.id;
    const isDateCompatible = !inferredDate || inferredDate === currentLesson.date;

    if (isLessonIdMatch && isDateCompatible) {
      return {
        isMatched: true,
        source: 'lesson_match' as const,
        inferredDate,
        audioKey,
        subtitles: lessonSubs,
      };
    }

    return {
      isMatched: false,
      source: 'unmatched' as const,
      inferredDate,
      audioKey,
      subtitles: [] as SubtitleLine[],
    };
  }, [thaiTrack, propSubtitles, currentLesson, bindingVersion]);

  const activeSubtitles: SubtitleLine[] = audioSubtitleBinding.subtitles;

  const [localLineIndex, setLocalLineIndex] = useState(0);
  const currentLineIndex = useMemo(() => {
    const raw = propLineIndex !== undefined ? propLineIndex : localLineIndex;
    if (activeSubtitles.length === 0) return 0;
    return Math.max(0, Math.min(activeSubtitles.length - 1, raw));
  }, [propLineIndex, localLineIndex, activeSubtitles.length]);
  const setCurrentLineIndex = useCallback(
    (idx: number) => {
      setLocalLineIndex(idx);
      onLineIndexChange?.(idx);
    },
    [onLineIndexChange]
  );

  const currentLine = activeSubtitles.length > 0 ? activeSubtitles[currentLineIndex] : undefined;

  const [isThaiPlaying, setIsThaiPlaying] = useState(false);
  const [isChinesePlaying, setIsChinesePlaying] = useState(false);
  const [thaiRawTime, setThaiRawTime] = useState(0);
  const [thaiDuration, setThaiDuration] = useState(0);
  const [chineseRawTime, setChineseRawTime] = useState(0);
  const [chineseDuration, setChineseDuration] = useState(0);

  // 声道焦点 & 伴弱音量（与视频学习保持一致交互）
  const [audioFocus, setAudioFocus] = useState<'thai' | 'both' | 'chinese'>('thai');
  const [chineseVol, setChineseVol] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('luangpor_chinese_dim_vol');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {}
    return 70;
  });

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLoopSentence, setIsLoopSentence] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 卡拉OK逐词演练
  const [isKaraokeDemoPlaying, setIsKaraokeDemoPlaying] = useState(false);
  const [karaokeDemoTime, setKaraokeDemoTime] = useState(0);

  // 全屏沉浸（保持底层 <audio> 不断播）
  const { stageRef: fullscreenRef, isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreenStage();

  // 页面内联合选源条展开信号（保持主界面清爽无多层弹窗）
  const [audioPickerFocusTrack, setAudioPickerFocusTrack] = useState<'thai_audio' | 'chinese_audio'>('thai_audio');
  const [externalExpandSignal, setExternalExpandSignal] = useState<{
    tab?: 'catalog' | 'link';
    sourceKind?: 'audio' | 'video';
    focusTrack?: 'thai_audio' | 'chinese_audio';
    nonce: number;
  } | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // 缓存与提示气泡
  const [cachingKey, setCachingKey] = useState<string | null>(null);
  const [cachingProgress, setCachingProgress] = useState('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  // 隆波开示目录（用于半自动匹配同日泰/中 MP3 及选单检索）
  const [catalogYear, setCatalogYear] = useState<'2026' | '2025'>('2026');
  const [pairedCatalog, setPairedCatalog] = useState<LuangporPairedCatalogResponse | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const replaceThaiTrack = useCallback((next: TrackAudioState | null) => {
    if (thaiBlobUrlRef.current && thaiBlobUrlRef.current !== next?.srcUrl) {
      URL.revokeObjectURL(thaiBlobUrlRef.current);
    }
    thaiBlobUrlRef.current = next && next.isBlobUrl ? next.srcUrl : null;
    setThaiTrack(next);
  }, []);

  const replaceChineseTrack = useCallback((next: TrackAudioState | null) => {
    if (chineseBlobUrlRef.current && chineseBlobUrlRef.current !== next?.srcUrl) {
      URL.revokeObjectURL(chineseBlobUrlRef.current);
    }
    chineseBlobUrlRef.current = next && next.isBlobUrl ? next.srcUrl : null;
    setChineseTrack(next);
  }, []);

  useEffect(() => {
    return () => {
      if (thaiBlobUrlRef.current) URL.revokeObjectURL(thaiBlobUrlRef.current);
      if (chineseBlobUrlRef.current) URL.revokeObjectURL(chineseBlobUrlRef.current);
    };
  }, []);

  // 拉取隆波开示日期对齐目录
  const loadCatalog = useCallback(async (year: '2026' | '2025', refresh = false) => {
    setIsCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await fetchLuangporPairedCatalog(year, refresh);
      setPairedCatalog(data);
    } catch (err: any) {
      setCatalogError(err?.message || '同步开示目录失败');
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog(catalogYear);
  }, [catalogYear, loadCatalog]);

  // 当前课程同日（及近期）的半自动候选列表
  const datePairedCandidates = useMemo<LuangporPairedItem[]>(() => {
    const list = pairedCatalog?.items || [];
    if (!currentLesson?.date) return [];
    return list.filter((row) => row.date === currentLesson.date);
  }, [pairedCatalog, currentLesson?.date]);

  // 半自动智能挂载：优先本机离线缓存 -> 其次精确日期官方 MP3 -> 实时目录同日匹配
  // 严格保护用户主动选定的外部/未匹配音轨，避免异步目录刷新将其冲掉
  useEffect(() => {
    let cancelled = false;
    const isLessonChanged = prevAutoLessonIdRef.current !== currentLesson.id;
    prevAutoLessonIdRef.current = currentLesson.id;

    const pendingExplicit =
      pendingExplicitTrackRef.current && pendingExplicitTrackRef.current.lessonId === currentLesson.id
        ? pendingExplicitTrackRef.current
        : null;
    if (pendingExplicit) {
      pendingExplicitTrackRef.current = null;
      if (pendingExplicit.trackType === 'thai_audio') {
        replaceThaiTrack(pendingExplicit.trackState);
      } else {
        replaceChineseTrack(pendingExplicit.trackState);
      }
    }

    if (isLessonChanged) {
      setIsThaiPlaying(false);
      setIsChinesePlaying(false);
      setThaiRawTime(0);
      setThaiDuration(0);
      setChineseRawTime(0);
      setChineseDuration(0);
    }

    const curThai = thaiAudioRefLatest.current;
    const curCn = chineseAudioRefLatest.current;
    const skipAutoThai =
      pendingExplicit?.trackType === 'thai_audio' ||
      (!isLessonChanged &&
        Boolean(curThai) &&
        (curThai!.matchMode === 'manual' ||
          curThai!.matchMode === 'cached' ||
          curThai!.lessonId.startsWith('unmatched::')));
    const skipAutoCn =
      pendingExplicit?.trackType === 'chinese_audio' ||
      (!isLessonChanged &&
        Boolean(curCn) &&
        (curCn!.matchMode === 'manual' ||
          curCn!.matchMode === 'cached' ||
          curCn!.lessonId.startsWith('unmatched::')));

    const staticThai = OFFICIAL_FREE_AUDIO_ARCHIVES.find(
      (a) => (a.suggestedLessonId === currentLesson.id || a.date === currentLesson.date) && a.trackType === 'thai_audio'
    );
    const staticChinese = OFFICIAL_FREE_AUDIO_ARCHIVES.find(
      (a) => (a.suggestedLessonId === currentLesson.id || a.date === currentLesson.date) && a.trackType === 'chinese_audio'
    );
    const catalogThai = datePairedCandidates.find((r) => r.thai)?.thai;
    const catalogChinese = datePairedCandidates.find((r) => r.chinese)?.chinese;

    offlineAudioStorage
      .getLessonTracks(currentLesson.id)
      .then((tracks) => {
        if (cancelled) return;

        // 1. 泰语原声轨（含用户录音优先）
        if (!skipAutoThai) {
          const cachedThai = tracks.thai_audio || tracks.user_recording;
          const cachedInferredDate = cachedThai
            ? inferGregorianDateFromAudio({ fileName: cachedThai.fileName })
            : null;
          const isCachedThaiDateValid =
            !cachedInferredDate || cachedInferredDate === currentLesson.date;

          if (cachedThai && isCachedThaiDateValid) {
            replaceThaiTrack({
              srcUrl: URL.createObjectURL(cachedThai.blob),
              isBlobUrl: true,
              fileName: cachedThai.fileName,
              dateLabel: currentLesson.date,
              mediaKey: getAudioMediaKey({ fileName: cachedThai.fileName }),
              sourceLabel: '已离线缓存',
              matchMode: 'cached',
              sizeBytes: cachedThai.sizeBytes,
              offsetSeconds: cachedThai.offsetSeconds || 0,
              lessonId: cachedThai.lessonId,
              trackType: cachedThai.trackType,
            });
          } else if (staticThai || catalogThai) {
            const mp3Url = staticThai?.mp3Url || catalogThai!.mp3Url;
            const fileName = staticThai?.fileName || catalogThai!.fileName;
            const fileCode = staticThai?.fileCode || catalogThai!.fileCode;
            const latestThai = thaiAudioRefLatest.current;
            if (
              isLessonChanged ||
              !latestThai ||
              latestThai.rawMp3Url !== mp3Url ||
              latestThai.lessonId !== currentLesson.id
            ) {
              replaceThaiTrack({
                srcUrl: buildAudioProxyUrl(mp3Url),
                rawMp3Url: mp3Url,
                isBlobUrl: false,
                fileName,
                fileCode,
                dateLabel: currentLesson.date,
                mediaKey: getAudioMediaKey({ rawMp3Url: mp3Url, fileName }),
                sourceLabel: `智能匹配 · ${currentLesson.date} (${fileCode})`,
                matchMode: 'auto',
                offsetSeconds: 0,
                lessonId: currentLesson.id,
                trackType: 'thai_audio',
                autoPlay: false,
              });
            }
          } else if (isLessonChanged) {
            replaceThaiTrack(null);
          }
        }

        // 2. 中文同传轨
        if (!skipAutoCn) {
          const cachedCn = tracks.chinese_audio;
          if (cachedCn) {
            replaceChineseTrack({
              srcUrl: URL.createObjectURL(cachedCn.blob),
              isBlobUrl: true,
              fileName: cachedCn.fileName,
              dateLabel: currentLesson.date,
              mediaKey: getAudioMediaKey({ fileName: cachedCn.fileName }),
              sourceLabel: '已离线缓存',
              matchMode: 'cached',
              sizeBytes: cachedCn.sizeBytes,
              offsetSeconds: cachedCn.offsetSeconds || 0,
              lessonId: cachedCn.lessonId,
              trackType: 'chinese_audio',
            });
          } else if (staticChinese || catalogChinese) {
            const mp3Url = staticChinese?.mp3Url || catalogChinese!.mp3Url;
            const fileName = staticChinese?.fileName || catalogChinese!.fileName;
            const fileCode = staticChinese?.fileCode || catalogChinese!.fileCode;
            const latestCn = chineseAudioRefLatest.current;
            if (
              isLessonChanged ||
              !latestCn ||
              latestCn.rawMp3Url !== mp3Url ||
              latestCn.lessonId !== currentLesson.id
            ) {
              replaceChineseTrack({
                srcUrl: buildAudioProxyUrl(mp3Url),
                rawMp3Url: mp3Url,
                isBlobUrl: false,
                fileName,
                fileCode,
                dateLabel: currentLesson.date,
                mediaKey: getAudioMediaKey({ rawMp3Url: mp3Url, fileName }),
                sourceLabel: `智能匹配 · ${currentLesson.date} (${fileCode})`,
                matchMode: 'auto',
                offsetSeconds: 0,
                lessonId: currentLesson.id,
                trackType: 'chinese_audio',
                autoPlay: false,
              });
            }
          } else if (isLessonChanged) {
            replaceChineseTrack(null);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (!skipAutoThai) {
          if (staticThai || catalogThai) {
            const mp3Url = staticThai?.mp3Url || catalogThai!.mp3Url;
            const fileName = staticThai?.fileName || catalogThai!.fileName;
            const fileCode = staticThai?.fileCode || catalogThai!.fileCode;
            replaceThaiTrack({
              srcUrl: buildAudioProxyUrl(mp3Url),
              rawMp3Url: mp3Url,
              isBlobUrl: false,
              fileName,
              fileCode,
              dateLabel: currentLesson.date,
              mediaKey: getAudioMediaKey({ rawMp3Url: mp3Url, fileName }),
              sourceLabel: `智能匹配 · ${currentLesson.date}`,
              matchMode: 'auto',
              offsetSeconds: 0,
              lessonId: currentLesson.id,
              trackType: 'thai_audio',
            });
          } else if (isLessonChanged) {
            replaceThaiTrack(null);
          }
        }

        if (!skipAutoCn) {
          if (staticChinese || catalogChinese) {
            const mp3Url = staticChinese?.mp3Url || catalogChinese!.mp3Url;
            const fileName = staticChinese?.fileName || catalogChinese!.fileName;
            const fileCode = staticChinese?.fileCode || catalogChinese!.fileCode;
            replaceChineseTrack({
              srcUrl: buildAudioProxyUrl(mp3Url),
              rawMp3Url: mp3Url,
              isBlobUrl: false,
              fileName,
              fileCode,
              dateLabel: currentLesson.date,
              mediaKey: getAudioMediaKey({ rawMp3Url: mp3Url, fileName }),
              sourceLabel: `智能匹配 · ${currentLesson.date}`,
              matchMode: 'auto',
              offsetSeconds: 0,
              lessonId: currentLesson.id,
              trackType: 'chinese_audio',
            });
          } else if (isLessonChanged) {
            replaceChineseTrack(null);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentLesson.id, currentLesson.date, datePairedCandidates, replaceThaiTrack, replaceChineseTrack]);

  // 同步倍速与音量
  useEffect(() => {
    if (thaiAudioRef.current) {
      thaiAudioRef.current.playbackRate = playbackRate;
      thaiAudioRef.current.volume = audioFocus === 'chinese' ? 0.15 : 1.0;
    }
    if (chineseAudioRef.current) {
      chineseAudioRef.current.playbackRate = playbackRate;
      chineseAudioRef.current.volume = audioFocus === 'thai' ? 0 : Math.max(0, Math.min(1, chineseVol / 100));
    }
  }, [playbackRate, audioFocus, chineseVol, thaiTrack?.srcUrl, chineseTrack?.srcUrl]);

  const handleChangeChineseVol = (nextVol: number) => {
    const clamped = Math.max(0, Math.min(100, nextVol));
    setChineseVol(clamped);
    try {
      localStorage.setItem('luangpor_chinese_dim_vol', String(clamped));
    } catch {}
  };

  // 卡拉OK演示时钟
  useEffect(() => {
    if (currentLine) {
      setKaraokeDemoTime(currentLine.secondsStart);
    }
  }, [currentLineIndex, currentLine?.secondsStart]);

  useEffect(() => {
    if (!isKaraokeDemoPlaying || !currentLine) return;
    const stepMs = 40;
    const stepSec = (stepMs / 1000) * playbackRate;
    const id = window.setInterval(() => {
      setKaraokeDemoTime((prev) => {
        const next = prev + stepSec;
        if (next >= currentLine.secondsEnd) {
          setIsKaraokeDemoPlaying(false);
          return currentLine.secondsEnd;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(id);
  }, [isKaraokeDemoPlaying, playbackRate, currentLine]);

  // 主驱动轮询：由当前激活音轨实时高亮字幕 + 单句循环
  useEffect(() => {
    const timer = window.setInterval(() => {
      const driverEl =
        audioFocus === 'chinese' && chineseAudioRef.current && !chineseAudioRef.current.paused
          ? chineseAudioRef.current
          : thaiAudioRef.current && !thaiAudioRef.current.paused
          ? thaiAudioRef.current
          : chineseAudioRef.current && !chineseAudioRef.current.paused
          ? chineseAudioRef.current
          : null;

      if (!driverEl) return;

      const offset =
        driverEl === chineseAudioRef.current
          ? chineseTrack?.offsetSeconds || 0
          : thaiTrack?.offsetSeconds || 0;
      const t = Math.max(0, driverEl.currentTime - offset);

      const line = activeSubtitles[currentLineIndex];
      if (isLoopSentence && line && t >= line.secondsEnd) {
        if (thaiAudioRef.current && thaiTrack) {
          thaiAudioRef.current.currentTime = Math.max(0, line.secondsStart + (thaiTrack.offsetSeconds || 0));
        }
        if (chineseAudioRef.current && chineseTrack && audioFocus !== 'thai') {
          chineseAudioRef.current.currentTime = Math.max(0, line.secondsStart + (chineseTrack.offsetSeconds || 0));
        }
        return;
      }

      if (!line || t < line.secondsStart || t >= line.secondsEnd) {
        const idx = activeSubtitles.findIndex((s, i) => {
          const next = activeSubtitles[i + 1];
          const endBound = next ? Math.max(next.secondsStart, s.secondsEnd) : s.secondsEnd + 3;
          return t >= s.secondsStart - 0.15 && t < endBound;
        });
        if (idx !== -1 && idx !== currentLineIndex) {
          setCurrentLineIndex(idx);
        }
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [audioFocus, thaiTrack, chineseTrack, activeSubtitles, currentLineIndex, isLoopSentence, setCurrentLineIndex]);

  const effectiveTime = useMemo(() => {
    if (isKaraokeDemoPlaying) return karaokeDemoTime;
    if (isThaiPlaying && thaiAudioRef.current) {
      return Math.max(0, thaiRawTime - (thaiTrack?.offsetSeconds || 0));
    }
    if (isChinesePlaying && chineseAudioRef.current) {
      return Math.max(0, chineseRawTime - (chineseTrack?.offsetSeconds || 0));
    }
    return currentLine?.secondsStart || 0;
  }, [
    isKaraokeDemoPlaying,
    karaokeDemoTime,
    isThaiPlaying,
    thaiRawTime,
    thaiTrack?.offsetSeconds,
    isChinesePlaying,
    chineseRawTime,
    chineseTrack?.offsetSeconds,
    currentLine?.secondsStart,
  ]);

  const currentWordSlots = useMemo(
    () => (currentLine ? computeSentenceWordSlots(currentLine) : []),
    [currentLine]
  );

  const { activeSlotIndex, wordProgressMap } = useMemo(
    () => getKaraokeWordProgress(effectiveTime, currentWordSlots),
    [effectiveTime, currentWordSlots]
  );

  const speakThai = useCallback(
    (text: string) => {
      if (onSpeak) onSpeak(text, playbackRate);
      else thaiAudio.speakWord(text, playbackRate);
    },
    [onSpeak, playbackRate]
  );

  // 跳转到指定句并联动播放
  const handleJumpToSentence = useCallback(
    (index: number, autoPlayAudio = true) => {
      const target = activeSubtitles[index];
      if (!target) return;
      setCurrentLineIndex(index);
      setKaraokeDemoTime(target.secondsStart);

      let startedAny = false;
      if (thaiAudioRef.current && thaiTrack && audioFocus !== 'chinese') {
        thaiAudioRef.current.currentTime = Math.max(0, target.secondsStart + (thaiTrack.offsetSeconds || 0));
        if (autoPlayAudio) {
          thaiAudioRef.current.play().catch(() => {});
        }
        startedAny = true;
      }
      if (chineseAudioRef.current && chineseTrack && audioFocus !== 'thai') {
        chineseAudioRef.current.currentTime = Math.max(0, target.secondsStart + (chineseTrack.offsetSeconds || 0));
        if (autoPlayAudio) {
          chineseAudioRef.current.play().catch(() => {});
        }
        startedAny = true;
      }
      if (!startedAny) {
        speakThai(target.thai);
      }
    },
    [activeSubtitles, setCurrentLineIndex, thaiTrack, chineseTrack, audioFocus, speakThai]
  );

  const isCurrentModePlaying =
    audioFocus === 'both'
      ? isThaiPlaying || isChinesePlaying
      : audioFocus === 'thai'
      ? isThaiPlaying
      : isChinesePlaying;

  // 主控播/停（支持单泰语、单中文、双轨同步）
  const handleMasterPlayToggle = useCallback(() => {
    const canPlayThai = Boolean(thaiAudioRef.current && thaiTrack);
    const canPlayChinese = Boolean(chineseAudioRef.current && chineseTrack);

    if (!canPlayThai && !canPlayChinese) {
      if (currentLine) {
        setIsKaraokeDemoPlaying((p) => !p);
        speakThai(currentLine.thai);
      }
      return;
    }

    setIsKaraokeDemoPlaying(false);
    if (isCurrentModePlaying) {
      thaiAudioRef.current?.pause();
      chineseAudioRef.current?.pause();
      return;
    }

    if (audioFocus === 'thai') {
      chineseAudioRef.current?.pause();
      if (canPlayThai) thaiAudioRef.current!.play().catch(() => {});
      else if (canPlayChinese) chineseAudioRef.current!.play().catch(() => {});
    } else if (audioFocus === 'chinese') {
      thaiAudioRef.current?.pause();
      if (canPlayChinese) chineseAudioRef.current!.play().catch(() => {});
      else if (canPlayThai) thaiAudioRef.current!.play().catch(() => {});
    } else {
      if (canPlayThai) thaiAudioRef.current!.play().catch(() => {});
      if (canPlayChinese) chineseAudioRef.current!.play().catch(() => {});
    }
  }, [thaiTrack, chineseTrack, audioFocus, isCurrentModePlaying, currentLine, speakThai]);

  const handleToggleThaiSolo = () => {
    if (!thaiAudioRef.current || !thaiTrack) {
      setAudioPickerFocusTrack('thai_audio');
      setExternalExpandSignal({ tab: 'catalog', sourceKind: 'audio', focusTrack: 'thai_audio', nonce: Date.now() });
      return;
    }
    if (thaiAudioRef.current.paused) {
      setIsKaraokeDemoPlaying(false);
      thaiAudioRef.current.play().catch(() => {});
    } else {
      thaiAudioRef.current.pause();
    }
  };

  const handleToggleChineseSolo = () => {
    if (!chineseAudioRef.current || !chineseTrack) {
      setAudioPickerFocusTrack('chinese_audio');
      setExternalExpandSignal({ tab: 'catalog', sourceKind: 'audio', focusTrack: 'chinese_audio', nonce: Date.now() });
      return;
    }
    if (chineseAudioRef.current.paused) {
      setIsKaraokeDemoPlaying(false);
      chineseAudioRef.current.play().catch(() => {});
    } else {
      chineseAudioRef.current.pause();
    }
  };

  // 一键将当前音频位置对齐到当前选中句
  const handleAlignCurrentTrack = async (trackType: 'thai_audio' | 'chinese_audio' = 'thai_audio') => {
    if (!currentLine) return;
    if (trackType === 'chinese_audio') {
      if (!chineseAudioRef.current || !chineseTrack) return;
      const rawSec = chineseAudioRef.current.currentTime;
      const nextOffset = parseFloat((rawSec - currentLine.secondsStart).toFixed(2));
      setChineseTrack((prev) => (prev ? { ...prev, offsetSeconds: nextOffset } : null));
      if (chineseTrack.isBlobUrl) {
        await offlineAudioStorage.updateAudioOffset(chineseTrack.lessonId, chineseTrack.trackType, nextOffset);
      }
      showToast(`已将中文音频 ${formatClock(rawSec)} 对齐第 ${currentLineIndex + 1} 句`);
      return;
    }

    if (!thaiAudioRef.current || !thaiTrack) {
      showToast('请先载入或播放一条音频后再对齐', 'error');
      return;
    }
    const rawSec = thaiAudioRef.current.currentTime;
    const nextOffset = parseFloat((rawSec - currentLine.secondsStart).toFixed(2));
    setThaiTrack((prev) => (prev ? { ...prev, offsetSeconds: nextOffset } : null));
    if (thaiTrack.isBlobUrl) {
      await offlineAudioStorage.updateAudioOffset(thaiTrack.lessonId, thaiTrack.trackType, nextOffset);
    }
    showToast(`已将泰语音频 ${formatClock(rawSec)} 对齐第 ${currentLineIndex + 1} 句`);
  };

  const handleNudgeOffset = async (trackType: 'thai_audio' | 'chinese_audio', delta: number) => {
    if (trackType === 'thai_audio' && thaiTrack) {
      const nextOffset = parseFloat((thaiTrack.offsetSeconds + delta).toFixed(2));
      setThaiTrack((prev) => (prev ? { ...prev, offsetSeconds: nextOffset } : null));
      if (thaiTrack.isBlobUrl) {
        await offlineAudioStorage.updateAudioOffset(thaiTrack.lessonId, thaiTrack.trackType, nextOffset);
      }
    } else if (trackType === 'chinese_audio' && chineseTrack) {
      const nextOffset = parseFloat((chineseTrack.offsetSeconds + delta).toFixed(2));
      setChineseTrack((prev) => (prev ? { ...prev, offsetSeconds: nextOffset } : null));
      if (chineseTrack.isBlobUrl) {
        await offlineAudioStorage.updateAudioOffset(chineseTrack.lessonId, chineseTrack.trackType, nextOffset);
      }
    }
  };

  // 从目录/自定义网址载入指定轨道并严格校验泰语音频与字幕的对应关系
  const handleSelectTrackStream = (params: {
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    dateLabel?: string;
    trackType: 'thai_audio' | 'chinese_audio';
    autoPlay?: boolean;
  }) => {
    setIsKaraokeDemoPlaying(false);
    const isThai = params.trackType === 'thai_audio';
    const currentTrack = isThai ? thaiTrack : chineseTrack;
    const currentEl = isThai ? thaiAudioRef.current : chineseAudioRef.current;
    const setTrack = isThai ? setThaiTrack : setChineseTrack;
    const replaceTrack = isThai ? replaceThaiTrack : replaceChineseTrack;

    if (currentTrack && currentTrack.rawMp3Url === params.mp3Url && currentEl) {
      setTrack((prev) => (prev ? { ...prev, autoPlay: true } : null));
      currentEl.play().catch(() => {});
      showToast(`开始播放 ${params.fileName}`);
      return;
    }

    const inferredDate = inferGregorianDateFromAudio({
      dateLabel: params.dateLabel,
      fileCode: params.fileCode,
      fileName: params.fileName,
      rawMp3Url: params.mp3Url,
    });
    const audioKey = getAudioMediaKey({ rawMp3Url: params.mp3Url, fileName: params.fileName });

    if (isThai) {
      const matchedLesson = findCuratedLessonByAudioMeta(lessons, {
        dateLabel: params.dateLabel || inferredDate || undefined,
        fileCode: params.fileCode,
        fileName: params.fileName,
        rawMp3Url: params.mp3Url,
      });

      const targetLessonId = matchedLesson
        ? matchedLesson.id
        : `unmatched::${inferredDate || params.fileCode || params.fileName}`;

      const nextState: TrackAudioState = {
        srcUrl: buildAudioProxyUrl(params.mp3Url),
        rawMp3Url: params.mp3Url,
        isBlobUrl: false,
        fileName: params.fileName,
        fileCode: params.fileCode,
        dateLabel: inferredDate || params.dateLabel,
        mediaKey: audioKey,
        sourceLabel: params.dateLabel || inferredDate ? `官方存档 · ${inferredDate || params.dateLabel}` : '手动选定 MP3',
        matchMode: 'manual',
        offsetSeconds: 0,
        lessonId: targetLessonId,
        trackType: 'thai_audio',
        autoPlay: params.autoPlay ?? true,
        fallbackTried: false,
      };

      if (matchedLesson && matchedLesson.id !== currentLesson.id) {
        pendingExplicitTrackRef.current = {
          lessonId: matchedLesson.id,
          trackType: 'thai_audio',
          trackState: nextState,
        };
        setCurrentLessonId(matchedLesson.id);
        setCurrentLineIndex(0);
        showToast(`已切换至对应课件「${matchedLesson.date}」并加载泰语音频：${params.fileName}`);
      } else {
        replaceThaiTrack(nextState);
        const bound = getBoundSubtitlesForMedia(audioKey);
        if (matchedLesson) {
          showToast(`已挂载同场泰语音频：${params.fileName}`);
        } else if (bound) {
          showToast(`已挂载泰语音频「${params.fileName}」并匹配到对应字幕 (${bound.subtitles.length} 句)`);
        } else {
          showToast(`已挂载泰语音频「${params.fileName}」；本音频暂无对应字幕，已自动隐藏其他场次字幕`);
        }
      }
      return;
    }

    replaceTrack({
      srcUrl: buildAudioProxyUrl(params.mp3Url),
      rawMp3Url: params.mp3Url,
      isBlobUrl: false,
      fileName: params.fileName,
      fileCode: params.fileCode,
      dateLabel: inferredDate || params.dateLabel,
      mediaKey: audioKey,
      sourceLabel: params.dateLabel || inferredDate ? `官方存档 · ${inferredDate || params.dateLabel}` : '手动选定 MP3',
      matchMode: 'manual',
      offsetSeconds: 0,
      lessonId: currentLesson.id,
      trackType: params.trackType,
      autoPlay: params.autoPlay ?? true,
      fallbackTried: false,
    });

    if (audioFocus === 'thai') {
      setAudioFocus('both');
    }
    showToast(`已挂载中文音频：${params.fileName}`);
  };

  // 响应从「视频学习」跨模式切入的待载入音轨
  const handleSelectTrackStreamRef = useRef(handleSelectTrackStream);
  handleSelectTrackStreamRef.current = handleSelectTrackStream;
  const lastHandledAudioNonceRef = useRef<number>(0);
  useEffect(() => {
    if (!pendingAudioSelection || pendingAudioSelection.nonce === lastHandledAudioNonceRef.current) return;
    lastHandledAudioNonceRef.current = pendingAudioSelection.nonce;
    handleSelectTrackStreamRef.current({
      mp3Url: pendingAudioSelection.mp3Url,
      fileName: pendingAudioSelection.fileName,
      fileCode: pendingAudioSelection.fileCode,
      dateLabel: pendingAudioSelection.dateLabel,
      trackType: pendingAudioSelection.trackType,
      autoPlay: true,
    });
  }, [pendingAudioSelection]);

  // 离线缓存指定 MP3 至 IndexedDB（4MB 分段兼容大文件）
  const handleCacheTrack = async (params: {
    key: string;
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    trackType: 'thai_audio' | 'chinese_audio';
  }) => {
    setCachingKey(params.key);
    setCachingProgress('0%');
    try {
      const { blob } = await fetchOfficialAudioBlob(params.mp3Url, (loaded, total) => {
        if (total && total > 0) {
          setCachingProgress(`${Math.round((loaded / total) * 100)}%`);
        } else {
          setCachingProgress(formatBytes(loaded));
        }
      });

      const inferredDate = inferGregorianDateFromAudio({
        fileCode: params.fileCode,
        fileName: params.fileName,
        rawMp3Url: params.mp3Url,
      });
      const matchedLesson = findCuratedLessonByAudioMeta(lessons, {
        fileCode: params.fileCode,
        fileName: params.fileName,
        rawMp3Url: params.mp3Url,
      });
      const targetLessonId =
        params.trackType === 'thai_audio'
          ? matchedLesson?.id || `unmatched::${inferredDate || params.fileCode || params.fileName}`
          : matchedLesson?.id || currentLesson.id;

      const meta = await offlineAudioStorage.saveAudioTrack({
        lessonId: targetLessonId,
        trackType: params.trackType,
        lessonTitle: matchedLesson?.chineseTitle || matchedLesson?.title || params.fileName,
        fileName: params.fileName,
        blob,
        sourceKind: 'official_archive',
      });

      const audioKey = getAudioMediaKey({ rawMp3Url: params.mp3Url, fileName: params.fileName });
      const nextState: TrackAudioState = {
        srcUrl: URL.createObjectURL(blob),
        rawMp3Url: params.mp3Url,
        isBlobUrl: true,
        fileName: meta.fileName,
        fileCode: params.fileCode,
        dateLabel: inferredDate || undefined,
        mediaKey: audioKey,
        sourceLabel: '已离线缓存至本机',
        matchMode: 'cached',
        sizeBytes: meta.sizeBytes,
        offsetSeconds: meta.offsetSeconds || 0,
        lessonId: meta.lessonId,
        trackType: meta.trackType,
      };

      if (params.trackType === 'thai_audio') {
        if (matchedLesson && matchedLesson.id !== currentLesson.id) {
          pendingExplicitTrackRef.current = {
            lessonId: matchedLesson.id,
            trackType: 'thai_audio',
            trackState: nextState,
          };
          setCurrentLessonId(matchedLesson.id);
          setCurrentLineIndex(0);
        } else {
          replaceThaiTrack(nextState);
        }
      } else {
        replaceChineseTrack(nextState);
      }

      showToast(`已缓存「${params.fileName}」(${formatBytes(blob.size)})`);
    } catch (err: any) {
      showToast(err?.message || '缓存失败，请重试', 'error');
    } finally {
      setCachingKey(null);
      setCachingProgress('');
    }
  };

  // 导入本地音频文件（严格校验文件名日期/绑定，不把无关音频误挂载成当前课字幕）
  const handleLocalFilePicked = async (file: File, trackType: 'thai_audio' | 'chinese_audio') => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.mov') || file.type.startsWith('video/')) &&
      !lower.endsWith('.webm')
    ) {
      showToast('请选择纯音频文件（MP3 / M4A / WAV / OGG）', 'error');
      return;
    }

    try {
      const inferredDate = inferGregorianDateFromAudio({ fileName: file.name });
      const matchedLesson = findCuratedLessonByAudioMeta(lessons, { fileName: file.name });
      const audioKey = getAudioMediaKey({ fileName: file.name });

      const targetLessonId =
        trackType === 'thai_audio'
          ? matchedLesson?.id || `unmatched::${inferredDate || file.name}`
          : matchedLesson?.id || currentLesson.id;

      const meta = await offlineAudioStorage.saveAudioTrack({
        lessonId: targetLessonId,
        trackType,
        lessonTitle: matchedLesson?.chineseTitle || matchedLesson?.title || file.name,
        fileName: file.name,
        blob: file,
        sourceKind: 'local_file',
      });
      const nextState: TrackAudioState = {
        srcUrl: URL.createObjectURL(file),
        isBlobUrl: true,
        fileName: meta.fileName,
        dateLabel: inferredDate || undefined,
        mediaKey: audioKey,
        sourceLabel: '本地导入 · 已离线保存',
        matchMode: 'cached',
        sizeBytes: meta.sizeBytes,
        offsetSeconds: meta.offsetSeconds || 0,
        lessonId: meta.lessonId,
        trackType: meta.trackType,
      };
      if (trackType === 'thai_audio') {
        if (matchedLesson && matchedLesson.id !== currentLesson.id) {
          pendingExplicitTrackRef.current = {
            lessonId: matchedLesson.id,
            trackType: 'thai_audio',
            trackState: nextState,
          };
          setCurrentLessonId(matchedLesson.id);
          setCurrentLineIndex(0);
          showToast(`已识别为 ${matchedLesson.date} 课件音频并载入「${file.name}」`);
        } else {
          replaceThaiTrack(nextState);
          if (matchedLesson || getBoundSubtitlesForMedia(audioKey)) {
            showToast(`已导入并匹配对应字幕：「${file.name}」`);
          } else {
            showToast(`已导入本地泰语音频「${file.name}」（暂未绑定字幕，已隐藏其他场次字幕）`);
          }
        }
      } else {
        replaceChineseTrack(nextState);
        showToast(`已导入并保存「${file.name}」`);
      }
    } catch (err: any) {
      showToast(err?.message || '导入音频失败', 'error');
    }
  };

  const handleActivatedFromModal = (
    lessonId: string,
    trackType: OfflineTrackType,
    blob: Blob,
    meta: OfflineAudioMeta
  ) => {
    const isUnmatchedSlot = lessonId.startsWith('unmatched::');
    const inferredDate = inferGregorianDateFromAudio({ fileName: meta.fileName });
    const targetLesson = !isUnmatchedSlot ? lessons.find((l) => l.id === lessonId) : undefined;
    const isConflictingDate = Boolean(targetLesson && inferredDate && inferredDate !== targetLesson.date);
    const effectiveLessonId = isConflictingDate ? `unmatched::${inferredDate}` : lessonId;

    const nextState: TrackAudioState = {
      srcUrl: URL.createObjectURL(blob),
      isBlobUrl: true,
      fileName: meta.fileName,
      dateLabel: inferredDate || targetLesson?.date,
      mediaKey: getAudioMediaKey({ fileName: meta.fileName }),
      sourceLabel: '本机离线音频库',
      matchMode: 'cached',
      sizeBytes: meta.sizeBytes,
      offsetSeconds: meta.offsetSeconds || 0,
      lessonId: effectiveLessonId,
      trackType,
    };
    if (trackType === 'chinese_audio') {
      if (!isUnmatchedSlot && !isConflictingDate && lessonId !== currentLessonId) {
        pendingExplicitTrackRef.current = { lessonId, trackType: 'chinese_audio', trackState: nextState };
        setCurrentLessonId(lessonId);
        setCurrentLineIndex(0);
      } else {
        replaceChineseTrack(nextState);
      }
      if (audioFocus === 'thai') setAudioFocus('both');
    } else {
      if (!isUnmatchedSlot && !isConflictingDate && lessonId !== currentLessonId) {
        pendingExplicitTrackRef.current = { lessonId, trackType: 'thai_audio', trackState: nextState };
        setCurrentLessonId(lessonId);
        setCurrentLineIndex(0);
      } else {
        replaceThaiTrack(nextState);
      }
    }
    setShowOfflineModal(false);
    showToast(
      isConflictingDate
        ? `已载入「${meta.fileName}」（日期 ${inferredDate} 与当前课件不同，已自动隐藏不匹配字幕）`
        : `已载入：${meta.fileName}`
    );
  };

  const filteredSubtitles = useMemo(() => {
    if (!searchQuery.trim()) return activeSubtitles;
    const q = searchQuery.toLowerCase().trim();
    return activeSubtitles.filter(
      (s) =>
        s.thai.toLowerCase().includes(q) ||
        s.chinese.toLowerCase().includes(q) ||
        s.romanization.toLowerCase().includes(q)
    );
  }, [activeSubtitles, searchQuery]);

  // 键盘快捷键（空格播停、上下句、Esc退出全屏）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (e.code === 'Space' && isFullscreen) {
        e.preventDefault();
        handleMasterPlayToggle();
      } else if (e.code === 'ArrowUp' && isFullscreen) {
        e.preventDefault();
        handleJumpToSentence(Math.max(0, currentLineIndex - 1), isCurrentModePlaying);
      } else if (e.code === 'ArrowDown' && isFullscreen) {
        e.preventDefault();
        handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1), isCurrentModePlaying);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, handleMasterPlayToggle, handleJumpToSentence, currentLineIndex, activeSubtitles.length, isCurrentModePlaying]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-4rem)] bg-[#faf7f2] text-[#2d2a26] pb-32 font-sans relative box-border">
      {/* 1. 顶部极简工作条（与「视频学习」完全对称一致） */}
      <div
        data-tour-id="tour-ml-hero"
        className="border-b border-[#e6d3ac]/60 bg-white/80 px-3 sm:px-6 py-2.5 max-w-full"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
              <Headphones className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-[#2d2a26] whitespace-nowrap">
                  泰中双音频同步对齐
                </h1>
                <span className="text-xs font-mono tabular-nums text-[#7a6f5f]">
                  {activeSubtitles.length > 0
                    ? `第 ${currentLineIndex + 1} / ${activeSubtitles.length} 句`
                    : '暂无对应字幕'}
                </span>
                <span className="hidden sm:inline text-stone-300" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-xs font-medium text-[#5b3f1e]">
                  {audioSubtitleBinding.isMatched
                    ? audioSubtitleBinding.source === 'custom_bound'
                      ? '已绑定本音频字幕'
                      : (() => {
                          const prov = getLessonProvenance(currentLesson);
                          return `${prov.type === 'official' ? '🌟' : '🤝'} ${prov.label}`;
                        })()
                    : '字幕严格绑定泰语音频'}
                </span>
              </div>
              <p className="text-xs text-[#7a6f5f] truncate max-w-md sm:max-w-xl">
                {audioSubtitleBinding.isMatched
                  ? `${currentLesson.date} · ${currentLesson.chineseTitle} ｜ ${currentLesson.title}`
                  : `当前泰语音频：${thaiTrack?.fileName || '自定义音频'}（暂无对应字幕）`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* 一键全屏沉浸 */}
            <button
              type="button"
              data-tour-id="tour-ml-fullscreen"
              onClick={toggleFullscreen}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              title="一键进入全屏沉浸字幕学习"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? '退出全屏' : '全屏沉浸'}</span>
            </button>

            <button
              type="button"
              onClick={onStartTour}
              className="min-h-[38px] px-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#7a6f5f] border border-stone-200 transition cursor-pointer flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0"
              title="查看功能导览"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导览</span>
            </button>
          </div>
        </div>
      </div>

      {/* 浮动提示气泡 */}
      {toastMsg && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 border ${
            toastMsg.type === 'success'
              ? 'bg-[#2d2a26] text-amber-200 border-amber-500/30'
              : 'bg-rose-950 text-rose-200 border-rose-500/40'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 主工作区 */}
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 pt-3 sm:pt-4 space-y-4 sm:space-y-5 max-w-full box-border">
        {/* 隐藏的本地文件选择器（供任意轨道快捷导入） */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLocalFilePicked(file, audioPickerFocusTrack);
            e.target.value = '';
          }}
        />

        {/* 主页直达选课与音视频源切换条 */}
        <UnifiedMediaSelectorBar
          mode="audio"
          onSwitchMode={(nextMode) => {
            if (nextMode === 'video') onSwitchToYouTubeMode();
          }}
          lessons={lessons}
          currentLessonId={currentLesson.id}
          currentDate={currentLesson.date}
          isUnmatchedCustomMedia={!audioSubtitleBinding.isMatched}
          unmatchedMediaLabel={thaiTrack?.fileName}
          onSelectLesson={(lesson) => {
            setCurrentLessonId(lesson.id);
            setCurrentLineIndex(0);
            showToast(`已切换开示：${lesson.date} · ${lesson.chineseTitle}`);
          }}
          pairedAudioCatalog={pairedCatalog}
          isAudioCatalogLoading={isCatalogLoading}
          audioCatalogError={catalogError}
          audioCatalogYear={catalogYear}
          onChangeAudioCatalogYear={(y) => setCatalogYear(y)}
          onRefreshAudioCatalog={() => loadCatalog(catalogYear, true)}
          onSelectAudioTrack={(params) =>
            handleSelectTrackStream({
              ...params,
              autoPlay: true,
            })
          }
          onCacheAudioTrack={(params) => handleCacheTrack(params)}
          cachingKey={cachingKey}
          cachingProgress={cachingProgress}
          onSelectYouTubePair={(item) => {
            const matchedLesson = item.matchedLessonId
              ? lessons.find((l) => l.id === item.matchedLessonId)
              : undefined;
            if (matchedLesson) {
              setCurrentLessonId(matchedLesson.id);
              setCurrentLineIndex(0);
              onSwitchToYouTubeMode();
            } else if (onOpenVideoWithPair) {
              onOpenVideoWithPair({
                thaiVideoUrl: item.thai?.url || '',
                chineseVideoUrl: item.chinese?.url || '',
                title: `${item.date} ${item.chinese?.title || item.thai?.title || '隆波开示'}`,
              });
            } else {
              onSwitchToYouTubeMode();
            }
          }}
          onLoadCustomMediaPair={({ thaiUrl, chineseUrl, title, mediaType }) => {
            if (mediaType === 'video') {
              if (onOpenVideoWithPair) {
                onOpenVideoWithPair({ thaiVideoUrl: thaiUrl, chineseVideoUrl: chineseUrl, title });
              } else {
                onSwitchToYouTubeMode();
              }
              return;
            }
            if (thaiUrl) {
              const fn = thaiUrl.split('/').pop()?.split('?')[0] || `thai_${Date.now()}.mp3`;
              handleSelectTrackStream({ mp3Url: thaiUrl, fileName: fn, trackType: 'thai_audio', autoPlay: true });
            }
            if (chineseUrl) {
              const fn = chineseUrl.split('/').pop()?.split('?')[0] || `cn_${Date.now()}.mp3`;
              handleSelectTrackStream({ mp3Url: chineseUrl, fileName: fn, trackType: 'chinese_audio', autoPlay: false });
            }
          }}
          onPickLocalAudioFile={(trackType) => {
            setAudioPickerFocusTrack(trackType);
            fileInputRef.current?.click();
          }}
          onOpenOfflineModal={() => setShowOfflineModal(true)}
          hasOfflineActive={Boolean(thaiTrack?.isBlobUrl || chineseTrack?.isBlobUrl)}
          onOpenSubtitleImporter={() => setShowImportSubtitlesModal(true)}
          externalExpandSignal={externalExpandSignal}
        />

        {/* 2. 紧凑双音频视窗区（对应双视频的两个框，紧致优雅、半自动匹配） */}
        <div
          data-tour-id="tour-ml-direct-mp3"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* 左侧音频框：🇹🇭 泰语原声 */}
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3 sm:px-3.5 py-2 flex flex-wrap items-center justify-between text-xs text-amber-100 gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full ${isThaiPlaying ? 'bg-emerald-400' : 'bg-stone-500'}`} />
                <span className="font-bold whitespace-nowrap">🇹🇭 泰语原声</span>
                <span className="text-[10px] text-stone-300 whitespace-nowrap">
                  ({isThaiPlaying ? '播放中' : '已暂停'})
                </span>
                {thaiTrack && (
                  <span className="hidden sm:inline text-[10px] text-amber-300/90 font-mono truncate max-w-[160px]">
                    · {thaiTrack.matchMode === 'cached' ? '已离线缓存' : thaiTrack.fileCode || '智能匹配'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {thaiTrack && !thaiTrack.isBlobUrl && thaiTrack.rawMp3Url && (
                  <button
                    type="button"
                    disabled={Boolean(cachingKey)}
                    onClick={() =>
                      handleCacheTrack({
                        key: 'thai_header',
                        mp3Url: thaiTrack.rawMp3Url!,
                        fileName: thaiTrack.fileName,
                        fileCode: thaiTrack.fileCode,
                        trackType: 'thai_audio',
                      })
                    }
                    className="px-2 py-1 rounded bg-stone-800/90 hover:bg-stone-700 text-amber-200 border border-stone-600/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    title="缓存至本机离线收听"
                  >
                    <Save className="w-3 h-3" />
                    <span>{cachingKey === 'thai_header' ? cachingProgress || '...' : '缓存'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAudioPickerFocusTrack('thai_audio');
                    setExternalExpandSignal({
                      tab: 'catalog',
                      sourceKind: 'audio',
                      focusTrack: 'thai_audio',
                      nonce: Date.now(),
                    });
                  }}
                  className="px-2 py-1 rounded bg-stone-800/90 hover:bg-stone-700 text-stone-200 border border-stone-600/60 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                  title="半自动挑选同日场次、其他日期或导入本地泰语音频"
                >
                  换音频
                </button>

                <button
                  type="button"
                  onClick={handleToggleThaiSolo}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                >
                  {isThaiPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isThaiPlaying ? '暂停泰语' : '播放泰语'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-[#231f1b] via-[#2b2621] to-[#1c1916] text-amber-100 flex-1 flex flex-col justify-between gap-2.5">
              {thaiTrack ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-bold text-white truncate max-w-[190px] sm:max-w-[260px]">
                        {thaiTrack.fileName}
                      </span>
                      <span className="text-stone-400 font-mono truncate">
                        · {thaiTrack.sourceLabel}
                        {thaiTrack.sizeBytes ? ` (${formatBytes(thaiTrack.sizeBytes)})` : ''}
                      </span>
                    </div>

                    {/* 同日多场次半自动快切 */}
                    {datePairedCandidates.filter((r) => r.thai).length > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {datePairedCandidates
                          .filter((r) => r.thai)
                          .map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() =>
                                handleSelectTrackStream({
                                  mp3Url: r.thai!.mp3Url,
                                  fileName: r.thai!.fileName,
                                  fileCode: r.thai!.fileCode,
                                  dateLabel: r.date,
                                  trackType: 'thai_audio',
                                  autoPlay: true,
                                })
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                thaiTrack.rawMp3Url === r.thai!.mp3Url
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              {r.thai!.fileCode}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <audio
                    key={thaiTrack.srcUrl}
                    ref={thaiAudioRef}
                    src={thaiTrack.srcUrl}
                    controls
                    autoPlay={Boolean(thaiTrack.autoPlay)}
                    preload="metadata"
                    className="w-full h-10"
                    onCanPlay={(e) => {
                      if (thaiTrack.autoPlay && e.currentTarget.paused) {
                        e.currentTarget.play().catch(() => {});
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (Number.isFinite(d) && d > 0) setThaiDuration(d);
                    }}
                    onTimeUpdate={(e) => setThaiRawTime(e.currentTarget.currentTime)}
                    onPlay={() => {
                      setIsThaiPlaying(true);
                      setIsKaraokeDemoPlaying(false);
                    }}
                    onPause={() => setIsThaiPlaying(false)}
                    onEnded={() => setIsThaiPlaying(false)}
                    onError={() => {
                      setIsThaiPlaying(false);
                      if (!thaiTrack.isBlobUrl && thaiTrack.rawMp3Url && !thaiTrack.fallbackTried) {
                        const isProxy = thaiTrack.srcUrl.startsWith('/api/audio-proxy');
                        replaceThaiTrack({
                          ...thaiTrack,
                          srcUrl: isProxy ? thaiTrack.rawMp3Url : buildAudioProxyUrl(thaiTrack.rawMp3Url),
                          fallbackTried: true,
                          autoPlay: true,
                        });
                      } else {
                        showToast('泰语音频流加载失败，可点「缓存」或换本地音频', 'error');
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-300">
                    <span>
                      {formatClock(thaiRawTime)}
                      {thaiDuration > 0 ? ` / ${formatClock(thaiDuration)}` : ''}
                      {' · '}偏移 {thaiTrack.offsetSeconds >= 0 ? `+${thaiTrack.offsetSeconds}` : thaiTrack.offsetSeconds}s
                    </span>

                    <div className="flex items-center gap-1">
                      {[-0.5, 0.5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleNudgeOffset('thai_audio', d)}
                          className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                        >
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAlignCurrentTrack('thai_audio')}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-sans font-bold cursor-pointer"
                        title="将泰语音频当前播放时刻对齐第 X 句字幕"
                      >
                        对齐此刻
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-stone-300">
                    本课（{currentLesson.date}）暂未自动匹配到泰语录音
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioPickerFocusTrack('thai_audio');
                        setExternalExpandSignal({
                          tab: 'catalog',
                          sourceKind: 'audio',
                          focusTrack: 'thai_audio',
                          nonce: Date.now(),
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                    >
                      从目录选音频
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioPickerFocusTrack('thai_audio');
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      本地导入
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧音频框：🇨🇳 中文同传 */}
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3 sm:px-3.5 py-2 flex flex-wrap items-center justify-between text-xs text-amber-100 gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full ${isChinesePlaying ? 'bg-amber-400' : 'bg-stone-500'}`} />
                <span className="font-bold whitespace-nowrap">🇨🇳 中文同传</span>
                <span className="text-[10px] text-stone-300 whitespace-nowrap">
                  ({isChinesePlaying ? '播放中' : '已暂停'})
                </span>
                <span className="hidden sm:inline text-[10px] text-amber-300/90 font-mono">
                  · 音量 {chineseVol}%
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {chineseTrack && !chineseTrack.isBlobUrl && chineseTrack.rawMp3Url && (
                  <button
                    type="button"
                    disabled={Boolean(cachingKey)}
                    onClick={() =>
                      handleCacheTrack({
                        key: 'chinese_header',
                        mp3Url: chineseTrack.rawMp3Url!,
                        fileName: chineseTrack.fileName,
                        fileCode: chineseTrack.fileCode,
                        trackType: 'chinese_audio',
                      })
                    }
                    className="px-2 py-1 rounded bg-stone-800/90 hover:bg-stone-700 text-amber-200 border border-stone-600/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    title="缓存至本机离线收听"
                  >
                    <Save className="w-3 h-3" />
                    <span>{cachingKey === 'chinese_header' ? cachingProgress || '...' : '缓存'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAudioPickerFocusTrack('chinese_audio');
                    setExternalExpandSignal({
                      tab: 'catalog',
                      sourceKind: 'audio',
                      focusTrack: 'chinese_audio',
                      nonce: Date.now(),
                    });
                  }}
                  className="px-2 py-1 rounded bg-stone-800/90 hover:bg-stone-700 text-stone-200 border border-stone-600/60 text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                  title="半自动挑选同日中文开示或导入本地音频"
                >
                  换音频
                </button>

                <button
                  type="button"
                  onClick={handleToggleChineseSolo}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                >
                  {isChinesePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isChinesePlaying ? '暂停中文' : '播放中文'}</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-gradient-to-br from-[#231f1b] via-[#2b2621] to-[#1c1916] text-amber-100 flex-1 flex flex-col justify-between gap-2.5">
              {chineseTrack ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-bold text-white truncate max-w-[190px] sm:max-w-[260px]">
                        {chineseTrack.fileName}
                      </span>
                      <span className="text-stone-400 font-mono truncate">
                        · {chineseTrack.sourceLabel}
                        {chineseTrack.sizeBytes ? ` (${formatBytes(chineseTrack.sizeBytes)})` : ''}
                      </span>
                    </div>

                    {datePairedCandidates.filter((r) => r.chinese).length > 1 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {datePairedCandidates
                          .filter((r) => r.chinese)
                          .map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() =>
                                handleSelectTrackStream({
                                  mp3Url: r.chinese!.mp3Url,
                                  fileName: r.chinese!.fileName,
                                  fileCode: r.chinese!.fileCode,
                                  dateLabel: r.date,
                                  trackType: 'chinese_audio',
                                  autoPlay: true,
                                })
                              }
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                                chineseTrack.rawMp3Url === r.chinese!.mp3Url
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              {r.chinese!.fileCode}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <audio
                    key={chineseTrack.srcUrl}
                    ref={chineseAudioRef}
                    src={chineseTrack.srcUrl}
                    controls
                    autoPlay={Boolean(chineseTrack.autoPlay)}
                    preload="metadata"
                    className="w-full h-10"
                    onCanPlay={(e) => {
                      if (chineseTrack.autoPlay && e.currentTarget.paused) {
                        e.currentTarget.play().catch(() => {});
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (Number.isFinite(d) && d > 0) setChineseDuration(d);
                    }}
                    onTimeUpdate={(e) => setChineseRawTime(e.currentTarget.currentTime)}
                    onPlay={() => {
                      setIsChinesePlaying(true);
                      setIsKaraokeDemoPlaying(false);
                    }}
                    onPause={() => setIsChinesePlaying(false)}
                    onEnded={() => setIsChinesePlaying(false)}
                    onError={() => {
                      setIsChinesePlaying(false);
                      if (!chineseTrack.isBlobUrl && chineseTrack.rawMp3Url && !chineseTrack.fallbackTried) {
                        const isProxy = chineseTrack.srcUrl.startsWith('/api/audio-proxy');
                        replaceChineseTrack({
                          ...chineseTrack,
                          srcUrl: isProxy ? chineseTrack.rawMp3Url : buildAudioProxyUrl(chineseTrack.rawMp3Url),
                          fallbackTried: true,
                          autoPlay: true,
                        });
                      } else {
                        showToast('中文音频加载失败，可点「缓存」或更换目录文件', 'error');
                      }
                    }}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-300">
                    <div className="flex items-center gap-1.5">
                      <span>伴弱 {chineseVol}%</span>
                      <button
                        type="button"
                        onClick={() => handleChangeChineseVol(chineseVol - 15)}
                        className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeChineseVol(chineseVol + 15)}
                        className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-stone-500">·</span>
                      <span>
                        {formatClock(chineseRawTime)}
                        {chineseDuration > 0 ? ` / ${formatClock(chineseDuration)}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[-0.5, 0.5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleNudgeOffset('chinese_audio', d)}
                          className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                        >
                          {d > 0 ? `+${d}` : d}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleAlignCurrentTrack('chinese_audio')}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-sans font-bold cursor-pointer"
                        title="将中文音频当前位置对齐第 X 句"
                      >
                        对齐此刻
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-stone-300">
                    本课（{currentLesson.date}）暂未自动匹配到中文同传
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioPickerFocusTrack('chinese_audio');
                        setExternalExpandSignal({ tab: 'catalog', sourceKind: 'audio', focusTrack: 'chinese_audio', nonce: Date.now() });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                    >
                      从目录选音频
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioPickerFocusTrack('chinese_audio');
                        fileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 cursor-pointer"
                    >
                      本地导入
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. 当前聚焦精读句大卡（与「视频学习」保持同一视觉设计与交互） */}
        {!currentLine && (
          <UnmatchedSubtitleBanner
            mediaKind="thai_audio"
            mediaIdentifier={thaiTrack?.fileName}
            inferredDate={audioSubtitleBinding.inferredDate}
            canConfirmSameDateAsLesson={Boolean(
              thaiTrack && !audioSubtitleBinding.inferredDate && audioSubtitleBinding.audioKey
            )}
            currentLessonDate={currentLesson.date}
            onConfirmSameDateAsLesson={() => {
              if (!thaiTrack || !audioSubtitleBinding.audioKey) return;
              saveBoundSubtitlesForMedia({
                mediaKey: audioSubtitleBinding.audioKey,
                mediaKind: 'thai_audio',
                thaiAudioUrl: thaiTrack.rawMp3Url,
                thaiAudioFileName: thaiTrack.fileName,
                date: currentLesson.date,
                title: currentLesson.chineseTitle || currentLesson.title,
                subtitles: currentLesson.subtitles,
                updatedAt: Date.now(),
              });
              setBindingVersion((v) => v + 1);
              setCurrentLineIndex(0);
              showToast(`已将「${thaiTrack.fileName}」确认关联到《${currentLesson.date}》字幕！`);
            }}
            onImportSubtitles={() => setShowImportSubtitlesModal(true)}
            onSwitchBackToMatchedLesson={() => {
              const target = lessons.find((l) => l.subtitles.length > 0) || lessons[0];
              if (target) {
                setCurrentLessonId(target.id);
                setCurrentLineIndex(0);
                replaceThaiTrack(null);
                showToast(`已切回课件：${target.date} · ${target.chineseTitle}`);
              }
            }}
          />
        )}
        {currentLine && (
          <div
            data-tour-id="tour-ml-subtitle-studio"
            className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 rounded-2xl p-5 sm:p-6 shadow-sm border border-amber-200/90 relative"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#b58940] text-white text-xs font-bold">
                  第 {currentLineIndex + 1} 句
                </span>
                <span className="text-xs font-medium text-stone-400">
                  / 共 {activeSubtitles.length} 句
                </span>
                <span className="text-xs font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded font-bold">
                  {currentLine.timeStart}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="一键全屏沉浸学习"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>全屏</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAlignCurrentTrack(audioFocus === 'chinese' ? 'chinese_audio' : 'thai_audio')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="以音频当前播放时间对齐到本句字幕"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎯 对齐进度</span>
                </button>

                <button
                  type="button"
                  onClick={() => speakThai(currentLine.thai)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#b58940]" />
                  <span>朗读泰文</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenKeyboard?.(currentLine.thai)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span>⌨️ 键盘打卡</span>
                </button>
              </div>
            </div>

            {/* 逐词卡拉OK试听控制栏 */}
            <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-300/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (isKaraokeDemoPlaying) {
                      setIsKaraokeDemoPlaying(false);
                    } else {
                      thaiAudioRef.current?.pause();
                      chineseAudioRef.current?.pause();
                      setKaraokeDemoTime(currentLine.secondsStart);
                      setIsKaraokeDemoPlaying(true);
                      speakThai(currentLine.thai);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer ${
                    isKaraokeDemoPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400'
                      : 'bg-[#b58940] hover:bg-[#9a7231] text-white'
                  }`}
                >
                  {isKaraokeDemoPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>暂停演练</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>🎤 逐词显示试听</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsKaraokeDemoPlaying(false);
                    setKaraokeDemoTime(currentLine.secondsStart);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>重置</span>
                </button>
              </div>

              <div className="text-xs text-stone-600">
                {activeSlotIndex >= 0 && currentWordSlots[activeSlotIndex] ? (
                  <span className="font-medium text-amber-900">
                    第 {activeSlotIndex + 1}/{currentWordSlots.length} 词：{currentWordSlots[activeSlotIndex].word.thai}
                  </span>
                ) : (
                  <span className="text-stone-500 text-[11px]">
                    点击任意单词可发音查词根
                  </span>
                )}
              </div>
            </div>

            {/* 泰文整句高亮 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-[#2d2a26] leading-relaxed tracking-wide my-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {currentWordSlots.length > 0 ? (
                currentWordSlots.map((slot) => {
                  const pInfo = wordProgressMap[slot.wordId] || { progress: 0, status: 'pending' };
                  const isActive = pInfo.status === 'active';
                  const isDone = pInfo.status === 'completed';
                  return (
                    <span
                      key={slot.wordId}
                      onClick={() => {
                        speakThai(slot.word.thai);
                        onSelectWord?.(slot.word);
                      }}
                      className={`relative inline-block cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'text-amber-900 scale-[1.03] font-black'
                          : isDone
                          ? 'text-stone-800'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      <span>{slot.word.thai}</span>
                      <span className="block w-full h-[3px] bg-stone-200/60 rounded-full overflow-hidden mt-0.5">
                        <span
                          className={`block h-full rounded-full transition-all duration-75 ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'
                              : isDone
                              ? 'bg-emerald-500'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${pInfo.progress}%` }}
                        />
                      </span>
                    </span>
                  );
                })
              ) : (
                <span>{currentLine.thai}</span>
              )}
            </div>

            {/* 逐词卡片 */}
            {currentLine.words && currentLine.words.length > 0 && (
              <div className="my-3.5 flex flex-wrap gap-2 items-end">
                {currentLine.words.map((w, wIdx) => {
                  const pInfo = wordProgressMap[w.id || `word_${wIdx}`] || { progress: 0, status: 'pending' };
                  const isActive = pInfo.status === 'active';
                  const isDone = pInfo.status === 'completed';
                  return (
                    <button
                      key={w.id || `ml_w_${wIdx}`}
                      type="button"
                      onClick={() => {
                        speakThai(w.thai);
                        onSelectWord?.(w);
                      }}
                      className={`group relative flex flex-col items-center border rounded-xl px-2.5 py-1.5 shadow-sm transition-all duration-150 text-left cursor-pointer min-w-[72px] ${
                        isActive
                          ? 'bg-gradient-to-b from-amber-50 to-amber-100/90 border-amber-500 ring-2 ring-amber-400/80 shadow-md scale-[1.04]'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-300/80 hover:bg-emerald-50/70'
                          : w.isCore
                          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                          : 'bg-white hover:bg-amber-50/80 border-amber-200/80'
                      }`}
                    >
                      <span className={`font-bold text-base leading-tight ${isActive ? 'text-amber-950 font-extrabold' : 'text-[#2d2a26]'}`}>
                        {w.thai}
                      </span>
                      <span className="text-[11px] font-mono text-[#b58940] mt-0.5">/{w.romanization}/</span>
                      <span className="text-[11px] font-medium text-[#7a6f5f] group-hover:text-amber-900 mt-0.5">{w.chinese}</span>
                      <div className="w-full h-1.5 bg-stone-200/90 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'
                              : isDone
                              ? 'bg-emerald-500'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${pInfo.progress}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentLine.romanization && (
              <div className="text-xs sm:text-sm font-mono text-[#b58940] my-1 font-medium">
                /{currentLine.romanization}/
              </div>
            )}

            <div className="text-base sm:text-lg font-medium text-[#5b3f1e] mt-2 border-t border-amber-200/50 pt-2">
              {currentLine.chinese}
            </div>
          </div>
        )}

        {/* 4. 法谈句子对照列表（与「视频学习」共用同一套数据与样式） */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e6d3ac]/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6d2] pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#2d2a26] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#b58940]" />
                <span>法谈句子对照列表</span>
              </h2>
              <span className="text-xs text-[#7a6f5f] px-2 py-0.5 rounded bg-stone-100 font-bold">
                {filteredSubtitles.length} / {activeSubtitles.length} 句
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索泰文 / 音标 / 中文"
                  className="min-h-[36px] w-44 sm:w-52 pl-8 pr-3 py-1 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#2d2a26] focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
            {activeSubtitles.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#7a6f5f] space-y-2">
                <p>当前泰语音频尚未关联字幕记录（已自动隐藏其他场次字幕，避免错配）。</p>
                <p className="text-[11px] text-stone-400">
                  可点击上方「切回已有字幕课件」或「为本音频导入对应字幕」继续学习。
                </p>
              </div>
            ) : filteredSubtitles.map((sub) => {
              const idx = sub.id - 1;
              const isActive = sub.id === currentLine?.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => handleJumpToSentence(idx)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-amber-50/90 border-amber-400 shadow-xs'
                      : 'bg-stone-50/50 border-stone-200/70 hover:border-amber-300/70 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="text-[11px] font-mono text-[#b58940] font-bold tabular-nums">
                      第 {sub.id} 句 · {sub.timeStart}
                    </div>
                    <div className="text-sm font-semibold text-[#2d2a26]">{sub.thai}</div>
                    <div className="text-xs text-[#5b3f1e]">{sub.chinese}</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakThai(sub.thai);
                    }}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-white hover:bg-amber-100 text-[#b58940] border border-amber-200 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="朗读泰文"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. 统一悬浮底部播放主控台 */}
      <UnifiedPlayerDock
        currentLineIndex={currentLineIndex}
        totalLines={activeSubtitles.length}
        clockLabel={formatClock(thaiRawTime)}
        isPlaying={isCurrentModePlaying}
        audioFocus={audioFocus}
        hasChineseTrack={true}
        isLoopSentence={isLoopSentence}
        playbackRate={playbackRate}
        onAlignCurrent={() => handleAlignCurrentTrack(audioFocus === 'chinese' ? 'chinese_audio' : 'thai_audio')}
        onPrevLine={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1), isCurrentModePlaying)}
        onTogglePlay={handleMasterPlayToggle}
        onNextLine={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1), isCurrentModePlaying)}
        onSelectFocus={(focus) => setAudioFocus(focus)}
        onToggleLoop={() => setIsLoopSentence((v) => !v)}
        onChangePlaybackRate={(rate) => setPlaybackRate(rate)}
      />

      {/* 6. 一键全屏沉浸舞台（保留底层 <audio> 不断播） */}
      {isFullscreen && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[70] bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 overflow-y-auto select-none"
        >
          <div className="w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="min-w-0 flex items-center gap-2 text-xs">
              <Headphones className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-white truncate max-w-[180px] sm:max-w-md">
                {audioSubtitleBinding.isMatched
                  ? `${currentLesson.date} · ${currentLesson.chineseTitle || currentLesson.title}`
                  : thaiTrack?.fileName || '自定义音频'}
              </span>
              <span className="text-slate-400 font-mono tabular-nums shrink-0">
                {activeSubtitles.length > 0
                  ? `· 第 ${currentLineIndex + 1} / ${activeSubtitles.length} 句`
                  : '· 暂无对应字幕'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const rates = [0.75, 1.0, 1.25];
                  setPlaybackRate(rates[(rates.indexOf(playbackRate) + 1) % rates.length]);
                }}
                className="min-h-[38px] px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs font-bold cursor-pointer"
              >
                {playbackRate}x
              </button>

              <button
                type="button"
                onClick={() => setIsLoopSentence((v) => !v)}
                className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  isLoopSentence
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">循环</span>
              </button>

              <button
                type="button"
                onClick={exitFullscreen}
                className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>退出全屏</span>
              </button>
            </div>
          </div>

          {!currentLine && (
            <div className="w-full my-auto py-8">
              <UnmatchedSubtitleBanner
                mediaKind="thai_audio"
                mediaIdentifier={thaiTrack?.fileName}
                inferredDate={audioSubtitleBinding.inferredDate}
                isFullscreen={true}
                onImportSubtitles={() => {
                  exitFullscreen();
                  setShowImportSubtitlesModal(true);
                }}
                onSwitchBackToMatchedLesson={() => {
                  const target = lessons.find((l) => l.subtitles.length > 0) || lessons[0];
                  if (target) {
                    setCurrentLessonId(target.id);
                    setCurrentLineIndex(0);
                    replaceThaiTrack(null);
                    showToast(`已切回课件：${target.date} · ${target.chineseTitle}`);
                  }
                }}
              />
            </div>
          )}

          {currentLine && (
            <div className="w-full max-w-4xl mx-auto my-auto py-6 flex flex-col items-center gap-6">
              {thaiTrack && (
                <div className="text-xs font-mono text-amber-300/90 flex items-center gap-2">
                  <span>{thaiTrack.fileName}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>
                    {formatClock(thaiRawTime)}
                    {thaiDuration > 0 ? ` / ${formatClock(thaiDuration)}` : ''}
                  </span>
                </div>
              )}

              <div className="w-full flex flex-wrap items-end justify-center gap-x-5 sm:gap-x-7 gap-y-4">
                {currentLine.words && currentLine.words.length > 0 ? (
                  currentLine.words.map((w, idx) => {
                    const p = wordProgressMap[w.id || `word_${idx}`] || { progress: 0, status: 'pending' };
                    const isActive = p.status === 'active';
                    return (
                      <button
                        key={w.id || `fs_w_${idx}`}
                        type="button"
                        onClick={() => {
                          speakThai(w.thai);
                          onSelectWord?.(w);
                        }}
                        className={`flex flex-col items-center px-2.5 py-2 rounded-2xl transition cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/15 ring-1 ring-amber-400/60 scale-[1.04]'
                            : 'hover:bg-slate-900'
                        }`}
                      >
                        <span className={`text-2xl sm:text-4xl font-extrabold tracking-wide ${isActive ? 'text-amber-300' : 'text-white'}`}>
                          {w.thai}
                        </span>
                        <span className="text-xs sm:text-sm font-mono text-amber-400 mt-1">/{w.romanization}/</span>
                        <span className="text-xs sm:text-sm text-slate-300 mt-0.5">{w.chinese}</span>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-amber-400 transition-all duration-75" style={{ width: `${p.progress}%` }} />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-3xl sm:text-4xl font-extrabold text-white text-center">{currentLine.thai}</div>
                )}
              </div>

              <div className="text-base sm:text-xl text-slate-200 text-center leading-relaxed max-w-3xl border-t border-slate-800/80 pt-4">
                {currentLine.chinese}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => speakThai(currentLine.thai)}
                  className="min-h-[42px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>朗读泰文</span>
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1), isCurrentModePlaying)}
              disabled={activeSubtitles.length === 0 || currentLineIndex <= 0}
              className="min-h-[46px] min-w-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleMasterPlayToggle}
              className="min-h-[46px] flex-1 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCurrentModePlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>播放</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1), isCurrentModePlaying)}
              disabled={activeSubtitles.length === 0 || currentLineIndex >= activeSubtitles.length - 1}
              className="min-h-[46px] min-w-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}



      {/* 9. 离线音频库与录音弹窗 */}
      <OfflineAudioModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        lessons={lessons}
        currentLesson={currentLesson}
        activeOfflineTracks={{
          thai: thaiTrack?.isBlobUrl ? { fileName: thaiTrack.fileName, lessonId: thaiTrack.lessonId } : undefined,
          chinese: chineseTrack?.isBlobUrl ? { fileName: chineseTrack.fileName, lessonId: chineseTrack.lessonId } : undefined,
        }}
        onAudioActivated={handleActivatedFromModal}
        onClearActiveTrack={(trackType) => {
          if (trackType === 'thai_audio') replaceThaiTrack(null);
          else if (trackType === 'chinese_audio') replaceChineseTrack(null);
        }}
      />

      {/* 10. 为当前未匹配泰语音频导入专属绑定字幕 */}
      <CourseStudioModal
        isOpen={showImportSubtitlesModal}
        onClose={() => setShowImportSubtitlesModal(false)}
        prefillConfig={{
          title: thaiTrack?.fileName || currentLesson.chineseTitle || '音频配套字幕',
          date: audioSubtitleBinding.inferredDate || thaiTrack?.dateLabel || currentLesson.date,
          audioMediaKey: audioSubtitleBinding.audioKey || undefined,
          audioFileName: thaiTrack?.fileName,
          audioUrl: thaiTrack?.rawMp3Url,
        }}
        onLessonCreatedAndLoaded={(lesson) => {
          setBindingVersion((v) => v + 1);
          setCurrentLineIndex(0);
          setShowImportSubtitlesModal(false);
          showToast(
            `已为当前泰语音频「${thaiTrack?.fileName || lesson.date}」绑定 ${lesson.subtitles.length} 句专属字幕`
          );
        }}
      />
    </div>
  );
};
