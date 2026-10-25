import { CuratedLesson, SubtitleLine } from '../types';
import { 
  LUANGPOR_OCT_18_SUBTITLES, 
  LUANGPOR_OCT_18_TALK_TITLE, 
  LUANGPOR_OCT_18_TALK_ZH_TITLE 
} from './luangporTalk18Oct';
import {
  DAILY_PRACTICE_SUBTITLES,
  DAILY_PRACTICE_TALK_TITLE,
  DAILY_PRACTICE_TALK_ZH_TITLE
} from './luangporTalkDailyPractice';

// 2026 最新《在日常生活与工作中修行》开示 6 大核心巴利法词
export const DAILY_PRACTICE_KEY_TERMS = [
  {
    thai: 'มีสติ',
    romanization: 'mii sà-tì',
    chinese: '正念觉知 / 有觉性',
    explanation: '觉知当下身心实相，工作与生活中身动心动随时觉知，不迎不拒',
    shortcutKey: 'S'
  },
  {
    thai: 'ภาวนา',
    romanization: 'pʰaa-wáʔ-naa',
    chinese: '修行 / 心灵修习',
    explanation: '不单靠睡前坐禅，在平凡日常生活中融入修习才能快速进步',
    shortcutKey: 'P'
  },
  {
    thai: 'จิต',
    romanization: 'cìt',
    chinese: '心 / 识知心',
    explanation: '心跑去想知道，心起喜怒哀乐知道，心是生灭变化者',
    shortcutKey: 'C'
  },
  {
    thai: 'ร่างกาย',
    romanization: 'râaŋ-kaaj',
    chinese: '身体 / 色身',
    explanation: '身体呼吸、行住坐卧、肢体动作，皆是培养觉知的极佳所缘',
    shortcutKey: 'K'
  },
  {
    thai: 'ทำงาน',
    romanization: 'tʰam ŋaan',
    chinese: '上班工作',
    explanation: '工作与修行无冲突，专注处理事务，间歇时刻观照自心',
    shortcutKey: 'W'
  },
  {
    thai: 'หลง',
    romanization: 'lǒŋ',
    chinese: '走神 / 迷失',
    explanation: '心迷失在所看所听或念头故事中，一旦觉察，知者心便自然生起',
    shortcutKey: 'L'
  }
];

// 2026-10-18 官方基准开示精选 6 大核心巴利法词
export const FLAGSHIP_20261018_KEY_TERMS = [
  {
    thai: 'สติ',
    romanization: 'sà-tì',
    chinese: '正念 / 觉知',
    explanation: '觉知当下正在发生的身心实相，不迎不拒，不随波逐流',
    shortcutKey: 'S'
  },
  {
    thai: 'มิจฉาทิฏฐิ',
    romanization: 'mìt-cʰǎa-tʰít-tʰì',
    chinese: '邪见 / 颠倒妄见',
    explanation: '误执身心为恒常、快乐、自我、主宰的常见与断见',
    shortcutKey: 'M'
  },
  {
    thai: 'สัมมาสมาธิ',
    romanization: 'sǎm-maa-sà-maa-tʰí',
    chinese: '正定 / 知者心安住',
    explanation: '心安住成为知者、观者，不紧绷、不散乱的清净心定',
    shortcutKey: 'D'
  },
  {
    thai: 'ขันธ์ 5',
    romanization: 'kʰǎn-hâa',
    chinese: '五蕴 (色受想行识)',
    explanation: '物质身体与精神活动的总和，无常、苦、无我',
    shortcutKey: 'K'
  },
  {
    thai: 'โสดาบัน',
    romanization: 'sǒo-daa-ban',
    chinese: '须陀洹 / 入流圣者',
    explanation: '断身见（萨迦耶见）、疑结与戒禁取结的第一道果圣者',
    shortcutKey: '1'
  },
  {
    thai: 'สังสารวัฏ',
    romanization: 'sǎŋ-sǎa-rá-wát',
    chinese: '轮回 / 生死流转',
    explanation: '因无明与渴爱驱动，于十二因缘大苦聚中循环不已',
    shortcutKey: 'W'
  }
];

