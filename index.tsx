import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Navbar } from './src/components/Navbar';
import { DualVideoSyncAlignPlayer } from './src/components/DualVideoSyncAlignPlayer';
import { ThaiKeyboardPractice } from './src/components/ThaiKeyboardPractice';
import { WordDetailModal } from './src/components/WordDetailModal';
import { RegistrationCheckinView } from './src/components/RegistrationCheckinView';
import { AdminSanctuaryModal } from './src/components/AdminSanctuaryModal';
import { AppFooter } from './src/components/AppFooter';
import { INITIAL_SUBTITLES } from './src/data/luangporCourseData';
import { SubtitleLine, WordToken, WordStatus, ActiveTab, RegisteredStudent } from './src/types';
import { thaiAudio } from './src/utils/thaiAudioSynthesizer';
import { studentStudyService } from './src/services/studentStudyService';
import { adminAuthService } from './src/services/adminAuthService';

const App: React.FC = () => {
  // 默认直接进入泰中双视频共学放映机
  const [activeTab, setActiveTab] = useState<ActiveTab>('dual_sync_player');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return adminAuthService.getSession().isAuthenticated;
  });

  const [currentStudent, setCurrentStudent] = useState<RegisteredStudent | null>(() => {
    return studentStudyService.getCurrentStudent();
  });

  // 监听管理员认证状态变动
  useEffect(() => {
    const unsub = adminAuthService.subscribe((s) => {
      setIsAdminAuthenticated(s.isAuthenticated);
    });
    return unsub;
  }, []);

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

  // 高保真泰语真人朗读驱动 (自带 Chromium 取消防抖、垃圾回收防护与多重回退)
  const handleSpeak = useCallback((text: string, rate: number = 0.95) => {
    thaiAudio.speakWord(text, rate);
  }, []);

  // 更新生词掌握状态并自动记录学修事件
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

    // 若标记为掌握且已登录学员，自动记录至学员成长档案
    if (status === 'mastered' && currentStudent) {
      const matched = subtitles.flatMap(l => l.words).find(w => w.id === wordId);
      if (matched) {
        studentStudyService.recordStudyEvent(
          currentStudent.id,
          'word_mastery',
          `掌握生词【${matched.thai} (${matched.chinese})】`,
          `音标: /${matched.romanization}/`
        );
        const refreshed = studentStudyService.getCurrentStudent();
        if (refreshed) setCurrentStudent(refreshed);
      }
    }
  };

  // 键盘打卡完成时自动沉淀学习记录
  const handlePracticeCompleted = (word: string) => {
    if (currentStudent) {
      studentStudyService.recordStudyEvent(
        currentStudent.id,
        'keyboard_finish',
        `完成泰文词【${word}】打卡`,
        `在泰语 Kedmanee 键盘实验室准确完成【${word}】敲击盲打并收听纯正原声`
      );
      const refreshed = studentStudyService.getCurrentStudent();
      if (refreshed) setCurrentStudent(refreshed);
    }
  };

  // 句子/单词一键联动跳转到键盘打卡
  const handlePracticeInKeyboard = (thaiText: string) => {
    setKeyboardTargetWord(thaiText);
    setActiveTab('keyboard_lab');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 顶部极简导航：共学、打字、注册打卡 + 独立暗号后台 */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentStudent={currentStudent}
        onOpenAdmin={() => setShowAdminModal(true)}
        isAdminAuthenticated={isAdminAuthenticated}
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
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex-wrap gap-2">
              <span className="text-xs text-amber-200 font-bold flex items-center gap-1.5">
                <span>⌨️ 泰语键盘实战打卡</span>
                <span className="text-stone-400 font-normal">| 当前练习目标:</span>
                <span className="text-amber-400 font-bold">{keyboardTargetWord}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('registration_checkin')}
                  className="text-xs text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/40 transition cursor-pointer"
                >
                  查看打卡记录
                </button>
                <button
                  onClick={() => setActiveTab('dual_sync_player')}
                  className="text-xs text-stone-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  ← 返回双视频共学
                </button>
              </div>
            </div>

            <ThaiKeyboardPractice
              initialTargetWord={keyboardTargetWord}
              onSpeak={handleSpeak}
              onBackToStudy={() => setActiveTab('dual_sync_player')}
              onPracticeCompleted={handlePracticeCompleted}
            />
          </div>
        )}

        {/* 3. 学员免费注册、个人学修打卡与禅修共学动态 */}
        {activeTab === 'registration_checkin' && (
          <RegistrationCheckinView
            currentStudent={currentStudent}
            onStudentChange={setCurrentStudent}
            onNavigateToKeyboard={handlePracticeInKeyboard}
            onNavigateToPlayer={() => setActiveTab('dual_sync_player')}
            onOpenAdmin={() => setShowAdminModal(true)}
          />
        )}

      </main>

      {/* 站点通用页脚：小助手二维码常驻展示 (任何页面底部可见) */}
      <AppFooter />

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

      {/* 独立机密管理后台与暗号解锁金库 (Admin Sanctuary) */}
      <AdminSanctuaryModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onLessonCalibrated={(lessonId, offset) => {
          console.log(`Lesson ${lessonId} calibrated to ${offset}s`);
        }}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  // 缓存 root 实例，防止热重载或重新挂载时重复调用 createRoot 报警
  const root = (window as any).__react_root__ || ReactDOM.createRoot(container);
  (window as any).__react_root__ = root;
  root.render(<App />);
}
