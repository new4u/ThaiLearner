import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Navbar } from './src/components/Navbar';
import { DualVideoSyncAlignPlayer } from './src/components/DualVideoSyncAlignPlayer';
import { ThaiKeyboardPractice } from './src/components/ThaiKeyboardPractice';
import { WordDetailModal } from './src/components/WordDetailModal';
import { INITIAL_SUBTITLES } from './src/data/luangporCourseData';
import { SubtitleLine, WordToken, WordStatus, ActiveTab } from './src/types';

const App: React.FC = () => {
  // 默认直接进入泰中双视频共学放映机
  const [activeTab, setActiveTab] = useState<ActiveTab>('dual_sync_player');
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>(() => {
    try {
      const saved = localStorage.getItem('luangpor_course_subtitles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 700 && parsed[0]?.words?.length > 0) {
          return parsed;
        }
      }
      return INITIAL_SUBTITLES;
    } catch {
      return INITIAL_SUBTITLES;
    }
  });

  const [selectedWord, setSelectedWord] = useState<WordToken | null>(null);
  const [keyboardTargetWord, setKeyboardTargetWord] = useState<string>('สัมมาสมาธิ');
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  // 加载浏览器泰语语音
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setBrowserVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // 离线真人朗读
  const handleSpeak = useCallback((text: string, rate: number = 1.0) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const thaiVoice = browserVoices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    utterance.lang = 'th-TH';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }, [browserVoices]);

  // 更新生词掌握状态
  const handleUpdateWordStatus = (wordId: string, status: WordStatus) => {
    setSubtitles(prev => {
      const updated = prev.map(line => ({
        ...line,
        words: line.words.map(w => w.id === wordId ? { ...w, status } : w)
      }));
      try {
        localStorage.setItem('luangpor_course_subtitles', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    if (selectedWord && selectedWord.id === wordId) {
      setSelectedWord(prev => prev ? { ...prev, status } : null);
    }
  };

  // 句子/单词一键联动跳转到键盘打卡
  const handlePracticeInKeyboard = (thaiText: string) => {
    setKeyboardTargetWord(thaiText);
    setActiveTab('keyboard_lab');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 顶部极简导航：仅保留共学与打字 */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 主界面视窗 */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 lg:p-6">
        
        {/* 1. 核心共学：泰中双视频同步对齐放映机 */}
        {activeTab === 'dual_sync_player' && (
          <DualVideoSyncAlignPlayer
            subtitles={subtitles}
            onSelectWord={setSelectedWord}
            onOpenKeyboard={handlePracticeInKeyboard}
            onSpeak={handleSpeak}
            onUpdateSubtitles={(newSubs) => setSubtitles(newSubs)}
          />
        )}

        {/* 2. 泰语打字练习：Kedmanee 键盘打卡实战 */}
        {activeTab === 'keyboard_lab' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                <span>⌨️ 泰语键盘实战打卡</span>
                <span className="text-stone-400 font-normal">| 当前练习目标:</span>
                <span className="text-amber-400 font-bold">{keyboardTargetWord}</span>
              </span>
              <button
                onClick={() => setActiveTab('dual_sync_player')}
                className="text-xs text-stone-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                ← 返回双视频共学
              </button>
            </div>

            <ThaiKeyboardPractice
              initialTargetWord={keyboardTargetWord}
              onSpeak={handleSpeak}
            />
          </div>
        )}

      </main>

      {/* 生词解析弹窗 */}
      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onUpdateStatus={handleUpdateWordStatus}
          onPracticeInKeyboard={handlePracticeInKeyboard}
          onSpeak={handleSpeak}
        />
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
