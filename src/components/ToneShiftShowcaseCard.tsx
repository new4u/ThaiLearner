import React from 'react';
import { ToneId, THAI_FIVE_TONES } from '../utils/thaiPhoneticData';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { Volume2, Play, ArrowRight, Zap, RefreshCw, Activity, Sparkles } from 'lucide-react';

export interface ToneShiftEvent {
  fromTone: ToneId;
  toTone: ToneId;
  fromText: string;
  toText: string;
  triggerChar: string;
  triggerName: string;
  ruleExplanation: string;
  timestamp?: number;
}

interface ToneShiftShowcaseCardProps {
  shiftEvent: ToneShiftEvent;
  onReplayTransition?: () => void;
}

export const ToneShiftShowcaseCard: React.FC<ToneShiftShowcaseCardProps> = ({
  shiftEvent,
  onReplayTransition
}) => {
  const fromInfo = THAI_FIVE_TONES[shiftEvent.fromTone];
  const toInfo = THAI_FIVE_TONES[shiftEvent.toTone];

  // SVG 坐标系计算 (320 x 140)
  const mapPoint = (timeIndex: number, pitchVal: number) => {
    const x = 50 + timeIndex * 55; // 0, 1, 2, 3, 4
    const y = 120 - (pitchVal - 1) * 24; // level 1=120, level 5=24
    return `${x},${y}`;
  };

  const getPathData = (points: number[]) => {
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapPoint(idx, p)}`).join(' ');
  };

  const handleReplay = () => {
    if (onReplayTransition) {
      onReplayTransition();
    } else {
      thaiAudio.playToneTransitionContrast(
        shiftEvent.fromTone,
        shiftEvent.toTone,
        shiftEvent.toText
      );
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden animate-fadeIn">
      
      {/* Top Banner: Real-time Tone Shift Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 animate-pulse">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                ⚡ 击键触发变调过程
              </span>
              <span className="text-xs font-mono text-cyan-300">Tone Shift Dynamic Walkthrough</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
              由【第 {shiftEvent.fromTone} 调】跃迁至【第 {shiftEvent.toTone} 调】
            </h3>
          </div>
        </div>

        {/* Audio Transition Play Button */}
        <button
          onClick={handleReplay}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 shrink-0"
        >
          <Volume2 className="w-4 h-4" />
          <span>🔊 完整对比试听变调过程</span>
        </button>
      </div>

      {/* Middle Grid: From Word vs To Word Cards & Pitch Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Left: Text & Tone Transition Flow (4 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          
          <div className="flex items-center justify-between gap-2 bg-slate-950/80 rounded-2xl p-3 border border-slate-800">
            {/* Before Tile */}
            <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">变调前原音</span>
              <span className="text-2xl sm:text-3xl font-black font-thai text-slate-200 mt-1">
                {shiftEvent.fromText}
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                <span className="font-bold text-slate-300">第 {shiftEvent.fromTone} 调</span>
                <span className="text-slate-400">[{fromInfo.chaoNumber}]</span>
              </div>
              <span className="text-[10px] text-slate-400">{fromInfo.nameZh.split('·')[1]}</span>
              <button
                type="button"
                onClick={() => thaiAudio.playToneMelody(shiftEvent.fromTone, 0.4)}
                className="mt-2 px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-2.5 h-2.5" /> 听原调
              </button>
            </div>

            {/* Shift Trigger Badge */}
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-xs font-bold text-amber-400 font-mono">+ 击键</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg font-bold font-thai text-amber-300 my-1 shadow-md">
                {shiftEvent.triggerChar}
              </div>
              <span className="text-[9px] text-amber-300/80 max-w-[64px] text-center font-thai leading-tight">
                {shiftEvent.triggerName}
              </span>
              <ArrowRight className="w-4 h-4 text-amber-400 mt-1 animate-pulse" />
            </div>

            {/* After Tile */}
            <div className="flex-1 flex flex-col items-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 shadow-inner">
              <span className="text-[11px] text-amber-300 font-bold">变调后新音</span>
              <span className="text-2xl sm:text-3xl font-black font-thai text-amber-400 mt-1 animate-scaleUp">
                {shiftEvent.toText}
              </span>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                <span className="font-extrabold text-amber-300">第 {shiftEvent.toTone} 调</span>
                <span className="text-cyan-300 font-bold">[{toInfo.chaoNumber}]</span>
              </div>
              <span className="text-[10px] text-amber-200/90 font-bold">{toInfo.nameZh.split('·')[1]}</span>
              <button
                type="button"
                onClick={() => {
                  thaiAudio.playToneMelody(shiftEvent.toTone, 0.4);
                  setTimeout(() => thaiAudio.speakThai(shiftEvent.toText, 0.9), 300);
                }}
                className="mt-2 px-2 py-0.5 text-[10px] rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 cursor-pointer border border-amber-500/30"
              >
                <Play className="w-2.5 h-2.5" /> 听新调
              </button>
            </div>
          </div>

          {/* Rule Summary Box */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              变调法则解析：
            </span>
            <p className="text-slate-300 text-xs leading-relaxed font-medium">
              {shiftEvent.ruleExplanation}
            </p>
          </div>
        </div>

        {/* Right: Pitch Trajectory Comparison SVG Graph (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-3 sm:p-4 flex flex-col">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              赵元任五度声学音高走势跃迁对比 (Chao Pitch Contour)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-500 inline-block"></span>
                原调: {fromInfo.chaoNumber}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <span className="w-3 h-1 bg-amber-400 rounded-full inline-block shadow-sm shadow-amber-400"></span>
                新调: {toInfo.chaoNumber}
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full aspect-[16/8] max-h-48 bg-slate-900/90 rounded-xl border border-slate-800/80 p-2 overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 320 140" className="w-full h-full select-none">
              <defs>
                <linearGradient id="shiftNewGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
                <filter id="shiftGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid 5 levels */}
              {[5, 4, 3, 2, 1].map((lvl) => {
                const y = 120 - (lvl - 1) * 24;
                return (
                  <g key={`grid-${lvl}`}>
                    <line
                      x1="45"
                      y1={y}
                      x2="285"
                      y2={y}
                      stroke={lvl === 3 ? '#475569' : '#1E293B'}
                      strokeDasharray={lvl === 3 ? '4,4' : '2,2'}
                      strokeWidth="1"
                    />
                    <text
                      x="30"
                      y={y + 3.5}
                      fill={lvl === 3 ? '#94A3B8' : '#64748B'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {lvl}度
                    </text>
                  </g>
                );
              })}

              <text x="50" y="135" fill="#64748B" fontSize="8" textAnchor="middle">起音</text>
              <text x="270" y="135" fill="#64748B" fontSize="8" textAnchor="middle">尾韵</text>

              {/* 1. 原音调曲线 (Dashed Slate) */}
              <path
                d={getPathData(fromInfo.pitchPoints)}
                fill="none"
                stroke="#64748B"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                strokeLinecap="round"
              />
              {fromInfo.pitchPoints.map((p, i) => {
                const [cx, cy] = mapPoint(i, p).split(',');
                return (
                  <circle
                    key={`from-pt-${i}`}
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill="#64748B"
                  />
                );
              })}

              {/* 2. 新音调曲线 (Glowing Amber/Green) */}
              <path
                d={getPathData(toInfo.pitchPoints)}
                fill="none"
                stroke="url(#shiftNewGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#shiftGlow)"
              />
              {toInfo.pitchPoints.map((p, i) => {
                const [cx, cy] = mapPoint(i, p).split(',');
                return (
                  <circle
                    key={`to-pt-${i}`}
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="#F59E0B"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>原音走势：{fromInfo.description}</span>
            <span className="font-bold text-amber-300">新调走势：{toInfo.description}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
