export type WordStatus = 'unmarked' | 'learning' | 'mastered';

export interface WordToken {
  id: string;
  thai: string;
  romanization: string; // Chula adapted IPA
  chinese: string;
  tip?: string; // Teaching CoT / pronunciation guidance
  duration?: number;
  startOffset?: number; // relative start seconds within the sentence
  endOffset?: number;   // relative end seconds within the sentence
  isCore?: boolean;     // Highlighted Dhamma core vocabulary
  rootBreakdown?: string; // e.g., "มิจฉา (邪/错) + สมาธิ (禅定)"
  status?: WordStatus;
}

export interface SubtitleLine {
  id: number;
  timeStart: string; // e.g. "00:15"
  timeEnd: string;
  secondsStart: number;
  secondsEnd: number;
  thai: string;
  romanization: string; // Chula adapted IPA
  chinese: string;
  dhammaNote?: string; // 法义讲解与背景提示
  words: WordToken[];
}

export type MaskMode = 'all' | 'blur_cn' | 'hide_th' | 'blind_audio';

// 核心功能标签页定义
export type ActiveTab = 
  | 'phonetic_lego'      // 积木式声韵拼音实验室（选字母即刻变调、出声、SVG五调曲线、同音五调对比盘）
  | 'tone_matrix'        // 变调全景声调大矩阵（中高低辅音×长短死活音×4标调符全息对照）
  | 'dharma_words'       // 经典法语词与高频词逆向透视（สติ, รู้, จิต, ธรรม, ใจ 一键拆解积木）
  | 'alphabet_atlas'     // 44辅音与32元音声学图谱（带发音、助记吉祥物与器官部位）
  | 'course_study'       // 泰法语声闻共学工作流（大字双语研读流、单句轻量发音试听）
  | 'dual_sync_player'   // 泰中双视频同步对齐放映机（听一句泰文·停一下·再听中文，双视频合放与毫秒级时间轴同步）
  | 'zoom_slides'        // Zoom 讲义（左侧大字 + 右侧 SVG 禅意 10 页幻灯片，极简放映与独立 HTML 导出）
  | 'sati_counter'       // Sati 听法觉知实时看板（随听随点、S/R/L/M 快捷键、觉知频率走势、打卡结缘报告）
  | 'student_promo'      // 共学指南（通关指南、学员心法、每周1小时办学规程、全勤季度滚动奖）
  | 'host_sop'           // 带读 SOP（主持人带读 5 步流程）
  | 'keyboard_lab'       // 键盘打卡（Kedmanee 泰语键盘盲打实战）
  | 'paragraph_analyzer' // 段落智能解构（纯前端离线朱拉音标解构，脱离外部大模型依赖）
  | 'course_manager';    // 课件分发与导入导出（深度对接 LR 官方 TSV/Excel/JSON 规范）

export interface DualVideoConfig {
  id?: string;
  title: string;
  thaiVideoUrl: string;       // YouTube URL / embed or HTML5 stream
  chineseVideoUrl: string;    // YouTube URL / embed or HTML5 stream
  offsetSeconds: number;      // Chinese track offset in seconds (+ means Chinese starts later)
  thaiVolume: number;         // 0 to 1
  chineseVolume: number;      // 0 to 1
}

export type ListeningStep = 'idle' | 'thai_first' | 'pause_gap' | 'chinese_trans' | 'thai_replay';

export interface EarCatchMetric {
  id: string;
  thai: string;
  romanization: string;
  chinese: string;
  shortcutKey?: string;  // e.g. 'S', 'R', 'L', 'M'
  count: number;
  targetCount: number;
}

export interface SatiCaptureRecord {
  id: string;
  timestamp: string;
  thaiWord: string;
  chinese: string;
  shortcut: string;
  totalAtTime: number;
}

export interface CoursePreset {
  id: string;
  title: string;
  speaker: string;
  source: string;
  tag: string;
  subtitles: SubtitleLine[];
}

export interface KeyboardPracticeItem {
  id: string;
  category: 'dhamma' | 'daily' | 'course';
  thai: string;
  romanization: string;
  chinese: string;
  explanation: string;
}

export interface ParagraphAnalysisResult {
  rawParagraph: string;
  sentences: SubtitleLine[];
  coreKeywords: Array<{
    thai: string;
    romanization: string;
    chinese: string;
    count: number;
    explanation: string;
  }>;
  overallSummary: string;
  paliGrammarTips: string[];
}

export interface StudentProfile {
  id: string;
  name: string;
  phoneOrWechat?: string;
  role: 'student' | 'ta' | 'guest';
  attendedClasses: number;
  streakDays: number;
  isFullAttendanceThisQuarter: boolean;
  avatarSeed?: string;
  joinDate: string;
}

export interface ZoomMeetingInfo {
  meetingTopic: string;
  meetingId: string;
  passcode: string;
  joinUrl: string;
  practiceRoomUrl: string;
  scheduleNotice: string;
}
