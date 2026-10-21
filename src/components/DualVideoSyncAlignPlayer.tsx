import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SubtitleLine, WordToken, DualVideoConfig } from '../types';
import { OCT_18_BENCHMARK_CONFIG, OCT_18_LIVE_SUBTITLES } from '../data/luangporCourseData';
import { parseLanguageReactorText } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT } from '../utils/lrFormatParser';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { 
  Play, Pause, RotateCcw, Volume2, Settings, Sparkles, CheckCircle2,
  Repeat, Headphones, Video, BookOpen, Check, Search, ClipboardPaste,
  SlidersHorizontal, Clock, Bot, Copy, ChevronLeft, ChevronRight
} from 'lucide-react';

interface DualVideoSyncAlignPlayerProps {
  subtitles?: SubtitleLine[];
  onSelectWord?: (word: WordToken) => void;
  onOpenKeyboard?: (thaiText: string) => void;
  onSpeak?: (text: string, rate?: number) => void;
  onGoToSlides?: () => void;
  onUpdateSubtitles?: (newSubs: SubtitleLine[]) => void;
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

  // 4. 声道管理
  const [audioFocus, setAudioFocus] = useState<'thai' | 'chinese' | 'both'>('both');
  const [thaiVol, setThaiVol] = useState(100);
  const [chineseVol, setChineseVol] = useState(85);

  // 5. 纯净每一句循环
  const [isLoopSentence, setIsLoopSentence] = useState(false);

  // 6. 弹窗与设置
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // 7. 搜索过滤
  const [searchQuery, setSearchQuery] = useState('');

  // 8. 粘贴导入临时状态
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<{
    subtitles: SubtitleLine[];
    detectedTitle?: string;
    totalParsed: number;
  }>({ subtitles: [], totalParsed: 0 });
  const [copiedPromptInModal, setCopiedPromptInModal] = useState(false);

  // DOM 引用
  const thaiIframeRef = useRef<HTMLIFrameElement>(null);
  const chineseIframeRef = useRef<HTMLIFrameElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  const thaiVideoId = extractYouTubeId(config.thaiVideoUrl);
  const chineseVideoId = extractYouTubeId(config.chineseVideoUrl);
  const currentLine = activeSubtitles[currentLineIndex] || activeSubtitles[0];

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

  // 发送指令给 YouTube IFrame
  const sendYTCommand = useCallback((iframe: HTMLIFrameElement | null, func: string, args: any[] = []) => {
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {
      // ignore
    }
  }, []);

  // 应用声道设置与静音管理
  const applyAudioSettings = useCallback((focus: 'thai' | 'chinese' | 'both', tVol: number, cVol: number) => {
    if (focus === 'thai') {
      sendYTCommand(thaiIframeRef.current, 'unMute');
      sendYTCommand(thaiIframeRef.current, 'setVolume', [tVol]);
      sendYTCommand(chineseIframeRef.current, 'mute');
    } else if (focus === 'chinese') {
      sendYTCommand(thaiIframeRef.current, 'mute');
      sendYTCommand(chineseIframeRef.current, 'unMute');
      sendYTCommand(chineseIframeRef.current, 'setVolume', [cVol]);
    } else {
      sendYTCommand(thaiIframeRef.current, 'unMute');
      sendYTCommand(thaiIframeRef.current, 'setVolume', [tVol]);
      sendYTCommand(chineseIframeRef.current, 'unMute');
      sendYTCommand(chineseIframeRef.current, 'setVolume', [cVol]);
    }
  }, [sendYTCommand]);

  useEffect(() => {
    applyAudioSettings(audioFocus, thaiVol, chineseVol);
  }, [audioFocus, thaiVol, chineseVol, applyAudioSettings]);

