import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SubtitleLine, WordToken, CuratedLesson } from '../types';
import { getAllCuratedLessons } from '../data/presetLessonsLibrary';
import { ChevronLeft, ChevronRight, Video, Sparkles, BookOpen } from 'lucide-react';

interface MinimalImmersionPlayerProps {
  initialLesson?: CuratedLesson;
  subtitles: SubtitleLine[];
  onSwitchToDualPlayer: () => void;
  onLessonChange?: (lesson: CuratedLesson) => void;
}

export const MinimalImmersionPlayer: React.FC<MinimalImmersionPlayerProps> = ({
  initialLesson,
  subtitles: propSubtitles,
  onSwitchToDualPlayer,
  onLessonChange,
}) => {
  const allLessons = useMemo(() => getAllCuratedLessons(), []);
  const [currentLesson, setCurrentLesson] = useState<CuratedLesson>(() => {
    return initialLesson || allLessons[0];
  });

  const activeSubtitles = useMemo(() => {
    if (currentLesson && currentLesson.subtitles && currentLesson.subtitles.length > 0) {
      return currentLesson.subtitles;
    }
    return propSubtitles && propSubtitles.length > 0 ? propSubtitles : [];
  }, [currentLesson, propSubtitles]);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLessonSelector, setShowLessonSelector] = useState(false);

  const playerRef = useRef<any>(null);
  const isReadyRef = useRef(false);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  // 提取 YouTube ID
  const extractVideoId = (urlOrId: string): string => {
    if (!urlOrId) return '';
    const clean = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : clean;
  };

  const thaiVideoId = useMemo(() => {
    return extractVideoId(currentLesson.thaiVideoUrl || currentLesson.thaiVideoId || 'xEKmQRulTgg');
  }, [currentLesson]);

  // 初始化或切换 YouTube 单播播放器
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!isMounted) return;
      const targetDiv = document.getElementById('minimal-thai-player');
      if (!targetDiv) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      try {
        playerRef.current = new (window as any).YT.Player('minimal-thai-player', {
          width: '100%',
          height: '100%',
          videoId: thaiVideoId,
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            controls: 1,
            fs: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => {
              if (!isMounted) return;
              isReadyRef.current = true;
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
              }
            }
          }
        });
      } catch (e) {
        console.error('Failed to create minimal YT player:', e);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api-tag')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-tag';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevOnReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevOnReady === 'function') prevOnReady();
        initPlayer();
      };
      const checkTimer = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkTimer);
          initPlayer();
        }
      }, 100);
      return () => {
        isMounted = false;
        clearInterval(checkTimer);
      };
    }

    return () => {
      isMounted = false;
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, [thaiVideoId]);

  // 高精度计时轮询：驱动进度条与当前句子匹配
  useEffect(() => {
    let animId: number;
    const pollTime = () => {
      if (playerRef.current && isReadyRef.current) {
        try {
          const t = playerRef.current.getCurrentTime?.() ?? 0;
          setCurrentTime(t);

          // 自动匹配当前句索引
          if (activeSubtitles.length > 0) {
            const foundIdx = activeSubtitles.findIndex((sub, idx) => {
              const nextSub = activeSubtitles[idx + 1];
              const upper = nextSub ? Math.max(nextSub.secondsStart, sub.secondsEnd) : sub.secondsEnd + 3;
              return t >= sub.secondsStart - 0.2 && t < upper;
            });
            if (foundIdx !== -1 && foundIdx !== currentLineIndex) {
              setCurrentLineIndex(foundIdx);
            }
          }
        } catch {}
      }
      animId = requestAnimationFrame(pollTime);
    };

    animId = requestAnimationFrame(pollTime);
    return () => cancelAnimationFrame(animId);
  }, [activeSubtitles, currentLineIndex]);

  const currentLine: SubtitleLine | undefined = activeSubtitles[currentLineIndex];

  // 句子连续进度计算（0% 到 100%）
  const sentenceProgressPercent = useMemo(() => {
    if (!currentLine) return 0;
    const duration = Math.max(0.5, currentLine.secondsEnd - currentLine.secondsStart);
    const elapsed = currentTime - currentLine.secondsStart;
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  }, [currentLine, currentTime]);

  // 估算当前处于发音焦点的单词索引 (基于连续进度条所在比例)
  const activeWordProximityIndex = useMemo(() => {
    if (!currentLine || !currentLine.words || currentLine.words.length === 0) return -1;
    const totalWords = currentLine.words.length;
    const fraction = sentenceProgressPercent / 100;
    const idx = Math.min(totalWords - 1, Math.floor(fraction * totalWords));
    return idx;
  }, [currentLine, sentenceProgressPercent]);

  // 跳转到指定时间
  const seekToSeconds = useCallback((sec: number) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(sec, true);
        setCurrentTime(sec);
      } catch {}
    }
  }, []);

  // 切换上一句 / 下一句
  const handleStepSentence = useCallback((step: -1 | 1) => {
    const nextIdx = currentLineIndex + step;
    if (nextIdx >= 0 && nextIdx < activeSubtitles.length) {
      setCurrentLineIndex(nextIdx);
      seekToSeconds(activeSubtitles[nextIdx].secondsStart + 0.05);
    }
  }, [currentLineIndex, activeSubtitles, seekToSeconds]);

  // 点击单词：跳转到该词在句中的比例对应时间
  const handleWordClick = useCallback((wordIdx: number) => {
    if (!currentLine) return;
    const totalWords = currentLine.words?.length || 1;
    const duration = Math.max(0.5, currentLine.secondsEnd - currentLine.secondsStart);
    const wordTargetSec = currentLine.secondsStart + (wordIdx / totalWords) * duration + 0.05;
    seekToSeconds(wordTargetSec);
  }, [currentLine, seekToSeconds]);

  // 点击句子进度条任意位置快速定位
  const handleProgressTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentLine || !progressTrackRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const duration = Math.max(0.5, currentLine.secondsEnd - currentLine.secondsStart);
    const targetSec = currentLine.secondsStart + clickRatio * duration;
    seekToSeconds(targetSec);
  };

  // 键盘快捷键监听 (空格播放/暂停，左右退进，上下切句)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免输入框打字冲突
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (playerRef.current) {
          try {
            if (isPlaying) playerRef.current.pauseVideo?.();
            else playerRef.current.playVideo?.();
          } catch {}
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekToSeconds(Math.max(0, currentTime - 3));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekToSeconds(currentTime + 3);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleStepSentence(-1);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleStepSentence(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, seekToSeconds, handleStepSentence]);

  // 选择切换课件
  const handleSelectLesson = (lesson: CuratedLesson) => {
    setCurrentLesson(lesson);
    setCurrentLineIndex(0);
    setShowLessonSelector(false);
    onLessonChange?.(lesson);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 pb-8">
      {/* 顶部极简模式切换与课件选择栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-2 py-1.5">
        {/* 模式切换胶囊 */}
        <div className="flex items-center p-1 bg-stone-900/90 rounded-xl border border-stone-800 shadow-md">
          <button
            type="button"
            onClick={onSwitchToDualPlayer}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-400 hover:text-stone-200 transition cursor-pointer flex items-center gap-1.5"
            title="返回标准泰中双视频同步研读工作台"
          >
            <Video className="w-3.5 h-3.5" />
            <span>双播研读模式</span>
          </button>
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-sm flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>极简沉浸版</span>
          </div>
        </div>

        {/* 课件标题与切换按钮 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLessonSelector(!showLessonSelector)}
            className="px-3 py-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-200 text-xs font-bold border border-amber-500/30 flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{currentLesson.chineseTitle || currentLesson.title}</span>
            <span className="text-[10px] text-stone-400 font-mono">({activeSubtitles.length}句)</span>
          </button>

          {showLessonSelector && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-2 z-50 space-y-1">
              <div className="text-[11px] font-bold text-stone-400 px-3 py-1.5 border-b border-stone-800">
                切换沉浸听法课件
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1 p-1">
                {allLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                      lesson.id === currentLesson.id
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <div className="line-clamp-1">{lesson.chineseTitle}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{lesson.date} · {lesson.totalSentences} 句</div>
                    </div>
                    {lesson.id === currentLesson.id && (
                      <span className="text-[10px] font-bold text-amber-400 shrink-0">当前</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 极简一体化剧场容器 (Seamless Integrated Theater Box) */}
      <div className="bg-[#0b0d12] rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl flex flex-col">
        {/* 1. 唯一播放框：泰文原版视频 (16:9) */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <div id="minimal-thai-player" className="w-full h-full" />
        </div>

        {/* 2. 嵌入式一体化字幕与进度条底托 (如原生镶嵌在视频下方) */}
        <div className="relative p-4 sm:p-7 bg-gradient-to-b from-[#0b0d12] via-[#0f121a] to-[#0b0d12] border-t border-stone-800/80 flex flex-col items-center justify-center min-h-[170px] select-none">
          
          {/* 句子轻触切句左右感应区 (无形交互热区，不呈现任何多余按钮) */}
          <button
            type="button"
            onClick={() => handleStepSentence(-1)}
            disabled={currentLineIndex <= 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-stone-700 hover:text-amber-400/80 transition cursor-pointer disabled:opacity-0"
            title="上一句 (快捷键: ↑)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleStepSentence(1)}
            disabled={currentLineIndex >= activeSubtitles.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-700 hover:text-amber-400/80 transition cursor-pointer disabled:opacity-0"
            title="下一句 (快捷键: ↓)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {currentLine ? (
            <div className="w-full max-w-3xl flex flex-col items-center gap-3.5 px-4 sm:px-8">
              
              {/* Option B: 泰文词组 + 朱拉隆功音标 + 中文释义 (无任何额外按钮，自然排列与换行) */}
              <div className="w-full flex flex-wrap items-end justify-center gap-x-4 sm:gap-x-6 gap-y-3.5">
                {currentLine.words && currentLine.words.length > 0 ? (
                  currentLine.words.map((w, wIdx) => {
                    const isNearActive = wIdx === activeWordProximityIndex;
                    return (
                      <div
                        key={w.id || `min_word_${wIdx}`}
                        onClick={() => handleWordClick(wIdx)}
                        className={`flex flex-col items-center cursor-pointer transition-all duration-150 p-1 rounded-lg ${
                          isNearActive 
                            ? 'bg-amber-500/10 scale-[1.04]' 
                            : 'hover:bg-stone-800/40'
                        }`}
                        title="轻触跳转至该词发音节点"
                      >
                        {/* 泰文大字 */}
                        <span className={`text-2xl sm:text-3xl font-extrabold tracking-wide transition-colors ${
                          isNearActive ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-stone-100'
                        }`}>
                          {w.thai}
                        </span>

                        {/* 朱拉隆功 Adapted IPA 音标 */}
                        <span className={`text-[11px] sm:text-xs font-mono transition-colors mt-0.5 ${
                          isNearActive ? 'text-amber-400 font-bold' : 'text-stone-400'
                        }`}>
                          /{w.romanization}/
                        </span>

                        {/* 单词简义 */}
                        <span className={`text-[11px] sm:text-xs transition-colors ${
                          isNearActive ? 'text-amber-200 font-medium' : 'text-stone-400'
                        }`}>
                          {w.chinese}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold text-stone-100">
                    {currentLine.thai}
                  </div>
                )}
              </div>

              {/* 核心创新折中方案：全句连续流光进度条 (横贯整句下方，精准平滑指示发音位置) */}
              <div className="w-full max-w-2xl mt-1 space-y-1">
                <div
                  ref={progressTrackRef}
                  onClick={handleProgressTrackClick}
                  className="w-full h-1.5 sm:h-2 bg-stone-800/80 hover:bg-stone-800 rounded-full cursor-pointer relative overflow-visible transition-colors"
                  title="点击进度条任意位置跳转"
                >
                  {/* 已流经的金色进度带 */}
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    style={{ width: `${sentenceProgressPercent}%` }}
                  />

                  {/* 随流光滑行的金色定位浮标 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-300 border-2 border-stone-950 shadow-md shadow-amber-500/50 transition-transform pointer-events-none"
                    style={{ left: `${sentenceProgressPercent}%` }}
                  />
                </div>

                {/* 句内进度与时间指示 (极小微字，不喧宾夺主) */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono px-0.5">
                  <span>第 {currentLineIndex + 1} / {activeSubtitles.length} 句</span>
                  <span>{currentLine.timeStart} - {currentLine.timeEnd}</span>
                </div>
              </div>

              {/* 中文整句意译 (优雅内嵌在底部) */}
              <div className="text-sm sm:text-base text-stone-300 text-center font-normal leading-relaxed mt-1 tracking-wide">
                {currentLine.chinese}
              </div>

            </div>
          ) : (
            <div className="text-stone-500 text-xs">
              正在载入字幕数据...
            </div>
          )}

        </div>
      </div>

      {/* 极简键盘交互友情提示 */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-stone-400 font-mono">
        <span>⌨️ 空格: 播放/暂停</span>
        <span>·</span>
        <span>← / →: 快退/快进 3s</span>
        <span>·</span>
        <span>↑ / ↓: 上一句/下一句</span>
        <span>·</span>
        <span>轻触任意单词即刻定位</span>
      </div>
    </div>
  );
};
