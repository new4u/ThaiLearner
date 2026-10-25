import { 
  SubtitleLine, KeyboardPracticeItem, EarCatchMetric, CoursePreset, 
  ZoomMeetingInfo, StudentProfile, DualVideoConfig 
} from '../types';
import { 
  LUANGPOR_OCT_18_SUBTITLES, 
  LUANGPOR_OCT_18_TALK_TITLE, 
  LUANGPOR_OCT_18_TALK_ZH_TITLE 
} from './luangporTalk18Oct';
import { DAILY_PRACTICE_SUBTITLES } from './luangporTalkDailyPractice';

export { LUANGPOR_OCT_18_SUBTITLES, LUANGPOR_OCT_18_TALK_TITLE, LUANGPOR_OCT_18_TALK_ZH_TITLE, DAILY_PRACTICE_SUBTITLES };

export const LUANGPOR_EXCERPT_METADATA = {
  title: '隆波帕默尊者开示实况共学（2026年10月18日）',
  thaiTitle: 'ธรรมะปฏิบัติ :: หลวงพ่อปราโมทย์ ปาโมชฺโช 18 ต.ค. 2568',
  speaker: '隆波帕默尊者 (หลวงพ่อปราโมทย์ ปาโมชฺโช)',
  source: 'Wat Suan Santidham 官方直播 & 解脱园中文同传 (2026-10-18)',
  duration: '59:01',
  theme: '746句全篇高精对齐 · 朱拉隆功 Adapted IPA 升级 · 逐词泰中对照'
};

// 官方默认首选句轨（以官方 746 句精准转译与逐词音义对照为唯一权威数据源）
export const OCT_18_LIVE_SUBTITLES: SubtitleLine[] = LUANGPOR_OCT_18_SUBTITLES;
export const INITIAL_SUBTITLES: SubtitleLine[] = LUANGPOR_OCT_18_SUBTITLES;

// 预置课件库（仅包含 10月17日 与 10月18日 官方原版双视频）
export const PRESET_COURSE_LIBRARY: CoursePreset[] = [
  {
    id: 'lesson_20261017',
    title: '2026年10月17日隆波帕默尊者网络直播（中文同声翻译） ｜ ปฏิบัติในที่ทุกสถานในกาลทุกเมื่อ :: หลวงปู่ปราโมทย์ ปาโมชฺโช 17 ต.ค. 2568',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    source: 'Wat Suan Santidham 官方原版直播 & 解脱园中文同传',
    tag: '10月17日官方开示 · 1198句全篇精准对齐 · 双视频实测对齐',
    subtitles: DAILY_PRACTICE_SUBTITLES
  },
  {
    id: 'lesson_20261018',
    title: '2026年10月18日隆波帕默尊者网络直播（中文同声翻译） ｜ แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2568',
    speaker: '隆波帕默尊者 (หลวงปู่ปราโมทย์ ปาโมชฺโช)',
    source: 'Wat Suan Santidham 官方原版直播 & 解脱园中文同传',
    tag: '10月18日官方开示 · 746句全篇精准对齐 · 双视频实测对齐',
    subtitles: LUANGPOR_OCT_18_SUBTITLES
  }
];

// 核心法词打卡预设
export const INITIAL_EAR_CATCH_METRICS: EarCatchMetric[] = [
  { id: 'ec_sati', thai: 'สติ', romanization: 'sà-tì', chinese: '正念/觉知', shortcutKey: 'S', count: 0, targetCount: 15 },
  { id: 'ec_phuru', thai: 'ผู้รู้', romanization: 'pʰûu-rúu', chinese: '知者心', shortcutKey: 'R', count: 0, targetCount: 10 },
  { id: 'ec_long', thai: 'หลง', romanization: 'lǒŋ', chinese: '走神/迷失', shortcutKey: 'L', count: 0, targetCount: 8 },
  { id: 'ec_samma', thai: 'สัมมาทิฏฐิ', romanization: 'sǎm-maa-tʰít-tʰì', chinese: '正见', shortcutKey: 'M', count: 0, targetCount: 10 },
  { id: 'ec_samadhi', thai: 'สัมมาสมาธิ', romanization: 'sǎm-maa-sà-maa-tʰí', chinese: '正定', shortcutKey: 'D', count: 0, targetCount: 10 },
  { id: 'ec_ruusuk', thai: 'รู้สึกตัว', romanization: 'rúu-sɯ̀k-tua', chinese: '觉知当下', shortcutKey: 'K', count: 0, targetCount: 8 }
];

