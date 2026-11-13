import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SubtitleLine, WordToken, DualVideoConfig, CuratedLesson } from '../types';
import { OCT_18_BENCHMARK_CONFIG, OCT_18_LIVE_SUBTITLES } from '../data/luangporCourseData';
import { getAllCuratedLessons, getFlagshipLesson } from '../data/presetLessonsLibrary';
import { parseLanguageReactorText, formatSecondsToTime } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT, exportToEnhancedSRT } from '../utils/lrFormatParser';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { 
  Play, Pause, RotateCcw, Volume2, Volume1, Settings, Sparkles, CheckCircle2,
  Repeat, Headphones, Video, BookOpen, Check, Search, ClipboardPaste,
  SlidersHorizontal, Clock, Bot, Copy, ChevronLeft, ChevronRight,
  FolderOpen, Upload, FileText, FileCheck2, Trash2, Library, X, ExternalLink,
  Lock, LockOpen, Mic, Globe
} from 'lucide-react';
import {
  offlineAudioStorage,
  OfflineAudioMeta,
  OfflineTrackType,
  formatBytes,
} from '../services/offlineAudioStorage';
import { OfflineAudioModal } from './OfflineAudioModal';
import { 
  computeSentenceWordSlots, 
  getKaraokeWordProgress, 
  WordProgressInfo 
} from '../utils/karaokeTiming';
import { 
  OFFICIAL_THAI_STREAMS_URL, 
  OFFICIAL_CHINESE_SEARCH_URL, 
  OFFICIAL_PAIRED_DISCOURSES,
  DHAMMA_EXTERNAL_PLATFORMS
} from '../data/officialChannels';

interface DualVideoSyncAlignPlayerProps {
  subtitles?: SubtitleLine[];
  onSelectWord?: (word: WordToken) => void;
  onOpenKeyboard?: (thaiText: string) => void;
  onSpeak?: (text: string, rate?: number) => void;
  onGoToSlides?: () => void;
  onUpdateSubtitles?: (newSubs: SubtitleLine[]) => void;
  /** 外部受控：中文轨基准偏移量（秒） */
  offsetSeconds?: number;
  /** 外部受控：是否锁定偏移量（锁定后调整将立即同步 seek） */
  isOffsetLocked?: boolean;
  /** 偏移量变化回调 */
  onOffsetChange?: (offset: number, locked: boolean) => void;
  /** 打开管理后台 */
  onOpenAdmin?: () => void;
  /** 切换到极简沉浸版 */
  onSwitchToMinimal?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// 提取 YouTube Video ID 辅助函数
export function extractYouTubeId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return '';
}

// 检测是否为苹果 iOS / iPadOS 设备 (WebKit 单一音频输出通道限制，坚决确保安卓与PC绝不误伤)
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // 安卓设备与桌面端绝对排除，保持原生畅播
  if (/Android/i.test(ua) || /Windows/i.test(ua) || /Linux/i.test(ua)) return false;
  const isIOSPlatform = /iPad|iPhone|iPod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return isIOSPlatform || isIPadOS;
}

// 6 大权威站点官方原生 SVG Icon 渲染中枢
export const renderPlatformIcon = (id: string) => {
  switch (id) {
    case 'youtube':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF0000" />
          <path d="M9.75 8.5L15.75 12L9.75 15.5V8.5Z" fill="white" />
        </svg>
      );
    case 'facebook':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#1877F2" />
          <path d="M16.5 12H13.8V21H10.1V12H8.5V8.9H10.1V6.9C10.1 5.3 11 3 14.6 3L17.2 3.01V5.9H15.3C14.2 5.9 13.8 6.5 13.8 7.3V8.9H17.2L16.5 12Z" fill="white" />
        </svg>
      );
    case 'yixin':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#047857" />
          <path d="M12 4.5C12 4.5 14.5 8 14.5 11C14.5 12.4 13.4 13.5 12 13.5C10.6 13.5 9.5 12.4 9.5 11C9.5 8 12 4.5 12 4.5Z" fill="#FDE047" />
          <path d="M7.5 11.5C7.5 11.5 9.5 12.8 10.5 14.5C11 15.5 10.5 16.8 9.2 16.8C8 16.8 6.5 15 6.5 13.2C6.5 12.2 7 11.7 7.5 11.5Z" fill="#A7F3D0" />
          <path d="M16.5 11.5C16.5 11.5 14.5 12.8 13.5 14.5C13 15.5 13.5 16.8 14.8 16.8C16 16.8 17.5 15 17.5 13.2C17.5 12.2 17 11.7 16.5 11.5Z" fill="#A7F3D0" />
          <circle cx="12" cy="16.2" r="1.3" fill="#FFFFFF" />
        </svg>
      );
    case 'fazang':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#78350F" />
          <path d="M6 6.5C6 5.7 6.7 5 7.5 5H17C17.6 5 18 5.4 18 6V17C18 17.6 17.6 18 17 18H7.5C6.7 18 6 17.3 6 16.5V6.5Z" stroke="#FDE68A" strokeWidth="1.4" />
          <circle cx="12" cy="11.5" r="3.6" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          <circle cx="12" cy="11.5" r="1" fill="#FEF3C7" />
          <path d="M12 8.5V14.5M9 11.5H15" stroke="#FDE68A" strokeWidth="0.8" />
        </svg>
      );
    case 'jietuoyuan':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#92400E" />
          <path d="M12 3.8L18 8.2H6L12 3.8Z" fill="#FEF3C7" />
          <rect x="7.5" y="9.2" width="9" height="1.4" rx="0.5" fill="#FDE68A" />
          <circle cx="12" cy="15" r="3.8" stroke="#FEF3C7" strokeWidth="1.2" />
          <circle cx="12" cy="15" r="1" fill="#FEF3C7" />
          <path d="M12 11.2V18.8M8.2 15H15.8M9.3 12.3L14.7 17.7M14.7 12.3L9.3 17.7" stroke="#FEF3C7" strokeWidth="0.75" />
        </svg>
      );
    case 'ganluyu':
      return (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0284C7" />
          <path d="M12 4C12 4 8 9.5 8 13C8 15.2 9.8 17 12 17C14.2 17 16 15.2 16 13C16 9.5 12 4 12 4Z" fill="#E0F2FE" />
          <path d="M10.8 12C10.8 10.5 12 8 12 8C12 8 13.2 10.5 13.2 12C13.2 12.7 12.7 13.2 12 13.2C11.3 13.2 10.8 12.7 10.8 12Z" fill="#38BDF8" />
          <path d="M6.5 18.5C8.5 17.6 10.5 18 12 18C13.5 18 15.5 17.6 17.5 18.5" stroke="#BAE6FD" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
};

const STORAGE_KEY = 'luangpor_custom_dual_video_v3';
const SUBTITLES_STORAGE_KEY = 'luangpor_active_subtitles_v3';

