import React, { useState } from 'react';
import { 
  THAI_CONSONANTS, 
  THAI_VOWELS, 
  THAI_FINAL_CONSONANTS, 
  THAI_TONE_MARKS, 
  ConsonantData, 
  VowelData, 
  FinalConsonantData, 
  ToneMarkData,
  ConsonantClass
} from '../../utils/thaiPhoneticData';
import { Volume2, Filter, Search, Crown } from 'lucide-react';

interface BlockDrawerProps {
  activeTab: 'consonant' | 'vowel' | 'final' | 'tone';
  onTabChange: (tab: 'consonant' | 'vowel' | 'final' | 'tone') => void;
  selectedConsonant: ConsonantData;
  selectedLeading?: ConsonantData | null;
  selectedVowel: VowelData;
  selectedFinal: FinalConsonantData;
  selectedToneMark: ToneMarkData;
  onSelectConsonant: (c: ConsonantData) => void;
  onSelectLeading: (c: ConsonantData | null) => void;
  onSelectVowel: (v: VowelData) => void;
  onSelectFinal: (f: FinalConsonantData) => void;
  onSelectToneMark: (t: ToneMarkData) => void;
  onPreviewSpeak: (text: string) => void;
}

export const BlockDrawer: React.FC<BlockDrawerProps> = ({
  activeTab,
  onTabChange,
  selectedConsonant,
  selectedLeading,
  selectedVowel,
  selectedFinal,
  selectedToneMark,
  onSelectConsonant,
  onSelectLeading,
  onSelectVowel,
  onSelectFinal,
  onSelectToneMark,
  onPreviewSpeak
}) => {
  // 辅音过滤器
  const [consonantFilter, setConsonantFilter] = useState<'all' | ConsonantClass | 'leading'>('all');
  // 辅音搜索
  const [searchQuery, setSearchQuery] = useState('');
  // 元音过滤器
  const [vowelFilter, setVowelFilter] = useState<'all' | 'simple_short' | 'simple_long' | 'diphthong' | 'special'>('all');

  const filteredConsonants = THAI_CONSONANTS.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = c.symbol.includes(q);
      const matchName = c.nameThai.toLowerCase().includes(q);
      const matchMeaning = c.nameMeaning.toLowerCase().includes(q);
      const matchRoman = c.romanization.toLowerCase().includes(q);
      if (!matchSymbol && !matchName && !matchMeaning && !matchRoman) return false;
    }

    if (consonantFilter === 'leading') {
      return c.symbol === 'ห' || c.symbol === 'อ';
    }
    if (consonantFilter !== 'all') {
      return c.class === consonantFilter;
    }
    return true;
  });

  const filteredVowels = THAI_VOWELS.filter(v => {
    if (vowelFilter === 'all') return true;
    return v.category === vowelFilter;
  });

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 flex flex-col shadow-xl">
      
      {/* 抽屉导航标签栏 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-2">
          
          <button
            onClick={() => onTabChange('consonant')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'consonant'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>首辅音库 (44)</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">中/高/低</span>
          </button>

          <button
            onClick={() => onTabChange('vowel')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'vowel'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>元音韵母库 (32)</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">长短形变</span>
          </button>

          <button
            onClick={() => onTabChange('final')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'final'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>尾辅音分类 (8แม่)</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">活/死音</span>
          </button>

          <button
            onClick={() => onTabChange('tone')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tone'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>声调符号 (4符)</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">一二三四符</span>
          </button>

        </div>
      </div>

      {/* =================== TAB 1: 辅音库 =================== */}
      {activeTab === 'consonant' && (
        <div className="flex flex-col gap-3">
          {/* 子过滤条与搜索 */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setConsonantFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  consonantFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部 (44)
              </button>
              <button
                onClick={() => setConsonantFilter('mid')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  consonantFilter === 'mid' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <span>🟢 中辅音 (9)</span>
              </button>
              <button
                onClick={() => setConsonantFilter('high')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  consonantFilter === 'high' ? 'bg-sky-600 text-white' : 'text-sky-400 hover:bg-slate-800'
                }`}
              >
                <span>🔵 高辅音 (11)</span>
              </button>
              <button
                onClick={() => setConsonantFilter('low')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  consonantFilter === 'low' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                <span>🟠 低辅音 (24)</span>
              </button>
              <button
                onClick={() => setConsonantFilter('leading')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  consonantFilter === 'leading' ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:bg-slate-800'
                }`}
                title="设置 ห นํา 或 อ นํา 前引变调"
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span>👑 前引字</span>
              </button>
            </div>

            {/* 搜索框 */}
            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索字母/助记/音标..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 前引字快捷开关条 */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
            <span className="font-bold text-indigo-300 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              前引字协同变调槽：
            </span>
            <button
              onClick={() => onSelectLeading(null)}
              className={`px-2 py-0.5 rounded-lg border text-xs font-medium cursor-pointer ${
                !selectedLeading
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
            >
              无前引
            </button>
            <button
              onClick={() => onSelectLeading(THAI_CONSONANTS.find(c => c.symbol === 'ห') || null)}
              className={`px-2 py-0.5 rounded-lg border text-xs font-bold cursor-pointer ${
                selectedLeading?.symbol === 'ห'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800/80 text-amber-300 border-slate-700'
              }`}
              title="ห 前引单低辅音，将声调完全拉升为高辅音规则"
            >
              ห นํา (领高辅调)
            </button>
            <button
              onClick={() => onSelectLeading(THAI_CONSONANTS.find(c => c.symbol === 'อ') || null)}
              className={`px-2 py-0.5 rounded-lg border text-xs font-bold cursor-pointer ${
                selectedLeading?.symbol === 'อ'
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800/80 text-sky-300 border-slate-700'
              }`}
              title="อ นํา (如 不要/在于/样式/想要 四大特殊词)"
            >
              อ นํา (领中辅调)
            </button>
          </div>

          {/* 辅音卡片网格 */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {filteredConsonants.map((c) => {
              const isSelected = selectedConsonant.symbol === c.symbol;
              return (
                <div
                  key={`consonant-${c.symbol}`}
                  onClick={() => {
                    onSelectConsonant(c);
                    onPreviewSpeak(c.symbol);
                  }}
                  className={`p-2 rounded-xl border transition flex flex-col items-center justify-between gap-1 cursor-pointer select-none group relative ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* 角标分类 */}
                  <div className="w-full flex items-center justify-between text-[10px]">
                    <span className={`font-bold px-1 rounded ${
                      c.class === 'mid'
                        ? 'text-emerald-400 bg-emerald-950/60'
                        : c.class === 'high'
                        ? 'text-sky-400 bg-sky-950/60'
                        : 'text-amber-400 bg-amber-950/60'
                    }`}>
                      {c.class === 'mid' ? '中' : c.class === 'high' ? '高' : '低'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewSpeak(c.nameThai);
                      }}
                      className="text-slate-500 hover:text-amber-400 p-0.5"
                      title="试听字母泰语全名发音"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 大字母 */}
                  <span className="text-2xl sm:text-3xl font-bold text-white group-hover:scale-110 transition my-0.5">
                    {c.symbol}
                  </span>

                  {/* 助记名称 */}
                  <span className="text-[11px] font-medium text-slate-300 truncate w-full text-center">
                    {c.nameThai}
                  </span>

                  {/* 汉语含义 */}
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {c.nameMeaning.split('(')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================== TAB 2: 元音库 =================== */}
      {activeTab === 'vowel' && (
        <div className="flex flex-col gap-3">
          {/* 元音子分类 */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setVowelFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                vowelFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              全部元音 (32)
            </button>
            <button
              onClick={() => setVowelFilter('simple_short')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                vowelFilter === 'simple_short' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              单元音 · 短音 (急促死音)
            </button>
            <button
              onClick={() => setVowelFilter('simple_long')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                vowelFilter === 'simple_long' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              单元音 · 长音 (延展活音)
            </button>
            <button
              onClick={() => setVowelFilter('diphthong')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                vowelFilter === 'diphthong' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              复合双元音 (ia / uea / ua)
            </button>
            <button
              onClick={() => setVowelFilter('special')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                vowelFilter === 'special' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-slate-800'
              }`}
            >
              特殊元音 (am / ai / ao)
            </button>
          </div>

          {/* 元音卡片网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {filteredVowels.map((v) => {
              const isSelected = selectedVowel.id === v.id;
              return (
                <div
                  key={`vowel-${v.id}`}
                  onClick={() => {
                    onSelectVowel(v);
                    onPreviewSpeak(v.example.split(' ')[0]);
                  }}
                  className={`p-2.5 rounded-xl border transition flex flex-col items-center justify-between gap-1 cursor-pointer select-none group relative ${
                    isSelected
                      ? 'bg-purple-600/25 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                      : 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[10px]">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300">
                      {v.length === 'long' ? '长' : '短'}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {v.position === 'front' ? '前置' : v.position === 'above' ? '上置' : v.position === 'below' ? '下置' : v.position === 'surrounding' ? '包围' : '后置'}
                    </span>
                  </div>

                  <span className="text-2xl font-bold text-purple-200 group-hover:scale-110 transition my-0.5">
                    {v.symbol}
                  </span>

                  <span className="text-xs font-bold text-white truncate w-full text-center">
                    {v.nameThai.split('(')[0]}
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    /{v.romanization.split(' ')[0]}/
                  </span>

                  {v.transformWithFinal && (
                    <span className="text-[9px] text-amber-300/90 truncate w-full text-center">
                      ⚡可触发形变
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================== TAB 3: 尾辅音库 =================== */}
      {activeTab === 'final' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/20 text-xs text-teal-200 leading-relaxed">
            <span className="font-bold">泰语尾音八大马特拉 (มาตราตัวสะกด 8 แม่)：</span>
            清亮鼻音与半元音（ง, น, ม, ย, ว）归入【活音】，气流可自然延长；塞音（ก, ด, บ）归入【死音】，气流在软腭、齿龈或双唇瞬间截断。
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {THAI_FINAL_CONSONANTS.map((f) => {
              const isSelected = selectedFinal.id === f.id;
              return (
                <div
                  key={`final-${f.id}`}
                  onClick={() => onSelectFinal(f)}
                  className={`p-3 rounded-xl border transition flex flex-col gap-1.5 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-teal-600/25 border-teal-500 shadow-md ring-1 ring-teal-500/50'
                      : 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {f.groupName}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      f.id === 'final_none'
                        ? 'bg-slate-700 text-slate-300'
                        : f.life === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {f.id === 'final_none' ? '开音节 (看元音)' : f.life === 'live' ? '🟢 活音' : '🔴 死音'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    代表音：<span className="font-bold text-amber-300 font-mono text-sm">{f.symbol}</span> ({f.endingSound})
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================== TAB 4: 声调符号库 =================== */}
      {activeTab === 'tone' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200 leading-relaxed">
            <span className="font-bold">泰语 4 大标调符规则：</span>
            中辅音可自由标全部4个调符；高辅音通常标 ่ 与 ้；低辅音遇 ่ 读第3调 (托)，遇 ้ 读第4调 (特利)。
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {THAI_TONE_MARKS.map((t) => {
              const isSelected = selectedToneMark.id === t.id;
              return (
                <div
                  key={`tone-mark-${t.id}`}
                  onClick={() => onSelectToneMark(t)}
                  className={`p-3 rounded-xl border transition flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none text-center ${
                    isSelected
                      ? 'bg-rose-600/25 border-rose-500 shadow-md ring-1 ring-rose-500/50'
                      : 'bg-slate-800/40 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-3xl font-bold text-amber-300 my-1">
                    {t.symbol ? `◌${t.symbol}` : '–'}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {t.nameZh}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {t.nameThai}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