// 预设精品课件总库：仅保留 10月17日 与 10月18日 官方原版实况双视频
export const CURATED_LESSONS_PRESETS: CuratedLesson[] = [
  {
    id: 'lesson_20261017',
    date: '2026-10-17',
    title: DAILY_PRACTICE_TALK_TITLE,
    chineseTitle: DAILY_PRACTICE_TALK_ZH_TITLE,
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    source: 'Wat Suan Santidham 官方原版直播 & 解脱园中文同传 (1198句全篇精准对齐)',
    thaiVideoUrl: 'https://www.youtube.com/watch?v=wx6pzQ9QltQ',
    chineseVideoUrl: 'https://www.youtube.com/watch?v=HfYrKhJh_SU',
    thaiVideoId: 'wx6pzQ9QltQ',
    chineseVideoId: 'HfYrKhJh_SU',
    defaultOffsetSeconds: 0.0,
    totalSentences: 1198,
    tags: ['10月17日官方开示', '1198句全篇精准对齐', '双视频实测校准', '逐词泰中释义'],
    keyTerms: DAILY_PRACTICE_KEY_TERMS,
    subtitles: DAILY_PRACTICE_SUBTITLES
  },
  {
    id: 'lesson_20261018',
    date: '2026-10-18',
    title: LUANGPOR_OCT_18_TALK_TITLE,
    chineseTitle: LUANGPOR_OCT_18_TALK_ZH_TITLE,
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    source: 'Wat Suan Santidham 官方原版直播 & 解脱园中文同传 (746句全篇精准对齐)',
    thaiVideoUrl: 'https://www.youtube.com/watch?v=F4-tJNYDpss',
    chineseVideoUrl: 'https://www.youtube.com/watch?v=HR-O2XYifbI',
    thaiVideoId: 'F4-tJNYDpss',
    chineseVideoId: 'HR-O2XYifbI',
    defaultOffsetSeconds: 0.0,
    totalSentences: 746,
    tags: ['10月18日官方开示', '746句全篇精准对齐', '双视频实测校准', '逐词泰中释义'],
    keyTerms: FLAGSHIP_20261018_KEY_TERMS,
    subtitles: LUANGPOR_OCT_18_SUBTITLES
  }
];

const PRESET_STORAGE_KEY = 'taixue_calibrated_preset_lessons_v1';

// 获取所有课件（融合本地管理员校准后的时间差与链接，标题严格遵循视频原名：中文在前、泰文在后）
export function getAllCuratedLessons(): CuratedLesson[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) {
        const overrides: Record<string, Partial<CuratedLesson>> = JSON.parse(saved);
        return CURATED_LESSONS_PRESETS.map(lesson => {
          const override = overrides[lesson.id] || 
            (lesson.id === 'lesson_20261017' ? (overrides['lesson_daily_life_practice'] as any) : undefined) ||
            (lesson.id === 'lesson_20261018' ? (overrides['lesson_20261018_flagship'] as any) : undefined);
          if (override) {
            return {
              ...lesson,
              ...override,
              // 权威锁定原版视频抬头（中文在前，泰文在后，不使用旧版自拟标题）
              title: lesson.title,
              chineseTitle: lesson.chineseTitle,
              // 确保全篇字幕不丢失
              subtitles: lesson.subtitles
            };
          }
          return lesson;
        });
      }
    }
  } catch (e) {
    console.error('Failed to load calibrated presets from storage', e);
  }
  return CURATED_LESSONS_PRESETS;
}

// 获取旗舰课件
export function getFlagshipLesson(): CuratedLesson {
  const all = getAllCuratedLessons();
  return all.find(l => l.id === 'lesson_20261017') || all.find(l => l.id === 'lesson_20261018') || all[0];
}

// 管理员校准更新课件配置（保存时间轴偏移量、视频链接）
export function updateCuratedLessonCalibration(
  lessonId: string, 
  updates: { 
    defaultOffsetSeconds?: number;
    thaiVideoUrl?: string;
    chineseVideoUrl?: string;
    thaiVideoId?: string;
    chineseVideoId?: string;
  }
): CuratedLesson[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      const overrides: Record<string, Partial<CuratedLesson>> = raw ? JSON.parse(raw) : {};
      overrides[lessonId] = {
        ...(overrides[lessonId] || {}),
        ...updates
      };
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (e) {
    console.error('Failed to save calibration', e);
  }
  return getAllCuratedLessons();
}