export const DualVideoSyncAlignPlayer: React.FC<DualVideoSyncAlignPlayerProps> = ({
  subtitles: propsSubtitles,
  onSelectWord,
  onOpenKeyboard,
  onSpeak,
  onGoToSlides,
  onUpdateSubtitles,
  offsetSeconds: propOffsetSeconds,
  isOffsetLocked: propIsOffsetLocked,
  onOffsetChange,
  onOpenAdmin,
  onSwitchToMinimal,
}) => {
  // 苹果 iOS 设备标记 (WebKit 单音频专属策略，安卓与电脑绝不受限)
  const [isAppleDevice] = useState(() => isIOSDevice());
  const isIOS = isAppleDevice;

  // 中文视频是否收起画面只出声音 (满足手机/苹果端画幅优化与音频随听需求)
  const [chineseAudioOnlyMode, setChineseAudioOnlyMode] = useState(false);

  // 1. 基础视频与校准配置
  const [config, setConfig] = useState<DualVideoConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.thaiVideoUrl || parsed.chineseVideoUrl)) {
          // 自动修复旧版失效的 synthetic 404 直链
          if (parsed.chineseVideoUrl?.includes('/video/2026/20261025') || parsed.chineseVideoUrl?.includes('video/2026')) {
            parsed.chineseVideoUrl = 'https://media.dhamma.cn/9/9b/D26.86%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8825%E6%97%A5.mp4';
          }
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return OCT_18_BENCHMARK_CONFIG;
  });

  const [inputThaiUrl, setInputThaiUrl] = useState(config.thaiVideoUrl);
  const [inputChineseUrl, setInputChineseUrl] = useState(config.chineseVideoUrl);
  const [inputTitle, setInputTitle] = useState(config.title);

  // 2. 字幕轨数据
  const [activeSubtitles, setActiveSubtitles] = useState<SubtitleLine[]>(() => {
    if (propsSubtitles && propsSubtitles.length >= 700 && propsSubtitles[0]?.words?.length > 0) return propsSubtitles;
    try {
      const savedSubs = localStorage.getItem(SUBTITLES_STORAGE_KEY);
      if (savedSubs) {
        const parsed = JSON.parse(savedSubs);
        if (Array.isArray(parsed) && parsed.length >= 700 && parsed[0]?.words?.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return OCT_18_LIVE_SUBTITLES;
  });

  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // 3. 独立与协同播放状态
  const [isBothPlaying, setIsBothPlaying] = useState(false);
  const [isThaiPlaying, setIsThaiPlaying] = useState(false);
  const [isChinesePlaying, setIsChinesePlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // 泰文基准时间
  const [offsetSeconds, setOffsetSeconds] = useState<number>(() => {
    if (typeof propOffsetSeconds === 'number') return propOffsetSeconds;
    if (typeof config?.offsetSeconds === 'number') return config.offsetSeconds;
    return 0.0;
  });
  const [isOffsetLocked, setIsOffsetLocked] = useState<boolean>(() => {
    if (typeof propIsOffsetLocked === 'boolean') return propIsOffsetLocked;
    try {
      const saved = localStorage.getItem('luangpor_offset_locked_v3');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  // 4. 声道管理与伴弱音量 (Dim)
  const [audioFocus, setAudioFocus] = useState<'thai' | 'chinese' | 'both'>('both');
  const [thaiVol, setThaiVol] = useState(100);
  const [chineseVol, setChineseVol] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('luangpor_chinese_dim_vol');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= 100) return val;
      }
    } catch {}
    return 70; // 默认采用 70% 伴弱飘心音量 (-30% 递减)
  });

  // 5. 纯净每一句循环与播放倍速
  const [isLoopSentence, setIsLoopSentence] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // 6. 预制精品课件库与弹窗设置
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [curatedLessons, setCuratedLessons] = useState<CuratedLesson[]>(() => getAllCuratedLessons());
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  // 默认不勾选自动滚动，避免列表频繁自动翻动打扰学习
  const [autoScroll, setAutoScroll] = useState(false);

  // 选择预制课件（严格按视频原标题：中文在前，泰文在后）
  const handleSelectPresetLesson = (lesson: CuratedLesson) => {
    const combinedTitle = `${lesson.chineseTitle} ｜ ${lesson.title}`;
    const newConf: DualVideoConfig = {
      title: combinedTitle,
      thaiVideoUrl: lesson.thaiVideoUrl,
      chineseVideoUrl: lesson.chineseVideoUrl,
      offsetSeconds: lesson.defaultOffsetSeconds,
      thaiVolume: 1.0,
      chineseVolume: chineseVol / 100
    };
    saveConfig(newConf);
    setOffsetSeconds(lesson.defaultOffsetSeconds);
    onOffsetChange?.(lesson.defaultOffsetSeconds, isOffsetLocked);
    setInputThaiUrl(lesson.thaiVideoUrl);
    setInputChineseUrl(lesson.chineseVideoUrl);
    setInputTitle(combinedTitle);
    saveSubtitles(lesson.subtitles);
    setCurrentLineIndex(0);
    setShowPresetModal(false);
    triggerToast(`已成功调入官方预制课件: ${lesson.chineseTitle}`);
  };

  // 7. 搜索过滤
  const [searchQuery, setSearchQuery] = useState('');

  // 8. 导入与文件读取状态
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    name: string;
    size: string;
    linesCount: number;
  } | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showRawTextarea, setShowRawTextarea] = useState(false);
  const [parseResult, setParseResult] = useState<{
    subtitles: SubtitleLine[];
    detectedTitle?: string;
    totalParsed: number;
  }>({ subtitles: [], totalParsed: 0 });
  const [copiedPromptInModal, setCopiedPromptInModal] = useState(false);

  // YouTube 播放器引用与状态
  const thaiPlayerRef = useRef<any>(null);
  const chinesePlayerRef = useRef<any>(null);
  const thaiHtml5AudioRef = useRef<HTMLAudioElement | null>(null);
  const chineseHtml5MediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [chineseMediaError, setChineseMediaError] = useState<boolean>(false);
  const isThaiReadyRef = useRef<boolean>(false);
  const isChineseReadyRef = useRef<boolean>(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // 离线纯音频与录音弹窗状态
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [thaiOfflineAudio, setThaiOfflineAudio] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    offsetSeconds: number;
    lessonId: string;
    trackType: OfflineTrackType;
  } | null>(null);
  const [chineseOfflineAudio, setChineseOfflineAudio] = useState<{
    url: string;
    fileName: string;
    sizeBytes: number;
    offsetSeconds: number;
    lessonId: string;
    trackType: OfflineTrackType;
  } | null>(null);
  const [useOfflineThai, setUseOfflineThai] = useState(false);
  const [useOfflineChinese, setUseOfflineChinese] = useState(false);
  const thaiOfflineUrlRef = useRef<string | null>(null);
  const chineseOfflineUrlRef = useRef<string | null>(null);

  const isThaiOfflineActive = Boolean(useOfflineThai && thaiOfflineAudio);
  const isChineseOfflineActive = Boolean(useOfflineChinese && chineseOfflineAudio);

  const replaceThaiOfflineAudio = useCallback((next: typeof thaiOfflineAudio) => {
    if (thaiOfflineUrlRef.current && thaiOfflineUrlRef.current !== next?.url) {
      URL.revokeObjectURL(thaiOfflineUrlRef.current);
    }
    thaiOfflineUrlRef.current = next ? next.url : null;
    setThaiOfflineAudio(next);
  }, []);

  const replaceChineseOfflineAudio = useCallback((next: typeof chineseOfflineAudio) => {
    if (chineseOfflineUrlRef.current && chineseOfflineUrlRef.current !== next?.url) {
      URL.revokeObjectURL(chineseOfflineUrlRef.current);
    }
    chineseOfflineUrlRef.current = next ? next.url : null;
    setChineseOfflineAudio(next);
  }, []);

  useEffect(() => {
    return () => {
      if (thaiOfflineUrlRef.current) URL.revokeObjectURL(thaiOfflineUrlRef.current);
      if (chineseOfflineUrlRef.current) URL.revokeObjectURL(chineseOfflineUrlRef.current);
    };
  }, []);

  // 当视频链接改变时，自动重置媒体错误状态
  useEffect(() => {
    setChineseMediaError(false);
  }, [config.chineseVideoUrl]);

  const thaiVideoId = extractYouTubeId(config.thaiVideoUrl);
  const chineseVideoId = extractYouTubeId(config.chineseVideoUrl);
  const hasChineseMedia = Boolean(
    chineseVideoId ||
    (config.chineseVideoUrl && config.chineseVideoUrl.trim() !== '') ||
    isChineseOfflineActive
  );

  useEffect(() => {
    if (!hasChineseMedia && audioFocus !== 'thai') {
      setAudioFocus('thai');
    }
  }, [hasChineseMedia, audioFocus]);

  const currentLine = activeSubtitles[currentLineIndex] || activeSubtitles[0];

  const currentCuratedLesson = useMemo(() => {
    return curatedLessons.find(l => 
      config.title.includes(l.chineseTitle) ||
      l.chineseTitle === config.title || 
      (thaiVideoId && l.thaiVideoId === thaiVideoId) || 
      (chineseVideoId && l.chineseVideoId === chineseVideoId)
    ) || curatedLessons[0];
  }, [curatedLessons, config.title, thaiVideoId, chineseVideoId]);

  // 切换课程时自动检索 IndexedDB 中的离线纯音频
  useEffect(() => {
    let cancelled = false;
    offlineAudioStorage
      .getLessonTracks(currentCuratedLesson.id)
      .then((tracks) => {
        if (cancelled) return;
        if (tracks.thai_audio) {
          const rec = tracks.thai_audio;
          replaceThaiOfflineAudio({
            url: URL.createObjectURL(rec.blob),
            fileName: rec.fileName,
            sizeBytes: rec.sizeBytes,
            offsetSeconds: rec.offsetSeconds || 0,
            lessonId: rec.lessonId,
            trackType: rec.trackType,
          });
          setUseOfflineThai(true);
        } else {
          replaceThaiOfflineAudio(null);
          setUseOfflineThai(false);
        }

        if (tracks.chinese_audio) {
          const rec = tracks.chinese_audio;
          replaceChineseOfflineAudio({
            url: URL.createObjectURL(rec.blob),
            fileName: rec.fileName,
            sizeBytes: rec.sizeBytes,
            offsetSeconds: rec.offsetSeconds || 0,
            lessonId: rec.lessonId,
            trackType: rec.trackType,
          });
          setUseOfflineChinese(true);
        } else {
          replaceChineseOfflineAudio(null);
          setUseOfflineChinese(false);
        }
      })
      .catch(() => {
        // ignore IndexedDB unavailable
      });
    return () => {
      cancelled = true;
    };
  }, [currentCuratedLesson.id, replaceThaiOfflineAudio, replaceChineseOfflineAudio]);

  // 🎤 卡拉OK逐词高亮与交互演练样板状态
  const [isKaraokeDemoPlaying, setIsKaraokeDemoPlaying] = useState<boolean>(false);
  const [karaokeDemoTime, setKaraokeDemoTime] = useState<number>(0);
  const [karaokeDemoSpeed, setKaraokeDemoSpeed] = useState<number>(1.0);
  const [isKaraokeEnabled] = useState<boolean>(true);

  // 计算当前聚焦句子的所有单词时间槽 (按音节与泰文字符权重推演)
  const currentWordSlots = useMemo(() => {
    if (!currentLine) return [];
    return computeSentenceWordSlots(currentLine);
  }, [currentLine]);

  // 当当前句改变时，将卡拉OK演示时间重置为新句起点
  useEffect(() => {
    if (currentLine) {
      setKaraokeDemoTime(currentLine.secondsStart);
    }
  }, [currentLineIndex, currentLine?.secondsStart]);

  // 决定用于卡拉OK高亮的有效播放时间戳
  const effectiveKaraokeTime = useMemo(() => {
    if (isKaraokeDemoPlaying) {
      return karaokeDemoTime;
    }
    if (isThaiPlaying || isChinesePlaying) {
      return currentTime;
    }
    if (karaokeDemoTime > 0) {
      return karaokeDemoTime;
    }
    return currentLine ? currentLine.secondsStart : 0;
  }, [isKaraokeDemoPlaying, karaokeDemoTime, isThaiPlaying, isChinesePlaying, currentTime, currentLine]);

  // 计算各个词块的卡拉OK彩色线条进度与当前发音词索引
  const { activeSlotIndex, wordProgressMap } = useMemo(() => {
    if (!isKaraokeEnabled) {
      return { activeSlotIndex: -1, wordProgressMap: {} };
    }
    return getKaraokeWordProgress(effectiveKaraokeTime, currentWordSlots);
  }, [effectiveKaraokeTime, currentWordSlots, isKaraokeEnabled]);

  // 提示信息
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  // 保存当前配置
  const saveConfig = useCallback((newConf: DualVideoConfig) => {
    setConfig(newConf);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConf));
      triggerToast('设置已保存');
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 保存字幕
  const saveSubtitles = useCallback((newSubs: SubtitleLine[]) => {
    setActiveSubtitles(newSubs);
    if (onUpdateSubtitles) {
      onUpdateSubtitles(newSubs);
    }
    try {
      localStorage.setItem(SUBTITLES_STORAGE_KEY, JSON.stringify(newSubs));
    } catch (e) {
      console.error(e);
    }
  }, [onUpdateSubtitles]);

  // 应用声道设置与音量 (同步支持 YouTube 与 HTML5 离线纯音频)
  const applyAudioSettings = useCallback((focus: 'thai' | 'chinese' | 'both', tVol: number, cVol: number) => {
    try {
      if (focus === 'thai') {
        thaiPlayerRef.current?.unMute?.();
        thaiPlayerRef.current?.setVolume?.(tVol);
        chinesePlayerRef.current?.mute?.();
      } else if (focus === 'chinese') {
        thaiPlayerRef.current?.mute?.();
        chinesePlayerRef.current?.unMute?.();
        chinesePlayerRef.current?.setVolume?.(cVol);
      } else {
        thaiPlayerRef.current?.unMute?.();
        thaiPlayerRef.current?.setVolume?.(tVol);
        chinesePlayerRef.current?.unMute?.();
        chinesePlayerRef.current?.setVolume?.(cVol);
      }

      if (thaiHtml5AudioRef.current) {
        if (focus === 'chinese') {
          thaiHtml5AudioRef.current.muted = true;
        } else {
          thaiHtml5AudioRef.current.muted = false;
          thaiHtml5AudioRef.current.volume = Math.max(0, Math.min(1, tVol / 100));
        }
      }

      if (chineseHtml5MediaRef.current) {
        if (focus === 'thai') {
          chineseHtml5MediaRef.current.muted = true;
        } else {
          chineseHtml5MediaRef.current.muted = false;
          chineseHtml5MediaRef.current.volume = Math.max(0, Math.min(1, cVol / 100));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    applyAudioSettings(audioFocus, thaiVol, chineseVol);
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings, isThaiOfflineActive, isChineseOfflineActive]);

  // 离线 HTML5 音频播放倍速同步
  useEffect(() => {
    if (thaiHtml5AudioRef.current) {
      thaiHtml5AudioRef.current.playbackRate = playbackRate;
    }
    if (chineseHtml5MediaRef.current) {
      chineseHtml5MediaRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isThaiOfflineActive, isChineseOfflineActive, thaiOfflineAudio?.url, chineseOfflineAudio?.url]);

  // 调整中文伴弱音量 (以 30% 幅度递减：100% -> 70% -> 40% -> 10%)
  const handleSetChineseVol = useCallback((vol: number) => {
    setChineseVol(vol);
    try {
      localStorage.setItem('luangpor_chinese_dim_vol', vol.toString());
    } catch {}

    // 如果之前是仅听泰语模式，用户调节中文音量表明需要伴随听中文，自动切换为双声道
    if (audioFocus === 'thai') {
      setAudioFocus('both');
    }

    try {
      chinesePlayerRef.current?.unMute?.();
      chinesePlayerRef.current?.setVolume?.(vol);
    } catch {}

    const tip = vol === 100 
      ? '中文音量已恢复 100% (标准同传)'
      : vol === 70 
      ? '中文伴弱 Dim: 70% (-30% 递减) · 意蕴飘心'
      : vol === 40 
      ? '中文伴弱 Dim: 40% (-60% 递减) · 轻声随听'
      : '中文伴弱 Dim: 10% (-90% 递减) · 微声浸润';
    triggerToast(tip);
  }, [audioFocus]);

  // 循环递减中文音量 (移动端一键 Dim 快捷切换：100% -> 70% -> 40% -> 10% -> 100%)
  const handleCycleChineseDim = useCallback(() => {
    if (chineseVol > 70) {
      handleSetChineseVol(70);
    } else if (chineseVol > 40) {
      handleSetChineseVol(40);
    } else if (chineseVol > 10) {
      handleSetChineseVol(10);
    } else {
      handleSetChineseVol(100);
    }
  }, [chineseVol, handleSetChineseVol]);

  // 初始化与挂载 YouTube IFrame 官方受控播放器 (离线纯音频激活时安全卸载对应 YT 实例)
  useEffect(() => {
    let isMounted = true;

    if (isThaiOfflineActive && thaiPlayerRef.current) {
      try { thaiPlayerRef.current.destroy?.(); } catch {}
      thaiPlayerRef.current = null;
      isThaiReadyRef.current = false;
    }
    if (isChineseOfflineActive && chinesePlayerRef.current) {
      try { chinesePlayerRef.current.destroy?.(); } catch {}
      chinesePlayerRef.current = null;
      isChineseReadyRef.current = false;
    }

    const initPlayers = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;

      // 泰文主控播放器 (仅在非离线音频模式下挂载)
      if (!isThaiOfflineActive && thaiVideoId && document.getElementById('thai-yt-player') && !thaiPlayerRef.current) {
        try {
          thaiPlayerRef.current = new window.YT.Player('thai-yt-player', {
            width: '100%',
            height: '100%',
            videoId: thaiVideoId,
            playerVars: {
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1
            },
            events: {
              onReady: (event: any) => {
                if (!isMounted) return;
                isThaiReadyRef.current = true;
                try {
                  event.target.setPlaybackRate(playbackRate);
                } catch {}
                applyAudioSettings(audioFocus, thaiVol, chineseVol);
              },
              onStateChange: (event: any) => {
                if (!isMounted) return;
                if (event.data === 1) {
                  setIsThaiPlaying(true);
                } else if (event.data === 2) {
                  setIsThaiPlaying(false);
                }
              }
            }
          });
        } catch (err) {
          console.error('Error creating Thai YT Player:', err);
        }
      }

      // 中文对照播放器 (仅在非离线音频模式下挂载)
      if (!isChineseOfflineActive && chineseVideoId && document.getElementById('chinese-yt-player') && !chinesePlayerRef.current) {
        try {
          chinesePlayerRef.current = new window.YT.Player('chinese-yt-player', {
            width: '100%',
            height: '100%',
            videoId: chineseVideoId,
            playerVars: {
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              controls: 1
            },
            events: {
              onReady: (event: any) => {
                if (!isMounted) return;
                isChineseReadyRef.current = true;
                try {
                  event.target.setPlaybackRate(playbackRate);
                } catch {}
                applyAudioSettings(audioFocus, thaiVol, chineseVol);
              },
              onStateChange: (event: any) => {
                if (!isMounted) return;
                if (event.data === 1) {
                  setIsChinesePlaying(true);
                } else if (event.data === 2) {
                  setIsChinesePlaying(false);
                }
              }
            }
          });
        } catch (err) {
          console.error('Error creating Chinese YT Player:', err);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayers();
    } else {
      if (!document.getElementById('youtube-iframe-api-tag')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-tag';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        initPlayers();
      };

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayers();
        }
      }, 100);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [thaiVideoId, chineseVideoId, isThaiOfflineActive, isChineseOfflineActive, applyAudioSettings, audioFocus, chineseVol, offsetSeconds, playbackRate, thaiVol]);

  // 动态更换视频链接时自动切片
  useEffect(() => {
    if (thaiPlayerRef.current && typeof thaiPlayerRef.current.cueVideoById === 'function') {
      try {
        thaiPlayerRef.current.cueVideoById(thaiVideoId);
      } catch (e) {
        console.warn('Failed to cue Thai video', e);
      }
    }
  }, [thaiVideoId]);

  useEffect(() => {
    if (chinesePlayerRef.current && typeof chinesePlayerRef.current.cueVideoById === 'function') {
      try {
        chinesePlayerRef.current.cueVideoById(chineseVideoId);
      } catch (e) {
        console.warn('Failed to cue Chinese video', e);
      }
    }
  }, [chineseVideoId]);

  // 组件卸载时安全释放播放器
  useEffect(() => {
    return () => {
      try { thaiPlayerRef.current?.destroy?.(); } catch {}
      try { chinesePlayerRef.current?.destroy?.(); } catch {}
      thaiPlayerRef.current = null;
      chinesePlayerRef.current = null;
    };
  }, []);

  // 监听中文视频播放状态
  useEffect(() => {
    const cTimer = setInterval(() => {
      if (chinesePlayerRef.current && typeof chinesePlayerRef.current.getPlayerState === 'function') {
        try {
          const cState = chinesePlayerRef.current.getPlayerState();
          setIsChinesePlaying(cState === 1);
        } catch {}
      }
    }, 200);
    return () => clearInterval(cTimer);
  }, []);

  useEffect(() => {
    setIsBothPlaying(isThaiPlaying && isChinesePlaying);
  }, [isThaiPlaying, isChinesePlaying]);

  // 外部传入 offset 与锁定状态同步（防止被重置为 0s）
  useEffect(() => {
    if (typeof propOffsetSeconds === 'number' && propOffsetSeconds !== offsetSeconds) {
      setOffsetSeconds(propOffsetSeconds);
    }
  }, [propOffsetSeconds, offsetSeconds]);

  useEffect(() => {
    if (typeof propIsOffsetLocked === 'boolean' && propIsOffsetLocked !== isOffsetLocked) {
      setIsOffsetLocked(propIsOffsetLocked);
    }
  }, [propIsOffsetLocked, isOffsetLocked]);

  // 全量设置或直接输入时差（立即同步到 state、config、localStorage 与顶层 App）
  const updateOffset = useCallback((nextVal: number, locked: boolean = isOffsetLocked) => {
    const next = parseFloat(nextVal.toFixed(2));
    setOffsetSeconds(next);
    setConfig(prev => {
      const updated = { ...prev, offsetSeconds: next };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      localStorage.setItem('luangpor_offset_locked_v3', String(locked));
    } catch {}
    onOffsetChange?.(next, locked);
  }, [isOffsetLocked, onOffsetChange]);

  // 时差微调：更新 offsetSeconds 并立即持久化
  const handleNudgeOffset = useCallback((delta: number) => {
    const next = parseFloat((offsetSeconds + delta).toFixed(2));
    updateOffset(next, isOffsetLocked);
    if (isOffsetLocked) {
      triggerToast(`时差已锁定并同步：${next >= 0 ? '+' : ''}${next}s`);
    } else {
      triggerToast(`时差：${next >= 0 ? '+' : ''}${next}s（未锁定，下次跳转生效）`);
    }
  }, [offsetSeconds, isOffsetLocked, updateOffset]);

  // 统一音轨控制辅助函数 (兼容在线 YouTube 与离线纯音频 HTML5)
  const isThaiTrackPlaying = useCallback((): boolean => {
    if (isThaiOfflineActive && thaiHtml5AudioRef.current) {
      return !thaiHtml5AudioRef.current.paused;
    }
    return thaiPlayerRef.current?.getPlayerState?.() === 1;
  }, [isThaiOfflineActive]);

  const isChineseTrackPlaying = useCallback((): boolean => {
    if (chineseHtml5MediaRef.current) {
      return !chineseHtml5MediaRef.current.paused;
    }
    return chinesePlayerRef.current?.getPlayerState?.() === 1;
  }, []);

  const playThaiTrack = useCallback(() => {
    if (isThaiOfflineActive && thaiHtml5AudioRef.current) {
      thaiHtml5AudioRef.current.play().catch(() => {});
    } else {
      try { thaiPlayerRef.current?.playVideo?.(); } catch {}
    }
  }, [isThaiOfflineActive]);

  const pauseThaiTrack = useCallback(() => {
    if (thaiHtml5AudioRef.current) {
      try { thaiHtml5AudioRef.current.pause(); } catch {}
    }
    try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
  }, []);

  const playChineseTrack = useCallback(() => {
    if (chineseHtml5MediaRef.current) {
      chineseHtml5MediaRef.current.play().catch(() => {});
    } else {
      try { chinesePlayerRef.current?.playVideo?.(); } catch {}
    }
  }, []);

  const pauseChineseTrack = useCallback(() => {
    if (chineseHtml5MediaRef.current) {
      try { chineseHtml5MediaRef.current.pause(); } catch {}
    }
    try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
  }, []);

  // 泰文主控带中文随动：同步跳转到指定时间（尊重当前 offsetSeconds 与离线音频偏置）
  const seekBothToTime = useCallback((thaiSec: number) => {
    const clampedThai = Math.max(0, thaiSec);
    const targetChinese = Math.max(0, clampedThai + offsetSeconds);

    setCurrentTime(clampedThai);
    if (isThaiOfflineActive && thaiHtml5AudioRef.current) {
      try {
        thaiHtml5AudioRef.current.currentTime = Math.max(0, clampedThai + (thaiOfflineAudio?.offsetSeconds || 0));
      } catch {}
    } else {
      try {
        thaiPlayerRef.current?.seekTo?.(clampedThai, true);
      } catch {}
    }

    if (chineseHtml5MediaRef.current) {
      try {
        const chOfflineOffset = isChineseOfflineActive ? (chineseOfflineAudio?.offsetSeconds || 0) : 0;
        chineseHtml5MediaRef.current.currentTime = Math.max(0, targetChinese + chOfflineOffset);
      } catch {}
    } else {
      try {
        chinesePlayerRef.current?.seekTo?.(targetChinese, true);
      } catch {}
    }

    const idx = activeSubtitles.findIndex(
      (sub) => clampedThai >= sub.secondsStart && clampedThai < sub.secondsEnd
    );
    if (idx !== -1) {
      setCurrentLineIndex(idx);
    }
  }, [offsetSeconds, activeSubtitles, isThaiOfflineActive, thaiOfflineAudio?.offsetSeconds, isChineseOfflineActive, chineseOfflineAudio?.offsetSeconds]);

  // 外部 offsetSeconds prop 变化时同步到内部 state 与 config
  useEffect(() => {
    if (propOffsetSeconds !== undefined && propOffsetSeconds !== offsetSeconds) {
      setOffsetSeconds(propOffsetSeconds);
      setConfig(prev => ({ ...prev, offsetSeconds: propOffsetSeconds }));
      if (isOffsetLocked) {
        try {
          seekBothToTime(currentTime);
        } catch {}
      }
    }
  }, [propOffsetSeconds, isOffsetLocked, currentTime, seekBothToTime]);

  // 外部 isOffsetLocked prop 变化时同步到内部 state
  useEffect(() => {
    const prevLocked = isOffsetLocked;
    if (propIsOffsetLocked !== undefined && propIsOffsetLocked !== isOffsetLocked) {
      setIsOffsetLocked(propIsOffsetLocked);
    }
    if (propIsOffsetLocked === true && !prevLocked) {
      try {
        seekBothToTime(currentTime);
      } catch {}
    }
  }, [propIsOffsetLocked, isOffsetLocked, currentTime, seekBothToTime]);

  // 核心操作 1：双轨同时播放 / 同时暂停
  const handleToggleDualPlay = useCallback(() => {
    const isThaiActive = isThaiTrackPlaying();
    const isChineseActive = isChineseTrackPlaying();

    if (isThaiActive || isChineseActive) {
      pauseThaiTrack();
      pauseChineseTrack();
      setIsBothPlaying(false);
      setIsThaiPlaying(false);
      setIsChinesePlaying(false);
    } else {
      playThaiTrack();
      playChineseTrack();
      setIsBothPlaying(true);
      setIsThaiPlaying(true);
      setIsChinesePlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings, isThaiTrackPlaying, isChineseTrackPlaying, pauseThaiTrack, pauseChineseTrack, playThaiTrack, playChineseTrack]);

  // 核心操作 2：泰文轨道单独播放/暂停
  const handleToggleThaiAlone = useCallback(() => {
    if (isThaiTrackPlaying()) {
      pauseThaiTrack();
      setIsThaiPlaying(false);
    } else {
      playThaiTrack();
      setIsThaiPlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings, isThaiTrackPlaying, pauseThaiTrack, playThaiTrack]);

  // 核心操作 3：中文轨道单独播放/暂停
  const handleToggleChineseAlone = useCallback(() => {
    if (isChineseTrackPlaying()) {
      pauseChineseTrack();
      setIsChinesePlaying(false);
    } else {
      playChineseTrack();
      setIsChinesePlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings, isChineseTrackPlaying, pauseChineseTrack, playChineseTrack]);

  // 跳转到指定句子 (遵循当前声道/单播模式)
  const handleJumpToSentence = (index: number) => {
    const target = activeSubtitles[index];
    if (!target) return;
    setCurrentLineIndex(index);
    seekBothToTime(target.secondsStart);

    if (audioFocus === 'both') {
      playThaiTrack();
      playChineseTrack();
      setIsBothPlaying(true);
      setIsThaiPlaying(true);
      setIsChinesePlaying(true);
    } else if (audioFocus === 'thai') {
      pauseChineseTrack();
      playThaiTrack();
      setIsBothPlaying(false);
      setIsChinesePlaying(false);
      setIsThaiPlaying(true);
    } else {
      pauseThaiTrack();
      playChineseTrack();
      setIsBothPlaying(false);
      setIsThaiPlaying(false);
      setIsChinesePlaying(true);
    }
    applyAudioSettings(audioFocus, thaiVol, chineseVol);
  };

  // 计算当前所选播轨模式下的实时播放状态
  const isCurrentModePlaying = useMemo(() => {
    if (audioFocus === 'both') {
      return isBothPlaying || (isThaiPlaying && isChinesePlaying);
    } else if (audioFocus === 'thai') {
      return isThaiPlaying;
    } else {
      return isChinesePlaying;
    }
  }, [audioFocus, isBothPlaying, isThaiPlaying, isChinesePlaying]);

  // 核心操作：根据当前分段模式 (泰播/双轨/中播) 智能主控播放与暂停
  const handleMasterPlayToggle = useCallback(() => {
    if (audioFocus === 'both') {
      handleToggleDualPlay();
    } else if (audioFocus === 'thai') {
      if (isThaiTrackPlaying()) {
        pauseThaiTrack();
        setIsThaiPlaying(false);
      } else {
        pauseChineseTrack();
        setIsChinesePlaying(false);
        playThaiTrack();
        setIsThaiPlaying(true);
        applyAudioSettings('thai', thaiVol, chineseVol);
      }
    } else {
      if (isChineseTrackPlaying()) {
        pauseChineseTrack();
        setIsChinesePlaying(false);
      } else {
        pauseThaiTrack();
        setIsThaiPlaying(false);
        playChineseTrack();
        setIsChinesePlaying(true);
        applyAudioSettings('chinese', thaiVol, chineseVol);
      }
    }
  }, [audioFocus, handleToggleDualPlay, thaiVol, chineseVol, applyAudioSettings, isThaiTrackPlaying, isChineseTrackPlaying, pauseThaiTrack, pauseChineseTrack, playThaiTrack, playChineseTrack]);

  // 三档分段滑块切换处理：无缝过渡播放与声道状态
  const handleSelectMode = useCallback((mode: 'thai' | 'both' | 'chinese') => {
    setAudioFocus(mode);
    const isAnyActive = isThaiPlaying || isChinesePlaying || isBothPlaying;

    if (mode === 'thai') {
      triggerToast('已切换至：🇹🇭 仅播泰语');
      pauseChineseTrack();
      setIsChinesePlaying(false);
      if (isAnyActive) {
        playThaiTrack();
        setIsThaiPlaying(true);
      }
      applyAudioSettings('thai', thaiVol, chineseVol);
    } else if (mode === 'both') {
      triggerToast('已切换至：🎧 双轨齐播');
      if (isAnyActive) {
        playThaiTrack();
        playChineseTrack();
        setIsThaiPlaying(true);
        setIsChinesePlaying(true);
        setIsBothPlaying(true);
      }
      applyAudioSettings('both', thaiVol, chineseVol);
    } else if (mode === 'chinese') {
      triggerToast('已切换至：🇨🇳 仅播中文');
      pauseThaiTrack();
      setIsThaiPlaying(false);
      if (isAnyActive) {
        playChineseTrack();
        setIsChinesePlaying(true);
      }
      applyAudioSettings('chinese', thaiVol, chineseVol);
    }
  }, [isThaiPlaying, isChinesePlaying, isBothPlaying, thaiVol, chineseVol, applyAudioSettings, pauseChineseTrack, pauseThaiTrack, playThaiTrack, playChineseTrack]);

  // 倍速控制（同步驱动 YT.Player 与 HTML5 离线音频）
  const handleSetPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    try {
      thaiPlayerRef.current?.setPlaybackRate?.(rate);
    } catch {}
    try {
      chinesePlayerRef.current?.setPlaybackRate?.(rate);
    } catch {}
    if (thaiHtml5AudioRef.current) {
      thaiHtml5AudioRef.current.playbackRate = rate;
    }
    if (chineseHtml5MediaRef.current) {
      chineseHtml5MediaRef.current.playbackRate = rate;
    }
    triggerToast(`倍速已设为 ${rate}x`);
  }, []);

  // 朗读当前句或单词（与播放倍速智能联动）
  const handleSpeakText = (text: string) => {
    if (onSpeak) {
      onSpeak(text, playbackRate);
    } else {
      thaiAudio.speakWord(text, playbackRate);
    }
  };

  // 键盘打卡跳转
  const handlePracticeTyping = (thaiText: string) => {
    if (onOpenKeyboard) {
      onOpenKeyboard(thaiText);
    }
  };

  // 🎤 卡拉OK交互演练微步驱动器 (40ms 精确插值)
  useEffect(() => {
    if (!isKaraokeDemoPlaying || !currentLine) return;

    const intervalMs = 40;
    const stepSec = (intervalMs / 1000) * karaokeDemoSpeed;

    const timer = setInterval(() => {
      setKaraokeDemoTime(prev => {
        const next = prev + stepSec;
        if (next >= currentLine.secondsEnd) {
          setIsKaraokeDemoPlaying(false);
          return currentLine.secondsEnd;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isKaraokeDemoPlaying, karaokeDemoSpeed, currentLine]);

  // 当真实视频或离线音频开播时，自动终止独立演练模式
  useEffect(() => {
    if (isThaiPlaying || isChinesePlaying) {
      setIsKaraokeDemoPlaying(false);
    }
  }, [isThaiPlaying, isChinesePlaying]);

  // 卡拉OK交互演练：开始/暂停演练
  const handleToggleKaraokeDemo = useCallback(() => {
    if (!currentLine) return;

    if (isKaraokeDemoPlaying) {
      setIsKaraokeDemoPlaying(false);
      triggerToast('⏸️ 已暂停逐词显示演练');
      return;
    }

    // 若音视频正在播放，先暂停
    pauseThaiTrack();
    pauseChineseTrack();
    setIsThaiPlaying(false);
    setIsChinesePlaying(false);
    setIsBothPlaying(false);

    let startFrom = karaokeDemoTime;
    if (startFrom >= currentLine.secondsEnd || startFrom < currentLine.secondsStart) {
      startFrom = currentLine.secondsStart;
      setKaraokeDemoTime(startFrom);
    }

    setIsKaraokeDemoPlaying(true);
    handleSpeakText(currentLine.thai);
    triggerToast('🎤 开始逐词显示同步演练 (点击任意单词可单独精听)');
  }, [isKaraokeDemoPlaying, currentLine, karaokeDemoTime, handleSpeakText, pauseThaiTrack, pauseChineseTrack]);

  // 重置卡拉OK演练
  const handleResetKaraokeDemo = useCallback(() => {
    if (!currentLine) return;
    setIsKaraokeDemoPlaying(false);
    setKaraokeDemoTime(currentLine.secondsStart);
    triggerToast('🔄 已重置到句首起点');
  }, [currentLine]);

  // 点击单个词槽：定位并高亮发音
  const handleSelectKaraokeSlot = useCallback((slotIndex: number) => {
    if (!currentWordSlots || !currentWordSlots[slotIndex]) return;
    const targetSlot = currentWordSlots[slotIndex];
    setKaraokeDemoTime(targetSlot.startSec + 0.05);
    handleSpeakText(targetSlot.word.thai);
    if (onSelectWord) {
      onSelectWord(targetSlot.word);
    }
  }, [currentWordSlots, handleSpeakText, onSelectWord]);

  // 上一词 / 下一词步进
  const handleStepKaraokeSlot = useCallback((direction: -1 | 1) => {
    if (!currentWordSlots || currentWordSlots.length === 0) return;
    let nextIdx = (activeSlotIndex === -1 ? 0 : activeSlotIndex) + direction;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= currentWordSlots.length) nextIdx = currentWordSlots.length - 1;
    handleSelectKaraokeSlot(nextIdx);
  }, [currentWordSlots, activeSlotIndex, handleSelectKaraokeSlot]);

  // 智能无气口盲区字幕索引定位：覆盖句子间静音气口与轻微时间误差
  const findActiveSubtitleIndex = useCallback((timeSec: number, subs: SubtitleLine[]): number => {
    if (!subs || subs.length === 0) return 0;

    // 1. 精确区间匹配：timeSec 在 [secondsStart, secondsEnd) 内
    const exactIdx = subs.findIndex(s => timeSec >= s.secondsStart && timeSec < s.secondsEnd);
    if (exactIdx !== -1) return exactIdx;

    // 2. 气口/停顿顺延匹配：当尊者两句话之间有静音停顿 (如 25.4s 到 27.0s)
    // 保持前一句高亮直至下一句正式开讲，绝不丢失当前句或跳入盲区
    for (let i = 0; i < subs.length; i++) {
      const cur = subs[i];
      const next = subs[i + 1];
      if (next) {
        if (timeSec >= cur.secondsStart && timeSec < next.secondsStart) {
          return i;
        }
      } else {
        if (timeSec >= cur.secondsStart) {
          return i;
        }
      }
    }

    // 3. 若还没开始第一句，返回第 0 句
    return 0;
  }, []);

  // 离线音频单轨校准微调与弹窗回调
  const handleNudgeTrackOfflineOffset = useCallback(
    async (trackType: 'thai_audio' | 'chinese_audio', delta: number) => {
      if (trackType === 'thai_audio' && thaiOfflineAudio) {
        const nextVal = parseFloat((thaiOfflineAudio.offsetSeconds + delta).toFixed(2));
        setThaiOfflineAudio(prev => (prev ? { ...prev, offsetSeconds: nextVal } : null));
        await offlineAudioStorage.updateAudioOffset(thaiOfflineAudio.lessonId, thaiOfflineAudio.trackType, nextVal);
      } else if (trackType === 'chinese_audio' && chineseOfflineAudio) {
        const nextVal = parseFloat((chineseOfflineAudio.offsetSeconds + delta).toFixed(2));
        setChineseOfflineAudio(prev => (prev ? { ...prev, offsetSeconds: nextVal } : null));
        await offlineAudioStorage.updateAudioOffset(chineseOfflineAudio.lessonId, chineseOfflineAudio.trackType, nextVal);
      }
    },
    [thaiOfflineAudio, chineseOfflineAudio]
  );

  const handleOfflineAudioActivated = useCallback(
    (lessonId: string, trackType: OfflineTrackType, blob: Blob, meta: OfflineAudioMeta) => {
      // 如果选择了另一个预制课件，先切入对应课件配置
      if (lessonId !== currentCuratedLesson.id) {
        const target = curatedLessons.find(l => l.id === lessonId);
        if (target) {
          const combinedTitle = `${target.chineseTitle} ｜ ${target.title}`;
          const newConf: DualVideoConfig = {
            title: combinedTitle,
            thaiVideoUrl: target.thaiVideoUrl,
            chineseVideoUrl: target.chineseVideoUrl,
            offsetSeconds: target.defaultOffsetSeconds,
            thaiVolume: 1.0,
            chineseVolume: chineseVol / 100,
          };
          saveConfig(newConf);
          setOffsetSeconds(target.defaultOffsetSeconds);
          onOffsetChange?.(target.defaultOffsetSeconds, isOffsetLocked);
          setInputThaiUrl(target.thaiVideoUrl);
          setInputChineseUrl(target.chineseVideoUrl);
          setInputTitle(combinedTitle);
          saveSubtitles(target.subtitles);
          setCurrentLineIndex(0);
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      if (trackType === 'chinese_audio') {
        replaceChineseOfflineAudio({
          url: blobUrl,
          fileName: meta.fileName,
          sizeBytes: meta.sizeBytes,
          offsetSeconds: meta.offsetSeconds || 0,
          lessonId,
          trackType,
        });
        setUseOfflineChinese(true);
      } else {
        replaceThaiOfflineAudio({
          url: blobUrl,
          fileName: meta.fileName,
          sizeBytes: meta.sizeBytes,
          offsetSeconds: meta.offsetSeconds || 0,
          lessonId,
          trackType,
        });
        setUseOfflineThai(true);
      }
      setShowOfflineModal(false);
      triggerToast(`已挂载离线纯音频：${meta.fileName}`);
    },
    [
      currentCuratedLesson.id,
      curatedLessons,
      chineseVol,
      saveConfig,
      onOffsetChange,
      isOffsetLocked,
      saveSubtitles,
      replaceChineseOfflineAudio,
      replaceThaiOfflineAudio,
    ]
  );

  // 核心对齐操作：一键纠偏，根据当前视频或离线音频真实播放时间，强制同步对齐字幕
  const handleAlignCurrent = useCallback(() => {
    try {
      let playerTime = 0;
      if (audioFocus === 'chinese') {
        if (chineseHtml5MediaRef.current) {
          const cTime = chineseHtml5MediaRef.current.currentTime || 0;
          const chOfflineOffset = isChineseOfflineActive ? (chineseOfflineAudio?.offsetSeconds || 0) : 0;
          playerTime = Math.max(0, cTime - chOfflineOffset - offsetSeconds);
        } else if (chinesePlayerRef.current && typeof chinesePlayerRef.current.getCurrentTime === 'function') {
          const cTime = chinesePlayerRef.current.getCurrentTime() || 0;
          playerTime = Math.max(0, cTime - offsetSeconds);
        }
      } else if (isThaiOfflineActive && thaiHtml5AudioRef.current) {
        playerTime = Math.max(0, (thaiHtml5AudioRef.current.currentTime || 0) - (thaiOfflineAudio?.offsetSeconds || 0));
      } else if (thaiPlayerRef.current && typeof thaiPlayerRef.current.getCurrentTime === 'function') {
        playerTime = thaiPlayerRef.current.getCurrentTime() || 0;
      }

      if (playerTime <= 0 && currentTime > 0) {
        playerTime = currentTime;
      }

      const correctIndex = findActiveSubtitleIndex(playerTime, activeSubtitles);
      setCurrentLineIndex(correctIndex);

      const targetSub = activeSubtitles[correctIndex];
      if (targetSub) {
        seekBothToTime(targetSub.secondsStart);
      }

      triggerToast(`🎯 已精确对齐到第 ${correctIndex + 1} 句 [${targetSub?.timeStart || formatSecondsToTime(playerTime)}]`);
    } catch (e) {
      console.warn('Align error:', e);
    }
  }, [
    audioFocus,
    offsetSeconds,
    currentTime,
    activeSubtitles,
    findActiveSubtitleIndex,
    seekBothToTime,
    isThaiOfflineActive,
    thaiOfflineAudio?.offsetSeconds,
    isChineseOfflineActive,
    chineseOfflineAudio?.offsetSeconds,
  ]);

  // 真实时间核心驱动 (统一支持 YouTube 与 HTML5 离线纯音频)
  useEffect(() => {
    let isSubscribed = true;

    const timer = setInterval(() => {
      if (!isSubscribed) return;

      try {
        const isThaiActivelyPlaying = isThaiTrackPlaying();
        const isChineseActivelyPlaying = isChineseTrackPlaying();

        setIsThaiPlaying(isThaiActivelyPlaying);
        setIsChinesePlaying(isChineseActivelyPlaying);

        let realTime = 0;
        if (isThaiOfflineActive && thaiHtml5AudioRef.current) {
          realTime = Math.max(0, (thaiHtml5AudioRef.current.currentTime || 0) - (thaiOfflineAudio?.offsetSeconds || 0));
        } else if (thaiPlayerRef.current && typeof thaiPlayerRef.current.getCurrentTime === 'function') {
          realTime = thaiPlayerRef.current.getCurrentTime() || 0;
        } else if (chineseHtml5MediaRef.current) {
          const cTime = chineseHtml5MediaRef.current.currentTime || 0;
          const chOfflineOffset = isChineseOfflineActive ? (chineseOfflineAudio?.offsetSeconds || 0) : 0;
          realTime = Math.max(0, cTime - chOfflineOffset - offsetSeconds);
        } else if (chinesePlayerRef.current && typeof chinesePlayerRef.current.getCurrentTime === 'function') {
          const cTime = chinesePlayerRef.current.getCurrentTime() || 0;
          realTime = Math.max(0, cTime - offsetSeconds);
        }

        if (!isThaiActivelyPlaying && isChineseActivelyPlaying && audioFocus === 'chinese') {
          if (chineseHtml5MediaRef.current) {
            const cTime = chineseHtml5MediaRef.current.currentTime || 0;
            const chOfflineOffset = isChineseOfflineActive ? (chineseOfflineAudio?.offsetSeconds || 0) : 0;
            realTime = Math.max(0, cTime - chOfflineOffset - offsetSeconds);
          } else {
            const cTime = chinesePlayerRef.current?.getCurrentTime?.() || 0;
            realTime = Math.max(0, cTime - offsetSeconds);
          }
        }

        setCurrentTime(realTime);

        const targetLine = activeSubtitles[currentLineIndex];

        if (isLoopSentence && targetLine && realTime >= targetLine.secondsEnd) {
          if (isThaiActivelyPlaying || isChineseActivelyPlaying) {
            playThaiTrack();
            playChineseTrack();
          }
          return;
        }

        if (!targetLine || realTime < targetLine.secondsStart || realTime >= targetLine.secondsEnd) {
          const newIdx = findActiveSubtitleIndex(realTime, activeSubtitles);
          if (newIdx !== -1 && newIdx !== currentLineIndex) {
            setCurrentLineIndex(newIdx);
          }
        }
      } catch {
        // ignore
      }
    }, 120);

    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, [
    activeSubtitles,
    currentLineIndex,
    isLoopSentence,
    audioFocus,
    offsetSeconds,
    findActiveSubtitleIndex,
    isThaiTrackPlaying,
    isChineseTrackPlaying,
    isThaiOfflineActive,
    thaiOfflineAudio?.offsetSeconds,
    isChineseOfflineActive,
    chineseOfflineAudio?.offsetSeconds,
    playThaiTrack,
    playChineseTrack,
  ]);

  // 自动滚动列表
  useEffect(() => {
    if (autoScroll && activeLineRef.current && timelineContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentLineIndex, autoScroll]);

  // 实时解析粘贴内容
  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    const result = parseLanguageReactorText(text);
    setParseResult(result);
  };

  // 本地大文件/字幕文件专用读取处理器 (避免剪贴板卡顿与超长截断)
  const processSubtitleFile = (file: File) => {
    if (!file) return;
    setIsReadingFile(true);

    const sizeFormatted = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    const reader = new FileReader();
    reader.onload = (e) => {
      setIsReadingFile(false);
      const content = (e.target?.result as string) || '';
      if (!content.trim()) {
        triggerToast('文件内容为空，请重新选择！');
        return;
      }

      setPastedText(content);
      const result = parseLanguageReactorText(content);
      setParseResult(result);
      setUploadedFileInfo({
        name: file.name,
        size: sizeFormatted,
        linesCount: result.totalParsed
      });

      setShowPasteModal(true);

      if (result.totalParsed > 0) {
        triggerToast(`成功解析「${file.name}」：共 ${result.totalParsed} 句法谈！`);
      } else {
        triggerToast(`已读取「${file.name}」，未识别到双语字幕，请检查格式。`);
      }
    };

    reader.onerror = () => {
      setIsReadingFile(false);
      triggerToast('读取文件出错，请重试');
    };

    reader.readAsText(file, 'utf-8');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSubtitleFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSubtitleFile(file);
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedFileInfo(null);
    setPastedText('');
    setParseResult({ subtitles: [], totalParsed: 0 });
  };

  // 统一应用装载：同时更新双视频链接字幕
  const handleApplyDiscourseAndMedia = () => {
    // 1. 更新双视频链接与标题
    const newThaiUrl = inputThaiUrl.trim() || config.thaiVideoUrl;
    const newChineseUrl = inputChineseUrl.trim(); // 允许清空进入单视频模式
    const newTitle = inputTitle.trim() || parseResult.detectedTitle || config.title;

    const updatedConf: DualVideoConfig = {
      ...config,
      thaiVideoUrl: newThaiUrl,
      chineseVideoUrl: newChineseUrl,
      title: newTitle,
      offsetSeconds: offsetSeconds
    };
    saveConfig(updatedConf);

    // 2. 如果解析出了有效字幕，则应用新字幕
    if (parseResult.totalParsed > 0) {
      saveSubtitles(parseResult.subtitles);
      setCurrentLineIndex(0);
      seekBothToTime(parseResult.subtitles[0].secondsStart);
    }

    setShowPasteModal(false);
    triggerToast(
      parseResult.totalParsed > 0 
        ? `已成功装载视频与 ${parseResult.totalParsed} 句字幕！`
        : '已成功装载视频！'
    );
  };

  // 还原默认课件
  const handleRestoreDefault18Oct = () => {
    saveSubtitles(OCT_18_LIVE_SUBTITLES);
    const defaultConf = { ...OCT_18_BENCHMARK_CONFIG, offsetSeconds: 0 };
    saveConfig(defaultConf);
    setInputThaiUrl(defaultConf.thaiVideoUrl);
    setInputChineseUrl(defaultConf.chineseVideoUrl);
    setInputTitle(defaultConf.title);
    setOffsetSeconds(0);
    setCurrentLineIndex(0);
    seekBothToTime(0);
    setShowPasteModal(false);
    setShowConfigDrawer(false);
    triggerToast('已重置为官方 10月18日基准课件！');
  };

  // 过滤后的字幕列表
  const filteredSubtitles = useMemo(() => {
    if (!searchQuery.trim()) return activeSubtitles;
    const q = searchQuery.toLowerCase().trim();
    return activeSubtitles.filter((sub) => 
      sub.thai.toLowerCase().includes(q) ||
      sub.chinese.toLowerCase().includes(q) ||
      sub.romanization.toLowerCase().includes(q)
    );
  }, [activeSubtitles, searchQuery]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-4rem)] bg-[#faf7f2] text-[#2d2a26] pb-32 font-sans relative box-border">
      {/* 顶部工具条 (非置顶常规布局，节省宝贵视口垂直空间) */}
      <div className="border-b border-[#e6d3ac]/60 bg-white/80 px-3 sm:px-6 py-2.5 max-w-full">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <Video className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-[#2d2a26]">
                  {hasChineseMedia ? '泰中双视频同步对齐放映机' : '泰文原声精进共学放映机'}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/60 font-mono">
                  第 {currentLineIndex + 1} 句 / 共 {activeSubtitles.length} 句
                </span>
                {activeSubtitles.length === 746 || activeSubtitles.length === 1198 || activeSubtitles.length === 1195 || activeSubtitles.length === 29 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span>🌟 官方精校课件</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <span>⚡ 自定义导入字幕</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7a6f5f] truncate max-w-md sm:max-w-xl">
                {config.title}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* 0. 极简沉浸版快捷切换 */}
            {onSwitchToMinimal && (
              <button
                type="button"
                onClick={onSwitchToMinimal}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
                title="切换到单泰文视频·嵌入式音标与连续进度条极简沉浸版"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>极简沉浸版</span>
              </button>
            )}

            {/* 离线纯音频与录音按钮 */}
            <button
              type="button"
              onClick={() => setShowOfflineModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0 border ${
                isThaiOfflineActive || isChineseOfflineActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-slate-700'
              }`}
              title="导入本地音频、缓存寺院公开 MP3 或纯音频录制分享"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{isThaiOfflineActive || isChineseOfflineActive ? '离线音频已挂载' : '离线音频与录音'}</span>
            </button>

            {/* 1. 装载视频链接 (核心一键弹窗，整合链接与字幕) */}
            <button
              onClick={() => {
                setInputThaiUrl(config.thaiVideoUrl);
                setInputChineseUrl(config.chineseVideoUrl);
                setInputTitle(config.title);
                setShowPasteModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              title="点击装载视频链接与字幕"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>📥 装载字幕</span>
            </button>

            {/* 2. 预制课件库 */}
            <button
              onClick={() => setShowPresetModal(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              title="挑选官方及社群共学课件"
            >
              <Library className="w-3.5 h-3.5" />
              <span>📚 课件库</span>
            </button>
          </div>
        </div>
      </div>

      {/* 提示气泡 */}
      {showSaveToast && (
        <div className="fixed top-16 right-6 z-50 bg-[#2d2a26] text-amber-200 px-4 py-2 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2 border border-amber-500/30">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 主界面内容 */}
      <div className="max-w-7xl mx-auto px-1.5 sm:px-4 pt-3 sm:pt-4 space-y-4 sm:space-y-5 max-w-full box-border">

        {/* 1. 视频视窗区域 (单播自适应全景，双播智能并列) */}
        <div className={hasChineseMedia ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "max-w-4xl mx-auto w-full"}>
          
          {/* 泰文视频视窗 */}
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3 sm:px-3.5 py-2 flex flex-wrap items-center justify-between text-xs text-amber-100 gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${isThaiPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                <span className="font-bold whitespace-nowrap">🇹🇭 泰文原版</span>
                <span className="text-[10px] text-stone-300 whitespace-nowrap">
                  ({isThaiPlaying ? '播放中' : '已暂停'})
                </span>
                {!hasChineseMedia && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    纯泰原声精研
                  </span>
                )}
              </div>
              <button
                onClick={handleToggleThaiAlone}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                title="单独播放/暂停泰文视频，用于听完一句暂停对齐"
              >
                {isThaiPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isThaiPlaying ? '暂停泰文' : '播放泰文'}</span>
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0">
              {isThaiOfflineActive && thaiOfflineAudio ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 text-amber-100 gap-3">
                  <div className="w-full max-w-md flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Headphones className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white truncate">{thaiOfflineAudio.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseOfflineThai(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Globe className="w-3 h-3 text-amber-400" />
                      <span>切回在线画面</span>
                    </button>
                  </div>

                  <div className="w-full max-w-md text-[11px] text-slate-400 font-mono">
                    免翻离线泰语纯音频 · {formatBytes(thaiOfflineAudio.sizeBytes)} · 正在驱动下方全篇字幕同步
                  </div>

                  <audio
                    key={thaiOfflineAudio.url}
                    ref={thaiHtml5AudioRef}
                    src={thaiOfflineAudio.url}
                    controls
                    className="w-full max-w-md h-10"
                    onPlay={() => setIsThaiPlaying(true)}
                    onPause={() => setIsThaiPlaying(false)}
                    onEnded={() => setIsThaiPlaying(false)}
                  />

                  <div className="w-full max-w-md flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      本轨字幕偏置: {thaiOfflineAudio.offsetSeconds >= 0 ? `+${thaiOfflineAudio.offsetSeconds}` : thaiOfflineAudio.offsetSeconds}s
                    </span>
                    <div className="flex items-center gap-1">
                      {[-0.5, -0.1, 0.1, 0.5].map(delta => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleNudgeTrackOfflineOffset('thai_audio', delta)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : thaiVideoId ? (
                <>
                  <div id="thai-yt-player" className="w-full h-full" />
                  {thaiOfflineAudio && (
                    <button
                      type="button"
                      onClick={() => setUseOfflineThai(true)}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer z-20"
                    >
                      <Headphones className="w-3 h-3" />
                      <span>切回离线音频</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Video className="w-8 h-8 text-stone-600 mb-2" />
                  <p>请输入有效的泰文 YouTube 视频链接，或点击顶部「离线音频与录音」载入本地纯音频</p>
                </div>
              )}
            </div>
          </div>

          {/* 中文视频视窗 (仅在有中文音视频源或已挂载离线中文音频时展示) */}
          {hasChineseMedia && (
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3 sm:px-3.5 py-2 flex flex-wrap items-center justify-between text-xs text-amber-100 gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${isChinesePlaying ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'}`} />
                <span className="font-bold whitespace-nowrap">🇨🇳 中文译版</span>
                <span className="text-[10px] text-stone-300 whitespace-nowrap">
                  ({isChinesePlaying ? '播放中' : '已暂停'})
                </span>
                {offsetSeconds !== 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    {offsetSeconds >= 0 ? `+${offsetSeconds}` : offsetSeconds}s
                  </span>
                )}
              </div>

              {/* 中文伴弱随听音量与画面控制 */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleCycleChineseDim}
                  className="px-2 py-1 rounded bg-stone-900/90 hover:bg-stone-800 text-amber-200 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  title="点击以30%幅度循环切换伴弱音量 (100% → 70% → 40% → 10%)"
                >
                  <Volume1 className="w-3 h-3 text-amber-400" />
                  <span>伴弱 {chineseVol}%</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !chineseAudioOnlyMode;
                    setChineseAudioOnlyMode(nextVal);
                    triggerToast(nextVal ? '已收起中文画面（仅保留声音随听）' : '已展开中文双视频画面');
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border whitespace-nowrap ${
                    chineseAudioOnlyMode
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-stone-800 text-stone-300 hover:text-white border-stone-700'
                  }`}
                  title="收起中文视频画面，仅保留声音播放（保持泰语全景画面）"
                >
                  <Headphones className="w-3 h-3" />
                  <span>{chineseAudioOnlyMode ? '仅出声' : '收起出声'}</span>
                </button>

                <button
                  onClick={handleToggleChineseAlone}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                  title="单独播放/暂停中文视频，用于听完一句暂停对齐"
                >
                  {isChinesePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isChinesePlaying ? '暂停' : '播中文'}</span>
                </button>
              </div>
            </div>

            <div className={`relative ${chineseAudioOnlyMode ? 'min-h-[100px] p-4 bg-stone-900 flex items-center justify-between border-t border-stone-800' : 'aspect-video'} w-full bg-black [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 transition-all`}>
              {isChineseOfflineActive && chineseOfflineAudio ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 text-amber-100 gap-3">
                  <div className="w-full max-w-md flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Headphones className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-bold text-white truncate">{chineseOfflineAudio.fileName}</span>
                    </div>
                    {chineseVideoId && (
                      <button
                        type="button"
                        onClick={() => setUseOfflineChinese(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Globe className="w-3 h-3 text-amber-400" />
                        <span>切回在线画面</span>
                      </button>
                    )}
                  </div>

                  <div className="w-full max-w-md text-[11px] text-slate-400 font-mono">
                    免翻离线中文同传纯音频 · {formatBytes(chineseOfflineAudio.sizeBytes)}
                  </div>

                  <audio
                    key={chineseOfflineAudio.url}
                    ref={chineseHtml5MediaRef as any}
                    src={chineseOfflineAudio.url}
                    controls
                    className="w-full max-w-md h-10"
                    onPlay={() => setIsChinesePlaying(true)}
                    onPause={() => setIsChinesePlaying(false)}
                    onEnded={() => setIsChinesePlaying(false)}
                  />

                  <div className="w-full max-w-md flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>
                      本轨字幕偏置: {chineseOfflineAudio.offsetSeconds >= 0 ? `+${chineseOfflineAudio.offsetSeconds}` : chineseOfflineAudio.offsetSeconds}s
                    </span>
                    <div className="flex items-center gap-1">
                      {[-0.5, -0.1, 0.1, 0.5].map(delta => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleNudgeTrackOfflineOffset('chinese_audio', delta)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : chineseVideoId ? (
                <>
                  <div 
                    id="chinese-yt-player" 
                    className={chineseAudioOnlyMode ? 'w-0 h-0 opacity-0 pointer-events-none absolute' : 'w-full h-full'} 
                  />
                  {chineseOfflineAudio && !chineseAudioOnlyMode && (
                    <button
                      type="button"
                      onClick={() => setUseOfflineChinese(true)}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer z-20"
                    >
                      <Headphones className="w-3 h-3" />
                      <span>切回离线音频</span>
                    </button>
                  )}
                  {chineseAudioOnlyMode && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-lg shrink-0">
                          🎧
                        </div>
                        <div>
                          <div className="text-xs font-bold text-stone-200 flex items-center gap-2">
                            <span>🇨🇳 中文同传音频运行中</span>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                              仅出声音
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {isChinesePlaying ? '正在同步播音，泰文视窗保留主屏幕画幅' : '音频已暂停或就绪'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChineseAudioOnlyMode(false)}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold cursor-pointer border border-stone-700 shrink-0"
                      >
                        展开画面
                      </button>
                    </div>
                  )}
                </>
              ) : config.chineseVideoUrl?.includes('.mp4') ? (
                <div className="w-full h-full flex items-center justify-center bg-black relative">
                  {chineseMediaError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-stone-900 text-stone-300 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl">
                        ⚠️
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">该视频直链在当前窗口无法直接内嵌播放</h4>
                        <p className="text-xs text-stone-400 max-w-sm">
                          源站跨域防盗链策略限制直接渲染。您可以点击在新窗口打开源视频，或恢复官方基准伴播源。
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={config.chineseVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          在新窗口打开源视频
                        </a>
                        <button
                          onClick={handleRestoreDefault18Oct}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition border border-stone-700 cursor-pointer"
                        >
                          恢复官方基准课件
                        </button>
                      </div>
                    </div>
                  ) : (
                    <video
                      key={config.chineseVideoUrl}
                      ref={chineseHtml5MediaRef as any}
                      src={encodeURI(config.chineseVideoUrl)}
                      controls
                      playsInline
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onPlay={() => setIsChinesePlaying(true)}
                      onPause={() => setIsChinesePlaying(false)}
                      onError={() => {
                        console.warn('HTML5 Video load failed:', config.chineseVideoUrl);
                        setChineseMediaError(true);
                      }}
                    />
                  )}
                </div>
              ) : config.chineseVideoUrl?.includes('.mp3') ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-stone-900 to-slate-900 text-amber-200">
                  {chineseMediaError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl">
                        ⚠️
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">该音频直链无法在当前窗口直接推流</h4>
                        <p className="text-xs text-stone-400 max-w-sm">
                          源站跨域策略限制，建议在新窗口打开收听或切换回官方基准课件。
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <a
                          href={config.chineseVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          在新窗口打开音频
                        </a>
                        <button
                          onClick={handleRestoreDefault18Oct}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition border border-stone-700"
                        >
                          恢复官方基准课件
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 bg-stone-800/80 p-3 rounded-2xl border border-stone-700 max-w-md w-full">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
                          🎧
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {config.title || '中文同传随动音频 (MP3)'}
                          </div>
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            {isChinesePlaying ? '▶ 正在伴随发声' : '⏸ 已就绪 / 暂停'}
                          </div>
                        </div>
                      </div>
                      <audio
                        key={config.chineseVideoUrl}
                        ref={chineseHtml5MediaRef as any}
                        src={encodeURI(config.chineseVideoUrl)}
                        controls
                        referrerPolicy="no-referrer"
                        className="w-full max-w-md mt-3 h-8"
                        onPlay={() => setIsChinesePlaying(true)}
                        onPause={() => setIsChinesePlaying(false)}
                        onError={() => {
                          console.warn('HTML5 Audio load failed:', config.chineseVideoUrl);
                          setChineseMediaError(true);
                        }}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Video className="w-8 h-8 text-stone-600 mb-2" />
                  <p>请输入有效的中文 YouTube 视频链接或 MP4/MP3 直链</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* 🍎 苹果 iOS 设备专属温馨提示 (仅在真机 iOS/iPadOS 且有双播时展示，安卓/PC 绝不出现) */}
        {isIOS && hasChineseMedia && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <span className="text-xl shrink-0">🍎</span>
              <div>
                <div className="font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
                  <span>苹果设备（iPhone / iPad）已适配</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-900 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                    轻量同播适配
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
                  提示：苹果 WebKit 单音频通道机制下，两路视频画面已实现毫秒级同步。您可随意切换泰语或中文发声，或开启【收起画面出声】保留泰语原版大画面。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleSelectMode('thai')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                  audioFocus !== 'chinese'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border border-amber-300'
                }`}
              >
                <span>🇹🇭 听泰语原声</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode('chinese')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                  audioFocus === 'chinese'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border border-amber-300'
                }`}
              >
                <span>🇨🇳 听中文同传</span>
              </button>
              <button
                type="button"
                onClick={() => setChineseAudioOnlyMode(!chineseAudioOnlyMode)}
                className="px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1"
              >
                <Headphones className="w-3 h-3" />
                <span>{chineseAudioOnlyMode ? '展开视频' : '仅出声音'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 伴弱意蕴飘心提醒条 (当中文音量被减弱时，温润提示) */}
        {chineseVol < 100 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-950 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center text-sm shrink-0">
                🎐
              </span>
              <div>
                <span className="font-bold text-[#452b14]">中文伴随音量: {chineseVol}%</span>
                <span className="text-[#694827] text-[11px] ml-2">
                  适合以泰语原声为主听闻。
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCycleChineseDim}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shadow-xs transition cursor-pointer"
                title="继续以30%幅度递减"
              >
                Dim 递减音量
              </button>
              <button
                type="button"
                onClick={() => handleSetChineseVol(100)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-stone-700 font-semibold text-[11px] border border-stone-300 transition cursor-pointer"
              >
                恢复 100%
              </button>
            </div>
          </div>
        )}

        {/* 2. 当前聚焦精读句大卡 (Hero Active Sentence Stage: 集成卡拉OK交互演练与逐词彩色进度线条) */}
        {currentLine && (
          <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 rounded-2xl p-5 sm:p-6 shadow-sm border border-amber-200/90 relative">
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

              <div className="flex items-center gap-2">
                {/* 🎯 视频下方固定显示的进度对齐按钮 (一键校准视频与字幕同步) */}
                <button
                  type="button"
                  onClick={handleAlignCurrent}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="立即校准对齐：以视频当前实际播放进度强力对齐字幕"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>🎯 对齐进度</span>
                </button>

                <button
                  onClick={() => handleSpeakText(currentLine.thai)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300/80 text-amber-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#b58940]" />
                  <span>朗读泰文</span>
                </button>

                <button
                  onClick={() => handlePracticeTyping(currentLine.thai)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <span>⌨️ 键盘打卡</span>
                </button>
              </div>
            </div>

            {/* 🎤 卡拉OK逐词高亮与交互演练样板栏 (满足用户直接试听、点击、测试彩色线条的需求) */}
            <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-300/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 试听演练主控按钮 */}
                <button
                  type="button"
                  onClick={handleToggleKaraokeDemo}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer ${
                    isKaraokeDemoPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 animate-pulse'
                      : 'bg-[#b58940] hover:bg-[#9a7231] text-white'
                  }`}
                  title="点击立即开始当前句的逐词显示高亮演练"
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

                {/* 重置回句首 */}
                <button
                  type="button"
                  onClick={handleResetKaraokeDemo}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
                  title="重置演练进度回句首起点"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>重置</span>
                </button>

                {/* 上一词 / 下一词 */}
                <div className="flex items-center rounded-lg bg-white border border-stone-300 overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleStepKaraokeSlot(-1)}
                    className="px-2 py-1 hover:bg-amber-50 text-stone-700 text-xs font-semibold border-r border-stone-200 transition cursor-pointer flex items-center gap-0.5"
                    title="高亮上一词并朗读"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>上词</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepKaraokeSlot(1)}
                    className="px-2 py-1 hover:bg-amber-50 text-stone-700 text-xs font-semibold transition cursor-pointer flex items-center gap-0.5"
                    title="高亮下一词并朗读"
                  >
                    <span>下词</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 演练倍速选择 */}
                <div className="flex items-center bg-white rounded-lg border border-stone-300 p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setKaraokeDemoSpeed(0.75)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      karaokeDemoSpeed === 0.75 ? 'bg-amber-500 text-white' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    0.75x 慢速
                  </button>
                  <button
                    type="button"
                    onClick={() => setKaraokeDemoSpeed(1.0)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      karaokeDemoSpeed === 1.0 ? 'bg-amber-500 text-white' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    1.0x 标准
                  </button>
                </div>
              </div>

              {/* 实时状态提示 */}
              <div className="flex items-center gap-2 text-xs">
                {activeSlotIndex >= 0 && currentWordSlots[activeSlotIndex] ? (
                  <span className="flex items-center gap-1.5 font-medium text-amber-900 bg-white/90 px-2.5 py-1 rounded-full border border-amber-300/80 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>第 {activeSlotIndex + 1}/{currentWordSlots.length} 词:</span>
                    <span className="font-bold text-[#2d2a26]">{currentWordSlots[activeSlotIndex].word.thai}</span>
                    <span className="text-[#b58940] font-mono text-[11px]">/{currentWordSlots[activeSlotIndex].word.romanization}/</span>
                  </span>
                ) : (
                  <span className="text-stone-500 text-[11px]">
                    💡 点击任意单词或按“逐词显示试听”体验逐词高亮线条
                  </span>
                )}
              </div>
            </div>

            {/* 泰文超大字符与句内卡拉OK高亮 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-[#2d2a26] leading-relaxed tracking-wide my-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {currentWordSlots.length > 0 ? (
                currentWordSlots.map((slot, sIdx) => {
                  const pInfo = wordProgressMap[slot.wordId] || { progress: 0, status: 'pending' };
                  const isActive = pInfo.status === 'active';
                  const isDone = pInfo.status === 'completed';
                  return (
                    <span
                      key={slot.wordId}
                      onClick={() => handleSelectKaraokeSlot(sIdx)}
                      className={`relative inline-block cursor-pointer transition-all duration-150 group ${
                        isActive
                          ? 'text-amber-900 scale-[1.03] font-black'
                          : isDone
                          ? 'text-stone-800'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                      title={`点击定格并朗读：${slot.word.thai}`}
                    >
                      <span>{slot.word.thai}</span>
                      {/* 文字下方彩色卡拉OK进度线条 */}
                      <span className="block w-full h-[3px] bg-stone-200/60 rounded-full overflow-hidden mt-0.5 relative">
                        <span
                          className={`block h-full rounded-full transition-all duration-75 ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.9)]'
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

            {/* 逐词泰中对照与朱拉隆功音标 (卡拉OK彩色线条强化) */}
            {currentLine.words && currentLine.words.length > 0 && (
              <div className="my-3.5 flex flex-wrap gap-2 items-end">
                {currentLine.words.map((w, wIdx) => {
                  const pInfo = wordProgressMap[w.id || `word_${wIdx}`] || { progress: 0, status: 'pending' };
                  const isActive = pInfo.status === 'active';
                  const isDone = pInfo.status === 'completed';
                  return (
                    <button
                      key={w.id || `w_${wIdx}`}
                      onClick={() => handleSelectKaraokeSlot(wIdx)}
                      className={`group relative flex flex-col items-center border rounded-xl px-2.5 py-1.5 shadow-sm transition-all duration-150 text-left cursor-pointer min-w-[72px] ${
                        isActive
                          ? 'bg-gradient-to-b from-amber-50 to-amber-100/90 border-amber-500 ring-2 ring-amber-400/80 shadow-md shadow-amber-200/50 scale-[1.04]'
                          : isDone
                          ? 'bg-emerald-50/40 border-emerald-300/80 hover:bg-emerald-50/70'
                          : w.isCore
                          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                          : 'bg-white hover:bg-amber-50/80 border-amber-200/80'
                      }`}
                      title={`点击查看生词释义并朗读: ${w.thai}`}
                    >
                      <span className={`font-bold text-base leading-tight transition-colors ${
                        isActive ? 'text-amber-950 font-extrabold' : 'text-[#2d2a26]'
                      }`}>
                        {w.thai}
                      </span>
                      <span className="text-[11px] font-mono text-[#b58940] mt-0.5">/{w.romanization}/</span>
                      <span className="text-[11px] font-medium text-[#7a6f5f] group-hover:text-amber-900 mt-0.5">{w.chinese}</span>
                      
                      {/* 核心词标记或正在发音发光标记 */}
                      <div className="flex items-center gap-1 mt-1">
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-amber-500 text-white animate-pulse shadow-xs flex items-center gap-0.5">
                            <Mic className="w-2.5 h-2.5" />
                            <span>发音中</span>
                          </span>
                        )}
                        {w.isCore && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-800">
                            核心
                          </span>
                        )}
                      </div>

                      {/* 文字下方彩色卡拉OK进度线条 (满足用户要求) */}
                      <div className="w-full h-1.5 bg-stone-200/90 rounded-full overflow-hidden mt-1.5 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.9)]'
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

            {/* 朱拉隆功 Adapted IPA 罗马拼音整句 */}
            {currentLine.romanization && (
              <div className="text-xs sm:text-sm font-mono text-[#b58940] my-1 font-medium">
                /{currentLine.romanization}/
              </div>
            )}

            {/* 中文翻译 */}
            <div className="text-base sm:text-lg font-medium text-[#5b3f1e] mt-2 border-t border-amber-200/50 pt-2">
              {currentLine.chinese}
            </div>
          </div>
        )}

        {/* 3. 完整法谈句子列表 (Timeline Transcript Deck) */}
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

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {/* ⏱️ 中泰时差校准控制模块 (移至对照表区域，直观清晰，彻底解放底部播放栏) */}
              <div className="flex items-center bg-stone-50 hover:bg-stone-100/90 p-1 rounded-xl border border-stone-200/90 gap-1 text-xs shadow-2xs">
                {/* 锁定切换与当前偏置 */}
                <button
                  type="button"
                  onClick={() => {
                    const nextLocked = !isOffsetLocked;
                    setIsOffsetLocked(nextLocked);
                    updateOffset(offsetSeconds, nextLocked);
                    triggerToast(nextLocked ? '时差已锁定咬合' : '时差已解锁');
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    isOffsetLocked
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-white text-stone-600 border border-stone-200 hover:text-stone-900'
                  }`}
                  title={isOffsetLocked ? '时差已锁定（跳转时两视频自动咬合）' : '时差未锁定（点击锁定）'}
                >
                  {isOffsetLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <LockOpen className="w-3.5 h-3.5 text-stone-400" />}
                  <span className="font-mono">{offsetSeconds >= 0 ? `+${offsetSeconds}` : offsetSeconds}s</span>
                </button>

                {/* -0.1s 微调 */}
                <button
                  type="button"
                  onClick={() => handleNudgeOffset(-0.1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-mono font-bold bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition cursor-pointer shadow-2xs"
                  title="微调时差 -0.1 秒"
                >
                  -0.1
                </button>

                {/* +0.1s 微调 */}
                <button
                  type="button"
                  onClick={() => handleNudgeOffset(0.1)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-xs font-mono font-bold bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition cursor-pointer shadow-2xs"
                  title="微调时差 +0.1 秒"
                >
                  +0.1
                </button>

                <span className="w-px h-3.5 bg-stone-300 mx-0.5" />

                {/* 齿轮/校准抽屉入口 */}
                <button
                  type="button"
                  onClick={() => setShowConfigDrawer(prev => !prev)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    showConfigDrawer
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-2xs'
                  }`}
                  title="展开课件列表与详细校准抽屉"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>校准</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索泰文 / 罗马音 / 中文..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#d9c8a9] bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#b58940] w-36 sm:w-60"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-[#7a6f5f] cursor-pointer select-none" title="开启后列表会随播放自动下滚，默认不打勾以保持安静不乱翻">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => {
                    setAutoScroll(e.target.checked);
                    triggerToast(e.target.checked ? '已开启随播自动滚动' : '已关闭自动滚动（列表保持静止）');
                  }}
                  className="rounded text-[#b58940] focus:ring-[#b58940] cursor-pointer"
                />
                <span>跟随播放滚动</span>
              </label>
            </div>
          </div>

          {/* 句子卡片滚动容器 */}
          <div
            ref={timelineContainerRef}
            className="max-h-[520px] overflow-y-auto space-y-2 pr-1 divide-y divide-stone-100"
          >
            {filteredSubtitles.map((sub) => {
              const isActive = sub.id === currentLine?.id;
              return (
                <div
                  key={sub.id}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleJumpToSentence(sub.id - 1)}
                  className={`p-3 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-amber-100/70 border border-amber-400/60 shadow-sm'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          isActive
                            ? 'bg-[#b58940] text-white'
                            : 'bg-stone-100 text-[#7a6f5f]'
                        }`}
                      >
                        第 {sub.id} 句
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded animate-pulse">
                          正在播放
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-semibold text-[#2d2a26]">
                      {sub.thai}
                    </div>

                    {sub.words && sub.words.length > 0 && isActive && (
                      <div className="my-2 flex flex-wrap gap-1.5 items-end">
                        {sub.words.map((w, wIdx) => {
                          const pInfo = wordProgressMap[w.id || `word_${wIdx}`] || { progress: 0, status: 'pending' };
                          const isWordActive = pInfo.status === 'active';
                          const isWordDone = pInfo.status === 'completed';
                          return (
                            <span
                              key={w.id || `sub_w_${wIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectKaraokeSlot(wIdx);
                              }}
                              className={`inline-flex flex-col items-center px-2 py-1 rounded-lg text-left shadow-xs cursor-pointer transition ${
                                isWordActive
                                  ? 'bg-amber-100/90 border border-amber-500 ring-1 ring-amber-400 scale-[1.02]'
                                  : isWordDone
                                  ? 'bg-emerald-50/50 border border-emerald-300'
                                  : 'bg-white/90 border border-amber-300/80 hover:bg-amber-100'
                              }`}
                              title={`点击查看生词并跟读: ${w.thai}`}
                            >
                              <span className="font-bold text-xs text-[#2d2a26]">{w.thai}</span>
                              <span className="text-[10px] font-mono text-[#b58940]">/{w.romanization}/</span>
                              <span className="text-[10px] text-[#7a6f5f] font-medium">{w.chinese}</span>
                              {/* 列表中的微型卡拉OK彩色线条 */}
                              <div className="w-full h-1 bg-stone-200/80 rounded-full overflow-hidden mt-1 relative">
                                <div
                                  className={`h-full rounded-full transition-all duration-75 ${
                                    isWordActive
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                                      : isWordDone
                                      ? 'bg-emerald-500'
                                      : 'bg-transparent'
                                  }`}
                                  style={{ width: `${pInfo.progress}%` }}
                                />
                              </div>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {sub.romanization && (
                      <div className="text-[11px] font-mono text-[#b58940]">
                        /{sub.romanization}/
                      </div>
                    )}

                    <div className="text-xs text-[#5b3f1e]">
                      {sub.chinese}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeakText(sub.thai);
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-[#b58940] hover:bg-white cursor-pointer"
                      title="朗读泰文"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePracticeTyping(sub.thai);
                      }}
                      className="px-2 py-1 rounded bg-[#f0e6d2] hover:bg-[#e6d3ac] text-[#5b3f1e] text-[11px] font-medium cursor-pointer"
                      title="键盘打卡"
                    >
                      打卡
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. 极简悬浮主控播放栏 (自适应响应式架构：手机/平板/电脑模式防溢出设计，精炼绝不突出) */}
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-20px)] max-w-sm sm:w-auto sm:max-w-md xl:max-w-4xl mx-auto bg-stone-900/95 backdrop-blur-xl border border-stone-800/80 hover:border-amber-500/30 rounded-2xl p-1.5 sm:px-4 sm:py-2.5 shadow-2xl shadow-black/90 text-white transition-all box-border overflow-hidden">
        
        {/* 📱 移动端 / 平板端 (宽度 < 1280px，涵盖各类 iPad、Android 平板、折叠屏及手机)：高品质双行结构 (严控宽度，绝不溢出) */}
        <div className="flex flex-col xl:hidden gap-1.5 sm:gap-2">
          {/* 顶行：主播放操作 + 三档声道滑块 */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* 上一句 */}
              <button
                onClick={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1))}
                disabled={currentLineIndex === 0}
                className="p-1 sm:p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 disabled:opacity-25 transition cursor-pointer"
                title="上一句"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* 主播控按键 */}
              <button
                onClick={handleMasterPlayToggle}
                className="px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1 shadow-md shadow-amber-500/25 active:scale-95 transition cursor-pointer shrink-0"
              >
                {isCurrentModePlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span>{!hasChineseMedia ? '暂停' : (audioFocus === 'both' ? '双轨停' : audioFocus === 'thai' ? '外文停' : '中文停')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
                    <span>{!hasChineseMedia ? '播放' : (audioFocus === 'both' ? '双轨播' : audioFocus === 'thai' ? '外文播' : '中文播')}</span>
                  </>
                )}
              </button>

              {/* 下一句 */}
              <button
                onClick={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1))}
                disabled={currentLineIndex >= activeSubtitles.length - 1}
                className="p-1 sm:p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 disabled:opacity-25 transition cursor-pointer"
                title="下一句"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 三档滑块：外文 | 双轨 | 中文 (仅在双播模式下展示) */}
            {hasChineseMedia && (
              <div className="flex items-center bg-stone-950/80 p-0.5 sm:p-1 rounded-xl border border-stone-800 shrink-0 text-xs gap-0.5 sm:gap-1">
                <button
                  onClick={() => handleSelectMode('thai')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'thai' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="单播外文原声"
                >
                  外文
                </button>
                <button
                  onClick={() => handleSelectMode('both')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'both' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="双轨齐播"
                >
                  双轨
                </button>
                <button
                  onClick={() => handleSelectMode('chinese')}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'chinese' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="单播中文译声"
                >
                  中文
                </button>
              </div>
            )}
          </div>

          {/* 底行：句序对齐 + 循环/倍速 (极简紧凑，绝不溢出) */}
          <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-stone-800/60">
            {/* 紧凑句序与时间戳 (点击一键精确对齐) */}
            <button
              onClick={handleAlignCurrent}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-200 text-[11px] sm:text-xs font-mono tracking-tight shrink min-w-0 truncate cursor-pointer transition"
              title="点击快速一键对齐视频与当前字幕"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">第 {currentLineIndex + 1} / {activeSubtitles.length} 句</span>
              <span className="text-stone-500">·</span>
              <span className="text-stone-300">{formatSecondsToTime(currentTime)}</span>
            </button>

            {/* 统一操作区：循环 + 倍速选择 (时差与校准已常驻上方对照表) */}
            <div className="flex items-center bg-stone-950/90 p-0.5 sm:p-1 rounded-lg border border-stone-800 gap-1 sm:gap-1.5 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => {
                  const nextVal = !isLoopSentence;
                  setIsLoopSentence(nextVal);
                  triggerToast(nextVal ? '已开启每一句循环' : '已关闭循环');
                }}
                className={`px-1.5 py-1 sm:px-2 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                  isLoopSentence
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="单句循环"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">循环</span>
              </button>

              <span className="w-px h-3 bg-stone-800" />

              {/* 手机窄屏端 (< sm): 单键循环倍速 (点击切换 0.75x -> 1.0x -> 1.25x) */}
              <button
                type="button"
                onClick={() => {
                  const rates = [0.75, 1.0, 1.25];
                  const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
                  handleSetPlaybackRate(rates[nextIdx]);
                }}
                className="sm:hidden px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-900 text-amber-300 border border-stone-800 hover:bg-stone-800 transition cursor-pointer"
                title={`当前倍速 ${playbackRate}x (点击切换 0.75x / 1.0x / 1.25x)`}
              >
                {playbackRate}x
              </button>

              {/* 平板端 (>= sm 且 < xl): 完整三档倍速切换按钮 */}
              <div className="hidden sm:flex items-center gap-0.5 text-[11px] font-bold">
                {[0.75, 1.0, 1.25].map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleSetPlaybackRate(rate)}
                    className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                      playbackRate === rate ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 💻 宽屏桌面端 (>= 1280px)：流畅单行自适应排布 */}
        <div className="hidden xl:flex items-center justify-between gap-3 w-full">
          {/* 左侧：句序与时间对齐 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAlignCurrent}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700/90 border border-stone-700/60 hover:border-amber-500/50 text-stone-200 transition cursor-pointer"
              title="点击快速一键对齐视频与当前字幕"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform shrink-0" />
              <span className="text-xs font-bold text-amber-200/90 font-mono tracking-tight whitespace-nowrap">
                第 {currentLineIndex + 1} / {activeSubtitles.length} 句
              </span>
              <span className="text-stone-500 text-xs">·</span>
              <span className="text-xs font-medium text-stone-300 font-mono whitespace-nowrap">
                {formatSecondsToTime(currentTime)}
              </span>
            </button>
          </div>

          {/* 中间：主控群 + 三档分段滑块 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1))}
              disabled={currentLineIndex === 0}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
              title="上一句"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={handleMasterPlayToggle}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition transform active:scale-95 cursor-pointer shrink-0"
            >
              {isCurrentModePlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>{!hasChineseMedia ? '暂停' : (audioFocus === 'both' ? '双轨暂停' : audioFocus === 'thai' ? '外文暂停' : '中文暂停')}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>{!hasChineseMedia ? '播放' : (audioFocus === 'both' ? '双轨播放' : audioFocus === 'thai' ? '外文播放' : '中文播放')}</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1))}
              disabled={currentLineIndex >= activeSubtitles.length - 1}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
              title="下一句"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 三档滑块：外文 | 双轨 | 中文 (仅在双播模式下展示) */}
            {hasChineseMedia && (
              <div className="flex items-center bg-stone-950/80 p-0.5 sm:p-1 rounded-xl border border-stone-800 shadow-inner gap-1">
                <button
                  onClick={() => handleSelectMode('thai')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'thai' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="单播外文原声"
                >
                  外文
                </button>
                <button
                  onClick={() => handleSelectMode('both')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'both' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="双轨齐播"
                >
                  双轨
                </button>
                <button
                  onClick={() => handleSelectMode('chinese')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    audioFocus === 'chinese' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="单播中文译声"
                >
                  中文
                </button>
              </div>
            )}
          </div>

          {/* 右侧：单句循环 + 倍速选择 */}
          <div className="flex items-center bg-stone-950/90 p-1 rounded-xl border border-stone-800 shadow-inner gap-1.5 shrink-0">
            {/* 1. 单句循环 */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !isLoopSentence;
                setIsLoopSentence(nextVal);
                triggerToast(nextVal ? '已开启每一句循环' : '已关闭循环');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                isLoopSentence
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
              }`}
              title="单句循环反复播放"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>循环</span>
            </button>

            <span className="w-px h-3.5 bg-stone-800" />

            {/* 2. 倍速选择 */}
            <div className="flex items-center gap-0.5 text-[11px] font-bold">
              {[0.75, 1.0, 1.25].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSetPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    playbackRate === rate ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. 装载法谈与双视频弹窗 (统一整合链接装载与法谈字幕于同一弹窗) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#d9c8a9] p-5 sm:p-6 space-y-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <ClipboardPaste className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    装载法坛 (链接与字幕合一)
                  </h3>
                  <p className="text-xs text-stone-500">
                    在此配置视频链接与法坛字幕，确认后一键秒级装载并开播
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 text-lg font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. 视频音频源链接装载 */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-amber-700" />
                  <span>1. 视频 / 音频链接</span>
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                  支持单播原声 / 双播并列
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    🇹🇭 泰文原版母带 (YouTube 链接 / ID)
                  </label>
                  <input
                    type="text"
                    value={inputThaiUrl}
                    onChange={(e) => setInputThaiUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=xEKmQRulTgg"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">
                    🇨🇳 中文伴播 (YouTube / MP4 / MP3 直链，单播请留空)
                  </label>
                  <input
                    type="text"
                    value={inputChineseUrl}
                    onChange={(e) => setInputChineseUrl(e.target.value)}
                    placeholder="例如: https://media.dhamma.cn/video/xxx.mp4"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. 官方精选课件一键快速填充 (同时填入链接与精校字幕) */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
              <span className="text-[11px] font-bold text-stone-600 block">
                🌟 快捷填入官方精校双播课件:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OFFICIAL_PAIRED_DISCOURSES.map((discourse) => (
                  <button
                    key={discourse.id}
                    type="button"
                    onClick={() => {
                      setInputThaiUrl(discourse.thaiVideoUrl);
                      setInputChineseUrl(discourse.chineseVideoUrl);
                      setInputTitle(discourse.combinedTitle);
                      setOffsetSeconds(discourse.offsetSeconds);
                      onOffsetChange?.(discourse.offsetSeconds, isOffsetLocked);
                      // 填充到解析结果中
                      setParseResult({
                        subtitles: discourse.subtitles,
                        totalParsed: discourse.subtitles.length,
                        detectedTitle: discourse.combinedTitle
                      });
                      setPastedText(
                        exportToEnhancedSRT(discourse.subtitles)
                      );
                      triggerToast(`已调入【${discourse.dateDisplay}】双视频链接与精校字幕（共 ${discourse.subtitles.length} 句全篇带 [GLOSS] 拆词）！`);
                    }}
                    className="p-2 rounded-lg bg-white hover:bg-amber-50/80 border border-stone-200 hover:border-amber-400 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 line-clamp-1">
                        📅 {discourse.dateDisplay} {discourse.chineseTitle}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {discourse.sentenceCount} 句全篇对齐
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      填入
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 本地文件上传与字幕内容 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>2. 法谈字幕文件 / 文本</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
                    triggerToast('已复制 AI 转换提示词！可发给 AI 批量生成朱拉音标字幕');
                  }}
                  className="text-[11px] text-amber-800 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>复制 AI 转换提示词</span>
                </button>
              </div>

              {/* 上传文件区域 */}
              <input
                type="file"
                ref={modalFileInputRef}
                className="hidden"
                accept=".srt,.txt,.vtt,.tsv,.csv,.json,.lrc,text/plain"
                onChange={handleFileInputChange}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => modalFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                    : uploadedFileInfo
                    ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
                    : 'border-[#d9c8a9] bg-stone-50/50 hover:bg-amber-50/30'
                }`}
              >
                {uploadedFileInfo ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-800 truncate max-w-xs">
                            {uploadedFileInfo.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {uploadedFileInfo.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          识别到 <strong className="text-emerald-700">{parseResult.totalParsed}</strong> 句法谈字幕
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearUploadedFile();
                      }}
                      className="p-1 rounded text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-stone-600">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-stone-800">点击上传 或 拖拽字幕文件 (.srt / .txt) 到此处</span>
                  </div>
                )}
              </div>

              {/* 粘贴文本框 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                    <span>或直接在此粘贴 SRT 字幕文本 (支持 [GLOSS] 拆词行):</span>
                    {parseResult.totalParsed > 0 && (
                      <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                        ✓ 已就绪 {parseResult.totalParsed} 句
                      </span>
                    )}
                  </label>
                  {pastedText && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pastedText);
                        triggerToast('已复制文本框中全部字幕！');
                      }}
                      className="text-[11px] text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>复制全文</span>
                    </button>
                  )}
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => handlePastedTextChange(e.target.value)}
                  placeholder="在此直接粘贴包含 [GLOSS] 拆词或普通生肉 SRT 的字幕全文..."
                  rows={8}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed shadow-inner"
                />
              </div>
            </div>

            {/* 弹窗底部操作按钮 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={handleRestoreDefault18Oct}
                className="text-xs text-amber-800 hover:underline font-medium cursor-pointer"
              >
                还原为官方 10月18日基准
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleApplyDiscourseAndMedia}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>🚀 确认装载并开播</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. 预制精品课件库弹窗 */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
            {/* 弹窗头部 */}
            <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  📚
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    官方预制精品课件库 (Curated Lessons Library)
                  </h3>
                  <p className="text-xs text-slate-400">
                    一键调入尊者原版视频与全篇精准对齐（含 10-10 原声精研、10-31 双播等）
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPresetModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 课件列表：仅预制 10月17日 与 10月18日 */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5">
              {curatedLessons.map((lesson) => {
                const isSelected = config.thaiVideoUrl === lesson.thaiVideoUrl || config.chineseVideoUrl === lesson.chineseVideoUrl || config.title.includes(lesson.chineseTitle);
                return (
                  <div
                    key={lesson.id}
                    className={`p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                    onClick={() => handleSelectPresetLesson(lesson)}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {lesson.date === '2026-10-17' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🇹🇭 10月17日实况
                          </span>
                        )}
                        {lesson.date === '2026-10-18' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            🇹🇭 10月18日实况
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400">
                          {lesson.date}
                        </span>
                        <span className="text-xs font-mono text-amber-400/90 font-bold">
                          {lesson.totalSentences} 句全篇对齐
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">
                        基准偏置: {lesson.defaultOffsetSeconds > 0 ? `+${lesson.defaultOffsetSeconds}s` : `${lesson.defaultOffsetSeconds}s`}
                      </span>
                    </div>

                    {/* 标题遵循视频抬头：中文在前，泰文在后 */}
                    <h4 className="text-sm font-bold text-white mb-1">
                      {lesson.chineseTitle}
                    </h4>
                    <p className="text-xs text-amber-300/80 font-serif mb-2 line-clamp-1">
                      {lesson.title}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      <div className="flex flex-wrap gap-1">
                        {lesson.tags.map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {t}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPresetLesson(lesson);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ 当前已载入' : '调入共学放映机'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 弹窗底部提示 */}
            <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>* 如需微调双视频毫秒级时间差，请在顶部导航点击「共学管理」进入校准工作流</span>
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 离线纯音频与录音弹窗 */}
      <OfflineAudioModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        lessons={curatedLessons}
        currentLesson={currentCuratedLesson}
        activeOfflineTracks={{
          thai: thaiOfflineAudio ? { fileName: thaiOfflineAudio.fileName, lessonId: thaiOfflineAudio.lessonId } : undefined,
          chinese: chineseOfflineAudio ? { fileName: chineseOfflineAudio.fileName, lessonId: chineseOfflineAudio.lessonId } : undefined,
        }}
        onAudioActivated={handleOfflineAudioActivated}
        onClearActiveTrack={(trackType) => {
          if (trackType === 'thai_audio') {
            replaceThaiOfflineAudio(null);
            setUseOfflineThai(false);
          } else if (trackType === 'chinese_audio') {
            replaceChineseOfflineAudio(null);
            setUseOfflineChinese(false);
          }
        }}
      />
    </div>
  );
};
