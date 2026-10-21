import React from 'react';
import { ActiveTab } from '../types';
import { Video, Keyboard } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 h-14 sm:h-16 flex items-center shadow-lg shadow-black/50 select-none">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 min-w-0">
        
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-base">
            📿
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              泰语共学工作台
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hidden sm:inline-flex items-center">
              双视频同步 & 键盘打卡
            </span>
          </div>
        </div>

        {/* 仅保留：共学与打字两个核心入口 */}
        <nav className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80 shrink-0">
          {/* 1. 双视频共学 */}
          <button
            onClick={() => onTabChange('dual_sync_player')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dual_sync_player'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-200/90 hover:text-white hover:bg-slate-800/80'
            }`}
            title="泰中双视频同步共学放映机"
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>双视频共学</span>
          </button>

          {/* 2. 泰语打字练习 */}
          <button
            onClick={() => onTabChange('keyboard_lab')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'keyboard_lab'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'text-amber-200/90 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Kedmanee 泰语键盘实战打卡与练习"
          >
            <Keyboard className="w-4 h-4 shrink-0" />
            <span>泰语打字练习</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
