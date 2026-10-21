import React from 'react';
import { 
  AssembleInput, 
  ToneDeductionResult 
} from '../../utils/thaiPhoneticEngine';
import { 
  Volume2, 
  RotateCcw, 
  Dices, 
  Sparkles, 
  Play, 
  Turtle, 
  X,
  Radio
} from 'lucide-react';
import { ToneId } from '../../utils/thaiPhoneticData';

interface SyllableAssemblyDeckProps {
  input: AssembleInput;
  deduction: ToneDeductionResult;
  onClearSlot: (slot: 'leading' | 'final' | 'tone') => void;
  onReset: () => void;
  onRandomize: () => void;
  onSpeak: (rate?: number) => void;
  onPlayToneMelody: (toneId: ToneId) => void;
  onSelectToneVariant: (variantText: string, toneId: ToneId) => void;
  activeDrawerTab: 'consonant' | 'vowel' | 'final' | 'tone';
  onSetDrawerTab: (tab: 'consonant' | 'vowel' | 'final' | 'tone') => void;
}

export const SyllableAssemblyDeck: React.FC<SyllableAssemblyDeckProps> = ({
  input,
  deduction,
  onClearSlot,
  onReset,
  onRandomize,
  onSpeak,
  onPlayToneMelody,
  onSelectToneVariant,
  activeDrawerTab,
  onSetDrawerTab
}) => {
  const { leadingConsonant, initialConsonant, vowel, finalConsonant, toneMark } = input;
  const hasFinal = finalConsonant.id !== 'final_none' && finalConsonant.symbol !== '-';
  const hasTone = toneMark.id !== 0;

  return (
    <div className="bg-gradient-to-b from-slate-900/95 to-slate-900/80 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      
      {/* 顶部状态与工具栏 */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-2">
            声韵调拼音积木台
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">Phonetic Lego Stage</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onRandomize}
            className="px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="随机生成一个合法泰语音节进行测试"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">随机生成</span>
            <span className="sm:hidden">随机</span>
          </button>

          <button
            onClick={onReset}
            className="px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            title="重置拼音积木台为基础字"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">清空重置</span>
            <span className="sm:hidden">重置</span>
          </button>
        </div>
      </div>

      {/* 核心中央大字展示台 */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 relative group">
        
        {/* 声调与性质标识徽章 */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${
            deduction.effectiveClass === 'mid'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : deduction.effectiveClass === 'high'
              ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
          }`}>
            {deduction.effectiveClassName.split('(')[0].trim()}
          </span>

          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${
            deduction.syllableLife === 'live'
              ? 'bg-teal-500/15 text-teal-300 border-teal-500/40'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
          }`}>
            {deduction.syllableLife === 'live' ? '活音 (คำเป็น)' : '死音 (คำตาย)'}
          </span>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            {deduction.toneInfo.nameZh} [{deduction.toneInfo.chaoNumber}]
          </span>
        </div>

        {/* 泰文组装大字 (Sarabun / Kanit font 样式) */}
        <div className="flex items-baseline justify-center gap-2 select-all my-2">
          <span className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-normal text-white drop-shadow-md">
            {deduction.assembledThai}
          </span>
        </div>

        {/* 国际音标与拼读提示 */}
        <div className="flex items-center gap-2 text-slate-300 font-mono text-sm sm:text-base mt-2">
          <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-amber-300 font-bold">
            /{deduction.romanization}/
          </span>
          <span className="text-xs text-slate-400">
            {deduction.toneInfo.ipaSymbol}
          </span>
        </div>

        {/* 发音触发大按键 */}
        <div className="flex items-center gap-2 sm:gap-3 mt-6">
          <button
            onClick={() => onSpeak(0.9)}
            className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition hover:scale-105 active:scale-95"
            title="真人标准发音（Web Speech API 泰语合成）"
          >
            <Volume2 className="w-5 h-5 text-slate-950" />
            <span>听读发音</span>
          </button>

          <button
            onClick={() => onSpeak(0.65)}
            className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            title="慢速逐字听辨 (0.65x)"
          >
            <Turtle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">慢速听辨</span>
            <span className="sm:hidden">慢速</span>
          </button>

          <button
            onClick={() => onPlayToneMelody(deduction.resultingTone)}
            className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            title="声学音高包络走势旋律"
          >
            <Radio className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">纯音调旋律</span>
            <span className="sm:hidden">纯音调</span>
          </button>
        </div>
      </div>

      {/* 4 个积木插槽 (Lego Slots) */}
      <div className="mt-5">
        <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
          <span>积木拼装插槽 (点击插槽切换下方备选字母)：</span>
          <span className="text-[11px] text-amber-400/80 font-normal">支持前引字、长短元音、活死尾音与变调符</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          
          {/* 1. 首辅音积木槽 */}
          <div
            onClick={() => onSetDrawerTab('consonant')}
            className={`p-3 rounded-2xl border transition cursor-pointer relative flex flex-col items-center gap-1 ${
              activeDrawerTab === 'consonant'
                ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800'
            }`}
          >
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold">1. 首辅音</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                initialConsonant.class === 'mid'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : initialConsonant.class === 'high'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {initialConsonant.class === 'mid' ? '中' : initialConsonant.class === 'high' ? '高' : '低'}
              </span>
            </div>

            <div className="text-3xl font-bold text-white my-1 flex items-center gap-1">
              {leadingConsonant && (
                <span className="text-sm font-bold text-sky-300 px-1 py-0.5 rounded bg-sky-950 border border-sky-800">
                  {leadingConsonant.symbol} นํา
                </span>
              )}
              <span>{initialConsonant.symbol}</span>
            </div>

            <div className="text-[11px] text-slate-300 font-medium truncate max-w-full">
              {initialConsonant.nameThai}
            </div>

            {leadingConsonant && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSlot('leading');
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center transition shadow cursor-pointer"
                title="取消前引字"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 2. 元音积木槽 */}
          <div
            onClick={() => onSetDrawerTab('vowel')}
            className={`p-3 rounded-2xl border transition cursor-pointer relative flex flex-col items-center gap-1 ${
              activeDrawerTab === 'vowel'
                ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800'
            }`}
          >
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold">2. 元音韵母</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                {vowel.length === 'long' ? '长元音' : '短元音'}
              </span>
            </div>

            <div className="text-3xl font-bold text-purple-200 my-1">
              {vowel.symbol}
            </div>

            <div className="text-[11px] text-slate-300 font-medium truncate max-w-full">
              {vowel.nameThai.split('(')[0]}
            </div>
          </div>

          {/* 3. 尾辅音积木槽 */}
          <div
            onClick={() => onSetDrawerTab('final')}
            className={`p-3 rounded-2xl border transition cursor-pointer relative flex flex-col items-center gap-1 ${
              activeDrawerTab === 'final'
                ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800'
            }`}
          >
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold">3. 尾辅音</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                hasFinal 
                  ? (finalConsonant.life === 'live' ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300')
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {hasFinal ? (finalConsonant.life === 'live' ? '活音尾' : '死音尾') : '开音节'}
              </span>
            </div>

            <div className="text-3xl font-bold text-white my-1">
              {finalConsonant.symbol}
            </div>

            <div className="text-[11px] text-slate-300 font-medium truncate max-w-full">
              {finalConsonant.groupName}
            </div>

            {hasFinal && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSlot('final');
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center transition shadow cursor-pointer"
                title="移除尾音（恢复开音节）"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 4. 声调符号积木槽 */}
          <div
            onClick={() => onSetDrawerTab('tone')}
            className={`p-3 rounded-2xl border transition cursor-pointer relative flex flex-col items-center gap-1 ${
              activeDrawerTab === 'tone'
                ? 'bg-slate-800/90 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800'
            }`}
          >
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold">4. 声调符号</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                {toneMark.id === 0 ? '无标调' : `第${toneMark.id}符`}
              </span>
            </div>

            <div className="text-3xl font-bold text-amber-300 my-1">
              {toneMark.symbol ? `◌${toneMark.symbol}` : '–'}
            </div>

            <div className="text-[11px] text-slate-300 font-medium truncate max-w-full">
              {toneMark.nameZh}
            </div>

            {hasTone && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSlot('tone');
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center transition shadow cursor-pointer"
                title="清除声调符号（还原为底调）"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 5. 同音五调横向对比盘 (5-Tone Contrast Disc) */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              同音五调横向对比盘
              <span className="text-[11px] text-slate-400 font-normal">One-Click 5-Tone Audition</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            轻按任意调，实时比对该读音在五种声调下的音高与字义
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {deduction.toneContrastVariants.map((variant) => {
            return (
              <button
                key={`variant-${variant.toneId}`}
                onClick={() => {
                  onSelectToneVariant(variant.displayText, variant.toneId);
                }}
                className={`p-2 sm:p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer select-none ${
                  variant.isCurrent
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold font-mono px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-300">
                  第{variant.toneId}调
                </span>
                <span className="text-lg sm:text-xl font-bold text-white truncate max-w-full">
                  {variant.displayText}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {variant.toneInfo.chaoNumber} {variant.toneInfo.ipaSymbol}
                </span>
                <span className="text-[9px] text-slate-500 truncate max-w-full hidden md:inline">
                  {variant.toneInfo.nameThai.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
