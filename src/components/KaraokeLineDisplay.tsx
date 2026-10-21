import React from 'react';
import { SubtitleLine, WordToken, MaskMode } from '../types';
import { Flame, CheckCircle, Volume2, Sparkles } from 'lucide-react';

interface KaraokeLineDisplayProps {
  currentLine: SubtitleLine;
  currentLineElapsedSeconds: number; // 0 to lineDuration
  lineDuration: number;
  isPlaying: boolean;
  maskMode: MaskMode;
  onWordClick: (word: WordToken) => void;
  onWordSeek: (offsetSeconds: number) => void;
  onSpeakWord: (text: string) => void;
  selectedFont?: string;
}

export const KaraokeLineDisplay: React.FC<KaraokeLineDisplayProps> = ({
  currentLine,
  currentLineElapsedSeconds,
  lineDuration,
  isPlaying,
  maskMode,
  onWordClick,
  onWordSeek,
  onSpeakWord,
  selectedFont = "'Noto Sans Thai'"
}) => {
  // Total line duration in seconds
  const totalDuration = lineDuration > 0 ? lineDuration : (currentLine.secondsEnd - currentLine.secondsStart);

  return (
    <div className="space-y-6 select-none">
      {/* Karaoke Word-by-Word Live Container */}
      {maskMode !== 'hide_th' && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              卡拉OK 逐字点亮视听流 (点击任意词即可精准跳转/查看法义)
            </span>
            <span className="font-mono text-amber-300">
              {currentLineElapsedSeconds.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>

          {/* Karaoke Words Flow */}
          <div
            className="flex flex-wrap items-end gap-x-3 gap-y-4 p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner"
            style={{ fontFamily: selectedFont }}
          >
            {currentLine.words.map((w, idx) => {
              // Word timing calculation
              const wordStart = w.startOffset ?? (idx * (totalDuration / currentLine.words.length));
              const wordEnd = w.endOffset ?? ((idx + 1) * (totalDuration / currentLine.words.length));
              
              const isWordActive = isPlaying && currentLineElapsedSeconds >= wordStart && currentLineElapsedSeconds <= wordEnd;
              const isWordPassed = currentLineElapsedSeconds > wordEnd;
              const isWordPending = currentLineElapsedSeconds < wordStart;

              // Progress percentage inside this word for smooth karaoke sweep
              let wordProgress = 0;
              if (isWordPassed) wordProgress = 100;
              else if (isWordActive) {
                wordProgress = Math.min(100, Math.max(0, ((currentLineElapsedSeconds - wordStart) / (wordEnd - wordStart)) * 100));
              }

              const isLearning = w.status === 'learning';
              const isMastered = w.status === 'mastered';

              return (
                <div
                  key={w.id}
                  onClick={() => {
                    onWordSeek(wordStart);
                    onWordClick(w);
                  }}
                  className={`group relative flex flex-col items-center cursor-pointer p-2 rounded-xl transition-all duration-150 border ${
                    isWordActive
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/30 scale-110 z-10'
                      : isWordPassed
                      ? 'bg-slate-900/80 border-slate-700/60'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                  title="点击跳转至此词并查看词根"
                >
                  {/* Status Badges */}
                  {isLearning && (
                    <Flame className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                  )}
                  {isMastered && (
                    <CheckCircle className="w-3 h-3 text-emerald-400 absolute -top-1.5 -right-1.5 drop-shadow" />
                  )}

                  {/* Karaoke Thai Word with gradient sweep */}
                  <div className="relative text-2xl sm:text-3xl font-extrabold tracking-wide">
                    {/* Background inactive text */}
                    <span className={`${isWordPassed ? 'text-amber-200' : 'text-slate-400'} transition-colors`}>
                      {w.thai}
                    </span>

                    {/* Active Karaoke sweep overlay */}
                    {isWordActive && (
                      <span
                        className="absolute inset-0 text-amber-400 font-black drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] overflow-hidden transition-all"
                        style={{
                          clipPath: `polygon(0 0, ${wordProgress}% 0, ${wordProgress}% 100%, 0 100%)`
                        }}
                      >
                        {w.thai}
                      </span>
                    )}
                  </div>

                  {/* Chulalongkorn Adapted IPA with tone diacritics */}
                  <div
                    className={`mt-1 text-xs sm:text-sm font-mono font-medium transition-colors ${
                      isWordActive
                        ? 'text-cyan-300 font-bold scale-105'
                        : isWordPassed
                        ? 'text-cyan-400/80'
                        : 'text-slate-400'
                    }`}
                  >
                    /{w.romanization}/
                  </div>

                  {/* Chinese gloss */}
                  <div
                    className={`text-[11px] sm:text-xs mt-0.5 transition-colors ${
                      isWordActive ? 'text-amber-300 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {w.chinese}
                  </div>

                  {/* Core badge */}
                  {w.isCore && (
                    <span className="mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      法要
                    </span>
                  )}

                  {/* Micro audio trigger */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onSpeakWord(w.thai);
                    }}
                    className="opacity-0 group-hover:opacity-100 absolute -bottom-2 p-1 rounded-full bg-slate-800 text-amber-300 hover:scale-110 transition shadow"
                    title="单独朗读此词"
                  >
                    <Volume2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chinese Translation Line (with blur mask option) */}
      <div
        className={`p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-base sm:text-lg font-medium text-slate-100 transition-all ${
          maskMode === 'blur_cn'
            ? 'blur-sm hover:blur-none select-none cursor-pointer border-dashed border-amber-500/40 bg-slate-950/70'
            : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400 font-normal">完整对译：</span>
          {maskMode === 'blur_cn' && (
            <span className="text-xs text-amber-400 font-normal">
              (已开启抓耳遮挡，触控或悬停查看中文)
            </span>
          )}
        </div>
        <p className="leading-relaxed">{currentLine.chinese}</p>
      </div>

      {/* Dhamma Root & Context breakdown */}
      {currentLine.dhammaNote && maskMode === 'all' && (
        <div className="bg-gradient-to-r from-indigo-950/40 to-slate-950 border border-indigo-900/50 p-4 rounded-2xl text-xs sm:text-sm text-indigo-200 leading-relaxed">
          <span className="font-bold text-amber-400 flex items-center gap-1.5 mb-1 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            隆波开示要义与词根拆解：
          </span>
          <p>{currentLine.dhammaNote}</p>
        </div>
      )}
    </div>
  );
};
