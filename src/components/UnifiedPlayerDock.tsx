import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';

interface UnifiedPlayerDockProps {
  currentLineIndex: number;
  totalLines: number;
  clockLabel?: string;
  isPlaying: boolean;
  audioFocus: 'thai' | 'both' | 'chinese';
  hasThaiTrack?: boolean;
  hasChineseTrack?: boolean;
  isLoopSentence: boolean;
  playbackRate: number;
  onAlignCurrent: () => void;
  onPrevLine: () => void;
  onTogglePlay: () => void;
  onNextLine: () => void;
  onSelectFocus: (focus: 'thai' | 'both' | 'chinese') => void;
  onToggleLoop: () => void;
  onChangePlaybackRate: (rate: number) => void;
  tourId?: string;
}

const RATES = [0.75, 1.0, 1.25];

export const UnifiedPlayerDock: React.FC<UnifiedPlayerDockProps> = ({
  currentLineIndex,
  totalLines,
  clockLabel,
  isPlaying,
  audioFocus,
  hasThaiTrack = true,
  hasChineseTrack = true,
  isLoopSentence,
  playbackRate,
  onAlignCurrent,
  onPrevLine,
  onTogglePlay,
  onNextLine,
  onSelectFocus,
  onToggleLoop,
  onChangePlaybackRate,
  tourId,
}) => {
  const hasBothTracks = hasThaiTrack && hasChineseTrack;

  const focusLabel =
    hasBothTracks
      ? audioFocus === 'both'
        ? isPlaying
          ? '双轨暂停'
          : '双轨播放'
        : audioFocus === 'thai'
        ? isPlaying
          ? '泰语暂停'
          : '泰语播放'
        : isPlaying
        ? '中文暂停'
        : '中文播放'
      : hasThaiTrack
      ? isPlaying
        ? '泰语暂停'
        : '泰语播放'
      : hasChineseTrack
      ? isPlaying
        ? '中文暂停'
        : '中文播放'
      : isPlaying
      ? '暂停'
      : '播放';

  const sentenceCounter =
    totalLines > 0 ? `第 ${currentLineIndex + 1} / ${totalLines} 句` : '0 / 0 句';

  return (
    <div
      data-tour-id={tourId}
      className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-20px)] max-w-sm sm:w-auto sm:max-w-md xl:max-w-4xl mx-auto bg-stone-900/95 backdrop-blur-xl border border-stone-800/80 hover:border-amber-500/30 rounded-2xl p-1.5 sm:px-4 sm:py-2.5 shadow-2xl shadow-black/90 text-white transition-all box-border overflow-hidden"
    >
      {/* 移动端 / 平板端 (< 1280px) */}
      <div className="flex flex-col xl:hidden gap-1.5 sm:gap-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onPrevLine}
              disabled={totalLines === 0 || currentLineIndex <= 0}
              className="p-1.5 sm:p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 disabled:opacity-25 transition cursor-pointer"
              title="上一句"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1 shadow-md shadow-amber-500/25 active:scale-95 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
              )}
              <span>{focusLabel}</span>
            </button>

            <button
              type="button"
              onClick={onNextLine}
              disabled={totalLines === 0 || currentLineIndex >= totalLines - 1}
              className="p-1.5 sm:p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 disabled:opacity-25 transition cursor-pointer"
              title="下一句"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {hasBothTracks && (
            <div className="flex items-center bg-stone-950/80 p-0.5 sm:p-1 rounded-xl border border-stone-800 shrink-0 text-xs gap-0.5 sm:gap-1">
              {(
                [
                  { id: 'thai', label: '泰语' },
                  { id: 'both', label: '双轨' },
                  { id: 'chinese', label: '中文' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectFocus(tab.id)}
                  className={`px-1.5 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    audioFocus === tab.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 w-full pt-1.5 border-t border-stone-800/60">
          <button
            type="button"
            onClick={onAlignCurrent}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-200 text-[11px] sm:text-xs font-mono tabular-nums tracking-tight shrink min-w-0 truncate cursor-pointer transition"
            title="点击对齐当前播放时刻"
          >
            <span className="truncate">{sentenceCounter}</span>
            {clockLabel && (
              <>
                <span className="text-stone-500">·</span>
                <span className="text-stone-300">{clockLabel}</span>
              </>
            )}
          </button>

          <div className="flex items-center bg-stone-950/90 p-0.5 sm:p-1 rounded-lg border border-stone-800 gap-1 sm:gap-1.5 shrink-0 text-xs">
            <button
              type="button"
              onClick={onToggleLoop}
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

            <button
              type="button"
              onClick={() => {
                const nextIdx = (RATES.indexOf(playbackRate) + 1) % RATES.length;
                onChangePlaybackRate(RATES[nextIdx]);
              }}
              className="sm:hidden px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-900 text-amber-300 border border-stone-800 hover:bg-stone-800 transition cursor-pointer"
              title="切换语速"
            >
              {playbackRate}x
            </button>

            <div className="hidden sm:flex items-center gap-0.5 text-[11px] font-bold">
              {RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onChangePlaybackRate(rate)}
                  className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 桌面端 (>= 1280px)：流畅单行 */}
      <div className="hidden xl:flex items-center justify-between gap-3 w-full">
        <button
          type="button"
          onClick={onAlignCurrent}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700/90 border border-stone-700/60 hover:border-amber-500/50 text-stone-200 transition cursor-pointer shrink-0"
          title="点击以当前时刻对齐字幕"
        >
          <span className="text-xs font-bold text-amber-200/90 font-mono tabular-nums whitespace-nowrap">
            {sentenceCounter}
          </span>
          {clockLabel && (
            <>
              <span className="text-stone-500 text-xs">·</span>
              <span className="text-xs font-medium text-stone-300 font-mono tabular-nums whitespace-nowrap">
                {clockLabel}
              </span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrevLine}
            disabled={totalLines === 0 || currentLineIndex <= 0}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
            title="上一句"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
            <span>{focusLabel}</span>
          </button>

          <button
            type="button"
            onClick={onNextLine}
            disabled={totalLines === 0 || currentLineIndex >= totalLines - 1}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 disabled:opacity-25 transition cursor-pointer"
            title="下一句"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {hasBothTracks && (
            <div className="flex items-center bg-stone-950/80 p-1 rounded-xl border border-stone-800 shadow-inner gap-1">
              {(
                [
                  { id: 'thai', label: '泰语' },
                  { id: 'both', label: '双轨' },
                  { id: 'chinese', label: '中文' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectFocus(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    audioFocus === tab.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center bg-stone-950/90 p-1 rounded-xl border border-stone-800 shadow-inner gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
              isLoopSentence
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
            }`}
            title="单句循环"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>循环</span>
          </button>

          <span className="w-px h-3.5 bg-stone-800" />

          <div className="flex items-center gap-0.5 text-[11px] font-bold">
            {RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
