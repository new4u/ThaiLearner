import React, { useState, useEffect, useMemo } from 'react';
import { RegisteredStudent, StudyCheckinRecord } from '../types';
import { studentStudyService } from '../services/studentStudyService';
import { adminAuthService } from '../services/adminAuthService';
import { 
  CheckCircle2, Calendar, Award, Flame, LogOut, 
  Sparkles, Keyboard, BookOpen, Clock, 
  Copy, Check, History, RefreshCw, ArrowRight,
  Cloud, X, UserCheck
} from 'lucide-react';

interface RegistrationCheckinViewProps {
  currentStudent: RegisteredStudent | null;
  onStudentChange: (student: RegisteredStudent | null) => void;
  onNavigateToKeyboard?: (word?: string) => void;
  onNavigateToPlayer?: () => void;
  onOpenAdmin?: () => void;
}

export const RegistrationCheckinView: React.FC<RegistrationCheckinViewProps> = ({
  currentStudent,
  onStudentChange,
  onNavigateToKeyboard,
  onNavigateToPlayer,
  onOpenAdmin
}) => {
  // 当前子标签页：每日打卡 / 我的记录
  const [activeTab, setActiveTab] = useState<'checkin' | 'records'>('checkin');

  // 打卡笔记输入
  const [checkinNotes, setCheckinNotes] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  // 注册/登录弹窗控制（只有在特定场景如点击打卡时，才弹出）
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginLookup, setIsLoginLookup] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputContact, setInputContact] = useState('');
  const [inputGoal, setInputGoal] = useState('听懂尊者实况开示原声');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [loginQuery, setLoginQuery] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 云端同步状态
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // 全量数据
  const [allStudyRecords, setAllStudyRecords] = useState<StudyCheckinRecord[]>([]);

  const refreshData = () => {
    setAllStudyRecords(studentStudyService.getAllStudyRecords());
  };

  useEffect(() => {
    refreshData();
    studentStudyService.syncWithSupabase().then(() => {
      refreshData();
    }).catch(() => {});

    const unsubscribe = studentStudyService.subscribeSync(() => {
      refreshData();
      const current = studentStudyService.getCurrentStudent();
      if (current) onStudentChange(current);
    });

    return () => unsubscribe();
  }, [currentStudent]);

  // 检查今日是否已打卡
  const todayStr = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const isCheckedInToday = useMemo(() => {
    if (!currentStudent) return false;
    return currentStudent.lastCheckinDate === todayStr;
  }, [currentStudent, todayStr]);

  // 当前用户的个人学习记录
  const personalRecords = useMemo(() => {
    if (!currentStudent) return [];
    return allStudyRecords.filter(r => r.studentId === currentStudent.id);
  }, [allStudyRecords, currentStudent]);

  // 触发云端同步
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('正在连接云端同步最新数据...');
    try {
      const res = await studentStudyService.syncWithSupabase();
      refreshData();
      setSyncStatusMsg(res.message);
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (e: any) {
      setSyncStatusMsg(e?.message || '同步完成');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  // 核心打卡动作：若未登记称呼，先弹出登记弹窗
  const handleCheckinClick = () => {
    if (!currentStudent) {
      setShowAuthModal(true);
      return;
    }

    const res = studentStudyService.recordDailyCheckin(currentStudent.id, checkinNotes);
    if (res) {
      onStudentChange(res.student);
      refreshData();
      setCheckinNotes('');
    }
  };

  // 提交登记并直接完成今日打卡 (注册必须设置密码)
  const handleSubmitRegisterAndCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      alert('请填写您的称呼');
      return;
    }
    if (!registerPassword || registerPassword.length < 4) {
      alert('请设置登录密码（至少 4 位），以后每次打卡用它登录');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      alert('两次输入的密码不一致，请重新输入');
      return;
    }

    try {
      const newStudent = await studentStudyService.registerStudent({
        name: inputName.trim(),
        wechatOrPhone: inputContact.trim(),
        learningGoal: inputGoal.trim() || '随喜参加泰语共学，听懂法音原声',
        password: registerPassword
      });

      onStudentChange(newStudent);
      // 立即打卡
      const res = studentStudyService.recordDailyCheckin(newStudent.id, checkinNotes);
      if (res) {
        onStudentChange(res.student);
      }
      refreshData();
      setShowAuthModal(false);
      setInputName('');
      setInputContact('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setCheckinNotes('');
    } catch (err: any) {
      alert(err?.message || '登记失败，请重试');
    }
  };

  // 已有称呼查找登录 (称呼/联系方式 + 密码)
  const handleLookupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginQuery.trim() || !loginPassword) return;

    const student = await studentStudyService.loginStudent(loginQuery.trim(), loginPassword);
    if (student && student.role === 'admin') {
      // 超级管理员：登录即进入管理后台 (密码验证发生在数据库 RPC)
      const authRes = await adminAuthService.unlock(loginPassword);
      if (authRes.success) {
        setShowAuthModal(false);
        setLoginQuery('');
        setLoginPassword('');
        onOpenAdmin?.();
      } else {
        alert(authRes.message);
      }
      return;
    }

    if (student) {
      onStudentChange(student);
      refreshData();
      setShowAuthModal(false);
      setLoginQuery('');
      setLoginPassword('');
    } else {
      alert('未找到该称呼，或密码不正确。请核对后重试，也可直接登记新称呼。');
    }
  };

  // 退出登录 / 切换称呼
  const handleLogout = () => {
    studentStudyService.logoutStudent();
    onStudentChange(null);
    refreshData();
  };

  // 复制今日打卡文本发群交流
  const handleCopyReport = () => {
    if (!currentStudent) return;
    const text = `【泰语学习打卡】
学员：${currentStudent.name}
连续打卡：第 ${currentStudent.streakDays} 天
打卡笔记：${checkinNotes.trim() || '随喜今日闻思开示，在泰语学习中积累资粮。'}
— 《泰学》学习工作台`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-100 animate-fadeIn pb-16">
      
      {/* 顶部个人打卡概况与状态栏 */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shrink-0">
              {currentStudent ? currentStudent.name.slice(0, 1) : '📿'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {currentStudent ? currentStudent.name : '每日学习打卡'}
                </h1>
                {currentStudent ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    已建立学习档案
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-stone-300">
                    点击打卡即可登记
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-stone-400 mt-1">
                {currentStudent ? (
                  <span>
                    学习目标：{currentStudent.learningGoal || '随喜学习，听懂尊者开示原声'}
                  </span>
                ) : (
                  <span>
                    每日坚持打卡闻思开示与键盘练习，沉淀学习足迹。
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* 右侧动作 */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {currentStudent ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                title="切换其他称呼账号"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>切换称呼</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>登记称呼</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-400 hover:text-stone-200 text-xs transition cursor-pointer"
              title="同步云端数据"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

        </div>

        {/* 学习指标卡：连续天数、累计打卡 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="text-[11px] text-stone-400">连续打卡</div>
              <div className="text-lg font-black text-amber-300 font-mono">
                {currentStudent ? currentStudent.streakDays : 0} <span className="text-xs font-normal text-stone-400">天</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-400">累计打卡</div>
              <div className="text-lg font-black text-emerald-300 font-mono">
                {currentStudent ? currentStudent.totalCheckins : 0} <span className="text-xs font-normal text-stone-400">次</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-400">键盘练习</div>
              <div className="text-lg font-black text-cyan-300 font-mono">
                {currentStudent ? currentStudent.keyboardPracticeCount || 0 : 0} <span className="text-xs font-normal text-stone-400">词</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-400">掌握法词</div>
              <div className="text-lg font-black text-indigo-300 font-mono">
                {currentStudent ? currentStudent.wordsMasteredCount || 0 : 0} <span className="text-xs font-normal text-stone-400">个</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡切换：今日打卡 / 我的记录 / 联系小助手 */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'checkin'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>今日打卡</span>
          {isCheckedInToday && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'records'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>打卡记录 ({personalRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: 今日打卡核心区域 */}
      {activeTab === 'checkin' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="max-w-xl mx-auto text-center space-y-4">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>📅 {todayStr} · 今日学习打卡</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {isCheckedInToday ? '今日打卡已完成 ✓' : '记录今日学修'}
              </h2>

              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                {currentStudent 
                  ? `您已连续打卡 ${currentStudent.streakDays} 天。点击下方按钮即可完成打卡。`
                  : '点击下方按钮填写称呼即可完成今日打卡，开启连续打卡记录。'}
              </p>

              {/* 心得笔记输入框 */}
              <div className="text-left bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-stone-300 flex items-center justify-between">
                  <span>今日心得 / 学习笔记（可选）：</span>
                </label>
                <textarea
                  rows={3}
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                  placeholder="可记录今日所闻法语、生词体会或学习心得..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* 打卡主按钮 */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckinClick}
                  className={`px-8 py-3.5 rounded-2xl font-black text-sm transition shadow-xl cursor-pointer flex items-center gap-2 ${
                    isCheckedInToday
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isCheckedInToday ? '今日已打卡（可再次更新心得）' : '点击完成今日打卡'}</span>
                </button>

                {currentStudent && isCheckedInToday && (
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    title="复制打卡内容发群分享"
                  >
                    {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedReport ? '已复制！' : '复制打卡内容'}</span>
                  </button>
                )}
              </div>

              {/* 今日学修快速跳转 */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-3 flex-wrap text-xs">
                <span className="text-stone-400">快速前往学修：</span>
                {onNavigateToPlayer && (
                  <button
                    type="button"
                    onClick={onNavigateToPlayer}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🎬 双视频放映机</span>
                  </button>
                )}
                {onNavigateToKeyboard && (
                  <button
                    type="button"
                    onClick={() => onNavigateToKeyboard('สัมมาสมาธิ')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>⌨️ 泰语打字练习</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 个人打卡记录 */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white">
                学习打卡历史 ({personalRecords.length})
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                记录每日打卡、泰语键盘打字与生词掌握
              </p>
            </div>

            <button
              type="button"
              onClick={refreshData}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>刷新</span>
            </button>
          </div>

          {personalRecords.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="text-3xl">📝</div>
              <div className="text-sm font-bold text-white">暂无打卡记录</div>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                完成今日打卡或进行泰语打字练习后，记录将保存在此处。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {personalRecords.map((rec) => {
                const isCheckin = rec.type === 'daily_checkin';
                const isKeyboard = rec.type === 'keyboard_finish';

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${
                        isCheckin 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : isKeyboard
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {isCheckin ? '☀️' : isKeyboard ? '⌨️' : '📖'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{rec.summary}</span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-stone-400">
                            {rec.timeStr}
                          </span>
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-stone-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                            {rec.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-amber-400">
                        连续 {rec.streakDay} 天
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 注册/登录弹窗（仅在特定场景如未登录点击打卡时弹出） */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isLoginLookup ? '登录以恢复打卡记录' : '登记称呼并打卡'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  {isLoginLookup 
                    ? '输入称呼与密码，恢复您的连续打卡天数' 
                    : '填写称呼并设置密码，提交即完成打卡'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-stone-400 hover:text-white font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!isLoginLookup ? (
              <form onSubmit={handleSubmitRegisterAndCheckin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    您的称呼 / 法名 <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="输入您的称呼（如：林师兄）"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      设置登录密码 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="至少 4 位，以后打卡用它登录"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-300 mb-1">
                      确认密码 <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      placeholder="再输入一次密码"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    微信号或手机号 <span className="text-stone-500 font-normal">(选填，用于多端同步)</span>
                  </label>
                  <input
                    type="text"
                    value={inputContact}
                    onChange={(e) => setInputContact(e.target.value)}
                    placeholder="选填"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    学习目标 / 心愿 <span className="text-stone-500 font-normal">(选填)</span>
                  </label>
                  <input
                    type="text"
                    value={inputGoal}
                    onChange={(e) => setInputGoal(e.target.value)}
                    placeholder="例如：听懂尊者开示原声"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLoginLookup(true)}
                    className="text-xs text-amber-400 hover:underline cursor-pointer"
                  >
                    已有称呼？点此查找
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    确认并完成打卡
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLookupLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    输入您登记过的称呼或手机号
                  </label>
                  <input
                    type="text"
                    required
                    value={loginQuery}
                    onChange={(e) => setLoginQuery(e.target.value)}
                    placeholder="输入称呼查找..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    登录密码 <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="输入登记时设置的密码"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLoginLookup(false)}
                    className="text-xs text-stone-400 hover:text-white cursor-pointer"
                  >
                    ← 返回直接登记
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    登录
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
