import React from 'react';
import { WordToken, WordStatus } from '../types';
import { Volume2, BookOpen, CheckCircle, Flame, Keyboard, X } from 'lucide-react';

interface WordDetailModalProps {
  word: WordToken | null;
  onClose: () => void;
  onUpdateStatus: (wordId: string, status: WordStatus) => void;
  onPracticeInKeyboard: (word: WordToken) => void;
  onSpeak: (text: string) => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  word,
  onClose,
  onUpdateStatus,
  onPracticeInKeyboard,
  onSpeak
}) => {
  if (!word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            朱拉隆功 adapted IPA 教学词源卡
          </span>
          {word.isCore && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              隆波开示核心词
            </span>
          )}
        </div>

        {/* Main Word Display */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="text-4xl font-bold tracking-wide text-amber-400 font-thai">
              {word.thai}
            </div>
            <div className="mt-1 text-lg font-mono text-cyan-300 font-medium">
              /{word.romanization}/
            </div>
          </div>
          <button
            onClick={() => onSpeak(word.thai)}
            className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="播放泰语发音"
          >
            <Volume2 className="w-5 h-5" />
            <span>听读</span>
          </button>
        </div>

        {/* Translation & Breakdown */}
        <div className="space-y-3 mb-6 text-sm">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 text-xs block mb-1">中文词义 (含义)：</span>
            <span className="text-slate-100 font-medium text-base">{word.chinese}</span>
          </div>

          {word.rootBreakdown && (
            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
              <span className="text-indigo-300 text-xs block mb-1 font-medium">
                💡 佛法巴利/泰语词根剖析 (法义与结构)：
              </span>
              <p className="text-indigo-100 leading-relaxed">{word.rootBreakdown}</p>
            </div>
          )}

          {word.tip && (
            <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-800/30">
              <span className="text-emerald-300 text-xs block mb-1 font-medium">
                🎯 朱拉隆功音标规则 & 发音提示 (8条 Principle)：
              </span>
              <p className="text-emerald-100 text-xs leading-relaxed">{word.tip}</p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Status buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onUpdateStatus(word.id, 'learning');
                onClose();
              }}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                word.status === 'learning'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-amber-300 border-amber-500/30 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              标记为“学习中”
            </button>

            <button
              onClick={() => {
                onUpdateStatus(word.id, 'mastered');
                onClose();
              }}
              className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                word.status === 'mastered'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-emerald-300 border-emerald-500/30 hover:bg-slate-700'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              标记为“已掌握”
            </button>
          </div>

          {/* Practice in Keyboard */}
          <button
            onClick={() => {
              onPracticeInKeyboard(word);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-blue-900/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
            泰语键盘打字挑战
          </button>
        </div>
      </div>
    </div>
  );
};
