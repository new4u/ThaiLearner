import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Navbar } from './src/components/Navbar';
import { DualVideoSyncAlignPlayer } from './src/components/DualVideoSyncAlignPlayer';
import { MainlandOfflinePage } from './src/components/MainlandOfflinePage';
import { ThaiKeyboardPractice } from './src/components/ThaiKeyboardPractice';
import { WordDetailModal } from './src/components/WordDetailModal';
import { RegistrationCheckinView } from './src/components/RegistrationCheckinView';
import { DailyThreeHourView } from './src/components/DailyThreeHourView';
import { AdminSanctuaryModal } from './src/components/AdminSanctuaryModal';
import { StatementIdentityModal } from './src/components/StatementIdentityModal';
import { FirstVisitOnboardingModal } from './src/components/FirstVisitOnboardingModal';
import {
  SpotlightTourOverlay,
  YOUTUBE_TOUR_STEPS,
  MAINLAND_TOUR_STEPS,
} from './src/components/SpotlightTourOverlay';
import { AppFooter } from './src/components/AppFooter';
import { getAllCuratedLessons, subscribeLessonsUpdate } from './src/data/presetLessonsLibrary';
import { SubtitleLine, WordToken, WordStatus, ActiveTab, RegisteredStudent } from './src/types';
import { thaiAudio } from './src/utils/thaiAudioSynthesizer';
import { getOrCreateDeviceFingerprint } from './src/utils/browserFingerprint';
import { studentStudyService } from './src/services/studentStudyService';
import { adminAuthService } from './src/services/adminAuthService';

const ONBOARDING_STORAGE_KEY = 'taixue_onboarding_v1';
const ACTIVE_LESSON_STORAGE_KEY = 'taixue_active_lesson_id_v1';

interface OnboardingPrefs {
  completed: boolean;
  canUseYouTube: boolean;
  tourCompleted: boolean;
  updatedAt: number;
}

function readOnboardingPrefs(): OnboardingPrefs | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.completed === 'boolean') {
      return parsed as OnboardingPrefs;
    }
  } catch {}
  return null;
}

function saveOnboardingPrefs(prefs: OnboardingPrefs): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

