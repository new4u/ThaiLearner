import React, { useState } from 'react';
import { StudentProfile } from '../types';
import { PRESET_STUDENT_PROFILES } from '../data/luangporCourseData';
import { 
  User, CheckCircle, ShieldCheck, Sparkles, X, 
  LogIn, Award, Heart, ArrowRight 
} from 'lucide-react';

interface LoginModalProps {
  currentStudent: StudentProfile | null;
  onLogin: (profile: StudentProfile) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentStudent,
  onLogin,
  onLogout,
  onClose
}) => {
  const [customName, setCustomName] = useState('');
  const [phoneOrWechat, setPhoneOrWechat] = useState('');
  const [role, setRole] = useState<'student' | 'ta' | 'guest'>('student');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newProfile: StudentProfile = {
      id: `stu_${Date.now()}`,
      name: customName.trim(),
      phoneOrWechat: phoneOrWechat.trim() || undefined,
      role: role,
      attendedClasses: 1,
      streakDays: 1,
      isFullAttendanceThisQuarter: false,
      joinDate: new Date().toISOString().slice(0, 10)
    };

    onLogin(newProfile);
    onClose();
  };

  const handleSelectPreset = (preset: StudentProfile) => {
    onLogin(preset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            学员登录中心
          </span>
          <span className="text-xs text-slate-400">
            隆波法音共学工作台
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          学员登录与共学打卡身份绑定
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          登录后可记录个人学词生词本、追踪季度全勤顺延资格，并获得 Zoom 课堂与练习室专属参会席位。
        </p>

        {/* Current logged-in status view */}
        {currentStudent ? (
          <div className="my-6 p-5 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                  {currentStudent.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{currentStudent.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentStudent.role === 'ta' ? '带读助教' : '精进学员'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {currentStudent.phoneOrWechat ? `微信/账号: ${currentStudent.phoneOrWechat}` : '随喜随学账号'}
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs font-semibold transition"
              >
                退出登录
              </button>
            </div>

            {/* Attendance & Rollover Badge */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">累计共学课次</span>
                <span className="text-lg font-black font-mono text-amber-400">{currentStudent.attendedClasses} 次</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">季度全勤顺延奖励</span>
                <span className={`text-xs font-bold block mt-1 ${
                  currentStudent.isFullAttendanceThisQuarter ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {currentStudent.isFullAttendanceThisQuarter ? '✨ 已达成！下月免收' : '进行中 (打卡即记录)'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Preset One-Click Logins */
          <div className="my-6 space-y-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block mb-2">
                一键快速体验账号（点击即登录）：
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PRESET_STUDENT_PROFILES.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="p-3 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 text-left transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-200 group-hover:text-amber-300">
                        {preset.name}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition" />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {preset.role === 'ta' ? '带读助教' : '共学学员'} · {preset.attendedClasses}次全勤
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Login Form */}
            <form onSubmit={handleCustomLogin} className="pt-3 border-t border-slate-800/80 space-y-3">
              <span className="text-xs text-slate-400 font-semibold block">
                或输入您的个人法名/称谓登录：
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">学员法名 / 称呼 *</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="如：觉明师兄 / 圆音"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">手机号或微信（用于全勤记录）</label>
                  <input
                    type="text"
                    value={phoneOrWechat}
                    onChange={e => setPhoneOrWechat(e.target.value)}
                    placeholder="微信/手机号 (选填)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">身份：</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'student'}
                      onChange={() => setRole('student')}
                      className="accent-amber-500"
                    />
                    <span>共学学员</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="role"
                      checked={role === 'ta'}
                      onChange={() => setRole('ta')}
                      className="accent-amber-500"
                    />
                    <span>带读者</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!customName.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>登录工作台</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100元/月 季度全勤滚动认证体系
          </span>
          <span>把隆波的殊胜法语映入日常生活</span>
        </div>
      </div>
    </div>
  );
};