export const KEYBOARD_PRACTICE_ITEMS: KeyboardPracticeItem[] = [
  {
    id: 'kb_dhamma_1',
    category: 'dhamma',
    thai: 'สัมมาทิฏฐิ',
    romanization: 'sǎm-maa-tʰít-tʰì',
    chinese: '正见 (八正道之首)',
    explanation: '知身心实相，离诸颠倒妄见。泰语打字：ส + ั + ม + ม + า + ท + ิ + ฏ + ฐ + ิ'
  },
  {
    id: 'kb_dhamma_2',
    category: 'dhamma',
    thai: 'สัมมาสมาธิ',
    romanization: 'sǎm-maa-sà-maa-tʰí',
    chinese: '正定 (知者心安住)',
    explanation: '心安住且轻松警醒，不迎不拒。泰语打字：ส + ั + ม + ม + า + ส + ม + า + ธ + ิ'
  },
  {
    id: 'kb_dhamma_3',
    category: 'dhamma',
    thai: 'สติปัฏฐาน',
    romanization: 'sà-tì-pàt-tʰǎan',
    chinese: '四念处 (解脱大道)',
    explanation: '观身、受、心、法。泰语打字：ส + ต + ิ + ป + ั + ฏ + ฐ + า + น'
  },
  {
    id: 'kb_dhamma_4',
    category: 'dhamma',
    thai: 'รู้สึกตัว',
    romanization: 'rúu-sɯ̀k-tua',
    chinese: '觉知身心',
    explanation: '知身心自然运转，不迎不拒。'
  }
];

export const DEFAULT_ZOOM_INFO: ZoomMeetingInfo = {
  meetingTopic: '轻松泰语互助共学 · 隆波法谈听解课',
  meetingId: '829 4172 0593',
  passcode: 'dhamma',
  joinUrl: 'https://zoom.us/j/82941720593?pwd=dhamma',
  practiceRoomUrl: 'https://zoom.us/j/82941720593?pwd=dhamma',
  scheduleNotice: '每周四 / 周日 晚 20:00 - 21:00'
};

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  id: 'student_1',
  name: '法友学员',
  role: 'student',
  attendedClasses: 8,
  streakDays: 5,
  isFullAttendanceThisQuarter: true,
  joinDate: '2026-10-01'
};

export const PRESET_STUDENT_PROFILES: StudentProfile[] = [DEFAULT_STUDENT_PROFILE];

export const COURSE_SOP_STEPS = [
  {
    stepNumber: 1,
    time: '20:00 - 20:05 (5分钟)',
    phase: '破冰与定调',
    name: '静心归位 · 声明初心',
    aim: '消除学员对“外语语法、生词背诵”的焦虑，锚定“像婴儿学说话一样用耳朵泡着听”的原则。',
    hostAction: '投屏《轻松泰语互助共学》极简幻灯片第 1-5 页，带领大家深呼吸，放下背单词的压力。',
    studentAction: '打开音频或静静收听，在心里确认：今晚不强求背会任何单词，只要耳朵听到原声即可。',
    toolHint: '点击上方【🎴 打开 Zoom 讲义】，全屏放映极简 10 页幻灯片'
  },
  {
    stepNumber: 2,
    time: '20:05 - 20:30 (25分钟)',
    phase: '盲听抓耳',
    name: '原声听辨 · 4步循环模式',
    aim: '先听泰文 $\to$ 停顿 $\to$ 听中文 $\to$ 再听泰文，建立纯粹的原声音频印记与心相联系。',
    hostAction: '使用【双视频同步放映机】，播放 10月18日 实况开示，启动“先听泰文·停一下·再听中文”自动循环。',
    studentAction: '闭目或微闭聆听，听到高频法词（如 สติ 正念、มิจฉาทิฏฐิ 邪见）时按下快捷键打卡。',
    toolHint: '使用【双视频同步放映机】分句带读与毫秒级时间轴对齐'
  },
  {
    stepNumber: 3,
    time: '20:30 - 20:50 (20分钟)',
    phase: '声闻研读',
    name: '拆解词根 · 击键变调演练',
    aim: '对照大字版 482 句中英泰字幕，点击单字观察辅音等级与变调规则，并在泰语键盘上击键复现。',
    hostAction: '挑选关键句（如第 4 句“ล้างความเห็นผิด ล้างขันธ์ 5 是自身”），拆解关键词，点击发音并演示键盘打字。',
    studentAction: '切换到【泰语键盘实验室】，在电脑键盘敲击相应泰文，体会中辅音到标调后的音调跃迁。',
    toolHint: '在泰语键盘实验室体验“击键即发音与组合变调走势”'
  },
  {
    stepNumber: 4,
    time: '20:50 - 21:00 (10分钟)',
    phase: '共学回向',
    name: '心得反馈 · 功德回向',
    aim: '学员自由交流刚才哪句话“抓住了耳根”，彼此赞叹精进，法喜充满。',
    hostAction: '投屏幻灯片第 10 页，随喜大家今晚的专注与精进。',
    studentAction: '开麦或在聊天区分享自己记住的声音片段。',
    toolHint: '导出当晚学习记录，下课'
  }
];

