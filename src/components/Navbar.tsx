import React from 'react';
import { ActiveTab, RegisteredStudent } from '../types';
import { Video, Keyboard, CheckCircle2, UserCheck, Flame, UserPlus, Settings, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentStudent?: RegisteredStudent | null;
  onOpenAdmin?: () => void;
  onOpenIdentityModal?: (mode?: 'set_statement' | 'claim_statement') => void;
  isAdminAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentStudent,
  onOpenAdmin,
  onOpenIdentityModal,
  isAdminAuthenticated = false
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-2.5 sm:px-6 h-14 sm:h-16 flex items-center shadow-lg shadow-black/50 select-none max-w-full">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        
        {/* Brand */}
        <div 
          onClick={() => onTabChange('dual_sync_player')}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer group"
        >
          <img
            src="/favicon.svg"
            alt="泰学"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shadow-md shadow-amber-500/20 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
            泰学
          </span>
        </div>

        {/* 核心三入口导航：双视频共学、泰语打字练习、免费注册与打卡 */}
        <nav className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-900/90 rounded-xl border border-slate-800/80 shrink-0">
          {/* 1. 双视频共学 */}
          <button
            onClick={() => onTabChange('dual_sync_player')}
            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'dual_sync_player'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-200/90 hover:text-white hover:bg-slate-800/80'
            }`}
            title="泰中双视频同步共学放映机"
          >
            <Video className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">双视频研读</span>
            <span className="sm:hidden">研读</span>
          </button>

          {/* 1.5 极简沉浸版 */}
          <button
            onClick={() => onTabChange('minimal_player')}
            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'minimal_player'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-200/90 hover:text-white hover:bg-slate-800/80'
            }`}
            title="单泰文视频·嵌入式音标与连续进度条极简沉浸版"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">极简沉浸</span>
            <span className="sm:hidden">沉浸</span>
          </button>

          {/* 2. 泰语打字练习 */}
          <button
            onClick={() => onTabChange('keyboard_lab')}
            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'keyboard_lab'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-200/90 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Kedmanee 泰语键盘实战打卡与练习"
          >
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">泰语打字</span>
            <span className="sm:hidden">打字</span>
          </button>

          {/* 3. 每日打卡 */}
          <button
            onClick={() => onTabChange('registration_checkin')}
            className={`px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeTab === 'registration_checkin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-emerald-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title="每日学习打卡与记录"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="hidden sm:inline">每日打卡</span>
            <span className="sm:hidden">打卡</span>
          </button>
        </nav>

        {/* 右侧：学员身份徽章 / 语句认领 / 共学管理 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentStudent ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenIdentityModal ? onOpenIdentityModal('set_statement') : onTabChange('registration_checkin')}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 transition cursor-pointer group"
                title={currentStudent.learningGoal ? `我的发心: “${currentStudent.learningGoal}” (点击修改)` : '点击写一段话作为您的真实发心'}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                  {currentStudent.name.slice(0, 1)}
                </div>
                <div className="text-left hidden md:flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white max-w-[100px] truncate leading-tight">
                    {currentStudent.name}
                  </span>
                  <span className="text-[10px] text-amber-400/90 truncate max-w-[110px] leading-tight">
                    {currentStudent.learningGoal ? '已写发心' : '写我的发心'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 font-mono flex items-center gap-0.5">
                  <Flame className="w-3 h-3 fill-amber-400" />
                  <span>{currentStudent.streakDays}天</span>
                </span>
              </button>

              <button
                onClick={() => onOpenIdentityModal ? onOpenIdentityModal('claim_statement') : onTabChange('registration_checkin')}
                className="hidden lg:flex px-2 py-1 rounded-xl text-[11px] font-medium text-stone-400 hover:text-amber-300 hover:bg-slate-900 transition border border-transparent hover:border-slate-800"
                title="若更换设备，可通过选出发心找回您的学修记录"
              >
                找回账号
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenIdentityModal ? onOpenIdentityModal('claim_statement') : onTabChange('registration_checkin')}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>辨识认领</span>
            </button>
          )}

          {/* 共学管理入口 (法工校对工作流、课件制作、开示与学员记录) */}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-stone-300 hover:text-white border border-slate-700/80 shadow-xs"
              title="共学管理 (法工校对工作流、课件、开示与学员管理)"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">共学管理</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
