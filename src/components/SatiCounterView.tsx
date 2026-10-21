import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EarCatchMetric, SatiCaptureRecord } from '../types';
import { 
  Activity, Clock, Play, Pause, RotateCcw, Copy, Check, 
  Sparkles, Flame, Headphones, Volume2, ShieldCheck, Heart, 
  Share2, ArrowUpRight
} from 'lucide-react';

interface SatiCounterViewProps {
  metrics: EarCatchMetric[];
  onIncrementMetric: (id: string) => void;
  onResetMetrics: () => void;
  onSpeak: (text: string) => void;
  onBackToCourse: () => void;
}

export const SatiCounterView: React.FC<SatiCounterViewProps> = ({
  metrics,
  onIncrementMetric,
  onResetMetrics,
  onSpeak,
  onBackToCourse
}) => {
  // 30分钟听法计时器
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerTargetMinutes, setTimerTargetMinutes] = useState(30);
  const [records, setRecords] = useState<SatiCaptureRecord[]>([]);
  const [copiedReport, setCopiedReport] = useState(false);
  const [lastCapturedId, setLastCapturedId] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // 计时器循环
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const totalCaptured = metrics.reduce((sum, m) => sum + m.count, 0);

  // 捕获打卡核心处理
  const handleCapture = useCallback((metricId: string) => {
    const target = metrics.find(m => m.id === metricId);
    if (!target) return;

    onIncrementMetric(metricId);
    setLastCapturedId(metricId);
    setTimeout(() => setLastCapturedId(null), 400);

    // 记录时间戳
    const mm = Math.floor(timerSeconds / 60);
    const ss = timerSeconds % 60;
    const timeFormatted = `${mm < 10 ? '0' : ''}${mm}:${ss < 10 ? '0' : ''}${ss}`;

    const newRecord: SatiCaptureRecord = {
      id: `rec_${Date.now()}_${Math.random()}`,
      timestamp: timeFormatted,
      thaiWord: target.thai,
      chinese: target.chinese,
      shortcut: target.shortcutKey || '',
      totalAtTime: totalCaptured + 1
    };

    setRecords(prev => [newRecord, ...prev.slice(0, 49)]); // 保留最近50次
  }, [metrics, onIncrementMetric, timerSeconds, totalCaptured]);

  // 全局键盘快捷键监听 (S, R, L, M, D, K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const key = e.key.toUpperCase();
      const matched = metrics.find(m => m.shortcutKey === key);
      if (matched) {
        e.preventDefault();
        handleCapture(matched.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metrics, handleCapture]);

  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimerAndData = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setRecords([]);
    onResetMetrics();
  };

  // 生成微信群听法觉知打卡报告
  const handleCopyWeChatReport = () => {
    const mm = Math.floor(timerSeconds / 60);
    const ss = timerSeconds % 60;
    const timeStr = `${mm} 分 ${ss} 秒`;

    const satiCount = metrics.find(m => m.shortcutKey === 'S')?.count || 0;
    const phuRuCount = metrics.find(m => m.shortcutKey === 'R')?.count || 0;
    const longCount = metrics.find(m => m.shortcutKey === 'L')?.count || 0;
    const sammaCount = metrics.find(m => m.shortcutKey === 'M')?.count || 0;

    const ratePerMin = timerSeconds > 0 ? ((totalCaptured / timerSeconds) * 60).toFixed(1) : '0';

    const text = `📿【泰语声闻共学 · 听法觉知打卡结缘报告】\n` +
      `📅 听法时长：${timeStr} (${timerSeconds >= 1800 ? '✅ 满30分钟' : '听法精进中'})\n` +
      `✨ 觉知法词捕获总数：${totalCaptured} 次 (平均每分钟捕获 ${ratePerMin} 次)\n` +
      `───────────────\n` +
      `• สติ (Sati 正念觉知)：${satiCount} 次 (按 S 键)\n` +
      `• ผู้รู้ (知者心)：${phuRuCount} 次 (按 R 键)\n` +
      `• สัมมาสมาธิ (正定)：${sammaCount} 次 (按 M 键)\n` +
      `• หหลง (觉察到走神)：${longCount} 次 (按 L 键)\n` +
      `───────────────\n` +
      `💡 听法心得：心跑去想了，立刻知道，知者之心自然显现！\n` +
      `每周仅需 1 小时，把隆波的殊胜法语映入日常生活。`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  // 格式化当前秒数
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto">
      
      {/* 顶部觉知时钟与统计横幅 */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              听法现场实时觉知看板
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              键盘 S / R / L / M 快捷键随听随点
            </span>
            <span className="text-xs text-amber-400 font-medium hidden lg:inline">
              对治“看懂了以为听懂了”的妄念
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sati 听法觉知统计板
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-2xl">
            在聆听隆波原声开示时，耳朵抓住核心法语，立即敲击对应按键。心迷失了也立刻按下“走神”，锻炼直下承当的无伪觉知！
          </p>
        </div>

        {/* 计时器与打卡总数看板 */}
        <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shrink-0">
          <div>
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              听法时钟
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-wider">
              {formatTimer(timerSeconds)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              目标: {timerTargetMinutes} 分钟盲听
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800" />

          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              觉知捕获总计
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-rose-400">
              {totalCaptured} <span className="text-xs font-normal text-slate-400">次</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {timerSeconds > 0 ? `${((totalCaptured / timerSeconds) * 60).toFixed(1)} 次/分` : '待起表'}
            </div>
          </div>

          {/* 计时器控制按钮 */}
          <div className="flex flex-col gap-1.5 ml-2">
            <button
              onClick={handleToggleTimer}
              className={`p-2 rounded-xl font-bold transition flex items-center justify-center cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
              }`}
              title={isTimerRunning ? '暂停计时' : '开始听法计时'}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button
              onClick={handleResetTimerAndData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="重置计时与数据"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 随听随点大号打卡按钮网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {metrics.map(metric => {
          const isPulsing = lastCapturedId === metric.id;
          return (
            <div
              key={metric.id}
              className={`relative overflow-hidden rounded-2xl border p-4 transition flex flex-col justify-between shadow-xl ${
                isPulsing
                  ? 'bg-rose-500/30 border-rose-400 scale-105 shadow-rose-500/40'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    按键 [{metric.shortcutKey}]
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-white">
                    {metric.count}
                  </span>
                </div>

                <div className="font-bold text-base sm:text-lg text-amber-300 font-thai tracking-wide">
                  {metric.thai}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  /{metric.romanization}/
                </div>
                <div className="text-xs text-slate-200 font-medium mt-0.5">
                  {metric.chinese}
                </div>
              </div>

              <button
                onClick={() => handleCapture(metric.id)}
                className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-900/30 transition hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-yellow-300" />
                <span>+1 抓到觉知</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* 觉知明细流水与结缘打卡报告导出 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧 2 列：觉知捕获流水与频次走势 */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              听法觉知捕获流水记录
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              最近 {records.length} 次抓取
            </span>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Headphones className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              暂无抓耳打卡记录。请点击上方按钮或按键盘快捷键 [S / R / L / M / D / K] 开始！
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {records.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {r.timestamp}
                    </span>
                    <span className="font-bold text-white font-thai text-sm">
                      {r.thaiWord}
                    </span>
                    <span className="text-slate-400">
                      ({r.chinese})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      快捷键 [{r.shortcut}]
                    </span>
                    <span className="font-mono font-bold text-rose-400 text-xs">
                      #{r.totalAtTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧 1 列：一键生成微信群打卡结缘报告 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              微信群打卡结缘文案
            </div>
            <h4 className="text-base font-bold text-white">
              一键生成听法觉知打卡报告
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              听法结束后，一键复制格式化报告，发到共修群或朋友圈，记录精进轨迹，随喜同修道友！
            </p>

            {/* 报告预览卡片 */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 leading-relaxed select-all">
              <div className="text-amber-300 font-bold">📿【泰语声闻共学·听法觉知打卡】</div>
              <div>听法时长：{Math.floor(timerSeconds / 60)} 分钟</div>
              <div>捕获总数：{totalCaptured} 次</div>
              <div className="text-slate-500 text-[11px]">───────────────</div>
              <div>• Sati (正念)：{metrics.find(m => m.shortcutKey === 'S')?.count || 0} 次</div>
              <div>• Phu Ru (知者)：{metrics.find(m => m.shortcutKey === 'R')?.count || 0} 次</div>
              <div>• Long (走神)：{metrics.find(m => m.shortcutKey === 'L')?.count || 0} 次</div>
              <div>• Sammā (正定)：{metrics.find(m => m.shortcutKey === 'M')?.count || 0} 次</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCopyWeChatReport}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition hover:scale-102 active:scale-95 cursor-pointer"
            >
              {copiedReport ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>已成功复制到剪贴板！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>一键复制微信群打卡文案</span>
                </>
              )}
            </button>

            <button
              onClick={onBackToCourse}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>返回声闻课件研读流</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
