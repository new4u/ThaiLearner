import React from 'react';
import { ActiveTab, RegisteredStudent } from '../types';
import { Video, Keyboard, CheckCircle2, UserCheck, Flame, UserPlus } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentStudent?: RegisteredStudent | null;
  onOpenAdmin?: () => void;
  isAdminAuthenticated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentStudent,
  onOpenAdmin,
  isAdminAuthenticated = false
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-2.5 sm:px-6 h-14 sm:h-16 flex items-center shadow-lg shadow-black/50 select-none max-w-full overflow-hidden">
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
            <span className="hidden sm:inline">双视频共学</span>
            <span className="sm:hidden">共学</span>
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

        {/* 右侧：学员身份徽章 / 桌面端快捷打卡入口 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentStudent ? (
            <button
              onClick={() => onTabChange('registration_checkin')}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition cursor-pointer"
              title="查看个人打卡档案与学修记录"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] sm:text-xs flex items-center justify-center shrink-0">
                {currentStudent.name.slice(0, 1)}
              </div>
              <span className="text-xs font-bold text-white max-w-[70px] sm:max-w-[110px] truncate hidden md:inline">
                {currentStudent.name}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 font-mono flex items-center gap-0.5">
                <Flame className="w-3 h-3 fill-amber-400" />
                <span>{currentStudent.streakDays}天</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => onTabChange('registration_checkin')}
              className="hidden sm:flex px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>每日打卡</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
