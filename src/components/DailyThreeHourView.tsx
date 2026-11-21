import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Headphones,
  Image as ImageIcon,
  Radio,
  Search,
  Sparkles,
  Video,
  X,
  BookOpen,
} from 'lucide-react';
import {
  CURRENT_THREE_HOUR_SCHEDULE,
  DailyPracticeSession,
  resolveScheduleSessionResources,
} from '../data/dailyThreeHourSchedule';
import { CuratedLesson } from '../types';

export interface DailyThreeHourAudioTrackPayload {
  mp3Url: string;
  fileName: string;
  fileCode?: string;
  dateLabel?: string;
  trackType: 'thai_audio' | 'chinese_audio';
}

export interface DailyThreeHourVideoPairPayload {
  thaiVideoUrl: string;
  chineseVideoUrl?: string;
  title?: string;
}

interface DailyThreeHourViewProps {
  allLessons: CuratedLesson[];
  onOpenAudioTrack: (track: DailyThreeHourAudioTrackPayload) => void;
  onOpenVideoPair: (pair: DailyThreeHourVideoPairPayload) => void;
  onOpenCuratedLesson: (lessonId: string) => void;
  onBackToStudy?: () => void;
}

function getLocalIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function extractCleanTitle(rawTitle: string): string {
  const bracket = rawTitle.match(/《([^》]+)》/);
  if (bracket?.[1]) return bracket[1].trim();
  return rawTitle.replace(/——.*$/, '').trim();
}

