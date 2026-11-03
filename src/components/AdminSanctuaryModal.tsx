import React, { useState, useEffect, useMemo } from 'react';
import { 
  RegisteredStudent, AdminAuditLog, AdminSessionState, CuratedLesson, SubtitleLine 
} from '../types';
import { adminAuthService } from '../services/adminAuthService';
import { secureStorageService } from '../services/secureStorageService';
import { 
  getAllCuratedLessons, updateCuratedLessonCalibration, getFlagshipLesson,
  getAllCommunityLessons, approveCommunityLesson, rejectCommunityLesson, deleteCommunityLesson
} from '../data/presetLessonsLibrary';
import { 
  ShieldCheck, Lock, Unlock, KeyRound, Download, Trash2, Search,
  RefreshCw, CheckCircle2, AlertTriangle, Eye, EyeOff, X, Sliders,
  FileSpreadsheet, Users, History, Clock, BookOpen, ExternalLink,
  ChevronRight, Save, LogOut, Check, Layers, Play, Sparkles, Copy,
  FileText, Wand2, Volume2, Bot, Video, Globe, FolderOpen, Headphones
} from 'lucide-react';
import { 
  OFFICIAL_THAI_STREAMS_URL, 
  OFFICIAL_CHINESE_SEARCH_URL,
  DHAMMA_EXTERNAL_PLATFORMS 
} from '../data/officialChannels';
import { AI_SRT_CONVERSION_PROMPT, offlineTokenizeThaiText } from '../utils/lrFormatParser';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { searchDhammaDiscourses, sniffPageMedia, DhammaSearchResult, DhammaMediaItem } from '../utils/dhammaLookup';
import { CourseStudioModal } from './CourseStudioModal';
import { DhammaExplorerDrawer } from './DhammaExplorerDrawer';

interface AdminSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLessonCalibrated?: (lessonId: string, offset: number) => void;
  onLoadLessonToPlayer?: (lesson: CuratedLesson) => void;
}

export type AdminSanctuaryTab = 
  | 'studio' 
  | 'dhamma_search' 
  | 'ai_prompt' 
  | 'platforms' 
  | 'review' 
  | 'calibration' 
  | 'students' 
  | 'security';

