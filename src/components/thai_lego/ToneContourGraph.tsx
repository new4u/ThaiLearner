import React from 'react';
import { ToneId, THAI_FIVE_TONES } from '../../utils/thaiPhoneticData';
import { Volume2, Activity } from 'lucide-react';

interface ToneContourGraphProps {
  currentTone: ToneId;
  onSelectTone?: (toneId: ToneId) => void;
  onPlayToneMelody?: (toneId: ToneId) => void;
}

export const ToneContourGraph: React.FC<ToneContourGraphProps> = ({
  currentTone,
  onSelectTone,
  onPlayToneMelody
}) => {
  // SVG 坐标系定义
  // X: 40 到 280 (时间轴: 0ms -> 300ms)
  // Y: 20 (五度高 5) 到 140 (五度低 1)
  const mapPoint = (timeIndex: number, pitchVal: number) => {
    const x = 50 + timeIndex * 55; // 0, 1, 2, 3, 4
    // pitchVal 1 = 140, 5 = 20
    const y = 140 - (pitchVal - 1) * 30;
    return `${x},${y}`;
  };

  const getPathData = (points: number[]) => {
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapPoint(idx, p)}`).join(' ');
  };

  const toneList = [1, 2, 3, 4, 5] as ToneId[];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              五调声学音高走势图
              <span className="text-[10px] text-slate-400 font-mono font-normal">Chao 5-Tone Contours</span>
            </h3>
          </div>
        </div>
        <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          当前命中：
          <span className="font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
            {THAI_FIVE_TONES[currentTone].nameZh} [{THAI_FIVE_TONES[currentTone].chaoNumber}]
          </span>
        </div>
      </div>

      {/* SVG 画布 */}
      <div className="relative w-full aspect-[16/9] max-h-52 bg-slate-950/80 rounded-xl border border-slate-800/80 p-2 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 320 160" className="w-full h-full select-none">
          <defs>
            {/* 渐变发光滤镜 */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="gradActive" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* 五度标调网格参考线 (Level 1 到 5) */}
          {[5, 4, 3, 2, 1].map((level) => {
            const y = 140 - (level - 1) * 30;
            return (
              <g key={`grid-${level}`}>
                <line
                  x1="45"
                  y1={y}
                  x2="285"
                  y2={y}
                  stroke={level === 3 ? '#334155' : '#1E293B'}
                  strokeDasharray={level === 3 ? '4,4' : '2,2'}
                  strokeWidth="1"
                />
                <text
                  x="30"
                  y={y + 4}
                  fill={level === 3 ? '#94A3B8' : '#64748B'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* 时间起始与终止标记 */}
          <text x="50" y="155" fill="#475569" fontSize="9" textAnchor="middle">起音</text>
          <text x="270" y="155" fill="#475569" fontSize="9" textAnchor="middle">收尾</text>

          {/* 渲染未激活的 4 条半透明走势曲线 */}
          {toneList.map((tId) => {
            if (tId === currentTone) return null;
            const tInfo = THAI_FIVE_TONES[tId];
            const d = getPathData(tInfo.pitchPoints);
            return (
              <g key={`tone-bg-${tId}`} className="group cursor-pointer" onClick={() => onSelectTone?.(tId)}>
                <path
                  d={d}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition duration-300 group-hover:stroke-slate-400 group-hover:stroke-width-3"
                />
                <circle
                  cx={tInfo.pitchPoints[4] ? 270 : 270}
                  cy={140 - (tInfo.pitchPoints[4] - 1) * 30}
                  r="3.5"
                  fill="#475569"
                  className="group-hover:fill-slate-300"
                />
              </g>
            );
          })}

          {/* 渲染当前激活的高亮变调曲线 (Active Curve with Glow) */}
          {(() => {
            const activeToneInfo = THAI_FIVE_TONES[currentTone];
            const d = getPathData(activeToneInfo.pitchPoints);
            const startY = 140 - (activeToneInfo.pitchPoints[0] - 1) * 30;
            const endY = 140 - (activeToneInfo.pitchPoints[4] - 1) * 30;

            return (
              <g key={`tone-active-${currentTone}`}>
                {/* 发光底层 */}
                <path
                  d={d}
                  fill="none"
                  stroke={activeToneInfo.accentColor}
                  strokeWidth="8"
                  strokeOpacity="0.3"
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
                {/* 主实体线 */}
                <path
                  d={d}
                  fill="none"
                  stroke={activeToneInfo.accentColor}
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* 起始点与终点 */}
                <circle cx="50" cy={startY} r="5" fill="#FFFFFF" stroke={activeToneInfo.accentColor} strokeWidth="2.5" />
                <circle cx="270" cy={endY} r="6" fill={activeToneInfo.accentColor} stroke="#FFFFFF" strokeWidth="2" />

                {/* 走势标签 */}
                <rect
                  x="120"
                  y="12"
                  width="130"
                  height="22"
                  rx="6"
                  fill="#0F172A"
                  stroke={activeToneInfo.accentColor}
                  strokeWidth="1.2"
                />
                <text
                  x="185"
                  y="26"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {activeToneInfo.nameZh} [{activeToneInfo.chaoNumber}]
                </text>
              </g>
            );
          })()}
        </svg>

        {/* 悬浮试听音高提示 */}
        <button
          onClick={() => onPlayToneMelody?.(currentTone)}
          className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          title="试听纯音高走势音频 (Web Audio API 模拟)"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>试听音高包络</span>
        </button>
      </div>

      {/* 5调快速点选与对比条 */}
      <div className="grid grid-cols-5 gap-1.5 mt-3">
        {toneList.map((tId) => {
          const t = THAI_FIVE_TONES[tId];
          const isSelected = tId === currentTone;
          return (
            <button
              key={`tone-chip-${tId}`}
              onClick={() => {
                onSelectTone?.(tId);
                onPlayToneMelody?.(tId);
              }}
              className={`p-1.5 rounded-xl border text-center transition flex flex-col items-center gap-0.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold font-mono">
                {t.chaoNumber}
              </span>
              <span className="text-[10px] font-medium truncate w-full">
                {t.nameThai.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
