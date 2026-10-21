import React from 'react';
import { ToneDeductionResult } from '../../utils/thaiPhoneticEngine';
import { CheckCircle2, ChevronRight, HelpCircle, Layers, Sparkles } from 'lucide-react';

interface RulePipelineCardProps {
  deduction: ToneDeductionResult;
}

export const RulePipelineCard: React.FC<RulePipelineCardProps> = ({ deduction }) => {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col shadow-xl">
      {/* 头部标题与形变提示 */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              变调规则透明化流水线
              <span className="text-[10px] text-slate-400 font-normal">Real-Time Tone Derivation</span>
            </h3>
          </div>
        </div>

        {deduction.isVowelTransformed && (
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
            <Sparkles className="w-3 h-3" />
            <span>触发元音形变！</span>
          </div>
        )}
      </div>

      {/* 形变特别告知条 */}
      {deduction.isVowelTransformed && deduction.transformationNote && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
          <span className="text-base leading-none">💡</span>
          <div>
            <span className="font-bold">拼写形变法则：</span>
            <span>{deduction.transformationNote}</span>
          </div>
        </div>
      )}

      {/* 4步推理流水线步骤卡 */}
      <div className="flex flex-col gap-2.5">
        {deduction.steps.map((step) => {
          const isFinal = step.stepNumber === 4;
          return (
            <div
              key={`step-${step.stepNumber}`}
              className={`p-3 rounded-xl border transition relative overflow-hidden ${
                isFinal
                  ? 'bg-gradient-to-r from-amber-500/10 via-slate-800/80 to-slate-800/50 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isFinal 
                      ? 'bg-amber-400 text-slate-950' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {step.stepNumber}
                  </div>
                  <span className={`text-xs font-bold ${isFinal ? 'text-amber-200' : 'text-slate-200'}`}>
                    {step.title}
                  </span>
                </div>

                {/* 属性标签 */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                  step.badgeColor === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : step.badgeColor === 'blue'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : step.badgeColor === 'amber'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : step.badgeColor === 'rose'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : step.badgeColor === 'purple'
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600'
                }`}>
                  {step.badge}
                </span>
              </div>

              {/* 核心推理叙述 */}
              <p className="text-xs text-slate-300 leading-relaxed pl-7">
                {step.detail}
              </p>

              {/* 补充细则 */}
              {step.subDetail && (
                <div className="mt-1 pl-7 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{step.subDetail}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 底部的简明公式口诀 */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>核心变调口诀：</span>
        </div>
        <div className="text-[11px] font-medium text-slate-300">
          中辅音全五调 · 高辅音自带第5调 · 低辅音标调标1读3、标2读4
        </div>
      </div>
    </div>
  );
};