  // 核心操作 1：双视频同时播放 / 同时暂停
  const handleToggleDualPlay = useCallback(() => {
    if (isBothPlaying || (isThaiPlaying && isChinesePlaying)) {
      sendYTCommand(thaiIframeRef.current, 'pauseVideo');
      sendYTCommand(chineseIframeRef.current, 'pauseVideo');
      setIsBothPlaying(false);
      setIsThaiPlaying(false);
      setIsChinesePlaying(false);
    } else {
      sendYTCommand(thaiIframeRef.current, 'playVideo');
      sendYTCommand(chineseIframeRef.current, 'playVideo');
      setIsBothPlaying(true);
      setIsThaiPlaying(true);
      setIsChinesePlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [isBothPlaying, isThaiPlaying, isChinesePlaying, audioFocus, thaiVol, chineseVol, sendYTCommand, applyAudioSettings]);

  // 核心操作 2：泰文视频单独播放/暂停 (用于听完一句手动打点暂停)
  const handleToggleThaiAlone = useCallback(() => {
    if (isThaiPlaying) {
      sendYTCommand(thaiIframeRef.current, 'pauseVideo');
      setIsThaiPlaying(false);
      setIsBothPlaying(false);
    } else {
      sendYTCommand(thaiIframeRef.current, 'playVideo');
      setIsThaiPlaying(true);
      if (isChinesePlaying) setIsBothPlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [isThaiPlaying, isChinesePlaying, audioFocus, thaiVol, chineseVol, sendYTCommand, applyAudioSettings]);

  // 核心操作 3：中文视频单独播放/暂停 (用于听完一句手动打点暂停)
  const handleToggleChineseAlone = useCallback(() => {
    if (isChinesePlaying) {
      sendYTCommand(chineseIframeRef.current, 'pauseVideo');
      setIsChinesePlaying(false);
      setIsBothPlaying(false);
    } else {
      sendYTCommand(chineseIframeRef.current, 'playVideo');
      setIsChinesePlaying(true);
      if (isThaiPlaying) setIsBothPlaying(true);
      applyAudioSettings(audioFocus, thaiVol, chineseVol);
    }
  }, [isChinesePlaying, isThaiPlaying, audioFocus, thaiVol, chineseVol, sendYTCommand, applyAudioSettings]);

  // 泰文主控带中文随动：同步跳转到指定时间
  const seekBothToTime = useCallback((thaiSec: number) => {
    const clampedThai = Math.max(0, thaiSec);
    const targetChinese = Math.max(0, clampedThai + offsetSeconds);

    setCurrentTime(clampedThai);
    sendYTCommand(thaiIframeRef.current, 'seekTo', [clampedThai, true]);
    sendYTCommand(chineseIframeRef.current, 'seekTo', [targetChinese, true]);

    const idx = activeSubtitles.findIndex(
      (sub) => clampedThai >= sub.secondsStart && clampedThai < sub.secondsEnd
    );
    if (idx !== -1) {
      setCurrentLineIndex(idx);
    }
  }, [offsetSeconds, activeSubtitles, sendYTCommand]);

  // 跳转到指定句子
  const handleJumpToSentence = (index: number) => {
    const target = activeSubtitles[index];
    if (!target) return;
    setCurrentLineIndex(index);
    seekBothToTime(target.secondsStart);
    sendYTCommand(thaiIframeRef.current, 'playVideo');
    sendYTCommand(chineseIframeRef.current, 'playVideo');
    setIsBothPlaying(true);
    setIsThaiPlaying(true);
    setIsChinesePlaying(true);
    applyAudioSettings(audioFocus, thaiVol, chineseVol);
  };

  // 倍速控制
  const handleSetPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    sendYTCommand(thaiIframeRef.current, 'setPlaybackRate', [rate]);
    sendYTCommand(chineseIframeRef.current, 'setPlaybackRate', [rate]);
    triggerToast(`倍速已设为 ${rate}x`);
  }, [sendYTCommand]);

  // 朗读当前句或单词
  const handleSpeakText = (text: string) => {
    if (onSpeak) {
      onSpeak(text, 0.9);
    } else {
      thaiAudio.speakWord(text, 0.9);
    }
  };

  // 键盘打卡跳转
  const handlePracticeTyping = (thaiText: string) => {
    if (onOpenKeyboard) {
      onOpenKeyboard(thaiText);
    }
  };

  // 播放主计时器与“每一句循环”支持
  useEffect(() => {
    if (isBothPlaying || isThaiPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          const targetLine = activeSubtitles[currentLineIndex];

          // 每一句循环检测：到达当前句句尾时自动跳回起点重播
          if (isLoopSentence && targetLine && next >= targetLine.secondsEnd) {
            seekBothToTime(targetLine.secondsStart);
            sendYTCommand(thaiIframeRef.current, 'playVideo');
            sendYTCommand(chineseIframeRef.current, 'playVideo');
            return targetLine.secondsStart;
          }

          // 常规自动追踪句子索引
          const idx = activeSubtitles.findIndex(
            (s) => next >= s.secondsStart && next < s.secondsEnd
          );
          if (idx !== -1 && idx !== currentLineIndex) {
            setCurrentLineIndex(idx);
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isBothPlaying, isThaiPlaying, isLoopSentence, activeSubtitles, currentLineIndex, seekBothToTime, sendYTCommand]);

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
      {/* 顶部工具条 (仅保留导入法谈、链接设置与讲义，极简不杂乱) */}
      <div className="border-b border-[#e6d3ac]/60 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              <Video className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#2d2a26]">
                  泰中双视频同步对齐放映机
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300/60">
                  第 {currentLineIndex + 1} 句 / 共 {activeSubtitles.length} 句
                </span>
              </div>
              <p className="text-xs text-[#7a6f5f] truncate max-w-md sm:max-w-xl">
                {config.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              title="导入 Language Reactor / Excel / SRT 课件"
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
        <div className="bg-[#fcfaf7] border-b border-[#e6d3ac] px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a6f5f] flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-[#b58940]" />
                <span>设置中泰双视频链接</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestoreDefault18Oct}
                  className="text-xs text-red-600 hover:text-red-700 underline font-medium cursor-pointer"
                >
                  恢复官方 10月18日默认链接
                </button>
                <button
                  onClick={() => setShowConfigDrawer(false)}
                  className="text-xs text-[#7a6f5f] hover:text-[#2d2a26] font-bold cursor-pointer"
                >
                  ✕ 关闭
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

            <div className="flex justify-end gap-2 pt-1">
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
                }}
                className="px-4 py-1.5 rounded-lg bg-[#b58940] hover:bg-[#9a7332] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                保存视频链接设置
              </button>
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

            <div className="relative aspect-video w-full bg-black">
              {thaiVideoId ? (
                <iframe
                  ref={thaiIframeRef}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${thaiVideoId}?enablejsapi=1&origin=${encodeURIComponent(
                    window.location.origin
                  )}`}
                  title="Thai Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
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
            <div className="bg-[#3d3730] px-3.5 py-2.5 flex items-center justify-between text-xs text-amber-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isChinesePlaying ? 'bg-blue-400 animate-pulse' : 'bg-stone-500'}`} />
                <span className="font-bold">🇨🇳 中文译版</span>
                <span className="text-[10px] text-stone-300">
                  ({isChinesePlaying ? '播放中' : '已暂停'})
                </span>
              </div>
              <button
                onClick={handleToggleChineseAlone}
                className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="单独播放/暂停中文视频，用于听完一句暂停对齐"
              >
                {isChinesePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isChinesePlaying ? '暂停中文' : '播放中文'}</span>
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {chineseVideoId ? (
                <iframe
                  ref={chineseIframeRef}
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${chineseVideoId}?enablejsapi=1&origin=${encodeURIComponent(
                    window.location.origin
                  )}`}
                  title="Chinese Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Video className="w-8 h-8 text-stone-600 mb-2" />
                  <p>请输入有效的中文 YouTube 视频链接</p>
                </div>
              )}
            </div>
          </div>
        </div>

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
              </div>

              <div className="flex items-center gap-2">
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

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索泰文 / 罗马音 / 中文关键词..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#d9c8a9] bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#b58940] w-48 sm:w-64"
                />
              </div>

              <label className="flex items-center gap-1.5 text-xs text-[#7a6f5f] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded text-[#b58940] focus:ring-[#b58940]"
                />
                <span>跟随播放高亮</span>
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

      {/* 4. 核心悬浮播放栏 (Floating Play Bar) —— 聚焦播放、循环与对齐 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-[#2d2a26]/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 text-white flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* 左侧：当前句子短览 */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-full md:max-w-[260px] shrink-0">
          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-xs shrink-0 shadow-sm">
            第 {currentLineIndex + 1} 句
          </div>
          <div className="text-xs truncate text-amber-100/90 hidden sm:block">
            {currentLine.thai}
          </div>
        </div>

        {/* 中间：核心播放与循环控制群 */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 上一句 */}
          <button
            onClick={() => handleJumpToSentence(Math.max(0, currentLineIndex - 1))}
            disabled={currentLineIndex === 0}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-amber-200 disabled:opacity-30 transition cursor-pointer"
            title="上一句"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* 双轨齐播 / 同暂 (最核心大按钮) */}
          <button
            onClick={handleToggleDualPlay}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 transition transform active:scale-95 cursor-pointer"
            title="两个视频同时播放 / 暂停"
          >
            {(isBothPlaying || (isThaiPlaying && isChinesePlaying)) ? (
              <>
                <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                <span>双轨同暂</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                <span>双轨齐播</span>
              </>
            )}
          </button>

          {/* 下一句 */}
          <button
            onClick={() => handleJumpToSentence(Math.min(activeSubtitles.length - 1, currentLineIndex + 1))}
            disabled={currentLineIndex >= activeSubtitles.length - 1}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-amber-200 disabled:opacity-30 transition cursor-pointer"
            title="下一句"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* 每一句循环 (单一极简循环) */}
          <button
            onClick={() => {
              const nextVal = !isLoopSentence;
              setIsLoopSentence(nextVal);
              triggerToast(nextVal ? '已开启每一句循环' : '已关闭循环');
            }}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isLoopSentence
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-stone-800/80 hover:bg-stone-700 text-amber-200/90'
            }`}
            title="开启后将单句循环反复播放"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>每一句循环</span>
          </button>
        </div>

        {/* 右侧：独立对齐单控 & 声道 */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {/* 泰语单控 */}
          <button
            onClick={handleToggleThaiAlone}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              isThaiPlaying
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
            title="单独控制泰文暂停/播放"
          >
            🇹🇭 {isThaiPlaying ? '泰暂' : '泰播'}
          </button>

          {/* 中文单控 */}
          <button
            onClick={handleToggleChineseAlone}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              isChinesePlaying
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
            title="单独控制中文暂停/播放"
          >
            🇨🇳 {isChinesePlaying ? '中暂' : '中播'}
          </button>

          {/* 声道选择 */}
          <div className="flex items-center bg-stone-800/80 p-0.5 rounded-lg border border-stone-700 text-[10px] font-bold">
            <button
              onClick={() => setAudioFocus('both')}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${audioFocus === 'both' ? 'bg-amber-500 text-slate-950' : 'text-stone-400'}`}
              title="双声道"
            >
              双
            </button>
            <button
              onClick={() => setAudioFocus('thai')}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${audioFocus === 'thai' ? 'bg-amber-500 text-slate-950' : 'text-stone-400'}`}
              title="仅听泰文"
            >
              泰
            </button>
            <button
              onClick={() => setAudioFocus('chinese')}
              className={`px-1.5 py-0.5 rounded transition cursor-pointer ${audioFocus === 'chinese' ? 'bg-amber-500 text-slate-950' : 'text-stone-400'}`}
              title="仅听中文"
            >
              中
            </button>
          </div>

          {/* 倍速 */}
          <div className="flex items-center bg-stone-800/80 p-0.5 rounded-lg border border-stone-700 text-[10px] font-bold">
            {[0.75, 1.0, 1.25].map(rate => (
              <button
                key={rate}
                onClick={() => handleSetPlaybackRate(rate)}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${playbackRate === rate ? 'bg-amber-500 text-slate-950' : 'text-stone-400'}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. 导入新法谈弹窗 (保留在顶部点击打开，不占用悬浮空间) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d9c8a9] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-[#b58940]" />
                <h3 className="text-base font-bold text-[#2d2a26]">
                  导入新法谈 (增强型 SRT / 传统 SRT / LR 格式)
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#7a6f5f] space-y-2 bg-gradient-to-r from-amber-50 to-indigo-50/50 p-3.5 rounded-xl border border-amber-200/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>支持全格式导入 & AI 转换赋能：</span>
                </div>
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
                      <span>已复制 AI 转换 Prompt！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制 AI 批量转换 Prompt</span>
                    </>
                  )}
                </button>
              </div>
              <p className="leading-relaxed text-[#5b3f1e]">
                支持直接从 Language Reactor、Excel 或 SRT 复制粘贴。系统自动分词、朱拉隆功音标转写与中泰句子对齐。
              </p>
            </div>

            <div>
              <textarea
                value={pastedText}
                onChange={(e) => handlePastedTextChange(e.target.value)}
                placeholder="直接在此粘贴复制的内容..."
                className="w-full h-44 text-xs font-mono p-3 rounded-xl border border-[#d9c8a9] focus:outline-none focus:ring-2 focus:ring-[#b58940]"
              />
            </div>

            {parseResult.totalParsed > 0 && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>成功识别 {parseResult.totalParsed} 句法谈对照！</span>
                </div>
                {parseResult.detectedTitle && (
                  <div className="text-[11px] text-emerald-800">
                    {parseResult.detectedTitle}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 cursor-pointer"
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
                  应用并载入播放器
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
