import { SOLIDIFIED_AUDIO_CATALOG_2025 } from './solidifiedAudioCatalog2025';
import { SOLIDIFIED_AUDIO_CATALOG_2026 } from './solidifiedAudioCatalog2026';
import { SOLIDIFIED_YOUTUBE_CATALOG } from './solidifiedYouTubeCatalog';
import { CURATED_LESSONS_PRESETS } from './presetLessonsLibrary';
import { LuangporPairedItem } from '../services/offlineAudioStorage';
import { YouTubePairedTalkItem, CuratedLesson } from '../types';

export interface DailyPracticeSession {
  id: string;
  timeSlot: string;          // e.g. "06:20", "10:00", "20:00"
  periodLabel: string;       // e.g. "早课" | "午前" | "晚课"
  rawTitle: string;          // 课表原始法谈标题
  dateStr: string;           // YYYY-MM-DD 用于自动匹配站内 2025/2026/视频库
  talkDateDisplay: string;   // 课表展示的开示日期，如 "2026.05.07" / "2020/12/26"
  sessionSuffix?: 'A' | 'B';
  sequenceNote?: string;     // 如 "第1场" / "第2场"
  isLiveBroadcast?: boolean; // 周六/周日 10:00 实时开示直播
  searchQueryHint: string;   // 若站内未收录，用于外部搜索的关键词
}

export interface DailyPracticeDay {
  dayIndex: number;          // 1956..1962
  date: string;              // YYYY-MM-DD (当周日期)
  dateDisplay: string;       // "11月23日"
  weekdayLabel: string;      // "星期一"
  sessions: DailyPracticeSession[];
}

export interface WeeklyPracticeSchedule {
  weekId: string;
  title: string;
  weekRangeLabel: string;
  zoomId: string;
  zoomPasscode: string;
  zoomJoinUrl: string;
  posterImageUrl: string;
  days: DailyPracticeDay[];
}

export interface ResolvedSessionResources {
  matchedLesson: CuratedLesson | null;
  matchedAudio: LuangporPairedItem | null;
  matchedYouTube: YouTubePairedTalkItem | null;
  hasAnySiteContent: boolean;
  externalSearchLinks: {
    dhammaCnSearchUrl: string;
    dhammaComArchiveUrl: string;
    youtubeChineseSearchUrl: string;
    youtubeThaiLiveUrl: string;
    youtubeChineseLiveUrl: string;
  };
}