const App: React.FC = () => {
  const deviceFingerprint = useMemo(() => getOrCreateDeviceFingerprint(), []);

  // 音频优先默认入口：仅在明确指定 #/video 或用户首次选择「视频学习」时进入双视频，否则一律默认音频学习
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#/3h' || window.location.hash === '#/daily') {
        return 'daily_three_hour';
      }
      if (window.location.hash === '#/video') {
        return 'dual_sync_player';
      }
      if (window.location.hash === '#/mainland' || window.location.hash === '#/audio') {
        return 'mainland_offline';
      }
    }
    const prefs = readOnboardingPrefs();
    if (prefs?.completed && prefs.canUseYouTube === true) {
      return 'dual_sync_player';
    }
    return 'mainland_offline';
  });
  const [lastMediaTab, setLastMediaTab] = useState<'mainland_offline' | 'dual_sync_player'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#/video') {
      return 'dual_sync_player';
    }
    const prefs = readOnboardingPrefs();
    if (prefs?.completed && prefs.canUseYouTube === true) {
      return 'dual_sync_player';
    }
    return 'mainland_offline';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => adminAuthService.getSession().isAuthenticated);
  const [showHiddenAdminGate, setShowHiddenAdminGate] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#/admin') {
      return !adminAuthService.getSession().isAuthenticated;
    }
    return false;
  });
  const [hiddenAdminPass, setHiddenAdminPass] = useState('');
  const [hiddenAdminErr, setHiddenAdminErr] = useState<string | null>(null);
  const [hiddenAdminBusy, setHiddenAdminBusy] = useState(false);

  useEffect(() => {
    return adminAuthService.subscribe((session) => {
      setIsAdminAuthenticated(Boolean(session.isAuthenticated));
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#/admin' && adminAuthService.getSession().isAuthenticated) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setShowAdminModal(true);
    }
  }, []);

  // 首次访问引导与“明暗”聚光灯 Tour 状态
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    const prefs = readOnboardingPrefs();
    return !prefs?.completed;
  });
  const [activeTourMode, setActiveTourMode] = useState<'youtube' | 'mainland' | null>(null);

  // 播放器中文轨偏移量与锁定状态（从持久化存储恢复，与校准中枢毫秒同步）
  const [playerOffsetSeconds, setPlayerOffsetSeconds] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('luangpor_custom_dual_video_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.offsetSeconds === 'number') {
          return parsed.offsetSeconds;
        }
      }
    } catch {}
    return 0.0;
  });
  const [playerIsOffsetLocked, setPlayerIsOffsetLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('luangpor_offset_locked_v3');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {}
    return true;
  });

  const [currentStudent, setCurrentStudent] = useState<RegisteredStudent | null>(() => {
    return studentStudyService.getCurrentStudent();
  });

  // 语句身份认领弹窗状态
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityModalMode, setIdentityModalMode] = useState<'set_statement' | 'claim_statement'>('set_statement');

  // 网页端访问：根据时间和浏览器指纹自动识读/注册账户，并持续保活 Supabase 数据库
  useEffect(() => {
    studentStudyService.autoEnsureFingerprintStudent().then(student => {
      setCurrentStudent(student);
    }).catch(err => {
      console.warn('Auto fingerprint registration warning:', err);
    });

    const unsubscribe = studentStudyService.subscribeSync(() => {
      const refreshed = studentStudyService.getCurrentStudent();
      if (refreshed) {
        setCurrentStudent(prev => {
          if (
            prev &&
            prev.id === refreshed.id &&
            prev.name === refreshed.name &&
            prev.learningGoal === refreshed.learningGoal &&
            prev.streakDays === refreshed.streakDays &&
            prev.totalCheckins === refreshed.totalCheckins
          ) {
            return prev;
          }
          return refreshed;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 同步 URL Hash 路由 (#/video 与 #/audio，兼容旧版 #/mainland) 与浏览器前进后退
  const navigateToTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'mainland_offline' || tab === 'dual_sync_player') {
      setLastMediaTab(tab);
    }
    if (typeof window !== 'undefined') {
      if (tab === 'daily_three_hour') {
        if (window.location.hash !== '#/3h') {
          window.location.hash = '#/3h';
        }
      } else if (tab === 'dual_sync_player') {
        if (window.location.hash !== '#/video') {
          window.location.hash = '#/video';
        }
      } else if (tab === 'mainland_offline') {
        if (
          window.location.hash === '#/video' ||
          window.location.hash === '#/mainland' ||
          window.location.hash === '#/3h' ||
          window.location.hash === '#/daily'
        ) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else if (window.location.hash === '#/3h' || window.location.hash === '#/daily') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#/admin') {
        if (adminAuthService.getSession().isAuthenticated) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setShowAdminModal(true);
        } else {
          setHiddenAdminErr(null);
          setHiddenAdminPass('');
          setShowHiddenAdminGate(true);
        }
        return;
      }
      if (window.location.hash === '#/3h' || window.location.hash === '#/daily') {
        setActiveTab('daily_three_hour');
      } else if (window.location.hash === '#/video') {
        setActiveTab('dual_sync_player');
      } else if (window.location.hash === '#/mainland' || window.location.hash === '#/audio' || window.location.hash === '') {
        setActiveTab((prev) =>
          prev === 'dual_sync_player' || prev === 'daily_three_hour' ? 'mainland_offline' : prev
        );
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // 手动重播或首次启动“明暗”高亮 Tour
  const triggerTour = useCallback(
    (mode: 'youtube' | 'mainland') => {
      const targetTab: ActiveTab = mode === 'youtube' ? 'dual_sync_player' : 'mainland_offline';
      if (activeTab !== targetTab) {
        navigateToTab(targetTab);
      }
      window.setTimeout(() => {
        setActiveTourMode(mode);
      }, 220);
    },
    [activeTab, navigateToTab]
  );

  const handleTourComplete = useCallback(() => {
    setActiveTourMode(null);
    const existing = readOnboardingPrefs();
    saveOnboardingPrefs({
      completed: existing?.completed ?? true,
      canUseYouTube: existing?.canUseYouTube ?? (activeTab === 'dual_sync_player'),
      tourCompleted: true,
      updatedAt: Date.now(),
    });
  }, [activeTab]);

  // 音频与视频两大学习岔路共用同一套课件与字幕状态
  const [lessonsVersion, setLessonsVersion] = useState(0);
  useEffect(() => {
    return subscribeLessonsUpdate(() => setLessonsVersion((v) => v + 1));
  }, []);
  const allLessons = useMemo(() => getAllCuratedLessons(), [lessonsVersion]);
  const [currentLessonId, setCurrentLessonId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_LESSON_STORAGE_KEY);
      if (savedId && allLessons.some((l) => l.id === savedId)) {
        return savedId;
      }
    } catch {}
    return allLessons.find((l) => l.id === 'lesson_20261017')?.id || allLessons[0]?.id || 'lesson_20261017';
  });

  const [subtitles, setSubtitles] = useState<SubtitleLine[]>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_LESSON_STORAGE_KEY);
      const target = allLessons.find((l) => l.id === (savedId || 'lesson_20261017')) || allLessons[0];
      if (target?.subtitles?.length) return target.subtitles;
    } catch {}
    return allLessons[0]?.subtitles || [];
  });

  const [sharedLineIndex, setSharedLineIndex] = useState<number>(0);
  const [lessonSyncNonce, setLessonSyncNonce] = useState<number>(0);
  const [pendingAudioSelection, setPendingAudioSelection] = useState<{
    mp3Url: string;
    fileName: string;
    fileCode?: string;
    dateLabel?: string;
    trackType: 'thai_audio' | 'chinese_audio';
    nonce: number;
  } | null>(null);
  const [pendingVideoSelection, setPendingVideoSelection] = useState<{
    thaiVideoUrl: string;
    chineseVideoUrl?: string;
    title?: string;
    nonce: number;
  } | null>(null);

  const handleSelectLessonId = useCallback(
    (lessonId: string) => {
      const lesson = allLessons.find((l) => l.id === lessonId);
      if (!lesson) return;
      setCurrentLessonId(lesson.id);
      setSubtitles(lesson.subtitles);
      setSharedLineIndex(0);
      setPlayerOffsetSeconds(lesson.defaultOffsetSeconds);
      setPlayerIsOffsetLocked(true);
      setLessonSyncNonce((n) => n + 1);
      try {
        localStorage.setItem(ACTIVE_LESSON_STORAGE_KEY, lesson.id);
        localStorage.setItem('luangpor_course_subtitles', JSON.stringify(lesson.subtitles));
        localStorage.setItem('luangpor_active_subtitles_v3', JSON.stringify(lesson.subtitles));
        localStorage.setItem('luangpor_offset_locked_v3', 'true');
        const saved = localStorage.getItem('luangpor_custom_dual_video_v3');
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.thaiVideoUrl = lesson.thaiVideoUrl;
        parsed.chineseVideoUrl = lesson.chineseVideoUrl;
        parsed.title = `${lesson.chineseTitle} ｜ ${lesson.title}`;
        parsed.offsetSeconds = lesson.defaultOffsetSeconds;
        localStorage.setItem('luangpor_custom_dual_video_v3', JSON.stringify(parsed));
      } catch {}
    },
    [allLessons]
  );

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden">
      
      {/* 顶部极简导航 */}
      <Navbar
        activeTab={activeTab}
        lastMediaTab={lastMediaTab}
        onTabChange={navigateToTab}
        currentStudent={currentStudent}
        isAdminAuthenticated={isAdminAuthenticated}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenIdentityModal={(m) => {
          setIdentityModalMode(m || 'set_statement');
          setShowIdentityModal(true);
        }}
        onStartTour={() =>
          triggerTour(lastMediaTab === 'dual_sync_player' ? 'youtube' : 'mainland')
        }
      />

      {/* 主界面视窗 */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-2 sm:p-4 lg:p-6 overflow-x-hidden">

        {/* 1. 音频学习（优先推荐 · 海内外通用，与视频模式共用同一套课件与字幕） */}
        {activeTab === 'mainland_offline' && (
          <MainlandOfflinePage
            currentLessonId={currentLessonId}
            onSelectLessonId={handleSelectLessonId}
            subtitles={subtitles}
            currentLineIndex={sharedLineIndex}
            onLineIndexChange={setSharedLineIndex}
            onSelectWord={setSelectedWord}
            onOpenKeyboard={handlePracticeInKeyboard}
            onSpeak={handleSpeak}
            pendingAudioSelection={pendingAudioSelection}
            onSwitchToYouTubeMode={() => {
              const existing = readOnboardingPrefs();
              saveOnboardingPrefs({
                completed: true,
                canUseYouTube: true,
                tourCompleted: existing?.tourCompleted ?? true,
                updatedAt: Date.now(),
              });
              navigateToTab('dual_sync_player');
            }}
            onOpenVideoWithPair={(pair) => {
              const existing = readOnboardingPrefs();
              saveOnboardingPrefs({
                completed: true,
                canUseYouTube: true,
                tourCompleted: existing?.tourCompleted ?? true,
                updatedAt: Date.now(),
              });
              setPendingVideoSelection({ ...pair, nonce: Date.now() });
              navigateToTab('dual_sync_player');
            }}
            onStartTour={() => triggerTour('mainland')}
          />
        )}

        {/* 2. 视频学习（YouTube 双视频同步学习，与音频模式共用同一套字幕与进度） */}
        {activeTab === 'dual_sync_player' && (
          <DualVideoSyncAlignPlayer
            subtitles={subtitles}
            currentLessonId={currentLessonId}
            lessonSyncNonce={lessonSyncNonce}
            onSelectLessonId={handleSelectLessonId}
            currentLineIndex={sharedLineIndex}
            onLineIndexChange={setSharedLineIndex}
            onSelectWord={setSelectedWord}
            onOpenKeyboard={handlePracticeInKeyboard}
            onSpeak={handleSpeak}
            pendingVideoSelection={pendingVideoSelection}
            onSwitchToAudioMode={() => {
              const existing = readOnboardingPrefs();
              saveOnboardingPrefs({
                completed: true,
                canUseYouTube: false,
                tourCompleted: existing?.tourCompleted ?? true,
                updatedAt: Date.now(),
              });
              navigateToTab('mainland_offline');
            }}
            onOpenAudioWithTrack={(track) => {
              const existing = readOnboardingPrefs();
              saveOnboardingPrefs({
                completed: true,
                canUseYouTube: false,
                tourCompleted: existing?.tourCompleted ?? true,
                updatedAt: Date.now(),
              });
              setPendingAudioSelection({ ...track, nonce: Date.now() });
              navigateToTab('mainland_offline');
            }}
            onStartTour={() => triggerTour('youtube')}
            onUpdateSubtitles={(newSubs) => {
              setSubtitles(newSubs);
              try {
                localStorage.setItem('luangpor_course_subtitles', JSON.stringify(newSubs));
              } catch {}
            }}
            offsetSeconds={playerOffsetSeconds}
            isOffsetLocked={playerIsOffsetLocked}
            onOpenAdmin={() => setShowAdminModal(true)}
            onOffsetChange={(offset, locked) => {
              setPlayerOffsetSeconds(offset);
              setPlayerIsOffsetLocked(locked);
              try {
                localStorage.setItem('luangpor_offset_locked_v3', String(locked));
                const saved = localStorage.getItem('luangpor_custom_dual_video_v3');
                const parsed = saved ? JSON.parse(saved) : {};
                parsed.offsetSeconds = offset;
                localStorage.setItem('luangpor_custom_dual_video_v3', JSON.stringify(parsed));
              } catch {}
            }}
          />
        )}

        {/* 3. 泰语打字练习：Kedmanee 键盘打卡实战 */}
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
                  onClick={() => navigateToTab('registration_checkin')}
                  className="text-xs text-emerald-300 hover:text-white px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/40 transition cursor-pointer"
                >
                  查看打卡记录
                </button>
                <button
                  onClick={() => navigateToTab(lastMediaTab)}
                  className="text-xs text-stone-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  ← 返回法谈学习
                </button>
              </div>
            </div>

            <ThaiKeyboardPractice
              initialTargetWord={keyboardTargetWord}
              onSpeak={handleSpeak}
              onBackToStudy={() => navigateToTab(lastMediaTab)}
              onPracticeCompleted={handlePracticeCompleted}
            />
          </div>
        )}

        {/* 4. 日常 3 小时共修课表 */}
        {activeTab === 'daily_three_hour' && (
          <DailyThreeHourView
            allLessons={allLessons}
            onOpenAudioTrack={(track) => {
              setPendingAudioSelection({ ...track, nonce: Date.now() });
              navigateToTab('mainland_offline');
            }}
            onOpenVideoPair={(pair) => {
              const existing = readOnboardingPrefs();
              saveOnboardingPrefs({
                completed: true,
                canUseYouTube: true,
                tourCompleted: existing?.tourCompleted ?? true,
                updatedAt: Date.now(),
              });
              setPendingVideoSelection({ ...pair, nonce: Date.now() });
              navigateToTab('dual_sync_player');
            }}
            onOpenCuratedLesson={(lessonId) => {
              handleSelectLessonId(lessonId);
              navigateToTab(lastMediaTab);
            }}
            onBackToStudy={() => navigateToTab(lastMediaTab)}
          />
        )}

        {/* 5. 学员免费注册、个人学修打卡与禅修共学动态 */}
        {activeTab === 'registration_checkin' && (
          <RegistrationCheckinView
            currentStudent={currentStudent}
            onStudentChange={setCurrentStudent}
            onNavigateToKeyboard={handlePracticeInKeyboard}
            onNavigateToPlayer={() => navigateToTab(lastMediaTab)}
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

      {/* 共学互助中心（仅 admin 登录后才显示专属管理界面） */}
      <AdminSanctuaryModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentStudent={currentStudent}
        onLessonCalibrated={(lessonId, offset) => {
          // 管理员校准后：更新播放器偏移量并自动锁定，立即同步生效
          setPlayerOffsetSeconds(offset);
          setPlayerIsOffsetLocked(true);
          try {
            localStorage.setItem('luangpor_offset_locked_v3', 'true');
            const saved = localStorage.getItem('luangpor_custom_dual_video_v3');
            const parsed = saved ? JSON.parse(saved) : {};
            parsed.offsetSeconds = offset;
            localStorage.setItem('luangpor_custom_dual_video_v3', JSON.stringify(parsed));
          } catch {}
        }}
        onLoadLessonToPlayer={(lesson) => {
          setCurrentLessonId(lesson.id);
          setSubtitles(lesson.subtitles);
          setSharedLineIndex(0);
          setPlayerOffsetSeconds(lesson.defaultOffsetSeconds);
          setPlayerIsOffsetLocked(true);
          setLessonSyncNonce((n) => n + 1);
          try {
            localStorage.setItem(ACTIVE_LESSON_STORAGE_KEY, lesson.id);
            localStorage.setItem('luangpor_course_subtitles', JSON.stringify(lesson.subtitles));
            localStorage.setItem('luangpor_active_subtitles_v3', JSON.stringify(lesson.subtitles));
            const saved = localStorage.getItem('luangpor_custom_dual_video_v3');
            const parsed = saved ? JSON.parse(saved) : {};
            parsed.thaiVideoUrl = lesson.thaiVideoUrl;
            parsed.chineseVideoUrl = lesson.chineseVideoUrl;
            parsed.title = `${lesson.chineseTitle} ｜ ${lesson.title}`;
            parsed.offsetSeconds = lesson.defaultOffsetSeconds;
            localStorage.setItem('luangpor_custom_dual_video_v3', JSON.stringify(parsed));
          } catch {}
          setShowAdminModal(false);
        }}
      />

      {/* 隐藏式 #/admin 专属登录弹窗（平时不在前台任何位置体现） */}
      {showHiddenAdminGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setHiddenAdminErr(null);
              setHiddenAdminBusy(true);
              try {
                const res = await adminAuthService.unlock(hiddenAdminPass);
                if (res.success) {
                  setShowHiddenAdminGate(false);
                  setHiddenAdminPass('');
                  if (typeof window !== 'undefined' && window.location.hash === '#/admin') {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                  }
                  setShowAdminModal(true);
                } else {
                  setHiddenAdminErr(res.message);
                }
              } finally {
                setHiddenAdminBusy(false);
              }
            }}
            className="w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-3"
          >
            <h3 className="text-sm font-bold text-white">admin 登录验证</h3>
            <input
              type="password"
              value={hiddenAdminPass}
              onChange={(e) => setHiddenAdminPass(e.target.value)}
              placeholder="请输入 admin 口令"
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-white outline-none"
            />
            {hiddenAdminErr && (
              <p className="text-xs text-rose-400">{hiddenAdminErr}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowHiddenAdminGate(false);
                  setHiddenAdminPass('');
                  setHiddenAdminErr(null);
                  if (typeof window !== 'undefined' && window.location.hash === '#/admin') {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={hiddenAdminBusy || !hiddenAdminPass.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {hiddenAdminBusy ? '验证中...' : '登录'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 法缘发心语句身份标识与认领弹窗 */}
      <StatementIdentityModal
        currentStudent={currentStudent}
        isOpen={showIdentityModal}
        initialMode={identityModalMode}
        onClose={() => setShowIdentityModal(false)}
        onStudentUpdated={(updated) => {
          setCurrentStudent(updated);
        }}
      />

      {/* 首次访问引导弹窗：指纹识别 + 名字发心 + 音频/视频岔路选择 */}
      <FirstVisitOnboardingModal
        isOpen={showOnboardingModal}
        currentStudent={currentStudent}
        fingerprint={deviceFingerprint}
        onComplete={({ updatedStudent, canUseYouTube }) => {
          setCurrentStudent(updatedStudent);
          saveOnboardingPrefs({
            completed: true,
            canUseYouTube,
            tourCompleted: false,
            updatedAt: Date.now(),
          });
          setShowOnboardingModal(false);
          triggerTour(canUseYouTube ? 'youtube' : 'mainland');
        }}
        onSwitchToClaimAccount={() => {
          setShowOnboardingModal(false);
          setIdentityModalMode('claim_statement');
          setShowIdentityModal(true);
        }}
      />

      {/* 现代“明暗”聚光灯高亮功能导览 (Spotlight Tour) */}
      <SpotlightTourOverlay
        isOpen={activeTourMode !== null}
        modeLabel={activeTourMode === 'youtube' ? '视频学习导览' : '音频学习导览'}
        steps={activeTourMode === 'youtube' ? YOUTUBE_TOUR_STEPS : MAINLAND_TOUR_STEPS}
        onClose={handleTourComplete}
        onFinish={handleTourComplete}
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
