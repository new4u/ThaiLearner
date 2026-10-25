import React, { useState, useEffect, useMemo } from 'react';
import { 
  RegisteredStudent, AdminAuditLog, AdminSessionState, CuratedLesson 
} from '../types';
import { adminAuthService } from '../services/adminAuthService';
import { secureStorageService } from '../services/secureStorageService';
import { 
  getAllCuratedLessons, updateCuratedLessonCalibration, getFlagshipLesson 
} from '../data/presetLessonsLibrary';
import { 
  ShieldCheck, Lock, Unlock, KeyRound, Download, Trash2, Search,
  RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, X, Sliders,
  FileSpreadsheet, Users, History, Clock, BookOpen, ExternalLink,
  ChevronRight, Save, LogOut
} from 'lucide-react';
import { 
  OFFICIAL_THAI_STREAMS_URL, 
  OFFICIAL_CHINESE_SEARCH_URL 
} from '../data/officialChannels';

interface AdminSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLessonCalibrated?: (lessonId: string, offset: number) => void;
}

export const AdminSanctuaryModal: React.FC<AdminSanctuaryModalProps> = ({
  isOpen,
  onClose,
  onLessonCalibrated
}) => {
  // 会话状态
  const [session, setSession] = useState<AdminSessionState>(() => adminAuthService.getSession());
  const [passphraseInput, setPassphraseInput] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [shakeLock, setShakeLock] = useState(false);

  // 子标签页
  const [activeTab, setActiveTab] = useState<'students' | 'calibration' | 'security'>('students');

  // 学员数据库状态
  const [students, setStudents] = useState<RegisteredStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'zero' | 'beginner' | 'intermediate'>('all');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // 课件库校准状态
  const [curatedLessons, setCuratedLessons] = useState<CuratedLesson[]>(() => getAllCuratedLessons());
  const [selectedLessonId, setSelectedLessonId] = useState<string>('lesson_20261017');
  const [calibratedOffset, setCalibratedOffset] = useState<number>(0.0);
  const [saveCalibrationToast, setSaveCalibrationToast] = useState(false);

  // 修改口令状态
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passChangeNotice, setPassChangeNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 审计日志
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // 监听会话变化
  useEffect(() => {
    const unsub = adminAuthService.subscribe((s) => {
      setSession(s);
      if (s.isAuthenticated) {
        refreshAdminData();
      }
    });
    return unsub;
  }, []);

  // 切换待校准课件
  const handleSelectLessonForCalibration = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const target = curatedLessons.find(l => l.id === lessonId);
    if (target) {
      setCalibratedOffset(target.defaultOffsetSeconds);
    }
  };

  // 刷新后台机密数据
  const refreshAdminData = () => {
    try {
      const allStudents = secureStorageService.getConfidentialStudents();
      setStudents(allStudents);
      const allLessons = getAllCuratedLessons();
      setCuratedLessons(allLessons);
      setAuditLogs(adminAuthService.getAuditLogs());

      const curr = allLessons.find(l => l.id === selectedLessonId) || allLessons[0];
      if (curr) {
        setCalibratedOffset(curr.defaultOffsetSeconds);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && session.isAuthenticated) {
      refreshAdminData();
    }
  }, [isOpen, session.isAuthenticated]);

  if (!isOpen) return null;

  // 1. 验证解锁
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passphraseInput.trim()) {
      setAuthError('请输入管理员密码');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const res = await adminAuthService.unlock(passphraseInput);
      if (res.success) {
        setPassphraseInput('');
        refreshAdminData();
      } else {
        setAuthError(res.message);
        setShakeLock(true);
        setTimeout(() => setShakeLock(false), 600);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. 安全锁定退出
  const handleLockOut = () => {
    adminAuthService.lock();
    setPassphraseInput('');
    setAuthError('');
  };

  // 3. 导出机密 CSV
  const handleExportCsv = () => {
    try {
      const res = secureStorageService.exportConfidentialCsv();
      setExportNotice(`机密报表导出成功！包含 ${res.count} 名学员完整数据 (${res.filename})`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      setExportNotice(`导出失败: ${err.message}`);
    }
  };

  // 4. 删除单个学员
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`⚠️ 安全确认：是否确定彻底删除学员【${studentName}】的所有隐私档案与打卡记录？此操作不可逆！`)) {
      secureStorageService.deleteStudentConfidential(studentId);
      refreshAdminData();
    }
  };

  // 5. 保存课件校准
  const handleSaveCalibration = () => {
    const updated = updateCuratedLessonCalibration(selectedLessonId, {
      defaultOffsetSeconds: calibratedOffset
    });
    setCuratedLessons(updated);
    adminAuthService.recordAuditLog('offset_calibrated', `管理员校准了课件 [ID: ${selectedLessonId}] 的基准偏移量为 ${calibratedOffset}s`);
    if (onLessonCalibrated) {
      onLessonCalibrated(selectedLessonId, calibratedOffset);
    }
    setSaveCalibrationToast(true);
    setTimeout(() => setSaveCalibrationToast(false), 2500);
  };

  // 6. 更新口令
  const handleUpdatePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeNotice(null);

    if (newPass !== confirmPass) {
      setPassChangeNotice({ type: 'error', msg: '两次输入的新口令不一致' });
      return;
    }

    const res = await adminAuthService.updatePassphrase(currentPass, newPass);
    if (res.success) {
      setPassChangeNotice({ type: 'success', msg: res.message });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setAuditLogs(adminAuthService.getAuditLogs());
    } else {
      setPassChangeNotice({ type: 'error', msg: res.message });
    }
  };

  // 过滤后的学员列表
  const filteredStudents = students.filter(s => {
    const matchQuery = !searchQuery.trim() || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.wechatOrPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.learningGoal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLevel = levelFilter === 'all' || s.thaiLevel === levelFilter;
    return matchQuery && matchLevel;
  });

  const selectedLesson = curatedLessons.find(l => l.id === selectedLessonId) || curatedLessons[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* 弹窗主体 */}
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden text-slate-100">
        
        {/* 顶部标题栏 */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-sm font-black shadow-inner">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  泰学 · 独立机密管理后台 (Admin Sanctuary)
                </h3>
                {session.isAuthenticated ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    已解锁
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    口令保护中
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                学员手机/微信与登录轨迹机密隔离存储 · 预制课件调校 · 仅管理员口令可见
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.isAuthenticated && (
              <button
                onClick={handleLockOut}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="立即锁定退出后台"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">锁定退出</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 视窗内容 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
          
          {/* A. 未解锁状态：管理员密码登录屏 */}
          {!session.isAuthenticated ? (
            <div className="max-w-md mx-auto py-8 sm:py-12 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/10 ${shakeLock ? 'animate-bounce' : ''}`}>
                <KeyRound className="w-8 h-8 text-amber-400" />
              </div>

              <h4 className="text-lg font-black text-white mb-2">
                请输入管理员密码
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                学员打卡与课件调校数据已安全存储，请输入管理员密码解锁。
              </p>

              <form onSubmit={handleUnlock} className="w-full space-y-3.5">
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphraseInput}
                    onChange={(e) => setPassphraseInput(e.target.value)}
                    placeholder="输入管理员密码..."
                    autoFocus
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isVerifying ? '验证密码中...' : '解锁进入管理后台'}</span>
                </button>

                {/* 默认密码友好提示 */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => setPassphraseInput('suan2026')}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
                  >
                    💡 快捷填入默认密码 (suan2026)
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* B. 已解锁状态：三大功能专区 */
            <div className="space-y-5">
              
              {/* 子导航 */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('students')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    activeTab === 'students'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>学员隐私档案与打卡金库 ({students.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('calibration')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    activeTab === 'calibration'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>预制课件与时间轴调校</span>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    activeTab === 'security'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>管理密码与审计日志</span>
                </button>
              </div>

              {/* 导出成功通知 */}
              {exportNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{exportNotice}</span>
                </div>
              )}

              {/* TAB 1: 学员隐私档案金库 */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  {/* KPI 统计卡片 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">机密注册学员</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                        {students.length} <span className="text-xs font-normal text-slate-400">人</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">累计学修打卡</div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                        {students.reduce((acc, s) => acc + s.totalCheckins, 0)} <span className="text-xs font-normal text-slate-400">次</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">泰文生词掌握</div>
                      <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">
                        {students.reduce((acc, s) => acc + s.wordsMasteredCount, 0)} <span className="text-xs font-normal text-slate-400">词</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">听法研读累计</div>
                      <div className="text-xl sm:text-2xl font-black text-yellow-400 mt-1">
                        {students.reduce((acc, s) => acc + s.videoMinutesStudied, 0)} <span className="text-xs font-normal text-slate-400">分钟</span>
                      </div>
                    </div>
                  </div>

                  {/* 搜索与导出栏 */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="搜索姓名、真实手机/微信号、修学目标..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder-slate-500 outline-none"
                        />
                      </div>
                      <select
                        value={levelFilter}
                        onChange={(e: any) => setLevelFilter(e.target.value)}
                        className="px-2.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 outline-none shrink-0"
                      >
                        <option value="all">全部基础</option>
                        <option value="zero">零基础</option>
                        <option value="beginner">初学者</option>
                        <option value="intermediate">进阶学员</option>
                      </select>
                    </div>

                    <button
                      onClick={handleExportCsv}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition cursor-pointer shrink-0"
                      title="导出完整机密档案为 CSV，原生支持 Excel、Numbers 与 WPS 打开"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出机密 CSV (UTF-8 BOM)</span>
                    </button>
                  </div>

                  {/* 学员完整隐私表格 */}
                  <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">学员姓名</th>
                            <th className="py-2.5 px-3">真实联系方式 (微信/手机)</th>
                            <th className="py-2.5 px-3">身份</th>
                            <th className="py-2.5 px-3">打卡连击</th>
                            <th className="py-2.5 px-3">掌握生词</th>
                            <th className="py-2.5 px-3">学习目标与承诺</th>
                            <th className="py-2.5 px-3 text-right">管理操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-500">
                                未检索到符合条件的学员档案
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-800/40 transition">
                                <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                                  {s.name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-amber-300 font-bold whitespace-nowrap">
                                  {s.wechatOrPhone}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    s.role === 'ta' 
                                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                                      : 'bg-slate-800 text-slate-300'
                                  }`}>
                                    {s.role === 'ta' ? '助教' : s.role === 'guest' ? '随喜' : '学员'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                                  <span className="text-amber-400 font-bold">{s.streakDays}</span> 天 / 累计 {s.totalCheckins} 次
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-cyan-300">
                                  {s.wordsMasteredCount} 词
                                </td>
                                <td className="py-2.5 px-3 max-w-xs truncate text-slate-400" title={s.learningGoal}>
                                  {s.learningGoal}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteStudent(s.id, s.name)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                    title="删除此学员机密记录"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 底部重置与提示 */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2">
                    <span>* 数据库仅保存在独立管理员金库中，不会暴露给任何第三方公共平台。</span>
                    <button
                      onClick={() => {
                        if (window.confirm('是否重置学员演示测试数据？此操作将恢复 3 位基准学员数据。')) {
                          secureStorageService.resetToDemoData();
                          refreshAdminData();
                        }
                      }}
                      className="text-slate-400 hover:text-amber-400 underline cursor-pointer"
                    >
                      恢复基准演示数据
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: 预置课件与时间轴调校 */}
              {activeTab === 'calibration' && (
                <div className="space-y-5">
                  {/* 官方直播源与中文同传合集直达 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>官方直播原片与同传合集快速直达（对比校准专用）</span>
                      </span>
                      <span className="text-[10px] text-slate-500">点击在新标签页打开</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <a
                        href={OFFICIAL_THAI_STREAMS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 font-bold">▶</span>
                          <span className="text-slate-200 group-hover:text-amber-300 font-medium">🇹🇭 尊者泰文官方直播合集 (@luangpupramote)</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                      </a>
                      <a
                        href={OFFICIAL_CHINESE_SEARCH_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-red-500 font-bold">🇨🇳</span>
                          <span className="text-slate-200 group-hover:text-amber-300 font-medium">解脱园中文同传最新视频检索</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                      </a>
                    </div>
                  </div>

                  {/* 课件选择栏 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                      选择待调校预置课件：
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {curatedLessons.map((lesson) => {
                        const isCurr = lesson.id === selectedLesson.id;
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => handleSelectLessonForCalibration(lesson.id)}
                            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                              isCurr
                                ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-mono text-slate-400">{lesson.date}</span>
                              <span className="font-bold text-amber-400 font-mono">{lesson.totalSentences} 句全篇对齐</span>
                            </div>
                            <div className="text-xs font-bold text-white line-clamp-1">{lesson.chineseTitle}</div>
                            <div className="text-[11px] text-amber-300/80 font-serif line-clamp-1 mt-0.5">{lesson.title}</div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                              <span>基准偏置: {lesson.defaultOffsetSeconds > 0 ? `+${lesson.defaultOffsetSeconds}s` : `${lesson.defaultOffsetSeconds}s`}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isCurr ? 'bg-amber-500/25 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                                {isCurr ? '当前选中' : '选择调校'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        课件校准中枢 · {selectedLesson.totalSentences} 句精准对齐
                      </h5>
                      <span className="text-[11px] font-mono text-slate-400">ID: {selectedLesson.id}</span>
                    </div>
                    <p className="text-sm text-slate-100 font-bold mb-1">
                      {selectedLesson.chineseTitle}
                    </p>
                    <p className="text-xs text-slate-400 font-serif mb-4 line-clamp-1">
                      {selectedLesson.title}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block mb-1">🇹🇭 泰文原版视频 ID：</span>
                        <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                          <span>{selectedLesson.thaiVideoId}</span>
                          <a
                            href={selectedLesson.thaiVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            <span>测试打开</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block mb-1">🇨🇳 中文同传视频 ID：</span>
                        <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                          <span>{selectedLesson.chineseVideoId}</span>
                          <a
                            href={selectedLesson.chineseVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            <span>测试打开</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* 时间差毫秒微调中枢 */}
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-300">
                          双视频基准对齐时间差 (Offset)
                        </span>
                        <span className="text-sm font-mono font-black text-amber-400">
                          {calibratedOffset > 0 ? `+${calibratedOffset.toFixed(1)}s` : `${calibratedOffset.toFixed(1)}s`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        正值表示中文同传视频滞后启动，负值表示中文同传视频提前启动。修改后将自动作为该课件的永久对齐基准。
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {[-1.0, -0.5, -0.1, 0.0, 0.1, 0.5, 1.0].map((step) => (
                          <button
                            key={step}
                            onClick={() => {
                              if (step === 0.0) setCalibratedOffset(0.0);
                              else setCalibratedOffset(prev => Number((prev + step).toFixed(1)));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 transition cursor-pointer"
                          >
                            {step === 0.0 ? '复位 0.0s' : step > 0 ? `+${step}s` : `${step}s`}
                          </button>
                        ))}

                        <button
                          onClick={handleSaveCalibration}
                          className="ml-auto px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>保存基准校准</span>
                        </button>
                      </div>

                      {saveCalibrationToast && (
                        <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>时间差基准校准已持久化保存！前台放映机已实时同步。</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 管理密码与审计日志 */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  {/* 修改密码卡片 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 max-w-lg">
                    <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>更新管理员密码</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mb-3">
                      支持自定义 6 位以上密码，密码使用 SHA-256 哈希加密后安全保存。
                    </p>

                    <form onSubmit={handleUpdatePassphrase} className="space-y-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">当前密码 (默认: suan2026)</label>
                        <input
                          type="password"
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          placeholder="输入当前密码..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">新管理员密码</label>
                        <input
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="输入新密码 (至少6位)..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">再次确认新密码</label>
                        <input
                          type="password"
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          placeholder="再次输入新密码..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      {passChangeNotice && (
                        <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                          passChangeNotice.type === 'success' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {passChangeNotice.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>{passChangeNotice.msg}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                        >
                          保存新密码
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('确认将管理员密码重置为出厂默认 (suan2026)？')) {
                              adminAuthService.resetToDefaultPassphrase();
                              alert('密码已恢复为出厂默认: suan2026');
                            }
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                        >
                          恢复默认密码
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 审计日志 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-cyan-400" />
                      <span>管理员操作安全审计流水 (Audit Trail)</span>
                    </h5>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                            <span className="text-slate-300">{log.details}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono shrink-0">
                            <span>{log.device}</span>
                            <span>{log.timeStr}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