export const CURRENT_THREE_HOUR_SCHEDULE: WeeklyPracticeSchedule = {
  weekId: '2026-11-23_11-29',
  title: '日常 3 小时共修 · Zoom 播放课表',
  weekRangeLabel: '2026.11.23 – 11.29',
  zoomId: '8337654321',
  zoomPasscode: '123456',
  zoomJoinUrl: 'https://zoom.us/j/8337654321',
  posterImageUrl: '/assets/aistudio/mmexport1795344595252_a97f8fba.jpg',
  days: [
    {
      dayIndex: 1956,
      date: '2026-11-23',
      dateDisplay: '11月23日',
      weekdayLabel: '星期一',
      sessions: [
        {
          id: 'd1956_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.07 阿姜给尊者开示（上）',
          dateStr: '2026-05-07',
          talkDateDisplay: '2026.05.07',
          searchQueryHint: '阿姜给尊者 2026.05.07 开示',
        },
        {
          id: 'd1956_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《辨识不出自身的烦恼，修行就无法进步》——隆波帕默尊者',
          dateStr: '2019-08-03',
          talkDateDisplay: '2019年8月3日A',
          sessionSuffix: 'A',
          searchQueryHint: '辨识不出自身的烦恼 2019年8月3日 隆波帕默',
        },
        {
          id: 'd1956_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《隆波帕默尊者开示》——隆波帕默尊者',
          dateStr: '2025-06-28',
          talkDateDisplay: '2025年06月28日',
          searchQueryHint: '连鬼都怕三法印 2025年6月28日 隆波帕默',
        },
      ],
    },
    {
      dayIndex: 1957,
      date: '2026-11-24',
      dateDisplay: '11月24日',
      weekdayLabel: '星期二',
      sessions: [
        {
          id: 'd1957_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.07 阿姜给尊者开示（下）',
          dateStr: '2026-05-07',
          talkDateDisplay: '2026.05.07',
          searchQueryHint: '阿姜给尊者 2026.05.07 开示',
        },
        {
          id: 'd1957_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《心安住是工具，心宁静是力量》——隆波帕默尊者',
          dateStr: '2020-12-26',
          talkDateDisplay: '2020/12/26',
          searchQueryHint: '心安住是工具 心宁静是力量 2020年12月26日',
        },
        {
          id: 'd1957_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《求功德享世间乐，悟善法破生死链》——隆波帕默尊者',
          dateStr: '2025-06-29',
          talkDateDisplay: '2025年06月29日',
          searchQueryHint: '求功德享世间乐 悟善法破生死链 2025年6月29日',
        },
      ],
    },
    {
      dayIndex: 1958,
      date: '2026-11-25',
      dateDisplay: '11月25日',
      weekdayLabel: '星期三',
      sessions: [
        {
          id: 'd1958_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.07 阿姜纳开示（上）',
          dateStr: '2026-05-07',
          talkDateDisplay: '2026.05.07',
          searchQueryHint: '阿姜纳 2026.05.07 开示',
        },
        {
          id: 'd1958_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《训练减少自己的自私》——隆波帕默尊者',
          dateStr: '2021-01-24',
          talkDateDisplay: '2021/1/24',
          searchQueryHint: '训练减少自己的自私 2021年1月24日',
        },
        {
          id: 'd1958_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《戒定慧的要点》——隆波帕默尊者',
          dateStr: '2025-07-05',
          talkDateDisplay: '2025年07月05日',
          searchQueryHint: '戒定慧的要点 2025年7月5日 隆波帕默',
        },
      ],
    },
    {
      dayIndex: 1959,
      date: '2026-11-26',
      dateDisplay: '11月26日',
      weekdayLabel: '星期四',
      sessions: [
        {
          id: 'd1959_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.07 阿姜纳开示（下）',
          dateStr: '2026-05-07',
          talkDateDisplay: '2026.05.07',
          searchQueryHint: '阿姜纳 2026.05.07 开示',
        },
        {
          id: 'd1959_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《自己的身心就是道场》——隆波帕默尊者',
          dateStr: '2021-04-30',
          talkDateDisplay: '2021/4/30',
          searchQueryHint: '自己的身心就是道场 2021年4月30日',
        },
        {
          id: 'd1959_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《每天前进一步也很好》——隆波帕默尊者',
          dateStr: '2025-07-06',
          talkDateDisplay: '2025年07月06日',
          searchQueryHint: '每天前进一步也很好 2025年7月6日',
        },
      ],
    },
    {
      dayIndex: 1960,
      date: '2026-11-27',
      dateDisplay: '11月27日',
      weekdayLabel: '星期五',
      sessions: [
        {
          id: 'd1960_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.07 阿姜妮开示（上）',
          dateStr: '2026-05-07',
          talkDateDisplay: '2026.05.07',
          searchQueryHint: '阿姜妮 2026.05.07 开示',
        },
        {
          id: 'd1960_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《你信吗？看破世间的方式居然是向内自我探索》——隆波帕默尊者',
          dateStr: '2021-08-28',
          talkDateDisplay: '2021/8/28',
          searchQueryHint: '你信吗 看破世间的方式 2021年8月28日',
        },
        {
          id: 'd1960_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《以实修呵护佛教》——隆波帕默尊者',
          dateStr: '2025-07-10',
          talkDateDisplay: '2025年07月10日',
          sessionSuffix: 'A',
          searchQueryHint: '以实修呵护佛教 2025年7月10日',
        },
      ],
    },
    {
      dayIndex: 1961,
      date: '2026-11-28',
      dateDisplay: '11月28日',
      weekdayLabel: '星期六',
      sessions: [
        {
          id: 'd1961_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《中道的“中”》——隆波帕默尊者',
          dateStr: '2021-08-29',
          talkDateDisplay: '2021/8/29',
          searchQueryHint: '中道的中 2021年8月29日 隆波帕默',
        },
        {
          id: 'd1961_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《如何呵护好佛教》——隆波帕默尊者',
          dateStr: '2025-07-12',
          talkDateDisplay: '2025年07月12日',
          searchQueryHint: '如何呵护好佛教 2025年7月12日',
        },
      ],
    },
    {
      dayIndex: 1962,
      date: '2026-11-29',
      dateDisplay: '11月29日',
      weekdayLabel: '星期日',
      sessions: [
        {
          id: 'd1962_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《就算学阿毗达摩，也别小瞧经藏》——隆波帕默尊者',
          dateStr: '2021-05-01',
          talkDateDisplay: '2021/5/1',
          searchQueryHint: '就算学阿毗达摩 也别小瞧经藏 2021年5月1日',
        },
        {
          id: 'd1962_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《苦是生命的常态》——隆波帕默尊者',
          dateStr: '2025-07-13',
          talkDateDisplay: '2025年07月13日',
          searchQueryHint: '苦是生命的常态 2025年7月13日',
        },
      ],
    },
  ],
};

