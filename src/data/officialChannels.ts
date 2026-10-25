// 隆波帕默尊者 Wat Suan Santidham 官方原版直播与解脱园中文同传官方频道与对照中枢
import { SubtitleLine } from '../types';
import { DAILY_PRACTICE_SUBTITLES, DAILY_PRACTICE_TALK_TITLE, DAILY_PRACTICE_TALK_ZH_TITLE } from './luangporTalkDailyPractice';
import { LUANGPOR_OCT_18_SUBTITLES, LUANGPOR_OCT_18_TALK_TITLE, LUANGPOR_OCT_18_TALK_ZH_TITLE } from './luangporTalk18Oct';

// 官方频道直接直达链接（供师兄师姐直接点击，避免复制粘贴繁琐步骤）
export const OFFICIAL_THAI_STREAMS_URL = 'https://www.youtube.com/@luangpupramote/streams';
export const OFFICIAL_CHINESE_SEARCH_URL = 'https://www.youtube.com/results?sp=mAEA&search_query=解脱园';

export interface OfficialPairedDiscourse {
  id: string;
  date: string;
  dateDisplay: string;
  // 泰文原版
  thaiVideoUrl: string;
  thaiVideoId: string;
  thaiTitle: string;
  // 中文同传
  chineseVideoUrl: string;
  chineseVideoId: string;
  chineseTitle: string;
  // 综合标题（中文在前，泰文在后）
  combinedTitle: string;
  // 字幕状态与句数
  subtitleType: 'manual_verified' | 'auto_generated';
  subtitleStatusLabel: string;
  sentenceCount: number;
  offsetSeconds: number;
  subtitles: SubtitleLine[];
  description: string;
}

// 官方已完成双轨对照与人工精校对齐的课件列表
export const OFFICIAL_PAIRED_DISCOURSES: OfficialPairedDiscourse[] = [
  {
    id: 'lesson_20261018',
    date: '2026-10-18',
    dateDisplay: '2026年10月18日',
    thaiVideoUrl: 'https://www.youtube.com/watch?v=F4-tJNYDpss',
    thaiVideoId: 'F4-tJNYDpss',
    thaiTitle: LUANGPOR_OCT_18_TALK_TITLE,
    chineseVideoUrl: 'https://www.youtube.com/watch?v=HR-O2XYifbI',
    chineseVideoId: 'HR-O2XYifbI',
    chineseTitle: LUANGPOR_OCT_18_TALK_ZH_TITLE,
    combinedTitle: `${LUANGPOR_OCT_18_TALK_ZH_TITLE} ｜ ${LUANGPOR_OCT_18_TALK_TITLE}`,
    subtitleType: 'manual_verified',
    subtitleStatusLabel: '官方人工精校字幕 (746句全篇)',
    sentenceCount: 746,
    offsetSeconds: 0.0,
    subtitles: LUANGPOR_OCT_18_SUBTITLES,
    description: 'Wat Suan Santidham 官方周日实况开示，已完成全篇 746 句中泰毫秒对齐与朱拉隆功音标释义。'
  },
  {
    id: 'lesson_20261017',
    date: '2026-10-17',
    dateDisplay: '2026年10月17日',
    thaiVideoUrl: 'https://www.youtube.com/watch?v=wx6pzQ9QltQ',
    thaiVideoId: 'wx6pzQ9QltQ',
    thaiTitle: DAILY_PRACTICE_TALK_TITLE,
    chineseVideoUrl: 'https://www.youtube.com/watch?v=HfYrKhJh_SU',
    chineseVideoId: 'HfYrKhJh_SU',
    chineseTitle: DAILY_PRACTICE_TALK_ZH_TITLE,
    combinedTitle: `${DAILY_PRACTICE_TALK_ZH_TITLE} ｜ ${DAILY_PRACTICE_TALK_TITLE}`,
    subtitleType: 'manual_verified',
    subtitleStatusLabel: '官方人工精校字幕 (1,198句全篇)',
    sentenceCount: 1198,
    offsetSeconds: 0.0,
    subtitles: DAILY_PRACTICE_SUBTITLES,
    description: 'Wat Suan Santidham 官方周六实况开示，已完成全篇 1,198 句逐词释义与毫秒双轨同步。'
  }
];
