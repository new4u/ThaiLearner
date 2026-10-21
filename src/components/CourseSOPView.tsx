import React, { useState, useEffect } from 'react';
import { COURSE_SOP_STAGES } from '../data/luangporCourseData';
import { 
  Play, Pause, RotateCcw, Clock, CheckCircle2, ChevronRight, 
  Sparkles, Keyboard, MessageSquare, Headphones, FileText, ArrowRight, Video 
} from 'lucide-react';

interface CourseSOPViewProps {
  onGoToPlayer: () => void;
  onGoToKeyboard: () => void;
  onOpenZoom?: () => void;
  onOpenDualSync?: () => void;
  onOpenSlides?: () => void;
}

export const CourseSOPView: React.FC<CourseSOPViewProps> = ({ 
  onGoToPlayer, 
  onGoToKeyboard,
  onOpenZoom,
  onOpenDualSync,
  onOpenSlides 
}) => {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(3600); // 60 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const toggleAction = (key: string) => {
    setCheckedActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStage = COURSE_SOP_STAGES[activeStageIndex];

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Top Banner: Master Host Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/50 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                带读者专属备课实战工作台 (内训带读版)
              </span>
              <span className="text-xs text-slate-400">1小时 Zoom 会议标准实战 SOP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              隆波开示《正定 vs 邪定》“泰语声闻共学”带读 SOP
            </h1>
            <p className="text-sm text-indigo-200/80 mt-2 max-w-2xl leading-relaxed">
              以【泰法语声闻共学 AI 工作流】为核心，将 1 小时打造成一场通关游戏般的沉浸式共学课。
              前半小时【盲听抓耳】训练听力觉知，后半小时【声闻研读】拆解巴利词根与法义，以泰语键盘打卡圆满交付。
            </p>

            {/* Quick Action Entries for Hosts */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {onOpenSlides && (
                <button
                  onClick={onOpenSlides}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>🎴</span>
                  <span>打开 Zoom 10 页禅意讲义</span>
                </button>
              )}
              {onOpenDualSync && (
                <button
                  onClick={onOpenDualSync}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>打开泰中双视频同步放映机</span>
                </button>
              )}
              <a
                href="/slides.html"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1 transition"
              >
                <span>独立 slides.html (Zoom专用)</span>
                <ChevronRight className="w-3 h-3 text-amber-400" />
              </a>
            </div>
          </div>

          {/* Interactive Session Timer */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl shadow-xl shrink-0">
            <div className="text-center">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                共学计时器
              </div>
              <div className="text-3xl font-black font-mono tracking-wider text-amber-400">
                {formatTimer(secondsRemaining)}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 border-l border-slate-800 pl-4">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isTimerRunning
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isTimerRunning ? '暂停' : '启动'}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setSecondsRemaining(3600);
                }}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Workflow Steps (Timeline Roadmap) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {COURSE_SOP_STAGES.map((stage, idx) => {
          const isActive = activeStageIndex === idx;
          return (
            <div
              key={stage.id}
              onClick={() => setActiveStageIndex(idx)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative ${
                isActive
                  ? 'bg-slate-900 border-amber-500/80 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className={`font-semibold px-2.5 py-0.5 rounded-full ${
                  isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {stage.phase}
                </span>
                <span className="font-mono text-slate-400 text-[11px]">{stage.timing}</span>
              </div>
              <h3 className={`font-bold text-base mt-1 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {stage.title}
              </h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {stage.actions[0]?.desc}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs font-medium">
                <span className={`${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                  {isActive ? '当前聚焦环节' : '点击查看执行要点'}
                </span>
                <ChevronRight className={`w-4 h-4 transition ${isActive ? 'text-amber-400 translate-x-1' : 'text-slate-600'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Stage Execution Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Step Checklist and Script */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  {currentStage.phase} · 执行细则与清单
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {currentStage.title} ({currentStage.timing})
                </h2>
              </div>
              <button
                onClick={onGoToPlayer}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <span>立即打开声闻研读流</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action Checklist */}
            <div className="space-y-4">
              {currentStage.actions.map((act, actIdx) => {
                const checkKey = `${currentStage.id}_${actIdx}`;
                const isChecked = !!checkedActions[checkKey];
                return (
                  <div
                    key={actIdx}
                    onClick={() => toggleAction(checkKey)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-500 text-slate-950'
                          : 'border border-slate-700 bg-slate-800 text-transparent hover:border-slate-500'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {act.tag}
                        </span>
                        {isChecked && (
                          <span className="text-[11px] text-emerald-400 font-medium">已完成</span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${isChecked ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                        {act.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teleprompter: Live Zoom Presenter Script */}
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-3">
              <MessageSquare className="w-4 h-4" />
              主持提词器 · 现场带读引导金句 (随时照着念)
            </div>

            {activeStageIndex === 0 && (
              <div className="space-y-3 text-sm text-slate-200 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-indigo-900/40">
                <p>
                  <strong>🎙️ 开课破冰与盲听抓耳测试引导：</strong>“各位同修师兄，欢迎来到今天的‘泰语声闻共学’。今天我们将一起聆听隆波关于<strong>‘正定与邪定’</strong>的一段经典开示。我们不讲死记硬背的书写，只讲法义与词根，跟着节奏通关！”
                </p>
                <p>
                  <strong>🎙️ 抓耳指引：</strong>“现在我们把屏幕上的字幕全部遮盖起来，进入纯盲听模式。请大家提起清明的觉知，只用耳朵听隆波的原声。在接下来这一分钟里，你听到了几次 <strong>สมาธิ (Samādhi / 禅定)</strong>？听到了几次 <strong>สติ (Sati / 正念)</strong>？抓到一个就在看板按键或者公屏敲 1，看看谁的觉知最敏锐！”
                </p>
                <p className="text-xs text-amber-300">
                  💡 <strong>主讲心得：</strong>此时主讲可在工作台的【Sati 听法觉知看板】同步敲击按键计数，学员会感受到极强的互动参与感！
                </p>
              </div>
            )}

            {activeStageIndex === 1 && (
              <div className="space-y-3 text-sm text-slate-200 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-indigo-900/40">
                <p>
                  <strong>🎙️ 词根拆解（声闻研读）：</strong>“大家看隆波说的这句话：<em>‘มิจฉาสมาธิ อันไม่ประกอบด้วย สัมมาสติ’</em>。很多同修觉得泰语长词可怕，其实它就像拼图：<strong>มิจฉา (Mitcha)</strong> 就是邪、错；<strong>สัมมา (Sammā)</strong> 就是正。八正道里凡是带สัมมา的都是好词！再看这个 <strong>ลืมตัว (Luem-tua)</strong>，ลืม 是忘记，ตัว 是自身，合起来就是‘忘却自我、失去觉知’！是不是一下就刻在脑子里了？”
                </p>
                <p>
                  <strong>🎙️ 发音试听：</strong>“现在点击单句试听发音，哪位师兄开一下麦，模仿隆波那种安详、清朗的语气读一句？”
                </p>
              </div>
            )}

            {activeStageIndex === 2 && (
              <div className="space-y-3 text-sm text-slate-200 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-indigo-900/40">
                <p>
                  <strong>🎙️ 通关打卡与发布课件：</strong>“今天我们的通关密语，就是隆波开示的正定：<strong>สัมมาสมาธิ</strong>！请大家现在切到 Kedmanee 泰语键盘，在 Zoom 聊天框敲出这五个字母打卡！同时，今天所有讲过的词汇与音标，已经在【课件分发】里生成了微信群排版文本与 LR 兼容 TSV 表格，马上发在微信群，大家随时复习导入！”
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Host Muscle Memory Cheatsheet & Quick Jumps */}
        <div className="space-y-6">
          {/* Shortcuts Cheatsheet */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-amber-400" />
              左手快捷键肌肉记忆 (带读神技)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              带读时常驻以下按键，流畅切换：
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-mono font-bold text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  A
                </span>
                <span className="text-slate-300 font-medium">上一句字幕 / 复听上文</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-mono font-bold text-cyan-400 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                  D
                </span>
                <span className="text-slate-300 font-medium">下一句字幕 / 顺流推进</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-mono font-bold text-indigo-400 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
                  Space 空格
                </span>
                <span className="text-slate-300 font-medium">单次试听发音</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span className="font-mono font-bold text-rose-400 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                  S / R / L
                </span>
                <span className="text-slate-300 font-medium">Sati / 知者 / 走神 觉知打卡</span>
              </div>
            </div>
          </div>

          {/* Quick Nav Tools */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              快速跳入实战工具
            </h4>
            {onOpenZoom && (
              <button
                onClick={onOpenZoom}
                className="w-full py-3 px-4 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/40 text-blue-200 font-semibold text-xs flex items-center justify-between transition shadow-md shadow-blue-950/40 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  进入 Zoom 现场共学与练习室
                </span>
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </button>
            )}
            <button
              onClick={onGoToPlayer}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-amber-400" />
                打开 声闻课件研读流
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={onGoToKeyboard}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                打开 泰语键盘实战打卡室
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