function cleanKeywordForSearch(rawTitle: string): string {
  const bracketMatch = rawTitle.match(/《([^》]+)》/);
  if (bracketMatch?.[1]) return bracketMatch[1].trim();
  return rawTitle.replace(/——.*$/, '').trim();
}

const DHAMMA_COM_BE_ARCHIVE: Record<string, string> = {
  '2018': 'https://www.dhamma.com/download/2561/',
  '2019': 'https://www.dhamma.com/download/2562/',
  '2020': 'https://www.dhamma.com/download/2563/',
  '2021': 'https://www.dhamma.com/download/2564/',
  '2022': 'https://www.dhamma.com/download/2565/',
  '2023': 'https://www.dhamma.com/download/2566/',
  '2024': 'https://www.dhamma.com/download/2567/',
  '2025': 'https://www.dhamma.com/download/2568/',
  '2026': 'https://www.dhamma.com/download/2569/',
};

export function resolveScheduleSessionResources(
  session: DailyPracticeSession,
  allLessons: CuratedLesson[] = CURATED_LESSONS_PRESETS
): ResolvedSessionResources {
  const { dateStr, sessionSuffix, rawTitle } = session;
  const isOtherTeacher = /阿姜/.test(rawTitle) && !/隆波帕默/.test(rawTitle);

  const matchedLesson = isOtherTeacher
    ? null
    : allLessons.find((l) => l.date === dateStr) || null;

  const allAudioItems = [
    ...SOLIDIFIED_AUDIO_CATALOG_2026.items,
    ...SOLIDIFIED_AUDIO_CATALOG_2025.items,
  ];
  const sameDateAudio = isOtherTeacher
    ? []
    : allAudioItems.filter((item) => item.date === dateStr);
  const matchedAudio =
    sameDateAudio.find(
      (item) =>
        (!sessionSuffix || !item.sessionSuffix || item.sessionSuffix === sessionSuffix) &&
        Boolean(item.chinese?.mp3Url)
    ) ||
    sameDateAudio.find(
      (item) =>
        !sessionSuffix || !item.sessionSuffix || item.sessionSuffix === sessionSuffix
    ) ||
    sameDateAudio[0] ||
    null;

  const matchedYouTube = isOtherTeacher
    ? null
    : SOLIDIFIED_YOUTUBE_CATALOG.items.find((item) => item.date === dateStr) || null;

  const hasAnySiteContent = Boolean(
    matchedLesson ||
      matchedAudio?.thai?.mp3Url ||
      matchedAudio?.chinese?.mp3Url ||
      matchedYouTube?.thai?.videoId ||
      matchedYouTube?.chinese?.videoId
  );

  const keyword = cleanKeywordForSearch(session.rawTitle) || session.searchQueryHint;
  const cnYear = dateStr.slice(0, 4);

  return {
    matchedLesson,
    matchedAudio,
    matchedYouTube,
    hasAnySiteContent,
    externalSearchLinks: {
      dhammaCnSearchUrl: `https://www.dhamma.cn/index.php?search=${encodeURIComponent(keyword)}`,
      dhammaComArchiveUrl: DHAMMA_COM_BE_ARCHIVE[cnYear] || 'https://www.dhamma.com/audio/',
      youtubeChineseSearchUrl: `https://www.youtube.com/@JieTuoYuan/search?query=${encodeURIComponent(keyword)}`,
      youtubeThaiLiveUrl: 'https://www.youtube.com/@luangpupramote/streams',
      youtubeChineseLiveUrl: 'https://www.youtube.com/@JieTuoYuan/streams',
    },
  };
}