export const TEACHING_PHILOSOPHY = {
  coreMethod: {
    title: '隆波法谈听解法：以耳朵为舟，以法义为锚',
    subtitle: '不背单词、不抠语法、不考死记，靠耳朵直觉唤醒语言母语脑',
    structure: {
      firstHalf: '前半小时 (30分钟)',
      firstHalfName: '盲听抓耳 · 听感觉知',
      firstHalfDesc: '关掉泰文字幕，只听隆波原声与中文对照，听到高频法词立即抓耳打卡，建立音义直觉连接。',
      secondHalf: '后半小时 (30分钟)',
      secondHalfName: '法味精析 · 词根剖析',
      secondHalfDesc: '大字对照显示 482 句实况课件，拆解巴利词根与泰语构词法，单句轻量发音试听，深刻领会原声安详意涵。'
    }
  },
  philosophyThaiTyping: {
    title: 'AI 时代的语言新学法：不考手写，只练“听懂 + 键盘输入”',
    points: [
      '现在都什么时代了？谁还拿着本子死记硬背手写泰文字母？',
      '只要会听、能借助音标理解、并在手机或电脑泰语键盘打得出来，就能畅通沟通与做笔记！',
      '既学殊胜佛法高频词（正定、正念、正见、邪见），也带你交流泰国生活实战词。'
    ]
  }
};

export const SAMPLE_DHAMMA_PARAGRAPHS = [
  {
    id: 'para_1',
    title: '以四念处对治邪见（2026年10月18日开示核心段落）',
    thai: 'ถ้าเราเข้าใจธรรมะในเบื้องต้นนะ ล้างความเห็นผิดจิตว่าขันธ์ 5 เป็นตัวเรา เราก็จะเข้าสู่จุดที่ปลอดภัยในสังสารวัฏนะ ตราบใดที่เรายังไม่ได้โสดาบันนะ เรายังอยู่ท่ามกลางความไม่แน่นอน อาจจะเวียนว่ายตายเกิดไปไม่รู้จักจบจักสิ้น แล้วก็ทุกข์แล้วทุกข์อีก ทุกคราวที่เกิดล้วนแต่ทุกข์ทั้งสิ้น',
    summary: '隆波开示第一阶段要领：破除“五蕴即自身”的萨迦耶见；未证须陀洹之前，众生依然漂泊于生死苦海的大不确定中。'
  }
];

// 2026年10月18日 隆波法谈实况双视频同步基准 (Wat Suan Santidham & 解脱园同传)
export const OCT_18_BENCHMARK_CONFIG: DualVideoConfig = {
  id: 'oct_18_live_benchmark',
  title: '2026年10月18日隆波帕默尊者网络直播（中文同声翻译） ｜ แก้มิจฉาทิฏฐิด้วยสติปัฏฐาน :: หลวงปู่ปราโมทย์ ปาโมชฺโช 18 ต.ค. 2568',
  thaiVideoUrl: 'https://www.youtube.com/watch?v=F4-tJNYDpss',
  chineseVideoUrl: 'https://www.youtube.com/watch?v=HR-O2XYifbI',
  offsetSeconds: 0.0,
  thaiVolume: 1.0,
  chineseVolume: 0.85
};

export const COURSE_SOP_STAGES = [
  {
    id: 'stage_1',
    phase: '环节一 (5分钟)',
    timing: '20:00 - 20:05',
    title: '破冰与定调：像婴儿一样用耳朵学',
    actions: [
      { tag: '带读主持', desc: '投屏《轻松泰语互助共学》幻灯片，声明初心：今晚不背单词、不考语法，纯粹靠耳朵原声浸泡。' },
      { tag: '学员准备', desc: '戴上耳机，在心里放下对外语死记硬背的焦虑，准备以清澈的心聆听尊者法音。' }
    ]
  },
  {
    id: 'stage_2',
    phase: '环节二 (25分钟)',
    timing: '20:05 - 20:30',
    title: '盲听抓耳：双视频原声同步循环',
    actions: [
      { tag: '双轨播放', desc: '使用【双视频同步放映机】播放10月18日实况开示，启动“先听泰文·停一下·再听中文”4步循环。' },
      { tag: '实时打卡', desc: '学员听到高频法词（如 สติ 正念、มิจฉาทิฏฐิ 邪见）时，使用键盘快捷键即时打卡。' }
    ]
  },
  {
    id: 'stage_3',
    phase: '环节三 (20分钟)',
    timing: '20:30 - 20:50',
    title: '声闻研读：482句精准拆解与键盘变调',
    actions: [
      { tag: '逐句深究', desc: '打开全文时间轴列表，对照中泰双语，剖析核心句法义与拼读规律。' },
      { tag: '击键练习', desc: '切换至泰语键盘实验室，敲击相应按键，体验击键发声与组合变调走势。' }
    ]
  }
];
