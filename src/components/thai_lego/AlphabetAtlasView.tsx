import React, { useState } from 'react';
import { THAI_CONSONANTS, THAI_VOWELS, ConsonantData } from '../../utils/thaiPhoneticData';
import { Volume2, BookOpen, Search, Sparkles } from 'lucide-react';

interface AlphabetAtlasViewProps {
  onSpeak: (text: string) => void;
  onLoadConsonantToLego?: (c: ConsonantData) => void;
}

export const AlphabetAtlasView: React.FC<AlphabetAtlasViewProps> = ({
  onSpeak,
  onLoadConsonantToLego
}) => {
  const [activeTab, setActiveTab] = useState<'consonants' | 'vowels'>('consonants');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<'all' | 'mid' | 'high' | 'low'>('all');

  const filteredConsonants = THAI_CONSONANTS.filter(c => {
    if (classFilter !== 'all' && c.class !== classFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.symbol.includes(q) ||
        c.nameThai.toLowerCase().includes(q) ||
        c.nameMeaning.toLowerCase().includes(q) ||
        c.romanization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl flex flex-col gap-5">
      
      {/* 头部导航与过滤 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            泰语 44 辅音与 32 元音声学图谱
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            打破死记硬背：每张字母卡牌均配备标准发音、助记吉祥物、发音器官部位与音标。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 主Tab */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('consonants')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'consonants' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              44 辅音
            </button>
            <button
              onClick={() => setActiveTab('vowels')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'vowels' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              32 元音
            </button>
          </div>

          {/* 搜索 */}
          <div className="relative w-36 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索字母..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 辅音视图 */}
      {activeTab === 'consonants' && (
        <div className="flex flex-col gap-4">
          {/* 辅音子过滤器 */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setClassFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                classFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              全部 (44)
            </button>
            <button
              onClick={() => setClassFilter('mid')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                classFilter === 'mid' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
              }`}
            >
              🟢 中辅音 (9)
            </button>
            <button
              onClick={() => setClassFilter('high')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                classFilter === 'high' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
              }`}
            >
              🔵 高辅音 (11)
            </button>
            <button
              onClick={() => setClassFilter('low')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                classFilter === 'low' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
              }`}
            >
              🟠 低辅音 (24)
            </button>
          </div>

          {/* 辅音卡牌网格 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredConsonants.map((c) => {
              return (
                <div
                  key={`atlas-c-${c.symbol}`}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-col justify-between gap-2 transition group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      c.class === 'mid'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : c.class === 'high'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {c.class === 'mid' ? '中辅音' : c.class === 'high' ? '高辅音' : '低辅音'}
                    </span>
                    <span className="text-base">{c.emoji}</span>
                  </div>

                  <div className="flex items-center justify-center my-1">
                    <span className="text-4xl font-bold text-white group-hover:scale-110 transition drop-shadow">
                      {c.symbol}
                    </span>
                  </div>

                  <div className="text-center">
                    <div className="text-xs font-bold text-amber-300 truncate">
                      {c.nameThai}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {c.nameMeaning}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      /{c.romanization}/
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => onSpeak(c.nameThai)}
                      className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="朗读字母全名发音"
                    >
                      <Volume2 className="w-3 h-3 text-amber-400" />
                      <span>发音</span>
                    </button>
                    {onLoadConsonantToLego && (
                      <button
                        onClick={() => onLoadConsonantToLego(c)}
                        className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition cursor-pointer"
                        title="载入拼音台拼装"
                      >
                        <Sparkles className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 元音视图 */}
      {activeTab === 'vowels' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {THAI_VOWELS.map((v) => {
            return (
              <div
                key={`atlas-v-${v.id}`}
                className="bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-3 flex flex-col justify-between gap-2 transition group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                    {v.length === 'long' ? '长元音' : '短元音'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {v.position}
                  </span>
                </div>

                <div className="flex items-center justify-center my-1">
                  <span className="text-3xl font-bold text-purple-200 group-hover:scale-110 transition drop-shadow">
                    {v.symbol}
                  </span>
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold text-white truncate">
                    {v.nameThai}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    /{v.romanization}/
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    例: {v.example}
                  </div>
                </div>

                <button
                  onClick={() => onSpeak(v.example.split(' ')[0])}
                  className="w-full py-1 rounded-lg bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                  title="朗读范例字发音"
                >
                  <Volume2 className="w-3 h-3 text-purple-300" />
                  <span>例词发音</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
