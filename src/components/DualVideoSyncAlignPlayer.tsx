import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SubtitleLine, WordToken, DualVideoConfig, CuratedLesson } from '../types';
import { OCT_18_BENCHMARK_CONFIG, OCT_18_LIVE_SUBTITLES } from '../data/luangporCourseData';
import { getAllCuratedLessons, getFlagshipLesson } from '../data/presetLessonsLibrary';
import { parseLanguageReactorText, formatSecondsToTime } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT } from '../utils/lrFormatParser';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { adminAuthService } from '../services/adminAuthService';
import { 
  Play, Pause, RotateCcw, Volume2, Volume1, Settings, Sparkles, CheckCircle2,
  Repeat, Headphones, Video, BookOpen, Check, Search, ClipboardPaste,
  SlidersHorizontal, Clock, Bot, Copy, ChevronLeft, ChevronRight,
  FolderOpen, Upload, FileText, FileCheck2, Trash2, Library, X, ExternalLink,
  Lock, LockOpen
} from 'lucide-react';
import { 
  OFFICIAL_THAI_STREAMS_URL, 
  OFFICIAL_CHINESE_SEARCH_URL, 
  OFFICIAL_PAIRED_DISCOURSES 
} from '../data/officialChannels';

interface DualVideoSyncAlignPlayerProps {
  subtitles?: SubtitleLine[];
  onSelectWord?: (word: WordToken) => void;
  onOpenKeyboard?: (thaiText: string) => void;
  onSpeak?: (text: string, rate?: number) => void;
  onGoToSlides?: () => void;
  onUpdateSubtitles?: (newSubs: SubtitleLine[]) => void;
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

const STORAGE_KEY = 'luangpor_custom_dual_video_v3';
const SUBTITLES_STORAGE_KEY = 'luangpor_active_subtitles_v3';

export const DualVideoSyncAlignPlayer: React.FC<DualVideoSyncAlignPlayerProps> = ({
  subtitles: propsSubtitles,
  onSelectWord,
  onOpenKeyboard,
  onSpeak,
  onGoToSlides,
  onUpdateSubtitles
}) => {
  // 1. 基础视频与校准配置
  const [config, setConfig] = useState<DualVideoConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.thaiVideoUrl || parsed.chineseVideoUrl)) {
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
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [offsetSeconds, setOffsetSeconds] = useState(config.offsetSeconds ?? 0.0);
  const [isOffsetLocked, setIsOffsetLocked] = useState(false);

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

  // 5. 纯净每一句循环
  const [isLoopSentence, setIsLoopSentence] = useState(false);

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
  const isThaiReadyRef = useRef<boolean>(false);
  const isChineseReadyRef = useRef<boolean>(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const thaiVideoId = extractYouTubeId(config.thaiVideoUrl);
  const chineseVideoId = extractYouTubeId(config.chineseVideoUrl);
  const currentLine = activeSubtitles[currentLineIndex] || activeSubtitles[0];

  const currentCuratedLesson = useMemo(() => {
    return curatedLessons.find(l => 
      l.chineseTitle === config.title || 
      (thaiVideoId && l.thaiVideoId === thaiVideoId) || 
      (chineseVideoId && l.chineseVideoId === chineseVideoId)
    ) || curatedLessons[0];
  }, [curatedLessons, config.title, thaiVideoId, chineseVideoId]);

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

  // 应用声道设置与音量
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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    applyAudioSettings(audioFocus, thaiVol, chineseVol);
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings]);

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

  // 初始化与挂载 YouTube IFrame 官方受控播放器
  useEffect(() => {
    let isMounted = true;

    const initPlayers = () => {
      if (!isMounted || !window.YT || !window.YT.Player) return;

      // 泰文主控播放器
      if (thaiVideoId && document.getElementById('thai-yt-player') && !thaiPlayerRef.current) {
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

      // 中文对照播放器
      if (chineseVideoId && document.getElementById('chinese-yt-player') && !chinesePlayerRef.current) {
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
                  // 防脱轨回正：已移除自动 seek，避免劫持中文字幕。
                  // 中文轨保持自由播放，偏移仅在用户显式跳转或加载课件时生效。
                  try {
                    const thaiT = thaiPlayerRef.current?.getCurrentTime?.() ?? 0;
                    const chineseT = event.target.getCurrentTime?.() ?? 0;
                    const targetC = thaiT + offsetSeconds;
                    if (Math.abs(chineseT - targetC) > 0.25) {
                      // 自动 seek 已中立化：仅记录偏差，不强制回正中文视频
                      void targetC;
                    }
                  } catch {
                    // ignore
                  }
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
  }, [thaiVideoId, chineseVideoId, applyAudioSettings, audioFocus, chineseVol, offsetSeconds, playbackRate, thaiVol]);

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

  // 偏移量微调：更新 offsetSeconds，若未锁定则不自动 seek（避免劫持中文字幕）
  const handleNudgeOffset = useCallback((delta: number) => {
    const next = parseFloat((offsetSeconds + delta).toFixed(2));
    setOffsetSeconds(next);
    try {
      adminAuthService.recordAuditLog(
        'offset_calibrated',
        `中文轨偏移量调整为 ${next >= 0 ? '+' : ''}${next}s（锁定：${isOffsetLocked}）`
      );
    } catch {}
    if (!isOffsetLocked) {
      triggerToast(`中文轨偏移：${next >= 0 ? '+' : ''}${next}s（未锁定，下次跳转生效）`);
    } else {
      triggerToast(`中文轨偏移已锁定：${next >= 0 ? '+' : ''}${next}s`);
    }
  }, [offsetSeconds, isOffsetLocked]);

  // 泰文主控带中文随动：同步跳转到指定时间（尊重当前 offsetSeconds）
  const seekBothToTime = useCallback((thaiSec: number) => {
    const clampedThai = Math.max(0, thaiSec);
    const targetChinese = Math.max(0, clampedThai + offsetSeconds);

    setCurrentTime(clampedThai);
    try {
      thaiPlayerRef.current?.seekTo?.(clampedThai, true);
    } catch {}
    try {
      chinesePlayerRef.current?.seekTo?.(targetChinese, true);
    } catch {}

    const idx = activeSubtitles.findIndex(
      (sub) => clampedThai >= sub.secondsStart && clampedThai < sub.secondsEnd
    );
    if (idx !== -1) {
      setCurrentLineIndex(idx);
    }
  }, [offsetSeconds, activeSubtitles]);

  // 核心操作 1：双视频同时播放 / 同时暂停
  const handleToggleDualPlay = useCallback(() => {
    const isThaiActive = thaiPlayerRef.current?.getPlayerState?.() === 1;
    const isChineseActive = chinesePlayerRef.current?.getPlayerState?.() === 1;

    if (isThaiActive || isChineseActive) {
      try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
      try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
      setIsBothPlaying(false);
      setIsThaiPlaying(false);
      setIsChinesePlaying(false);
    } else {
      // 双轨齐播：保持用户手动对齐好的当前位置直接开播，中文轨迹不再做任何自动调整
      try { thaiPlayerRef.current?.playVideo?.(); } catch {}
      try { chinesePlayerRef.current?.playVideo?.(); } catch {}
      setIsBothPlaying(true);
      setIsThaiPlaying(true);
      setIsChinesePlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings]);

  // 核心操作 2：泰文视频单独播放/暂停
  const handleToggleThaiAlone = useCallback(() => {
    const isPlaying = thaiPlayerRef.current?.getPlayerState?.() === 1;
    if (isPlaying) {
      try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
      setIsThaiPlaying(false);
    } else {
      try { thaiPlayerRef.current?.playVideo?.(); } catch {}
      setIsThaiPlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings]);

  // 核心操作 3：中文视频单独播放/暂停
  const handleToggleChineseAlone = useCallback(() => {
    const isPlaying = chinesePlayerRef.current?.getPlayerState?.() === 1;
    if (isPlaying) {
      try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
      setIsChinesePlaying(false);
    } else {
      try { chinesePlayerRef.current?.playVideo?.(); } catch {}
      setIsChinesePlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings]);

  // 跳转到指定句子 (遵循当前声道/单播模式)
  const handleJumpToSentence = (index: number) => {
    const target = activeSubtitles[index];
    if (!target) return;
    setCurrentLineIndex(index);
    seekBothToTime(target.secondsStart);

    if (audioFocus === 'both') {
      try { thaiPlayerRef.current?.playVideo?.(); } catch {}
      try { chinesePlayerRef.current?.playVideo?.(); } catch {}
      setIsBothPlaying(true);
      setIsThaiPlaying(true);
      setIsChinesePlaying(true);
    } else if (audioFocus === 'thai') {
      try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
      try { thaiPlayerRef.current?.playVideo?.(); } catch {}
      setIsBothPlaying(false);
      setIsChinesePlaying(false);
      setIsThaiPlaying(true);
    } else {
      try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
      try { chinesePlayerRef.current?.playVideo?.(); } catch {}
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
      const isThaiActive = thaiPlayerRef.current?.getPlayerState?.() === 1;
      if (isThaiActive) {
        try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
        setIsThaiPlaying(false);
      } else {
        try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
        setIsChinesePlaying(false);
        try { thaiPlayerRef.current?.playVideo?.(); } catch {}
        setIsThaiPlaying(true);
        applyAudioSettings('thai', thaiVol, chineseVol);
      }
    } else {
      const isChineseActive = chinesePlayerRef.current?.getPlayerState?.() === 1;
      if (isChineseActive) {
        try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
        setIsChinesePlaying(false);
      } else {
        try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
        setIsThaiPlaying(false);
        try {
          const thaiT = thaiPlayerRef.current?.getCurrentTime?.() ?? currentTime;
          const targetC = Math.max(0, thaiT + offsetSeconds);
          const chineseT = chinesePlayerRef.current?.getCurrentTime?.() ?? 0;
          if (Math.abs(chineseT - targetC) > 0.4) {
            // 自动 seek 已中立化：不强制回正中文视频，避免劫持中文字幕
            void targetC;
            void chineseT;
          }
        } catch {}
        try { chinesePlayerRef.current?.playVideo?.(); } catch {}
        setIsChinesePlaying(true);
        applyAudioSettings('chinese', thaiVol, chineseVol);
      }
    }
  }, [audioFocus, handleToggleDualPlay, currentTime, offsetSeconds, thaiVol, chineseVol, applyAudioSettings]);

  // 三档分段滑块切换处理：无缝过渡播放与声道状态
  const handleSelectMode = useCallback((mode: 'thai' | 'both' | 'chinese') => {
    setAudioFocus(mode);
    const isAnyActive = isThaiPlaying || isChinesePlaying || isBothPlaying;

    if (mode === 'thai') {
      triggerToast('已切换至：🇹🇭 仅播泰语');
      try { chinesePlayerRef.current?.pauseVideo?.(); } catch {}
      setIsChinesePlaying(false);
      if (isAnyActive) {
        try { thaiPlayerRef.current?.playVideo?.(); } catch {}
        setIsThaiPlaying(true);
      }
      applyAudioSettings('thai', thaiVol, chineseVol);
    } else if (mode === 'both') {
      triggerToast('已切换至：🎧 双轨齐播');
      if (isAnyActive) {
        // 中文轨保持当前自由位置直接播放，不做自动对齐调整
        try {
          thaiPlayerRef.current?.playVideo?.();
          chinesePlayerRef.current?.playVideo?.();
          setIsThaiPlaying(true);
          setIsChinesePlaying(true);
          setIsBothPlaying(true);
        } catch {}
      }
      applyAudioSettings('both', thaiVol, chineseVol);
    } else if (mode === 'chinese') {
      triggerToast('已切换至：🇨🇳 仅播中文');
      try { thaiPlayerRef.current?.pauseVideo?.(); } catch {}
      setIsThaiPlaying(false);
      if (isAnyActive) {
        try {
          chinesePlayerRef.current?.playVideo?.();
          setIsChinesePlaying(true);
        } catch {}
      }
      applyAudioSettings('chinese', thaiVol, chineseVol);
    }
  }, [isThaiPlaying, isChinesePlaying, isBothPlaying, audioFocus, thaiVol, chineseVol, applyAudioSettings]);

  // 倍速控制（直接调用 YT.Player 原生 API，音轨与媒体时间自然变速）
  const handleSetPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    try {
      thaiPlayerRef.current?.setPlaybackRate?.(rate);
    } catch {}
    try {
      chinesePlayerRef.current?.setPlaybackRate?.(rate);
    } catch {}
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

  // 核心对齐操作：一键纠偏，根据当前视频真实播放时间，强制同步对齐字幕与双视频
  const handleAlignCurrent = useCallback(() => {
    try {
      // 优先获取当前正在发声/主控的真实播放时间
      let playerTime = 0;
      if (audioFocus === 'chinese' && chinesePlayerRef.current && typeof chinesePlayerRef.current.getCurrentTime === 'function') {
        const cTime = chinesePlayerRef.current.getCurrentTime() || 0;
        playerTime = Math.max(0, cTime - offsetSeconds);
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
  }, [audioFocus, offsetSeconds, currentTime, activeSubtitles, findActiveSubtitleIndex, seekBothToTime]);

  // 真实时间核心驱动与双视频长期播放漂移自动纠偏 (解决播放时间久了字幕脱节的深层根本原因)
  useEffect(() => {
    let isSubscribed = true;

    const timer = setInterval(() => {
      if (!isSubscribed) return;

      try {
        const thaiState = thaiPlayerRef.current?.getPlayerState?.();
        const chineseState = chinesePlayerRef.current?.getPlayerState?.();
        const isThaiActivelyPlaying = thaiState === 1;
        const isChineseActivelyPlaying = chineseState === 1;

        setIsThaiPlaying(isThaiActivelyPlaying);
        setIsChinesePlaying(isChineseActivelyPlaying);

        // A. 真实时间基准获取：
        // 若泰文正在播放，以泰文为绝对时间戳基准；
        // 若泰文暂停而中文单独播放，以中文时间倒推泰文基准时间
        let realTime = 0;
        if (thaiPlayerRef.current && typeof thaiPlayerRef.current.getCurrentTime === 'function') {
          realTime = thaiPlayerRef.current.getCurrentTime() || 0;
        } else if (chinesePlayerRef.current && typeof chinesePlayerRef.current.getCurrentTime === 'function') {
          const cTime = chinesePlayerRef.current.getCurrentTime() || 0;
          realTime = Math.max(0, cTime - offsetSeconds);
        }

        // 如果泰文卡顿暂停但中文在放，且用户在听中文
        if (!isThaiActivelyPlaying && isChineseActivelyPlaying && audioFocus === 'chinese') {
          const cTime = chinesePlayerRef.current?.getCurrentTime?.() || 0;
          realTime = Math.max(0, cTime - offsetSeconds);
        }

        setCurrentTime(realTime);

        // 注：中文视频不做任何自动对齐调整（遵循用户操作准则：“中文随便它播”），
        // 字幕高亮与时间基准始终以泰文原版为准，中文轨保持自由播放。

        const targetLine = activeSubtitles[currentLineIndex];

        // C. 每一句循环检测：到达当前句真实句尾时平滑跳回起点（已移除自动 seek，避免劫持中文字幕）
        if (isLoopSentence && targetLine && realTime >= targetLine.secondsEnd) {
          // seekBothToTime(targetLine.secondsStart); — 已禁用自动跳转
          if (isThaiActivelyPlaying || isChineseActivelyPlaying) {
            thaiPlayerRef.current?.playVideo?.();
            chinesePlayerRef.current?.playVideo?.();
          }
          return;
        }

        // D. 真实时间驱动字幕高亮同步 (采用全覆盖无盲区定位，解决停顿气口造成的识别中断)
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
  }, [activeSubtitles, currentLineIndex, isLoopSentence, seekBothToTime, audioFocus, offsetSeconds, findActiveSubtitleIndex]);

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

  // 应用粘贴的内容
  const handleApplyPastedSubtitles = () => {
    if (parseResult.totalParsed === 0) {
      alert('未能识别到有效的法谈字幕行，请确认包含双语文本！');
      return;
    }
    saveSubtitles(parseResult.subtitles);
    if (parseResult.detectedTitle) {
      const updatedConf = { ...config, title: parseResult.detectedTitle };
      saveConfig(updatedConf);
      setInputTitle(parseResult.detectedTitle);
    }
    setCurrentLineIndex(0);
    seekBothToTime(parseResult.subtitles[0].secondsStart);
    setShowPasteModal(false);
    triggerToast(`成功载入 ${parseResult.totalParsed} 句法谈！`);
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#faf7f2] text-[#2d2a26] pb-32 font-sans relative">
      {/* 顶部工具条 (非置顶常规布局，节省宝贵视口垂直空间) */}
      <div className="border-b border-[#e6d3ac]/60 bg-white/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <Video className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-[#2d2a26]">
                  泰中双视频同步对齐放映机
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/60 font-mono">
                  第 {currentLineIndex + 1} 句 / 共 {activeSubtitles.length} 句
                </span>
                {activeSubtitles.length === 746 || activeSubtitles.length === 1198 ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                    <span>🌟 官方人工精校字幕</span>
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresetModal(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              title="查看与调入官方预制课件（10月17日 1,198句 与 10月18日 746句原版对齐）"
            >
              <Library className="w-3.5 h-3.5" />
              <span>📚 预制课件库</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[#b58940] hover:bg-[#9a7332] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              title="导入或更换法谈字幕 (支持拖拽文件与格式粘贴)"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>📋 导入法谈 (SRT / LR)</span>
            </button>

            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-3 py-1.5 rounded-lg bg-[#f0e6d2] hover:bg-[#e6d3ac] text-[#5b3f1e] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>视频链接</span>
            </button>

            {onGoToSlides && (
              <button
                onClick={onGoToSlides}
                className="hidden sm:flex px-3 py-1.5 rounded-lg bg-[#b58940] hover:bg-[#9a7332] text-white text-xs font-semibold items-center gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>🎴 共学讲义</span>
              </button>
            )}
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

      {/* 视频链接设置抽屉 */}
      {showConfigDrawer && (
        <div className="bg-[#fcfaf7] border-b border-[#e6d3ac] px-4 sm:px-6 py-4 shadow-inner">
          <div className="max-w-7xl mx-auto space-y-4">
            
            {/* 抽屉头部 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6d3ac]/60 pb-2.5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#b58940]" />
                <h3 className="text-sm font-bold text-[#2d2a26]">
                  中泰双视频链接与实况对照
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestoreDefault18Oct}
                  className="text-xs text-amber-800 hover:text-amber-900 underline font-medium cursor-pointer"
                >
                  恢复 10月18日默认
                </button>
                <button
                  onClick={() => setShowConfigDrawer(false)}
                  className="px-2 py-1 rounded-md text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-bold cursor-pointer transition"
                >
                  ✕ 关闭抽屉
                </button>
              </div>
            </div>

            {/* 1. 两个官方合集链接直达卡片：供师兄师姐直接点进去浏览最新直播 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={OFFICIAL_THAI_STREAMS_URL}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-300 flex items-center justify-between group transition shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                    ▶
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 group-hover:text-amber-950 flex items-center gap-1.5">
                      <span>🇹🇭 尊者泰文官方直播合集 (@luangpupramote/streams)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700" />
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Wat Suan Santidham 原版直播录像 · 泰文原声与官方人工字幕发布源
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-900 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
                  直接点进 ↗
                </span>
              </a>

              <a
                href={OFFICIAL_CHINESE_SEARCH_URL}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-red-50/80 hover:bg-red-100/90 border border-red-200 flex items-center justify-between group transition shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                    🇨🇳
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 group-hover:text-red-950 flex items-center gap-1.5">
                      <span>🇨🇳 解脱园中文同传最新合集 (YouTube 检索专区)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-red-700" />
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      中文同声翻译同步直播录像 · 华语团队实时译制
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-red-900 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs">
                  直接点进 ↗
                </span>
              </a>
            </div>

            {/* 2. 双视频相关对照列表 (点击即装载) */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#e6d3ac] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-900">
                    🌟 官方实况对照列表 (点击直接装载播放)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                    官方原版抬头
                  </span>
                </div>
                <span className="text-[11px] text-stone-500">
                  点击卡片右下角按钮，立即同步调入视频、时间差与全篇精校字幕
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {OFFICIAL_PAIRED_DISCOURSES.map((paired) => {
                  const isCurrentlyLoaded = config.thaiVideoUrl === paired.thaiVideoUrl || config.title.includes(paired.date);
                  return (
                    <div
                      key={paired.id}
                      className={`p-3.5 rounded-xl border transition ${
                        isCurrentlyLoaded
                          ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-stone-50/70 border-stone-200 hover:border-amber-400 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded text-[11px]">
                          📅 {paired.dateDisplay} 实况
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                          {paired.subtitleStatusLabel}
                        </span>
                      </div>

                      {/* 中文原版抬头在前 */}
                      <div className="text-xs font-bold text-stone-900 line-clamp-1 mb-1">
                        🇨🇳 {paired.chineseTitle}
                      </div>
                      {/* 泰文原版抬头在后 */}
                      <div className="text-[11px] text-amber-800 font-serif line-clamp-1 mb-2.5">
                        🇹🇭 {paired.thaiTitle}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-xs">
                        <div className="text-[10px] font-mono text-stone-500">
                          ID: {paired.thaiVideoId} ↔ {paired.chineseVideoId}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newConf: DualVideoConfig = {
                              title: paired.combinedTitle,
                              thaiVideoUrl: paired.thaiVideoUrl,
                              chineseVideoUrl: paired.chineseVideoUrl,
                              offsetSeconds: paired.offsetSeconds,
                              thaiVolume: 1.0,
                              chineseVolume: chineseVol / 100
                            };
                            saveConfig(newConf);
                            setOffsetSeconds(paired.offsetSeconds);
                            setInputThaiUrl(paired.thaiVideoUrl);
                            setInputChineseUrl(paired.chineseVideoUrl);
                            setInputTitle(paired.combinedTitle);
                            saveSubtitles(paired.subtitles);
                            setCurrentLineIndex(0);
                            setShowConfigDrawer(false);
                            triggerToast(`已成功装载【${paired.dateDisplay}】双视频与${paired.sentenceCount}句全篇字幕！`);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            isCurrentlyLoaded
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isCurrentlyLoaded ? '正在放映此场' : '▶ 一键装载同步播放'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. 泰文字幕两阶段演进与智能拉取指引 */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-stone-700 space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>泰文字幕演进说明</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] leading-relaxed pt-1">
                <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60">
                  <span className="font-bold text-stone-900 block mb-0.5">
                    1. 新直播刚结束时 (自动生成字幕 / Auto ASR)：
                  </span>
                  <span className="text-stone-600">
                    YouTube 系统会自动识别出泰语音轨，虽有断句，但生僻佛教巴利词汇可能不够精准。急需学习时，可从 YouTube 复制字幕文本直接导入，本放映机会自动补全朱拉音标与词典切词。
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60">
                  <span className="font-bold text-emerald-900 block mb-0.5">
                    2. 直播后数天 (官方人工精校字幕 / Manual CC)：
                  </span>
                  <span className="text-stone-600">
                    寺庙基金会发布人工校准泰文字幕后，巴利术语 100% 严谨。预制课件库会自动更新收录，您无需任何繁琐操作，在「📚 预制课件库」或本抽屉一键载入即可享受人工精校体验。
                  </span>
                </div>
              </div>
            </div>

            {/* 4. 自定义手动调整区域 (备用) */}
            <div className="pt-2 border-t border-[#e6d3ac]/60">
              <details className="group">
                <summary className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer list-none flex items-center gap-1 mb-2">
                  <span className="text-amber-800">▸</span>
                  <span>高级选项：手动输入/修改视频链接与标题</span>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[#7a6f5f] block mb-1">
                      泰文主控视频链接 (YouTube)
                    </label>
                    <input
                      type="text"
                      value={inputThaiUrl}
                      onChange={(e) => setInputThaiUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#d9c8a9] bg-white focus:outline-none focus:ring-1 focus:ring-[#b58940]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#7a6f5f] block mb-1">
                      中文对照视频链接 (YouTube)
                    </label>
                    <input
                      type="text"
                      value={inputChineseUrl}
                      onChange={(e) => setInputChineseUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#d9c8a9] bg-white focus:outline-none focus:ring-1 focus:ring-[#b58940]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#7a6f5f] block mb-1">
                      法谈课题名称
                    </label>
                    <input
                      type="text"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#d9c8a9] bg-white focus:outline-none focus:ring-1 focus:ring-[#b58940]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    onClick={() => {
                      const updated = {
                        ...config,
                        thaiVideoUrl: inputThaiUrl,
                        chineseVideoUrl: inputChineseUrl,
                        title: inputTitle
                      };
                      saveConfig(updated);
                      setShowConfigDrawer(false);
                      triggerToast('视频链接已更新');
                    }}
                    className="px-4 py-1.5 rounded-lg bg-[#b58940] hover:bg-[#9a7332] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    保存自定义链接设置
                  </button>
                </div>
              </details>
            </div>

          </div>
        </div>
      )}

      {/* 主界面内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">

        {/* 1. 双视频视窗区域 (带各自的独立暂停/播放快捷键，方便听完一句手动打点暂停) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* 泰文视频视窗 */}
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3.5 py-2.5 flex items-center justify-between text-xs text-amber-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isThaiPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                <span className="font-bold">🇹🇭 泰文原版</span>
                <span className="text-[10px] text-stone-300">
                  ({isThaiPlaying ? '播放中' : '已暂停'})
                </span>
              </div>
              <button
                onClick={handleToggleThaiAlone}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="单独播放/暂停泰文视频，用于听完一句暂停对齐"
              >
                {isThaiPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isThaiPlaying ? '暂停泰文' : '播放泰文'}</span>
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0">
              {thaiVideoId ? (
                <div id="thai-yt-player" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Video className="w-8 h-8 text-stone-600 mb-2" />
                  <p>请输入有效的泰文 YouTube 视频链接</p>
                </div>
              )}
            </div>
          </div>

          {/* 中文视频视窗 */}
          <div className="bg-[#2d2a26] rounded-2xl overflow-hidden shadow-lg border border-[#d9c8a9]/30 flex flex-col">
            <div className="bg-[#3d3730] px-3.5 py-2 flex items-center justify-between text-xs text-amber-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isChinesePlaying ? 'bg-blue-400 animate-pulse' : 'bg-stone-500'}`} />
                <span className="font-bold">🇨🇳 中文译版</span>
                <span className="text-[10px] text-stone-300">
                  ({isChinesePlaying ? '播放中' : '已暂停'})
                </span>
                {chineseVol < 100 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    Dim {chineseVol}%
                  </span>
                )}
              </div>

              {/* 中文伴弱随听音量微调 (以 30% 递减：70%、40%、10%) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-stone-900/90 rounded-lg p-0.5 border border-amber-500/30 text-[10px]">
                  <span className="text-[10px] text-amber-200/90 px-1 font-semibold flex items-center gap-0.5">
                    <Volume1 className="w-3 h-3 text-amber-400" />
                    <span className="hidden xs:inline">伴弱:</span>
                  </span>
                  {[100, 70, 40, 10].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleSetChineseVol(v)}
                      className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        chineseVol === v
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'text-stone-300 hover:text-white hover:bg-stone-800'
                      }`}
                      title={v === 100 ? '正常 100%' : `以 30% 幅度递减至 ${v}% (减弱 ${100 - v}%)`}
                    >
                      {v === 100 ? '100%' : `${v}%`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleToggleChineseAlone}
                  className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="单独播放/暂停中文视频，用于听完一句暂停对齐"
                >
                  {isChinesePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isChinesePlaying ? '暂停中文' : '播放中文'}</span>
                </button>
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0">
              {chineseVideoId ? (
                <div id="chinese-yt-player" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Video className="w-8 h-8 text-stone-600 mb-2" />
                  <p>请输入有效的中文 YouTube 视频链接</p>
                </div>
              )}
            </div>
          </div>
        </div>

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

        {/* 2. 当前聚焦精读句大卡 (Hero Active Sentence Stage) */}
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

            {/* 泰文超大字符 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-[#2d2a26] leading-relaxed tracking-wide my-2">
              {currentLine.thai}
            </div>

            {/* 逐词泰中对照与朱拉隆功音标 */}
            {currentLine.words && currentLine.words.length > 0 && (
              <div className="my-3.5 flex flex-wrap gap-2 items-end">
                {currentLine.words.map(w => (
                  <button
                    key={w.id}
                    onClick={() => {
                      if (onSelectWord) onSelectWord(w);
                      else handleSpeakText(w.thai);
                    }}
                    className={`group relative flex flex-col items-center border rounded-xl px-2.5 py-1.5 shadow-sm transition text-left cursor-pointer ${
                      w.isCore
                        ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
                        : 'bg-white hover:bg-amber-50/80 border-amber-200/80'
                    }`}
                    title={`点击查看生词释义并朗读: ${w.thai}`}
                  >
                    <span className="font-bold text-base text-[#2d2a26] leading-tight">{w.thai}</span>
                    <span className="text-[11px] font-mono text-[#b58940] mt-0.5">/{w.romanization}/</span>
                    <span className="text-[11px] font-medium text-[#7a6f5f] group-hover:text-amber-900 mt-0.5">{w.chinese}</span>
                    {w.isCore && (
                      <span className="mt-0.5 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-800">
                        核心
                      </span>
                    )}
                  </button>
                ))}
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
                        {sub.words.map(w => (
                          <span
                            key={w.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectWord) onSelectWord(w);
                              else handleSpeakText(w.thai);
                            }}
                            className="inline-flex flex-col items-center bg-white/90 border border-amber-300/80 px-2 py-1 rounded-lg text-left shadow-xs cursor-pointer hover:bg-amber-100 transition"
                            title={`点击查看生词: ${w.thai}`}
                          >
                            <span className="font-bold text-xs text-[#2d2a26]">{w.thai}</span>
                            <span className="text-[10px] font-mono text-[#b58940]">/{w.romanization}/</span>
                            <span className="text-[10px] text-[#7a6f5f] font-medium">{w.chinese}</span>
                          </span>
                        ))}
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

      {/* 4. 极简悬浮主控播放栏 (Apple 精工悬浮底栏 —— 紧凑单行、三档滑块联动、一键极速对齐) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-stone-900/95 backdrop-blur-xl border border-stone-800/80 hover:border-amber-500/30 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-2xl shadow-black/80 text-white flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5 transition-colors">
        
        {/* 左侧：紧凑句序与时间戳 (点击一键精确对齐，解决脱节) */}
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

        {/* 中间：主控群 + 三档分段滑块 (🇹🇭 仅泰语 | 🎧 双轨齐播 | 🇨🇳 仅中文) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 flex-wrap justify-center">
          {/* 上一句 */}
          <button
            onClick={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1))}
            disabled={currentLineIndex === 0}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
            title="上一句"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 主播控按键 (根据当前分段模式智能播放/暂停) */}
          <button
            onClick={handleMasterPlayToggle}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition transform active:scale-95 cursor-pointer shrink-0"
            title={
              audioFocus === 'both'
                ? (isCurrentModePlaying ? '双轨同时暂停' : '双轨同时播放')
                : audioFocus === 'thai'
                ? (isCurrentModePlaying ? '泰语单轨暂停' : '泰语单轨播放')
                : (isCurrentModePlaying ? '中文单轨暂停' : '中文单轨播放')
            }
          >
            {isCurrentModePlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>
                  {audioFocus === 'both' ? '双轨暂停' : audioFocus === 'thai' ? '泰语暂停' : '中文暂停'}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>
                  {audioFocus === 'both' ? '双轨齐播' : audioFocus === 'thai' ? '泰语播放' : '中文播放'}
                </span>
              </>
            )}
          </button>

          {/* 下一句 */}
          <button
            onClick={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1))}
            disabled={currentLineIndex >= activeSubtitles.length - 1}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
            title="下一句"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 🌟 三档分段滑块：合并泰播、中播与声道滑块 */}
          <div className="flex items-center bg-stone-950/80 p-0.5 sm:p-1 rounded-xl border border-stone-800 shadow-inner">
            <button
              onClick={() => handleSelectMode('thai')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                audioFocus === 'thai'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="单播泰语（中文静音暂停）"
            >
              <span>🇹🇭</span>
              <span className="hidden xs:inline">仅泰语</span>
              <span className="xs:hidden">泰</span>
            </button>

            <button
              onClick={() => handleSelectMode('both')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                audioFocus === 'both'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="双轨齐播（泰语原声 + 中文伴读）"
            >
              <span>🎧</span>
              <span className="hidden xs:inline">双轨齐播</span>
              <span className="xs:hidden">双轨</span>
            </button>

            <button
              onClick={() => handleSelectMode('chinese')}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                audioFocus === 'chinese'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="单播中文（泰语静音暂停）"
            >
              <span>🇨🇳</span>
              <span className="hidden xs:inline">仅中文</span>
              <span className="xs:hidden">中</span>
            </button>
          </div>
        </div>

        {/* 右侧：单句循环与倍速精调 (移除拥挤冗余的 Dim，专注核心体验) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 每一句循环 */}
          <button
            onClick={() => {
              const nextVal = !isLoopSentence;
              setIsLoopSentence(nextVal);
              triggerToast(nextVal ? '已开启每一句循环' : '已关闭循环');
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              isLoopSentence
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/25 font-black'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border-stone-700/60'
            }`}
            title="单句循环反复播放"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">循环</span>
          </button>

          {/* 倍速 */}
          <div className="flex items-center bg-stone-950/80 p-0.5 rounded-xl border border-stone-800 text-[11px] font-bold">
            {[0.75, 1.0, 1.25].map(rate => (
              <button
                key={rate}
                onClick={() => handleSetPlaybackRate(rate)}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  playbackRate === rate ? 'bg-amber-500 text-slate-950 font-black' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* 🔒 偏移量锁定与微调 */}
          <div className="flex items-center gap-1 bg-stone-950/80 p-0.5 rounded-xl border border-stone-800">
            <button
              onClick={() => {
                setIsOffsetLocked(!isOffsetLocked);
                triggerToast(isOffsetLocked ? '偏移量已解锁' : '偏移量已锁定');
              }}
              className={`px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                isOffsetLocked
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title={isOffsetLocked ? '点击解锁偏移量' : '点击锁定偏移量（锁定后双轨跳转将尊持当前偏移）'}
            >
              {isOffsetLocked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
              <span className="hidden sm:inline text-xs">{isOffsetLocked ? '锁' : '解'}</span>
            </button>
            <span className="text-[10px] font-mono text-amber-400 font-bold px-1.5">
              {offsetSeconds >= 0 ? '+' : ''}{offsetSeconds}s
            </span>
            <button
              onClick={() => handleNudgeOffset(-0.1)}
              className="px-1.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 text-xs transition cursor-pointer"
              title="偏移 -0.1s"
            >
              −0.1
            </button>
            <button
              onClick={() => handleNudgeOffset(0.1)}
              className="px-1.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-200 text-xs transition cursor-pointer"
              title="偏移 +0.1s"
            >
              +0.1
            </button>
          </div>
        </div>
      </div>

      {/* 5. 导入新法谈弹窗 (支持本地文件直接读取与手动粘贴) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#d9c8a9] p-5 sm:p-6 space-y-4">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2d2a26]">
                    导入法谈课件 / 字幕文件
                  </h3>
                  <p className="text-[11px] text-[#7a6f5f]">
                    支持官方精校一键拉取、直通官方合集与本地文件秒级解析
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

            {/* 1. 官方频道直接直达链接 (方便师兄师姐直接点击进入浏览最新直播，零复制粘贴困扰) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={OFFICIAL_THAI_STREAMS_URL}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-amber-50/90 hover:bg-amber-100 border border-amber-300 flex items-center justify-between group transition shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    ▶
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 group-hover:text-amber-950 flex items-center gap-1">
                      <span>🇹🇭 尊者泰文直播合集</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-amber-700" />
                    </div>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      @luangpupramote/streams 官方原版
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                  直接点进 ↗
                </span>
              </a>

              <a
                href={OFFICIAL_CHINESE_SEARCH_URL}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-red-50/90 hover:bg-red-100 border border-red-200 flex items-center justify-between group transition shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    🇨🇳
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 group-hover:text-red-950 flex items-center gap-1">
                      <span>🇨🇳 解脱园中文最新合集</span>
                      <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-red-700" />
                    </div>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      解说员最新 YouTube 视频专区
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-red-900 bg-white px-2 py-0.5 rounded-md border border-red-200">
                  直接点进 ↗
                </span>
              </a>
            </div>

            {/* 2. 🌟 一键拉取官方人工精校字幕 */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-stone-50 border border-emerald-300 space-y-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>🌟 官方人工精校字幕直通拉取</span>
                </div>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                  官方人工审定 · 术语100%校准
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                官方人工精校字幕已与视频精准对齐，点击下方卡片可直接调入播放器：
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                {OFFICIAL_PAIRED_DISCOURSES.map((discourse) => (
                  <div
                    key={discourse.id}
                    className="p-3 rounded-xl bg-white/95 border border-emerald-200 hover:border-emerald-400 transition flex flex-col justify-between gap-2.5 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span className="text-emerald-900 font-mono">📅 {discourse.dateDisplay}</span>
                        <span className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {discourse.sentenceCount} 句全篇
                        </span>
                      </div>
                      <div className="text-xs font-bold text-stone-900 line-clamp-1">
                        🇨🇳 {discourse.chineseTitle}
                      </div>
                      <div className="text-[10px] text-amber-800 font-serif line-clamp-1 mt-0.5">
                        🇹🇭 {discourse.thaiTitle}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newConf: DualVideoConfig = {
                          title: discourse.combinedTitle,
                          thaiVideoUrl: discourse.thaiVideoUrl,
                          chineseVideoUrl: discourse.chineseVideoUrl,
                          offsetSeconds: discourse.offsetSeconds,
                          thaiVolume: 1.0,
                          chineseVolume: chineseVol / 100
                        };
                        saveConfig(newConf);
                        setOffsetSeconds(discourse.offsetSeconds);
                        setInputThaiUrl(discourse.thaiVideoUrl);
                        setInputChineseUrl(discourse.chineseVideoUrl);
                        setInputTitle(discourse.combinedTitle);
                        saveSubtitles(discourse.subtitles);
                        setCurrentLineIndex(0);
                        setShowPasteModal(false);
                        triggerToast(`已一键拉取装载【${discourse.dateDisplay}】${discourse.sentenceCount}句官方人工精校字幕！`);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>一键载入此篇精校 ({discourse.sentenceCount}句)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 泰文字幕两阶段演进与智能拉取指引 */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs text-stone-700 space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <span>💡</span>
                <span>泰文字幕两阶段演进逻辑（为什么优先推荐官方人工字幕）：</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                <div className="bg-white/90 p-2 rounded-lg border border-amber-200/60">
                  <span className="font-bold text-stone-900 block mb-0.5">
                    1. 初期自动字幕 (Auto-generated ASR)：
                  </span>
                  <span className="text-stone-600">
                    直播刚结束时由 YouTube 自动生成，虽有时间轴，但对佛学巴利术语常有断句或识别误差。若急需学习，可直接拖入或粘贴进下方，本机会自动用朱拉音标和词典补齐。
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-200/60">
                  <span className="font-bold text-emerald-900 block mb-0.5">
                    2. 后期人工精校 (Official Manual CC)：
                  </span>
                  <span className="text-stone-600">
                    数天后寺庙团队发布人工听写审校字幕，巴利佛学术语严谨无误。本放映机已自动集成，直接点击上方【一键载入】即可享受高品质对齐体验。
                  </span>
                </div>
              </div>
            </div>

            {/* 本地文件拖拽上传区 (核心推荐区) */}
            <input
              type="file"
              ref={modalFileInputRef}
              className="hidden"
              accept=".srt,.txt,.vtt,.tsv,.csv,.json,.lrc,.sub,.ass,.ssa,text/plain,text/*,application/json"
              onChange={handleFileInputChange}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => modalFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                  : uploadedFileInfo
                  ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
                  : 'border-[#d9c8a9] bg-stone-50/60 hover:bg-amber-50/40 hover:border-amber-400'
              }`}
            >
              {uploadedFileInfo ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-6 h-6" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-800 truncate max-w-[240px] sm:max-w-xs">
                          {uploadedFileInfo.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {uploadedFileInfo.size}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        本地文本读取完成 • 识别到 <strong className="text-emerald-700">{parseResult.totalParsed}</strong> 句双语对齐字幕
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition cursor-pointer"
                    >
                      重新选文件
                    </button>
                    <button
                      type="button"
                      onClick={handleClearUploadedFile}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="清除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800">
                      点击浏览 或 将字幕文件拖拽到此处
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      大文件秒级读取，解析方式与粘贴完全一致（纯 TXT / UTF-8 解码）
                    </p>
                  </div>
                  {/* 支持格式气泡 */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    {['.SRT (推荐)', '.TXT', '.VTT', '.TSV', '.CSV', '.JSON', '.LRC', '.ASS'].map((fmt) => (
                      <span
                        key={fmt}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-stone-200 text-stone-600"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 解析成功预览条 */}
            {parseResult.totalParsed > 0 && (
              <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl p-3.5 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>成功识别 {parseResult.totalParsed} 句法谈！</span>
                  </div>
                  {parseResult.detectedTitle && (
                    <span className="text-[11px] text-emerald-800 truncate max-w-[200px] font-medium">
                      {parseResult.detectedTitle}
                    </span>
                  )}
                </div>

                {/* 前两句快速预览，让用户放心 */}
                <div className="bg-white/80 rounded-lg p-2.5 space-y-1 text-[11px] text-stone-700 border border-emerald-200/60 max-h-24 overflow-y-auto">
                  {parseResult.subtitles.slice(0, 2).map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 border-b last:border-b-0 border-stone-100 pb-1 last:pb-0">
                      <span className="font-mono text-[10px] text-amber-700 shrink-0 pt-0.5">{s.timeStart}</span>
                      <div className="truncate">
                        <span className="font-semibold text-stone-900">{s.thai}</span>
                        {s.chinese && <span className="text-stone-500 ml-2">({s.chinese})</span>}
                      </div>
                    </div>
                  ))}
                  {parseResult.totalParsed > 2 && (
                    <div className="text-[10px] text-stone-400 text-center pt-0.5">
                      ... 其余 {parseResult.totalParsed - 2} 句已准备就绪 ...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 可折叠的手动粘贴 / AI 提示词辅助区 */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRawTextarea(!showRawTextarea)}
                className="w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  <span>{showRawTextarea ? '收起文本输入与编辑框' : '📝 手动粘贴文本 / 查看原始字幕文本 / 复制 AI 转换 Prompt'}</span>
                </span>
                <span className="text-[11px] text-stone-400">{showRawTextarea ? '▲ 收起' : '▼ 展开'}</span>
              </button>

              {showRawTextarea && (
                <div className="p-3.5 space-y-3 bg-white border-t border-stone-200">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-stone-500 text-[11px]">可直接修改或在此粘贴文本：</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
                        setCopiedPromptInModal(true);
                        setTimeout(() => setCopiedPromptInModal(false), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      {copiedPromptInModal ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>已复制 AI 批量转换 Prompt！</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>复制 AI 批量转换 Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  <textarea
                    value={pastedText}
                    onChange={(e) => handlePastedTextChange(e.target.value)}
                    placeholder="可在此直接粘贴文本内容，或查看已上传文件的纯文本..."
                    className="w-full h-36 text-xs font-mono p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#b58940]"
                  />
                </div>
              )}
            </div>

            {/* 弹窗底部操作按钮 */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={handleRestoreDefault18Oct}
                className="text-xs text-amber-800 hover:underline font-medium cursor-pointer"
              >
                还原为官方 10月18日 (746句完整版)
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
                  onClick={handleApplyPastedSubtitles}
                  disabled={parseResult.totalParsed === 0}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer ${
                    parseResult.totalParsed > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                      : 'bg-stone-300 cursor-not-allowed'
                  }`}
                >
                  {parseResult.totalParsed > 0
                    ? `应用并载入播放器 (${parseResult.totalParsed} 句)`
                    : '请先导入或粘贴字幕'}
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
                    一键调入尊者原版双视频与全篇精准对齐（仅预制 10月17日 1,198句 与 10月18日 746句）
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
              <span>* 如需微调双视频毫秒级时间差，请在顶部导航点击 🔒 管理后台 进入校准中枢</span>
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
    </div>
  );
};