export const DailyThreeHourView: React.FC<DailyThreeHourViewProps> = ({
  allLessons,
  onOpenAudioTrack,
  onOpenVideoPair,
  onOpenCuratedLesson,
  onBackToStudy,
}) => {
  const schedule = CURRENT_THREE_HOUR_SCHEDULE;
  const todayIso = useMemo(() => getLocalIsoDate(), []);

  const [selectedDayDate, setSelectedDayDate] = useState<string>('all');
  const [onlyLinked, setOnlyLinked] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedZoom, setCopiedZoom] = useState<boolean>(false);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);

  const enrichedDays = useMemo(() => {
    return schedule.days.map((day) => ({
      ...day,
      isToday: day.date === todayIso,
      sessions: day.sessions.map((session) => ({
        session,
        resolved: resolveScheduleSessionResources(session, allLessons),
      })),
    }));
  }, [schedule.days, allLessons, todayIso]);

  const stats = useMemo(() => {
    let total = 0;
    let linked = 0;
    let live = 0;
    let externalArchive = 0;
    for (const day of enrichedDays) {
      for (const item of day.sessions) {
        total += 1;
        if (item.resolved.hasAnySiteContent) {
          linked += 1;
        } else if (item.session.isLiveBroadcast) {
          live += 1;
        } else {
          externalArchive += 1;
        }
      }
    }
    return { total, linked, live, externalArchive };
  }, [enrichedDays]);

  const filteredDays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedDays
      .filter((day) => selectedDayDate === 'all' || day.date === selectedDayDate)
      .map((day) => {
        const matchedSessions = day.sessions.filter(({ session, resolved }) => {
          if (onlyLinked && !resolved.hasAnySiteContent) return false;
          if (!q) return true;
          const haystack = [
            day.dateDisplay,
            day.weekdayLabel,
            `第${day.dayIndex}天`,
            session.timeSlot,
            session.rawTitle,
            session.talkDateDisplay,
            resolved.matchedAudio?.chinese?.fileCode || '',
            resolved.matchedAudio?.thai?.fileCode || '',
            resolved.matchedAudio?.chinese?.title || '',
            resolved.matchedAudio?.thai?.title || '',
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
        return { ...day, sessions: matchedSessions };
      })
      .filter((day) => day.sessions.length > 0);
  }, [enrichedDays, selectedDayDate, onlyLinked, searchQuery]);

  const handleCopyZoomInfo = async () => {
    const text = `日常3小时共修 Zoom 会议号：${schedule.zoomId}  密码：${schedule.zoomPasscode}  链接：${schedule.zoomJoinUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedZoom(true);
      window.setTimeout(() => setCopiedZoom(false), 2200);
    } catch {
      setCopiedZoom(false);
    }
  };

  const handlePlaySessionAudio = (
    session: DailyPracticeSession,
    trackType: 'thai_audio' | 'chinese_audio',
    mp3Url: string,
    fileName: string,
    fileCode?: string
  ) => {
    onOpenAudioTrack({
      mp3Url,
      fileName,
      fileCode,
      dateLabel: session.dateStr,
      trackType,
    });
  };

  return (
    <div className="space-y-5">
      {/* 顶部课表总览与 Zoom 快捷入口 */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300/90 font-semibold">
              <CalendarDays className="w-4 h-4 text-amber-400 shrink-0" />
              <span>每周更新课表</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-slate-300">
                {schedule.weekRangeLabel}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono tabular-nums text-slate-400">
                第 1949–1955 天
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              日常 3 小时共修 · Zoom 播放课表
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              每日早课 <span className="font-mono tabular-nums text-slate-200">06:20</span>、午前{' '}
              <span className="font-mono tabular-nums text-slate-200">10:00</span>、晚课{' '}
              <span className="font-mono tabular-nums text-slate-200">20:00</span> 共修法谈。
              本周共 <span className="font-mono tabular-nums text-slate-200">{stats.total}</span> 场，
              其中 <span className="font-mono tabular-nums text-amber-300 font-semibold">{stats.linked}</span> 场已直接关联站内音视频与课件，
              其余 <span className="font-mono tabular-nums text-slate-300">{stats.externalArchive + stats.live}</span> 场均在右侧附有检索指引或直播入口。
            </p>
          </div>

          {/* Zoom 房间信息与操作区 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/85 p-3.5 sm:p-4 flex flex-col gap-3 shrink-0 lg:min-w-[330px]">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="text-slate-400">Zoom 会议号与密码</div>
                <div className="font-mono tabular-nums text-sm sm:text-base font-bold text-white tracking-wide">
                  {schedule.zoomId}
                  <span className="mx-2 text-slate-600">/</span>
                  <span className="text-amber-300">{schedule.zoomPasscode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyZoomInfo}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 cursor-pointer transition shrink-0"
              >
                {copiedZoom ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>复制号密</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={schedule.zoomJoinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[135px] px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>进入 Zoom 共修</span>
              </a>
              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>查看课表原图</span>
              </button>
              {onBackToStudy && (
                <button
                  type="button"
                  onClick={onBackToStudy}
                  className="px-2.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 text-xs font-medium cursor-pointer transition"
                >
                  返回学习区
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 日期切换与筛选栏 */}
      <section className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDayDate('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
              selectedDayDate === 'all'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            全部 7 天
          </button>

          {enrichedDays.map((day) => {
            const active = selectedDayDate === day.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayDate(day.date)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span className="font-mono tabular-nums">{day.date.slice(5).replace('-', '/')}</span>
                <span>{day.weekdayLabel.replace('星期', '周')}</span>
                {day.isToday && (
                  <span
                    className={`text-[10px] font-bold ${
                      active ? 'text-slate-900' : 'text-amber-300'
                    }`}
                  >
                    今日
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索法谈篇名、开示日期（如 2025-06-07）或档案编号..."
              className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-amber-500/70 text-xs text-slate-100 placeholder:text-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer"
                aria-label="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
            <button
              type="button"
              onClick={() => setOnlyLinked((v) => !v)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                onlyLinked
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              {onlyLinked ? '仅看站内已关联（已开启）' : '仅看站内已关联'}
            </button>
            <span className="text-slate-500 font-mono tabular-nums">
              已匹配 {stats.linked}/{stats.total}
            </span>
          </div>
        </div>
      </section>

      {/* 每日课表明细 */}
      {filteredDays.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-200">没有符合当前筛选条件的共修场次</p>
          <p className="text-xs text-slate-400">可尝试清空关键词或关闭「仅看站内已关联」。</p>
          <button
            type="button"
            onClick={() => {
              setSelectedDayDate('all');
              setOnlyLinked(false);
              setSearchQuery('');
            }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 cursor-pointer transition"
          >
            重置筛选
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDays.map((day) => (
            <article
              key={day.date}
              className={`rounded-2xl border bg-slate-900/65 overflow-hidden ${
                day.isToday ? 'border-amber-500/50' : 'border-slate-800'
              }`}
            >
              {/* 每日标题栏 */}
              <div className="px-4 sm:px-5 py-3 bg-slate-950/75 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono tabular-nums text-xs font-bold text-amber-300">
                    第 {day.dayIndex} 天
                  </span>
                  <span className="text-slate-700">/</span>
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {day.dateDisplay} · {day.weekdayLabel}
                  </h2>
                  {day.isToday && (
                    <span className="text-xs font-bold text-emerald-300">
                      · 今日共修
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  {day.date}
                </span>
              </div>

              {/* 该日各时间段法谈列表 */}
              <div className="divide-y divide-slate-800/80">
                {day.sessions.map(({ session, resolved }) => {
                  const {
                    matchedLesson,
                    matchedAudio,
                    matchedYouTube,
                    hasAnySiteContent,
                    externalSearchLinks,
                  } = resolved;
                  const cleanKeyword = extractCleanTitle(session.rawTitle);
                  const archiveCodes = [
                    matchedAudio?.chinese?.fileCode,
                    matchedAudio?.thai?.fileCode,
                  ].filter(Boolean);

                  return (
                    <div
                      key={session.id}
                      className="p-4 sm:px-5 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/90 transition-colors"
                    >
                      {/* 左+中：时间与法谈主体信息 */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5 flex-1 min-w-0">
                        <div className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-0.5 shrink-0 sm:w-20">
                          <span className="font-mono tabular-nums text-base sm:text-lg font-extrabold text-amber-300 leading-none">
                            {session.timeSlot}
                          </span>
                          <span className="text-xs text-slate-400">
                            {session.periodLabel}
                          </span>
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            {session.sequenceNote && (
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {session.sequenceNote}
                              </span>
                            )}
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                              {session.rawTitle}
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                            <span>
                              开示日期：
                              <span className="font-mono tabular-nums text-slate-300">
                                {session.talkDateDisplay}
                              </span>
                            </span>

                            {hasAnySiteContent ? (
                              <>
                                <span className="text-emerald-300 font-medium">
                                  站内已关联
                                  {archiveCodes.length > 0 && (
                                    <span className="font-mono text-slate-300 ml-1">
                                      ({archiveCodes.join(' / ')})
                                    </span>
                                  )}
                                </span>
                                {matchedYouTube?.thaiCaptionStatus === 'manual' && (
                                  <span className="text-amber-300 font-medium">
                                    YouTube 含官方泰文字幕
                                  </span>
                                )}
                                {matchedLesson && (
                                  <span className="text-sky-300 font-medium">
                                    已配逐词精读课件
                                  </span>
                                )}
                              </>
                            ) : session.isLiveBroadcast ? (
                              <span className="text-sky-300 font-medium">
                                周末实时开示直播时段
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                站内暂未收录 · 请按右侧提示自寻
                              </span>
                            )}
                          </div>

                          {matchedAudio?.chinese?.title && (
                            <p className="text-xs text-slate-400 truncate">
                              站内档案名：{matchedAudio.chinese.title}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 右侧：直接播放操作区 OR 未收录外搜提示区 */}
                      <div className="lg:w-[400px] xl:w-[440px] shrink-0">
                        {hasAnySiteContent ? (
                          <div className="flex flex-wrap items-center lg:justify-end gap-2">
                            {matchedLesson && (
                              <button
                                type="button"
                                onClick={() => onOpenCuratedLesson(matchedLesson.id)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>进入逐词课件</span>
                              </button>
                            )}

                            {matchedAudio?.chinese?.mp3Url && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePlaySessionAudio(
                                    session,
                                    'chinese_audio',
                                    matchedAudio.chinese!.mp3Url,
                                    matchedAudio.chinese!.title ||
                                      matchedAudio.chinese!.fileName ||
                                      session.rawTitle,
                                    matchedAudio.chinese!.fileCode
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Headphones className="w-3.5 h-3.5" />
                                <span>听中文同传</span>
                              </button>
                            )}

                            {matchedAudio?.thai?.mp3Url && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePlaySessionAudio(
                                    session,
                                    'thai_audio',
                                    matchedAudio.thai!.mp3Url,
                                    matchedAudio.thai!.title ||
                                      matchedAudio.thai!.fileName ||
                                      session.rawTitle,
                                    matchedAudio.thai!.fileCode
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>听泰语原声</span>
                              </button>
                            )}

                            {matchedYouTube?.thai?.url && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenVideoPair({
                                    thaiVideoUrl: matchedYouTube.thai!.url,
                                    chineseVideoUrl: matchedYouTube.chinese?.url,
                                    title: session.rawTitle,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>
                                  {matchedYouTube.thaiCaptionStatus === 'manual'
                                    ? '看双语视频 · 官方字幕'
                                    : '看泰语视频'}
                                </span>
                              </button>
                            )}
                          </div>
                        ) : session.isLiveBroadcast ? (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                            <div className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                              <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                              <span>
                                周末实时直播档，请在开播时间进入上方 Zoom 房间，或前往官方频道跟听直播：
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={externalSearchLinks.youtubeChineseLiveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                              >
                                <span>解脱园中文直播</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                              <a
                                href={externalSearchLinks.youtubeThaiLiveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                              >
                                <span>泰语官方直播</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-3 space-y-2">
                            <p className="text-xs text-slate-300 leading-relaxed">
                              本站暂未收录此 {session.dateStr.slice(0, 4)} 年往期归档，可按篇名「
                              <span className="text-amber-200 font-medium">{cleanKeyword}</span>
                              」与日期前往下列官方库自行查找收听：
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={externalSearchLinks.dhammaCnSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                              >
                                <span>搜 dhamma.cn</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                              <a
                                href={externalSearchLinks.dhammaComArchiveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                              >
                                <span>dhamma.com 历年库</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                              <a
                                href={externalSearchLinks.youtubeChineseSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 transition"
                              >
                                <span>搜解脱园 YouTube</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 原图课表查看弹窗 */}
      {showPosterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-sm"
          onClick={() => setShowPosterModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[92vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>本周课表原图（{schedule.weekRangeLabel}）</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                aria-label="关闭原图"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-950 flex items-start justify-center">
              <img
                src={schedule.posterImageUrl}
                alt="Zoom 播放课表 2026.11.16-11.22"
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
