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
  talkDateDisplay: string;   // 课表展示的开示日期，如 "2026.05.09" / "2018/2/10"
  sessionSuffix?: 'A' | 'B';
  sequenceNote?: string;     // 如 "第1场" / "第2场"
  isLiveBroadcast?: boolean; // 周六/周日 10:00 实时开示直播
  searchQueryHint: string;   // 若站内未收录，用于外部搜索的关键词
}

export interface DailyPracticeDay {
  dayIndex: number;          // 1949..1955
  date: string;              // YYYY-MM-DD (当周日期)
  dateDisplay: string;       // "11月16日"
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
  weekId: '2026-11-16_11-22',
  title: '日常 3 小时共修 · Zoom 播放课表',
  weekRangeLabel: '2026.11.16 – 11.22',
  zoomId: '8337654321',
  zoomPasscode: '123456',
  zoomJoinUrl: 'https://zoom.us/j/8337654321',
  posterImageUrl: '/assets/aistudio/mmexport1795144103332_52935f8e.jpg',
  days: [
    {
      dayIndex: 1949,
      date: '2026-11-16',
      dateDisplay: '11月16日',
      weekdayLabel: '星期一',
      sessions: [
        {
          id: 'd1949_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.09 隆波帕默尊者直播',
          dateStr: '2026-05-09',
          talkDateDisplay: '2026.05.09',
          searchQueryHint: '2026年5月9日 隆波帕默尊者',
        },
        {
          id: 'd1949_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《一心》——隆波帕默尊者',
          dateStr: '2018-02-10',
          talkDateDisplay: '2018/2/10',
          searchQueryHint: '一心 2018年2月10日 隆波帕默',
        },
        {
          id: 'd1949_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《四种执着》——隆波帕默尊者',
          dateStr: '2025-06-07',
          talkDateDisplay: '2025年06月07日',
          searchQueryHint: '四种执着 2025年6月7日 隆波帕默',
        },
      ],
    },
    {
      dayIndex: 1950,
      date: '2026-11-17',
      dateDisplay: '11月17日',
      weekdayLabel: '星期二',
      sessions: [
        {
          id: 'd1950_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.10 隆波帕默尊者直播',
          dateStr: '2026-05-10',
          talkDateDisplay: '2026.05.10',
          searchQueryHint: '2026年5月10日 隆波帕默尊者',
        },
        {
          id: 'd1950_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《四圣谛》——隆波帕默尊者',
          dateStr: '2018-06-16',
          talkDateDisplay: '2018年6月16日A',
          sessionSuffix: 'A',
          searchQueryHint: '四圣谛 2018年6月16日 隆波帕默',
        },
        {
          id: 'd1950_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《万般带不走，唯有业随身》——隆波帕默尊者',
          dateStr: '2025-06-08',
          talkDateDisplay: '2025年06月08日',
          searchQueryHint: '万般带不走，唯有业随身 2025年6月8日',
        },
      ],
    },
    {
      dayIndex: 1951,
      date: '2026-11-18',
      dateDisplay: '11月18日',
      weekdayLabel: '星期三',
      sessions: [
        {
          id: 'd1951_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.16 隆波帕默尊者直播',
          dateStr: '2026-05-16',
          talkDateDisplay: '2026.05.16',
          searchQueryHint: '2026年5月16日 隆波帕默尊者',
        },
        {
          id: 'd1951_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《心是自生，亦或上帝创造的？》——隆波帕默尊者',
          dateStr: '2019-02-16',
          talkDateDisplay: '2019/2/16',
          searchQueryHint: '心是自生 2019年2月16日 隆波帕默',
        },
        {
          id: 'd1951_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《功德应如何做》——隆波帕默尊者',
          dateStr: '2025-06-14',
          talkDateDisplay: '2025年06月14日',
          searchQueryHint: '功德应如何做 2025年6月14日',
        },
      ],
    },
    {
      dayIndex: 1952,
      date: '2026-11-19',
      dateDisplay: '11月19日',
      weekdayLabel: '星期四',
      sessions: [
        {
          id: 'd1952_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.17 隆波帕默尊者直播',
          dateStr: '2026-05-17',
          talkDateDisplay: '2026.05.17',
          searchQueryHint: '2026年5月17日 隆波帕默尊者',
        },
        {
          id: 'd1952_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《生活中遇到问题，就会看到修行的好处》——隆波帕默尊者',
          dateStr: '2019-06-15',
          talkDateDisplay: '2019/6/15',
          searchQueryHint: '生活中遇到问题 2019年6月15日 隆波帕默',
        },
        {
          id: 'd1952_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《修习念处直至摆脱诸苦》——隆波帕默尊者',
          dateStr: '2025-06-15',
          talkDateDisplay: '2025年06月15日',
          searchQueryHint: '修习念处直至摆脱诸苦 2025年6月15日',
        },
      ],
    },
    {
      dayIndex: 1953,
      date: '2026-11-20',
      dateDisplay: '11月20日',
      weekdayLabel: '星期五',
      sessions: [
        {
          id: 'd1953_0620',
          timeSlot: '06:20',
          periodLabel: '早课',
          rawTitle: '2026.05.23 隆波帕默尊者直播',
          dateStr: '2026-05-23',
          talkDateDisplay: '2026.05.23',
          searchQueryHint: '2026年5月23日 隆波帕默尊者',
        },
        {
          id: 'd1953_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '《修行中的陷阱》——隆波帕默尊者',
          dateStr: '2019-06-30',
          talkDateDisplay: '2019/6/30',
          searchQueryHint: '修行中的陷阱 2019年6月30日 隆波帕默',
        },
        {
          id: 'd1953_2000_1',
          timeSlot: '20:00',
          periodLabel: '晚课',
          sequenceNote: '1)',
          rawTitle: '《空顶师名，不行师道：皆是投机客》——隆波帕默尊者',
          dateStr: '2025-06-20',
          talkDateDisplay: '2025年06月20日',
          searchQueryHint: '空顶师名，不行师道 2025年6月20日',
        },
        {
          id: 'd1953_2000_2',
          timeSlot: '20:00',
          periodLabel: '晚课',
          sequenceNote: '2)',
          rawTitle: '《杯中冷暖，心间自知》——隆波帕默尊者',
          dateStr: '2025-08-01',
          talkDateDisplay: '2025年08月01日',
          searchQueryHint: '杯中冷暖，心间自知 2025年8月1日',
        },
      ],
    },
    {
      dayIndex: 1954,
      date: '2026-11-21',
      dateDisplay: '11月21日',
      weekdayLabel: '星期六',
      sessions: [
        {
          id: 'd1954_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '隆波帕默尊者开示直播',
          dateStr: '2026-11-21',
          talkDateDisplay: '2026.11.21 直播',
          isLiveBroadcast: true,
          searchQueryHint: '2026年11月21日 隆波帕默尊者',
        },
        {
          id: 'd1954_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《分离名色进而照见实相》——隆波帕默尊者',
          dateStr: '2025-06-21',
          talkDateDisplay: '2025年06月21日',
          searchQueryHint: '分离名色进而照见实相 2025年6月21日',
        },
      ],
    },
    {
      dayIndex: 1955,
      date: '2026-11-22',
      dateDisplay: '11月22日',
      weekdayLabel: '星期日',
      sessions: [
        {
          id: 'd1955_1000',
          timeSlot: '10:00',
          periodLabel: '午前',
          rawTitle: '隆波帕默尊者开示直播',
          dateStr: '2026-11-22',
          talkDateDisplay: '2026.11.22 直播',
          isLiveBroadcast: true,
          searchQueryHint: '2026年11月22日 隆波帕默尊者',
        },
        {
          id: 'd1955_2000',
          timeSlot: '20:00',
          periodLabel: '晚课',
          rawTitle: '《戒定慧的修习之道》——隆波帕默尊者',
          dateStr: '2025-06-22',
          talkDateDisplay: '2025年06月22日',
          searchQueryHint: '戒定慧的修习之道 2025年6月22日',
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

export function resolveScheduleSessionResources(
  session: DailyPracticeSession,
  allLessons: CuratedLesson[] = CURATED_LESSONS_PRESETS
): ResolvedSessionResources {
  const { dateStr, sessionSuffix } = session;

  const matchedLesson =
    allLessons.find((l) => l.date === dateStr) || null;

  const allAudioItems = [
    ...SOLIDIFIED_AUDIO_CATALOG_2026.items,
    ...SOLIDIFIED_AUDIO_CATALOG_2025.items,
  ];
  const matchedAudio =
    allAudioItems.find(
      (item) =>
        item.date === dateStr &&
        (!sessionSuffix || !item.sessionSuffix || item.sessionSuffix === sessionSuffix)
    ) ||
    allAudioItems.find((item) => item.date === dateStr) ||
    null;

  const matchedYouTube =
    SOLIDIFIED_YOUTUBE_CATALOG.items.find((item) => item.date === dateStr) || null;

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
      dhammaComArchiveUrl:
        cnYear === '2018'
          ? 'https://www.dhamma.com/download/2561/'
          : cnYear === '2019'
          ? 'https://www.dhamma.com/download/2562/'
          : 'https://www.dhamma.com/audio/',
      youtubeChineseSearchUrl: `https://www.youtube.com/@JieTuoYuan/search?query=${encodeURIComponent(keyword)}`,
      youtubeThaiLiveUrl: 'https://www.youtube.com/@luangpupramote/streams',
      youtubeChineseLiveUrl: 'https://www.youtube.com/@JieTuoYuan/streams',
    },
  };
}
