import React from 'react';
import { PRESET_DHAMMA_WORDS, PresetDhammaWord } from '../../utils/thaiPhoneticData';
import { Volume2, Sparkles, ArrowRight, BookOpen } from 'lucide-react';

interface DharmaWordDeconstructorProps {
  onLoadWordIntoLego: (word: PresetDhammaWord) => void;
  onSpeak: (text: string) => void;
}

export const DharmaWordDeconstructor: React.FC<DharmaWordDeconstructorProps> = ({
  onLoadWordIntoLego,
  onSpeak
}) => {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl flex flex-col gap-5">
      
      {/* 头部介绍 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            经典法语与高频词逆向透视器
            <span className="text-xs font-semibold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              隆波开示核心词汇
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            点击任意词汇，即刻一键导入“声韵拼音积木台”进行音节拆解、变调流水线反向透视与发音试听。
          </p>
        </div>
      </div>

      {/* 词汇卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {PRESET_DHAMMA_WORDS.map((w) => {
          return (
            <div
              key={`preset-${w.id}`}
              className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 transition duration-200 flex flex-col justify-between gap-3 group relative shadow-md"
            >
              <div>
                {/* 顶部标签与发音按钮 */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    w.category === 'dhamma'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {w.category === 'dhamma' ? '📿 佛法核心词' : '💬 日常高频词'}
                  </span>

                  <button
                    onClick={() => onSpeak(w.thai)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                    title="朗读该词发音"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>

                {/* 泰文大字与中文 */}
                <div className="flex items-baseline gap-2.5 my-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                    {w.thai}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-200">
                    {w.chinese}
                  </span>
                </div>

                {/* 音节拆解预览 */}
                <div className="flex flex-wrap items-center gap-1.5 my-2">
                  {w.syllables.map((s, idx) => (
                    <span
                      key={`syl-${idx}`}
                      className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-slate-200"
                    >
                      {s.thaiPart} <span className="text-amber-400 font-bold">[{s.expectedTone}调]</span>
                    </span>
                  ))}
                </div>

                {/* 教学解析 */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mt-1">
                  {w.explanation}
                </p>
              </div>

              {/* 载入积木台按键 */}
              <button
                onClick={() => onLoadWordIntoLego(w)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 group-hover:border-amber-400"
              >
                <span>载入拼音台积木拆解</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
};