export const AdminSanctuaryModal: React.FC<AdminSanctuaryModalProps> = ({
  isOpen,
  onClose,
  onLessonCalibrated,
  onLoadLessonToPlayer
}) => {
  // 会话状态
  const [session, setSession] = useState<AdminSessionState>(() => adminAuthService.getSession());

  // 子标签页 (法工校对工作流、开示检索、AI提示词、6大平台、审核发布、时间调校、学员档案、数据日志)
  const [activeTab, setActiveTab] = useState<AdminSanctuaryTab>('studio');

  // 课件工坊生产状态
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [studioPrefill, setStudioPrefill] = useState<{
    title?: string;
    thaiVideoUrl?: string;
    chineseVideoUrl?: string;
    snippet?: string;
    pageId?: number;
  } | null>(null);

  // dhamma.cn 检索与嗅探状态
  const [dhammaSearchQuery, setDhammaSearchQuery] = useState('2026年10月');
  const [isSearchingDhamma, setIsSearchingDhamma] = useState(false);
  const [dhammaSearchResult, setDhammaSearchResult] = useState<DhammaSearchResult | null>(null);
  const [dhammaCacheNotice, setDhammaCacheNotice] = useState<string | null>(null);
  const [showDhammaDrawer, setShowDhammaDrawer] = useState(false);

  // 安全提取检索条目数组，保证 100% 为可迭代 Array，杜绝 map 报错
  const dhammaItems = useMemo<DhammaMediaItem[]>(() => {
    if (!dhammaSearchResult) return [];
    if (Array.isArray(dhammaSearchResult.items)) return dhammaSearchResult.items;
    if (Array.isArray(dhammaSearchResult)) return dhammaSearchResult as any;
    return [];
  }, [dhammaSearchResult]);

  // AI 提示词与音标测试实验室状态
  const [copiedPromptToast, setCopiedPromptToast] = useState(false);
  const [testThaiInput, setTestThaiInput] = useState('ผู้รู้ มีสติ รู้สึกตัว แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน');
  const [testTokens, setTestTokens] = useState<any[]>(() => offlineTokenizeThaiText('ผู้รู้ มีสติ รู้สึกตัว แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน'));

  // 待审核与社区课件状态
  const [communityLessons, setCommunityLessons] = useState<CuratedLesson[]>(() => getAllCommunityLessons());
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

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

  // 审计日志
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // 刷新共学管理数据
  const refreshAdminData = () => {
    try {
      const allStudents = secureStorageService.getConfidentialStudents();
      setStudents(allStudents);
      const allLessons = getAllCuratedLessons();
      setCuratedLessons(allLessons);
      setCommunityLessons(getAllCommunityLessons());
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
    if (isOpen) {
      refreshAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 切换待校准课件
  const handleSelectLessonForCalibration = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    const target = curatedLessons.find(l => l.id === lessonId);
    if (target) {
      setCalibratedOffset(target.defaultOffsetSeconds);
    }
  };

  // 导出学员数据 CSV
  const handleExportCsv = () => {
    try {
      const res = secureStorageService.exportConfidentialCsv();
      setExportNotice(`学员数据报表导出成功！包含 ${res.count} 名学员完整数据 (${res.filename})`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      setExportNotice(`导出失败: ${err.message}`);
    }
  };

  // 删除单个学员
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`确认：是否确定删除学员【${studentName}】的档案与打卡记录？此操作不可逆！`)) {
      secureStorageService.deleteStudentConfidential(studentId);
      refreshAdminData();
    }
  };

  // 保存课件校准
  const handleSaveCalibration = () => {
    const updated = updateCuratedLessonCalibration(selectedLessonId, {
      defaultOffsetSeconds: calibratedOffset
    });
    setCuratedLessons(updated);
    adminAuthService.recordAuditLog('offset_calibrated', `法工校准了课件 [ID: ${selectedLessonId}] 的基准偏移量为 ${calibratedOffset}s`);
    if (onLessonCalibrated) {
      onLessonCalibrated(selectedLessonId, calibratedOffset);
    }
    setSaveCalibrationToast(true);
    setTimeout(() => setSaveCalibrationToast(false), 2500);
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
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  共学管理 · 法工校对工作流
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                  在线协同
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                法谈课件制作 · 词汇音标 · 开示检索 · 课件审核 · 时间轴对齐 · 学员打卡记录
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 视窗内容 (直接进入全功能专区，无需任何密码或拦截) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 space-y-5">
          
          {/* 子导航栏 */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'studio'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="法工校对工作流：导入生肉、朱拉分词与课件制作"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>✍️ 法工校对工作流</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('dhamma_search');
                if (!dhammaSearchResult) {
                  setIsSearchingDhamma(true);
                  searchDhammaDiscourses(dhammaSearchQuery).then(res => {
                    setDhammaSearchResult(res);
                    setIsSearchingDhamma(false);
                  });
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'dhamma_search'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="通过 MediaWiki 检索 dhamma.cn 并嗅探 MP4/MP3 直链"
            >
              <Search className="w-3.5 h-3.5" />
              <span>🔍 开示检索</span>
            </button>

            <button
              onClick={() => setActiveTab('ai_prompt')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'ai_prompt'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="标准朱拉隆功音标与五调 AI 提示词流水线"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>🤖 AI 优化词</span>
            </button>

            <button
              onClick={() => setActiveTab('platforms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'platforms'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
              title="解脱园、尊者原声、一心、法藏等6大官方与权威资源直通"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>🌿 学习参考资源</span>
            </button>

            <button
              onClick={() => setActiveTab('review')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'review'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                课件审核 (
                {communityLessons.filter((l) => l.status === 'pending').length > 0 ? (
                  <span className="text-amber-300 font-black animate-pulse">
                    {communityLessons.filter((l) => l.status === 'pending').length} 待审
                  </span>
                ) : (
                  communityLessons.length
                )}
                )
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calibration')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'calibration'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>时间轴调校</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>学员记录 ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>数据与日志</span>
            </button>
              </div>

              {/* 导出成功通知 */}
              {exportNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{exportNotice}</span>
                </div>
              )}

              {/* TAB 1: 法工校对工作流 (Course Studio) */}
              {activeTab === 'studio' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Wand2 className="w-4 h-4 text-amber-400" />
                          <span>法工校对工作流 (Course Studio)</span>
                        </h4>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                          法工协作
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        在此将生肉双语/单语 SRT 导入，系统将自动基于内置 1120+ 佛学大词典与朱拉隆功实用音标进行逐词拆解断词，可直接测试卡拉OK并发布为全员共学课件。
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setStudioPrefill(null);
                          setShowStudioModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>🚀 启动课件制作</span>
                      </button>
                    </div>
                  </div>

                  {/* 快捷载入预制模版 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FolderOpen className="w-4 h-4 text-amber-400" />
                        <span>快速挑选课件模板进行二次编辑或调入放映机</span>
                      </h5>
                      <span className="text-[11px] text-slate-400">
                        共 {curatedLessons.length} 篇精校课件
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                      {curatedLessons.slice(0, 8).map((lesson) => (
                        <div
                          key={lesson.id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 transition flex flex-col justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-amber-400 font-mono font-bold text-[11px]">
                                📅 {lesson.date}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {lesson.totalSentences} 句全篇
                              </span>
                            </div>
                            <div className="font-bold text-white line-clamp-1">{lesson.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{lesson.chineseTitle}</div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-500 font-mono">
                              时差: {lesson.defaultOffsetSeconds >= 0 ? `+${lesson.defaultOffsetSeconds}` : lesson.defaultOffsetSeconds}s
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setStudioPrefill({
                                    title: lesson.title,
                                    thaiVideoUrl: lesson.thaiVideoUrl,
                                    chineseVideoUrl: lesson.chineseVideoUrl,
                                  });
                                  setShowStudioModal(true);
                                }}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-[11px] transition cursor-pointer"
                              >
                                编辑副本
                              </button>
                              {onLoadLessonToPlayer && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onLoadLessonToPlayer(lesson);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>载入放映</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 开示智能检索与嗅探 (dhamma.cn Explorer) */}
              {activeTab === 'dhamma_search' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          通过 MediaWiki API 检索 dhamma.cn 并嗅探直链音视频
                        </h4>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ⏱️ 7 天本地持久化缓存生效中
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={dhammaSearchQuery}
                          onChange={(e) => setDhammaSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setIsSearchingDhamma(true);
                              searchDhammaDiscourses(dhammaSearchQuery).then(res => {
                                setDhammaSearchResult(res);
                                setIsSearchingDhamma(false);
                              }).catch(() => setIsSearchingDhamma(false));
                            }
                          }}
                          placeholder="输入法谈主题、日期或导师名 (例如: 2026年10月, 四念处, 知者心)..."
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-medium"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSearchingDhamma(true);
                          searchDhammaDiscourses(dhammaSearchQuery).then(res => {
                            setDhammaSearchResult(res);
                            setIsSearchingDhamma(false);
                          }).catch(() => setIsSearchingDhamma(false));
                        }}
                        disabled={isSearchingDhamma}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSearchingDhamma ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>检索</span>
                      </button>
                    </div>

                    {/* 快捷推荐词 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">快捷法题:</span>
                      {['2026年10月', '四念处', '知者心', '从奢摩他到毗婆舍那', '日常生活', '阿姜给', '身念处', '正定与邪定'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setDhammaSearchQuery(tag);
                            setIsSearchingDhamma(true);
                            searchDhammaDiscourses(tag).then(res => {
                              setDhammaSearchResult(res);
                              setIsSearchingDhamma(false);
                            }).catch(() => setIsSearchingDhamma(false));
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] transition cursor-pointer border border-slate-700/80"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 检索状态提示 */}
                  {dhammaSearchResult?.sourceNotice && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                      <span className="font-semibold">🌿 {dhammaSearchResult.sourceNotice}</span>
                      {dhammaSearchResult.ttlRemaining && (
                        <span className="font-mono text-[10px] text-amber-400/90">{dhammaSearchResult.ttlRemaining}</span>
                      )}
                    </div>
                  )}

                  {/* 检索结果展示 */}
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {isSearchingDhamma ? (
                      <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                        <span>正在检索 dhamma.cn 档案库并嗅探音视频...</span>
                      </div>
                    ) : dhammaItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        暂无检索结果，请尝试输入其他关键词或点击上方快捷法题
                      </div>
                    ) : (
                      dhammaItems.map((res) => {
                        const pageId = res.pageId || (res as any).pageid || 0;
                        const wordCount = res.wordCount || (res as any).wordcount || '8000+';
                        const dateStr = res.timestamp ? res.timestamp.slice(0, 10) : '2026年10月';
                        const videoUrl = res.mp4Url || (res as any).media?.videoUrl;
                        const audioUrl = res.mp3Url || (res as any).media?.audioUrl;
                        const sourceUrl = res.url || `https://www.dhamma.cn/index.php?curid=${pageId}`;

                        return (
                          <div
                            key={pageId || res.title}
                            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-white text-sm hover:text-amber-300 transition">
                                  {res.title}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>词数: {wordCount}</span>
                                  <span>•</span>
                                  <span>开示日期: {dateStr}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {videoUrl && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                                    <Video className="w-3 h-3" />
                                    <span>已嗅探 MP4</span>
                                  </span>
                                )}
                                {audioUrl && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-bold">
                                    <Headphones className="w-3 h-3" />
                                    <span>已嗅探 MP3</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 开示文稿摘录 */}
                            <div
                              className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed [&>b]:text-amber-300 [&>b]:font-bold"
                              dangerouslySetInnerHTML={{ __html: res.snippet }}
                            />

                            {/* 直链与一键调入 */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                              <div className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                                {videoUrl || audioUrl || sourceUrl}
                              </div>

                              <div className="flex items-center gap-2">
                                <a
                                  href={sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>源网页</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudioPrefill({
                                      title: res.title,
                                      thaiVideoUrl: 'https://www.youtube.com/watch?v=F4-tJNYDpss',
                                      chineseVideoUrl: videoUrl || audioUrl || 'https://media.dhamma.cn/9/9b/D26.86%E3%80%8A%E9%9A%86%E6%B3%A2%E5%B8%95%E9%BB%98%E5%B0%8A%E8%80%85%E5%BC%80%E7%A4%BA%E3%80%8B-2026%E5%B9%B410%E6%9C%8825%E6%97%A5.mp4',
                                      snippet: res.snippet,
                                      pageId: pageId
                                    });
                                    setShowStudioModal(true);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>调入工坊制作</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: 标准朱拉隆功音标与 AI 提示词流水线 (AI Prompt Pipeline) */}
              {activeTab === 'ai_prompt' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Bot className="w-4 h-4 text-amber-400" />
                          <span>标准朱拉隆功音标与五调 AI 优化词转换流水线</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                          原始 SRT 绝无自带音标。使用此标准 Prompt 发送给 ChatGPT / Claude / Gemini / DeepSeek，将生肉 SRT 自动转换为标准的【增强型逐词对齐 SRT (SRT-GLOSS)】，包含规范朱拉隆功 Adapted IPA 五声调与佛法核心术语。
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
                          setCopiedPromptToast(true);
                          setTimeout(() => setCopiedPromptToast(false), 3000);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedPromptToast ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPromptToast ? '已复制完整 Prompt！' : '📋 复制完整 AI 提示词'}</span>
                      </button>
                    </div>

                    {/* 五大声调标准规范对照卡片 */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800 text-center">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">1调 中平 (Mid)</span>
                        <span className="font-mono text-amber-300 font-bold text-xs mt-0.5 block">a / maa / caj</span>
                        <span className="text-[10px] text-slate-500">无附加符号</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">2调 低平 (Low)</span>
                        <span className="font-mono text-emerald-300 font-bold text-xs mt-0.5 block">à / sà-tì / kì-lèet</span>
                        <span className="text-[10px] text-slate-500">重音符 \`</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">3调 降调 (Falling)</span>
                        <span className="font-mono text-cyan-300 font-bold text-xs mt-0.5 block">â / pʰûu / hâa</span>
                        <span className="text-[10px] text-slate-500">扬抑符 \^</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">4调 高调 (High)</span>
                        <span className="font-mono text-yellow-300 font-bold text-xs mt-0.5 block">á / rúu / tʰúk</span>
                        <span className="text-[10px] text-slate-500">锐音符 \'</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">5调 升调 (Rising)</span>
                        <span className="font-mono text-purple-300 font-bold text-xs mt-0.5 block">ǎ / kʰǎn / sǒo</span>
                        <span className="text-[10px] text-slate-500">抑扬符 \ˇ</span>
                      </div>
                    </div>
                  </div>

                  {/* 离线切词与音标实时测试实验室 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>朱拉隆功音标与分词实时测试沙盒 (离线算法即时推导)</span>
                      </h5>
                      <span className="text-[11px] text-slate-400">
                        支持测试任意泰文句子或佛学词组
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={testThaiInput}
                        onChange={(e) => {
                          setTestThaiInput(e.target.value);
                          setTestTokens(offlineTokenizeThaiText(e.target.value));
                        }}
                        placeholder="输入泰语句子测试分词与音标..."
                        className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setTestTokens(offlineTokenizeThaiText(testThaiInput))}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition cursor-pointer"
                      >
                        重新推导
                      </button>
                    </div>

                    {/* 单词解析气泡 */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {testTokens.map((tok, tIdx) => (
                        <div
                          key={tok.id || tIdx}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/30 flex flex-col gap-0.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-amber-200 text-xs">{tok.thai}</span>
                            {tok.isCore && (
                              <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">核心词</span>
                            )}
                          </div>
                          <span className="font-mono text-cyan-300 text-[11px]">/{tok.romanization}/</span>
                          <span className="text-slate-400 text-[10px]">{tok.chinese}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 提示词全文预览代码框 */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300">Prompt 全文模版 (只读预览):</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
                          setCopiedPromptToast(true);
                          setTimeout(() => setCopiedPromptToast(false), 2500);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        复制全文
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-400 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                      {AI_SRT_CONVERSION_PROMPT}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 4: 6 大官方与权威平台资源直达 (Platforms) */}
              {activeTab === 'platforms' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">
                        解脱园及尊者法音权威平台官方直达矩阵
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      后台集中归拢 6 大权威平台与母带直播源，已从学员端移至管理后台，供管理员与制作团队一键直达获取最新原版母带与官方同传。
                    </p>
                  </div>

                  {/* 官方直播母带快速直通 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <a
                      href={OFFICIAL_THAI_STREAMS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 hover:border-red-500/60 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                          ▶
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-red-300 transition flex items-center gap-1.5">
                            <span>🇹🇭 尊者泰文原版直播合集</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-red-300" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            @luangpupramote/streams · 寺庙官方母带源
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-red-300 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-500/30">
                        直接打开 ↗
                      </span>
                    </a>

                    <a
                      href={OFFICIAL_CHINESE_SEARCH_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3.5 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 hover:border-red-500/60 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          🇨🇳
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-red-300 transition flex items-center gap-1.5">
                            <span>🇨🇳 解脱园中文最新同传合集</span>
                            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-red-300" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            @JieTuoYuan · 解脱园官方频道
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-red-300 bg-red-950/80 px-2.5 py-1 rounded-lg border border-red-500/30">
                        直接打开 ↗
                      </span>
                    </a>
                  </div>

                  {/* 6 大官方与权威平台资源网格 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DHAMMA_EXTERNAL_PLATFORMS.map((platform) => (
                      <a
                        key={platform.id}
                        href={platform.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 transition flex items-center justify-between group shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm font-bold shrink-0">
                            {platform.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white group-hover:text-amber-300 truncate">
                              {platform.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              {platform.domain}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center text-slate-500 group-hover:text-amber-400 pl-2 shrink-0 transition">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: 课件审核发布专区 */}
              {activeTab === 'review' && (
                <div className="space-y-4">
                  {/* KPI 概览卡片 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">共建课件总数</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                        {communityLessons.length} <span className="text-xs font-normal text-slate-400">个</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">⏳ 待管理员审核</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-500 mt-1">
                        {communityLessons.filter((l) => l.status === 'pending').length} <span className="text-xs font-normal text-slate-400">个</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">✅ 已批准上线</div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                        {communityLessons.filter((l) => l.status === 'approved').length} <span className="text-xs font-normal text-slate-400">个</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">❌ 驳回记录</div>
                      <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
                        {communityLessons.filter((l) => l.status === 'rejected').length} <span className="text-xs font-normal text-slate-400">个</span>
                      </div>
                    </div>
                  </div>

                  {/* 筛选标签与操作栏 */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 font-medium mr-1">状态筛选:</span>
                      {(['all', 'pending', 'approved', 'rejected'] as const).map((filterKey) => {
                        const labels = {
                          all: `全部 (${communityLessons.length})`,
                          pending: `⏳ 待审核 (${communityLessons.filter((l) => l.status === 'pending').length})`,
                          approved: `✅ 已批准 (${communityLessons.filter((l) => l.status === 'approved').length})`,
                          rejected: `❌ 已驳回 (${communityLessons.filter((l) => l.status === 'rejected').length})`,
                        };
                        return (
                          <button
                            key={filterKey}
                            onClick={() => setReviewFilter(filterKey)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              reviewFilter === filterKey
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {labels[filterKey]}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCommunityLessons(getAllCommunityLessons())}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>刷新池</span>
                    </button>
                  </div>

                  {/* 课件列表 */}
                  <div className="space-y-3">
                    {communityLessons
                      .filter((l) => reviewFilter === 'all' || l.status === reviewFilter)
                      .map((lesson) => {
                        const isPending = lesson.status === 'pending';
                        const isApproved = lesson.status === 'approved';
                        const isRejected = lesson.status === 'rejected';

                        return (
                          <div
                            key={lesson.id}
                            className={`p-4 rounded-xl border transition space-y-3 ${
                              isPending
                                ? 'bg-slate-950/80 border-amber-500/40 hover:border-amber-400'
                                : isApproved
                                ? 'bg-slate-950/60 border-emerald-500/30'
                                : 'bg-slate-950/40 border-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-white">
                                    {lesson.chineseTitle || lesson.title}
                                  </h4>
                                  {isPending && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                                      ⏳ 待审核
                                    </span>
                                  )}
                                  {isApproved && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                      ✅ 已批准上线
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                      ❌ 已驳回
                                    </span>
                                  )}
                                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                    {lesson.totalSentences} 句
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                  主讲: {lesson.speaker} · 日期: {lesson.date} · 提交人: {lesson.submittedBy?.name || '学员'} ({lesson.submittedBy?.emailOrPhone || '匿名'})
                                </p>
                              </div>

                              {/* 快速审核动作群 */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const updated = approveCommunityLesson(lesson.id, session.adminName || 'Admin');
                                        setCommunityLessons([...updated]);
                                        setExportNotice(`已成功批准课件《${lesson.title}》上线！所有学员均可在前台课件库载入研读。`);
                                        setTimeout(() => setExportNotice(null), 4000);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer transition"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>✅ 批准发布上线</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt('请输入驳回修改原因（可选）：') || '请重新核对时差与字幕切词';
                                        const updated = rejectCommunityLesson(lesson.id, reason);
                                        setCommunityLessons([...updated]);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 cursor-pointer transition"
                                    >
                                      驳回
                                    </button>
                                  </>
                                )}

                                {isApproved && (
                                  <button
                                    onClick={() => {
                                      const updated = rejectCommunityLesson(lesson.id, '管理员临时下架');
                                      setCommunityLessons([...updated]);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs cursor-pointer transition"
                                  >
                                    下架撤回
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    if (confirm(`确定要彻底删除课件《${lesson.title}》吗？`)) {
                                      const updated = deleteCommunityLesson(lesson.id);
                                      setCommunityLessons([...updated]);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400 cursor-pointer transition"
                                  title="删除课件"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* 双视频源与时差 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                              <div className="truncate text-amber-300/90">
                                🇹🇭 泰文原版: {lesson.thaiVideoUrl}
                              </div>
                              <div className="truncate text-blue-300/90">
                                🇨🇳 中文随动 ({lesson.chineseMediaType || 'youtube'}): {lesson.chineseVideoUrl}
                              </div>
                            </div>

                            {/* 首句试看与卡拉OK试听 */}
                            {lesson.subtitles && lesson.subtitles[0] && (
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                                <div className="truncate">
                                  <span className="text-amber-400 font-bold mr-2">第 1 句抽查:</span>
                                  <span className="text-white font-medium">{lesson.subtitles[0].thai}</span>
                                  <span className="text-slate-400 ml-2">({lesson.subtitles[0].chinese})</span>
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                  默认偏移: {lesson.defaultOffsetSeconds >= 0 ? `+${lesson.defaultOffsetSeconds}` : lesson.defaultOffsetSeconds}s
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {communityLessons.filter((l) => reviewFilter === 'all' || l.status === reviewFilter).length === 0 && (
                      <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                        <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                        <p>暂无符合此条件的课件记录。</p>
                        <p className="text-[11px] text-slate-600">
                          学员在播放器中点击「🛠️ 制作课件」完成测试并上传后，待审核记录将即时汇总在此。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: 学员学修档案与打卡记录 */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  {/* KPI 统计卡片 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">共学登记学员</div>
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
                    <span>* 学员记录保存在本地安全数据库中，尊重学修隐私，不会泄露给任何第三方公共平台。</span>
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
                          <span className="text-slate-200 group-hover:text-amber-300 font-medium">🇨🇳 解脱园中文官方频道 (@JieTuoYuan)</span>
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
                        {/* 直接输入偏移量 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">直接输入：</span>
                          <input
                            type="number"
                            step="0.1"
                            value={calibratedOffset}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v)) setCalibratedOffset(v);
                            }}
                            className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                            placeholder="0.0"
                          />
                          <span className="text-[11px] text-slate-400">秒</span>
                        </div>

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

              {/* TAB 8: 数据管理与操作日志 */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  {/* 数据备份与导出卡片 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <h5 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>共学数据导出与备份</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mb-3">
                      支持导出学员打卡学习记录与课件库数据，便于离线归档与统计。
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>导出学员记录报表 (CSV)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(curatedLessons, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `dhamma_lessons_backup_${new Date().toISOString().slice(0, 10)}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          adminAuthService.recordAuditLog('data_exported', '导出全部共学课件库 JSON 备份');
                          refreshAdminData();
                        }}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>备份全部课件库 (JSON)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('确认重置演示数据？这将刷新预置经典课件与学员打卡样本。')) {
                            localStorage.removeItem('taixue_community_lessons_v3');
                            localStorage.removeItem('taixue_confidential_students_v2');
                            refreshAdminData();
                            alert('共学数据已重置为初始默认状态！');
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>重置初始演示数据</span>
                      </button>
                    </div>
                  </div>

                  {/* 审计日志 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <h5 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-cyan-400" />
                      <span>法工校对操作日志 (Audit Trail)</span>
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
      </div>

      {/* 课件制作工坊弹窗 (Course Studio) */}
      {showStudioModal && (
        <CourseStudioModal
          isOpen={showStudioModal}
          onClose={() => {
            setShowStudioModal(false);
            setStudioPrefill(null);
          }}
          currentUserEmail="dhamma_worker"
          currentUserName="法工团队"
          prefillConfig={studioPrefill || undefined}
          onLessonCreatedAndLoaded={(lesson) => {
            refreshAdminData();
            if (onLoadLessonToPlayer) {
              onLoadLessonToPlayer(lesson);
              onClose();
            }
          }}
        />
      )}

      {/* 开示智能检索抽屉 (Dhamma Explorer) */}
      {showDhammaDrawer && (
        <DhammaExplorerDrawer
          isOpen={showDhammaDrawer}
          onClose={() => setShowDhammaDrawer(false)}
          currentThaiVideoUrl="https://www.youtube.com/watch?v=F4-tJNYDpss"
          currentThaiTitle="2026年最新实况开示"
          onSelectForDualPlayback={(cfg) => {
            if (onLoadLessonToPlayer) {
              onLoadLessonToPlayer({
                id: `lesson_${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                title: cfg.title,
                chineseTitle: cfg.title,
                speaker: '隆波帕默尊者',
                source: 'dhamma.cn',
                thaiVideoUrl: cfg.thaiVideoUrl,
                chineseVideoUrl: cfg.chineseVideoUrl,
                thaiVideoId: '',
                chineseVideoId: '',
                defaultOffsetSeconds: 0,
                totalSentences: 0,
                tags: ['dhamma.cn', '最新检索'],
                keyTerms: [],
                subtitles: []
              });
              setShowDhammaDrawer(false);
              onClose();
            }
          }}
          onSelectForStudio={(pref) => {
            setStudioPrefill(pref);
            setShowStudioModal(true);
            setShowDhammaDrawer(false);
          }}
        />
      )}
    </div>
  );
};
