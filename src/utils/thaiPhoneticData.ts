// 泰语声学数据字典与全套规则基础模型
// Thai Phonetic Data: 44 Consonants, 32 Vowels, Final Consonants, Tone Marks & Core Words

export type ConsonantClass = 'mid' | 'high' | 'low';
export type ConsonantSubClass = 'mid' | 'high' | 'low_single' | 'low_pair';
export type VowelLength = 'short' | 'long';
export type SyllableLife = 'live' | 'dead'; // คำเป็น (Live) / คำตาย (Dead)
export type ToneId = 1 | 2 | 3 | 4 | 5;

export interface ConsonantData {
  symbol: string;
  nameThai: string;
  nameMeaning: string;
  romanization: string;
  finalSound?: string;
  class: ConsonantClass;
  subClass: ConsonantSubClass;
  phoneticGroup: string; // e.g., '喉音/喉塞', '舌尖齿龈', '唇音'
  mnemonicTip: string;
  isObsolete?: boolean; // ฃ, ฅ
  emoji?: string;
}

export interface VowelData {
  id: string;
  symbol: string; // Display symbol with placeholder ◌, e.g. ◌า, เ◌, ◌ิ
  nameThai: string;
  length: VowelLength;
  romanization: string;
  position: 'front' | 'back' | 'above' | 'below' | 'surrounding';
  transformWithFinal?: string; // 形变规则说明，如 ◌ะ + 尾音 -> ◌ั
  category: 'simple_short' | 'simple_long' | 'diphthong' | 'special';
  example: string;
}

export interface FinalConsonantData {
  id: string;
  symbol: string; // Representing character or '-' for open syllable
  groupName: string; // e.g. แม่กง, แม่กก
  life: SyllableLife;
  endingSound: string; // e.g. -ng, -n, -m, -k, -t, -p
  allowedConsonants: string[];
  description: string;
}

export interface ToneMarkData {
  id: number;
  symbol: string; // '', '่', '้', '๊', '๋'
  nameThai: string;
  nameZh: string;
  ipaSymbol: string;
}

export interface ToneContourInfo {
  toneId: ToneId;
  nameThai: string;
  nameZh: string;
  chaoNumber: string; // 33, 21, 51, 45, 24
  ipaSymbol: string;
  pitchPoints: number[]; // 5 normalized points (1-5) for SVG rendering: [start, mid-1, mid-2, mid-3, end]
  description: string;
  color: string;
  accentColor: string;
}

// 44 个泰语辅音完整库（按中、高、低分类）
export const THAI_CONSONANTS: ConsonantData[] = [
  // ========== 🟢 中辅音 (Mid Consonants) 9个 ==========
  // 口诀：ไก่ จิก เด็ก ตาย บน ปาก โอ่ง (鸡啄死小孩在陶瓮口)
  {
    symbol: 'ก',
    nameThai: 'ก ไก่',
    nameMeaning: '鸡 (Gai)',
    romanization: 'k / g',
    finalSound: 'k',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '软腭不送气不塞音',
    mnemonicTip: '不送气的 G/K 之间音，像汉语“歌”的发音口型但不送气。中辅音基石。',
    emoji: '🐔'
  },
  {
    symbol: 'จ',
    nameThai: 'จ จาน',
    nameMeaning: '盘子 (Jaan)',
    romanization: 'ch / j',
    finalSound: 't',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '硬腭不送气塞擦音',
    mnemonicTip: '发不送气的 J/Z 之间音，舌尖抵住下齿背。',
    emoji: '🍽️'
  },
  {
    symbol: 'ด',
    nameThai: 'ด เด็ก',
    nameMeaning: '小孩 (Dek)',
    romanization: 'd',
    finalSound: 't',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '齿龈浊塞音',
    mnemonicTip: '带声带振动的 D 音，圈圈向内卷。',
    emoji: '👶'
  },
  {
    symbol: 'ต',
    nameThai: 'ต เต่า',
    nameMeaning: '乌龟 (Tao)',
    romanization: 't (不送气)',
    finalSound: 't',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '齿龈清不送气塞音',
    mnemonicTip: '像汉语“打”的声母声调但不送气，字形顶端有凹槽如龟壳。',
    emoji: '🐢'
  },
  {
    symbol: 'บ',
    nameThai: 'บ ใบไม้',
    nameMeaning: '树叶 (Baimai)',
    romanization: 'b',
    finalSound: 'p',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '双唇浊塞音',
    mnemonicTip: '带浊音振动的 B，口型较窄。',
    emoji: '🍃'
  },
  {
    symbol: 'ป',
    nameThai: 'ป ปลา',
    nameMeaning: '鱼 (Bpla)',
    romanization: 'p (不送气)',
    finalSound: 'p',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '双唇清不送气塞音',
    mnemonicTip: '比 บ 尾巴更长，发汉语“八”的不送气声母。',
    emoji: '🐟'
  },
  {
    symbol: 'อ',
    nameThai: 'อ อ่าง',
    nameMeaning: '水盆 (Aang)',
    romanization: 'ʔ (零辅音)',
    finalSound: '-',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '喉塞音/零辅音',
    mnemonicTip: '泰语最神奇的中辅音，自身不发音，承载元音发声；可作前引字（อ นํา）。',
    emoji: '🥣'
  },
  {
    symbol: 'ฎ',
    nameThai: 'ฎ ชฎา',
    nameMeaning: '宝冠 (Chada)',
    romanization: 'd',
    finalSound: 't',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '齿龈浊塞音（梵巴借词）',
    mnemonicTip: '发音同 ด (d)，多用于巴利语典籍与古典梵词。',
    emoji: '👑'
  },
  {
    symbol: 'ฏ',
    nameThai: 'ฏ ปฏัก',
    nameMeaning: '刺棒 (Patak)',
    romanization: 't (不送气)',
    finalSound: 't',
    class: 'mid',
    subClass: 'mid',
    phoneticGroup: '齿龈清不送气塞音（梵巴借词）',
    mnemonicTip: '发音同 ต (t)，底端有两道波浪卷。',
    emoji: '🦯'
  },

  // ========== 🔵 高辅音 (High Consonants) 11个 ==========
  // 口诀：ผี ฝาก ถุง ข้าว สาร ให้ ฉัน (鬼送米袋给我)
  {
    symbol: 'ข',
    nameThai: 'ข ไข่',
    nameMeaning: '蛋 (Khai)',
    romanization: 'kh (送气)',
    finalSound: 'k',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '软腭送气清塞音',
    mnemonicTip: '强送气的 K/H 音，如汉语“开”。自带第5调（升调）底色。',
    emoji: '🥚'
  },
  {
    symbol: 'ฉ',
    nameThai: 'ฉ ฉิ่ง',
    nameMeaning: '铜钹 (Ching)',
    romanization: 'ch (送气)',
    finalSound: '-',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '硬腭送气清塞擦音',
    mnemonicTip: '清脆送气“哧”，从低到高的升调扬起。',
    emoji: '🎵'
  },
  {
    symbol: 'ถ',
    nameThai: 'ถ ถุง',
    nameMeaning: '布袋 (Thung)',
    romanization: 'th (送气)',
    finalSound: 't',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '齿龈送气清塞音',
    mnemonicTip: '送气的 T 音，如“特”，圈圈在内側。',
    emoji: '🛍️'
  },
  {
    symbol: 'ผ',
    nameThai: 'ผ ผึ้ง',
    nameMeaning: '蜜蜂 (Pheung)',
    romanization: 'ph (送气)',
    finalSound: '-',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '双唇送气清塞音',
    mnemonicTip: '送气的 P 音，如“怕”，尾巴与肩同高。',
    emoji: '🐝'
  },
  {
    symbol: 'ฝ',
    nameThai: 'ฝ ฝา',
    nameMeaning: '锅盖 (Fa)',
    romanization: 'f',
    finalSound: '-',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '唇齿清擦音',
    mnemonicTip: '高辅音 F，尾巴长长翘出锅盖。',
    emoji: '🥘'
  },
  {
    symbol: 'ส',
    nameThai: 'ส เสือ',
    nameMeaning: '老虎 (Seua)',
    romanization: 's',
    finalSound: 't',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '齿龈清擦音',
    mnemonicTip: '常用高辅音 S，“Sati (สติ)”的首辅音就是它！高亢明澈。',
    emoji: '🐅'
  },
  {
    symbol: 'ห',
    nameThai: 'ห หีบ',
    nameMeaning: '箱子 (Heep)',
    romanization: 'h',
    finalSound: '-',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '声门清擦音',
    mnemonicTip: '泰语最核心的“前引字 (ห นํา)”，不发音却能将低辅音提为高辅音变调！',
    emoji: '📦'
  },
  {
    symbol: 'ศ',
    nameThai: 'ศ ศาลา',
    nameMeaning: '凉亭 (Sala)',
    romanization: 's',
    finalSound: 't',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '齿龈清擦音（梵巴借词）',
    mnemonicTip: '发高辅音 S，字形在 ค 顶部加个小逗号。用于 ศาสนา (宗教) 等。',
    emoji: '🏛️'
  },
  {
    symbol: 'ษ',
    nameThai: 'ษ ฤๅษี',
    nameMeaning: '隐士/鲁士 (Reusi)',
    romanization: 's',
    finalSound: 't',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '齿龈清擦音（梵巴借词）',
    mnemonicTip: '发高辅音 S，字形在 บ 腹部加个小角。',
    emoji: '🧘'
  },
  {
    symbol: 'ฐ',
    nameThai: 'ฐ ฐาน',
    nameMeaning: '底座 (Than)',
    romanization: 'th (送气)',
    finalSound: 't',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '齿龈送气清塞音（梵巴借词）',
    mnemonicTip: '发高辅音 th，底座繁复如莲花座。',
    emoji: '🪑'
  },
  {
    symbol: 'ฃ',
    nameThai: 'ฃ ขวด',
    nameMeaning: '瓶子 (Khuat - 古废字)',
    romanization: 'kh',
    finalSound: 'k',
    class: 'high',
    subClass: 'high',
    phoneticGroup: '软腭送气清塞音',
    mnemonicTip: '现代泰语已停用，改由 ข 替代。',
    isObsolete: true,
    emoji: '🍾'
  },

  // ========== 🟠 低辅音 (Low Consonants) 24个 ==========
  // 分为单低辅音（响音 10个）与双低辅音（对应高辅音送气对偶 14个）
  // 10个单低辅音（可被 ห 前引）：ง, ญ, ณ, น, ย, ร, ล, ว, ฬ, ม (口诀：งูใหญ่นอนอยู่ ณ ริมวัดโมฬีโลก)
  {
    symbol: 'ง',
    nameThai: 'ง งู',
    nameMeaning: '蛇 (Ngu)',
    romanization: 'ng',
    finalSound: 'ng',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '软腭鼻音（单低辅音）',
    mnemonicTip: '首辅音或尾音均发后鼻音“ng”，单低辅音，易被 ห 前引变调。',
    emoji: '🐍'
  },
  {
    symbol: 'น',
    nameThai: 'น หนู',
    nameMeaning: '老鼠 (Noo)',
    romanization: 'n',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '齿龈鼻音（单低辅音）',
    mnemonicTip: '发音同汉语 N，单低辅音基石。',
    emoji: '🐁'
  },
  {
    symbol: 'ม',
    nameThai: 'ม ม้า',
    nameMeaning: '马 (Ma)',
    romanization: 'm',
    finalSound: 'm',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '双唇鼻音（单低辅音）',
    mnemonicTip: '发音同汉语 M。常与 ห 组合为 หม- 变升调（如 หมา 狗）。',
    emoji: '🐴'
  },
  {
    symbol: 'ย',
    nameThai: 'ย ยักษ์',
    nameMeaning: '夜叉巨人 (Yak)',
    romanization: 'y',
    finalSound: 'y',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '硬腭近音（单低辅音）',
    mnemonicTip: '发音如 Y，夜叉大牙。',
    emoji: '👹'
  },
  {
    symbol: 'ร',
    nameThai: 'ร เรือ',
    nameMeaning: '小船 (Reua)',
    romanization: 'r (弹舌/卷舌)',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '齿龈颤音/近音（单低辅音）',
    mnemonicTip: '“รู้ (Ru 知道)”的声母，标调ไม้โท变高平调！',
    emoji: '⛵'
  },
  {
    symbol: 'ล',
    nameThai: 'ล ลิง',
    nameMeaning: '猴子 (Ling)',
    romanization: 'l',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '齿龈边近音（单低辅音）',
    mnemonicTip: '舌尖边音 L，如“隆波 (Luangpor)”的声母。',
    emoji: '🐒'
  },
  {
    symbol: 'ว',
    nameThai: 'ว แหวน',
    nameMeaning: '戒指 (Waen)',
    romanization: 'w',
    finalSound: 'w',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '唇软腭近音（单低辅音）',
    mnemonicTip: '发音如 W。在辅音后常与元音组合。',
    emoji: '💍'
  },
  {
    symbol: 'ญ',
    nameThai: 'ญ หญิง',
    nameMeaning: '女性 (Ying)',
    romanization: 'y',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '硬腭鼻音（单低辅音）',
    mnemonicTip: '做首辅音发 Y，做尾音发 N（如 ัญญา Panya 智慧）。',
    emoji: '👩'
  },
  {
    symbol: 'ณ',
    nameThai: 'ณ เณร',
    nameMeaning: '沙弥 (Nen)',
    romanization: 'n',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '齿龈鼻音（梵巴借词单低辅音）',
    mnemonicTip: '发音同 น (n)，多用于僧伽、佛教法词。',
    emoji: '🧘‍♂️'
  },
  {
    symbol: 'ฬ',
    nameThai: 'ฬ จุฬา',
    nameMeaning: '朱拉风筝 (Chula)',
    romanization: 'l',
    finalSound: 'n',
    class: 'low',
    subClass: 'low_single',
    phoneticGroup: '齿龈边近音（单低辅音）',
    mnemonicTip: '发音同 ล (l)，形如朱拉大学校名标志。',
    emoji: '🪁'
  },

  // 14个双低辅音（对应高辅音对偶）
  {
    symbol: 'ค',
    nameThai: 'ค ควาย',
    nameMeaning: '水牛 (Khway)',
    romanization: 'kh (送气)',
    finalSound: 'k',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '软腭送气清塞音（双低辅音）',
    mnemonicTip: '送气 Kh，与高辅音 ข 构成对偶对，但它是低辅音！',
    emoji: '🐃'
  },
  {
    symbol: 'ช',
    nameThai: 'ช ช้าง',
    nameMeaning: '大象 (Chang)',
    romanization: 'ch (送气)',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '硬腭送气清塞擦音（双低辅音）',
    mnemonicTip: '送气 Ch，象鼻卷起。低辅音对偶。',
    emoji: '🐘'
  },
  {
    symbol: 'ซ',
    nameThai: 'ซ โซ่',
    nameMeaning: '铁链 (So)',
    romanization: 's',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '齿龈清擦音（双低辅音）',
    mnemonicTip: '送气低辅音 S，顶部有铁链缺口。',
    emoji: '⛓️'
  },
  {
    symbol: 'ท',
    nameThai: 'ท ทหาร',
    nameMeaning: '军人 (Thahan)',
    romanization: 'th (送气)',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '齿龈送气清塞音（双低辅音）',
    mnemonicTip: '送气 Th，极高频双低辅音，对应高辅音 ถ。',
    emoji: '💂'
  },
  {
    symbol: 'พ',
    nameThai: 'พ พาน',
    nameMeaning: '高足托盘 (Phaan)',
    romanization: 'ph (送气)',
    finalSound: 'p',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '双唇送气清塞音（双低辅音）',
    mnemonicTip: '送气 Ph，对应高辅音 ผ。像 พระ (佛/僧) 的声母。',
    emoji: '🥗'
  },
  {
    symbol: 'ฟ',
    nameThai: 'ฟ ฟัน',
    nameMeaning: '牙齿 (Fan)',
    romanization: 'f',
    finalSound: 'p',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '唇齿清擦音（双低辅音）',
    mnemonicTip: '低辅音 F，长尾巴向外伸出。',
    emoji: '🦷'
  },
  {
    symbol: 'ฮ',
    nameThai: 'ฮ นกฮูก',
    nameMeaning: '猫头鹰 (Nokhook)',
    romanization: 'h',
    finalSound: '-',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '声门清擦音（双低辅音）',
    mnemonicTip: '低辅音 H，对应高辅音 ห，尾巴挽成圈如猫头鹰大眼睛。',
    emoji: '🦉'
  },
  {
    symbol: 'ฆ',
    nameThai: 'ฆ ระฆัง',
    nameMeaning: '铜钟 (Rakhang)',
    romanization: 'kh (送气)',
    finalSound: 'k',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '软腭送气清塞音（梵巴借词）',
    mnemonicTip: '发音同 ค (kh)，古铜钟形。',
    emoji: '🔔'
  },
  {
    symbol: 'ฌ',
    nameThai: 'ฌ เฌอ',
    nameMeaning: '灌木树 (Choe)',
    romanization: 'ch (送气)',
    finalSound: '-',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '硬腭送气清塞擦音（梵巴借词）',
    mnemonicTip: '“禅那 (ฌาน Jhana)”的声母！神圣法词专用。',
    emoji: '🌳'
  },
  {
    symbol: 'ธ',
    nameThai: 'ธ ธง',
    nameMeaning: '旗帜 (Thong)',
    romanization: 'th (送气)',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '齿龈送气清塞音（梵巴借词）',
    mnemonicTip: '“佛法 (ธรรม Dhamma)”的首辅音！庄严旗帜。',
    emoji: '🚩'
  },
  {
    symbol: 'ภ',
    nameThai: 'ภ สำเภา',
    nameMeaning: '扬帆古帆船 (Samphao)',
    romanization: 'ph (送气)',
    finalSound: 'p',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '双唇送气清塞音（梵巴借词）',
    mnemonicTip: '“ภาวนา (修行/修习)”的首辅音，发音同 พ。',
    emoji: '⛵'
  },
  {
    symbol: 'ฑ',
    nameThai: 'ฑ มณโฑ',
    nameMeaning: '曼陀夫人 (Montho)',
    romanization: 'th / d',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '齿龈送气清塞音（梵巴借词）',
    mnemonicTip: '发音多为 th，梵巴借词专用。',
    emoji: '👸'
  },
  {
    symbol: 'ฒ',
    nameThai: 'ฒ ผู้เฒ่า',
    nameMeaning: '长者老者 (Phuthao)',
    romanization: 'th',
    finalSound: 't',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '齿龈送气清塞音（梵巴借词）',
    mnemonicTip: '发音同 ท (th)，如慈悲长者。',
    emoji: '👴'
  },
  {
    symbol: 'ฅ',
    nameThai: 'ฅ คน',
    nameMeaning: '人 (Khon - 古废字)',
    romanization: 'kh',
    finalSound: 'k',
    class: 'low',
    subClass: 'low_pair',
    phoneticGroup: '软腭送气清塞音',
    mnemonicTip: '现代泰语已停用，改由 ค 替代。',
    isObsolete: true,
    emoji: '👤'
  }
];

// 泰语 32 个元音代表性库（长短对立、前后上下包围布局）
export const THAI_VOWELS: VowelData[] = [
  // 基础短/长单元音对
  {
    id: 'v_a_short',
    symbol: '◌ะ',
    nameThai: 'สระอะ',
    length: 'short',
    romanization: 'a (短)',
    position: 'back',
    transformWithFinal: '遇到尾辅音变身为迈寒挨 ◌ั (Mai Han-Akat)',
    category: 'simple_short',
    example: 'จะ (将要), กัด (咬)'
  },
  {
    id: 'v_a_long',
    symbol: '◌า',
    nameThai: 'สระอา',
    length: 'long',
    romanization: 'aa (长)',
    position: 'back',
    category: 'simple_long',
    example: 'มา (来), กา (乌鸦)'
  },
  {
    id: 'v_i_short',
    symbol: '◌ิ',
    nameThai: 'สระอิ',
    length: 'short',
    romanization: 'i (短)',
    position: 'above',
    category: 'simple_short',
    example: 'สติ (Sati 觉知), จิต (Jit 心)'
  },
  {
    id: 'v_i_long',
    symbol: '◌ี',
    nameThai: 'สระอี',
    length: 'long',
    romanization: 'ee (长)',
    position: 'above',
    category: 'simple_long',
    example: 'มี (有), ดี (好)'
  },
  {
    id: 'v_ue_short',
    symbol: '◌ึ',
    nameThai: 'สระอึ',
    length: 'short',
    romanization: 'ue (扁唇短)',
    position: 'above',
    category: 'simple_short',
    example: 'ถึง (到达), ดึง (拉)'
  },
  {
    id: 'v_ue_long',
    symbol: '◌ื',
    nameThai: 'สระอือ',
    length: 'long',
    romanization: 'uee (扁唇长)',
    position: 'above',
    transformWithFinal: '无尾音时需补 อ 作辅位 (เช่น คือ)',
    category: 'simple_long',
    example: 'มือ (手), ลืม (忘记)'
  },
  {
    id: 'v_u_short',
    symbol: '◌ุ',
    nameThai: 'สระอุ',
    length: 'short',
    romanization: 'u (短圆唇)',
    position: 'below',
    category: 'simple_short',
    example: 'ทุกข์ (苦), ยุค (时代)'
  },
  {
    id: 'v_u_long',
    symbol: '◌ู',
    nameThai: 'สระอู',
    length: 'long',
    romanization: 'oo (长圆唇)',
    position: 'below',
    category: 'simple_long',
    example: 'รู้ (知/觉察), ดู (看)'
  },

  // 中前部元音 (เ-, แ-, โ-)
  {
    id: 'v_e_short',
    symbol: 'เ◌ะ',
    nameThai: 'สระเอะ',
    length: 'short',
    romanization: 'e (短)',
    position: 'surrounding',
    transformWithFinal: '遇到尾辅音变身为 เ◌็ (例如 เป็ด 鸭子)',
    category: 'simple_short',
    example: 'เตะ (踢), เป็ด (鸭)'
  },
  {
    id: 'v_e_long',
    symbol: 'เ◌',
    nameThai: 'สระเอ',
    length: 'long',
    romanization: 'ay (长)',
    position: 'front',
    category: 'simple_long',
    example: 'เท (倒), เวลา (时间)'
  },
  {
    id: 'v_ae_short',
    symbol: 'แ◌ะ',
    nameThai: 'สระแอะ',
    length: 'short',
    romanization: 'ae (短大开口)',
    position: 'surrounding',
    transformWithFinal: '遇到尾辅音变身为 แ◌็ (例如 แข็ง 坚硬)',
    category: 'simple_short',
    example: 'แกะ (羊), แข็ง (硬)'
  },
  {
    id: 'v_ae_long',
    symbol: 'แ◌',
    nameThai: 'สระแอ',
    length: 'long',
    romanization: 'aae (长大开口)',
    position: 'front',
    category: 'simple_long',
    example: 'แม่ (母亲), แดง (红色)'
  },
  {
    id: 'v_o_short',
    symbol: 'โ◌ะ',
    nameThai: 'สระโอะ (隐形元音)',
    length: 'short',
    romanization: 'o (短)',
    position: 'surrounding',
    transformWithFinal: '重要隐形规律：遇任何尾辅音时完全隐形！(เช่น นม, คน, ลม)',
    category: 'simple_short',
    example: 'โต๊ะ (桌子), คน (人 = ค + ะโ + น)'
  },
  {
    id: 'v_o_long',
    symbol: 'โ◌',
    nameThai: 'สระโอ',
    length: 'long',
    romanization: 'oh (长)',
    position: 'front',
    category: 'simple_long',
    example: 'โต (大), โพธิ์ (菩提)'
  },
  {
    id: 'v_aw_short',
    symbol: 'เ◌าะ',
    nameThai: 'สระเอาะ',
    length: 'short',
    romanization: 'aw (短圆唇)',
    position: 'surrounding',
    category: 'simple_short',
    example: 'เกาะ (岛屿)'
  },
  {
    id: 'v_aw_long',
    symbol: '◌อ',
    nameThai: 'สระออ',
    length: 'long',
    romanization: 'aww (长圆唇)',
    position: 'back',
    category: 'simple_long',
    example: 'พ่อ (父亲), ขอ (求)'
  },
  {
    id: 'v_oe_short',
    symbol: 'เ◌อะ',
    nameThai: 'สระเออะ',
    length: 'short',
    romanization: 'oe (短)',
    position: 'surrounding',
    category: 'simple_short',
    example: 'เจอะ (遇见)'
  },
  {
    id: 'v_oe_long',
    symbol: 'เ◌อ',
    nameThai: 'สระเออ',
    length: 'long',
    romanization: 'oee (长)',
    position: 'surrounding',
    transformWithFinal: '遇一般尾音变 เ◌ิ (เช่น เดิน); 遇 ย 尾音变成 เ-ย (เช่น เคย)',
    category: 'simple_long',
    example: 'เธอ (你), เดิน (走)'
  },

  // 复合双元音 (Diphthongs: ia, uea, ua)
  {
    id: 'v_ia_short',
    symbol: 'เ◌ียะ',
    nameThai: 'สระเอียะ',
    length: 'short',
    romanization: 'ia (短)',
    position: 'surrounding',
    category: 'diphthong',
    example: 'เผียะ (啪啪声)'
  },
  {
    id: 'v_ia_long',
    symbol: 'เ◌ีย',
    nameThai: 'สระเอีย',
    length: 'long',
    romanization: 'iaa (长)',
    position: 'surrounding',
    category: 'diphthong',
    example: 'เสีย (坏/损失), เรียน (学习)'
  },
  {
    id: 'v_uea_short',
    symbol: 'เ◌ือะ',
    nameThai: 'สระเอือะ',
    length: 'short',
    romanization: 'uea (短)',
    position: 'surrounding',
    category: 'diphthong',
    example: 'เกลือะ (罕用)'
  },
  {
    id: 'v_uea_long',
    symbol: 'เ◌ือ',
    nameThai: 'สระเอือ',
    length: 'long',
    romanization: 'ueaa (长)',
    position: 'surrounding',
    category: 'diphthong',
    example: 'เรือ (船), เสือ (虎)'
  },
  {
    id: 'v_ua_short',
    symbol: '◌ัวะ',
    nameThai: 'สระอัวะ',
    length: 'short',
    romanization: 'ua (短)',
    position: 'surrounding',
    category: 'diphthong',
    example: 'ผัวะ (撞击声)'
  },
  {
    id: 'v_ua_long',
    symbol: '◌ัว',
    nameThai: 'สระอัว',
    length: 'long',
    romanization: 'uaa (长)',
    position: 'surrounding',
    transformWithFinal: '遇任何尾音时 ไม้หันอากาศ 消失，仅保留 ว (เช่น ชวน, กวน)',
    category: 'diphthong',
    example: 'ตัว (身体/个), สวน (花园)'
  },

  // 特殊元音 (am, ai, ao, lue, rue)
  {
    id: 'v_am',
    symbol: '◌ำ',
    nameThai: 'สระอำ (Am)',
    length: 'short',
    romanization: 'am',
    position: 'back',
    category: 'special',
    example: 'ทำ (做), ธรรม (法)'
  },
  {
    id: 'v_ai_mai_muan',
    symbol: 'ใ◌',
    nameThai: 'สระไอไม้ม้วน (20常用字卷尾艾)',
    length: 'short',
    romanization: 'ai',
    position: 'front',
    category: 'special',
    example: 'ใจ (心), ใน (里)'
  },
  {
    id: 'v_ai_mai_malay',
    symbol: 'ไ◌',
    nameThai: 'สระไอไม้มลาย (花尾艾)',
    length: 'short',
    romanization: 'ai',
    position: 'front',
    category: 'special',
    example: 'ไป (去), ไม่ (不)'
  },
  {
    id: 'v_ao',
    symbol: 'เ◌า',
    nameThai: 'สระเอา',
    length: 'short',
    romanization: 'ao',
    position: 'surrounding',
    category: 'special',
    example: 'เรา (我们), เอา (要)'
  }
];

// 8大尾辅音分类（马特拉规制 มาตราตัวสะกด 8 แม่ + 开音节）
export const THAI_FINAL_CONSONANTS: FinalConsonantData[] = [
  {
    id: 'final_none',
    symbol: '-',
    groupName: 'แม่ ก กา (开音节/无尾音)',
    life: 'live', // 默认按长元音开音节算活音，若元音是短元音则判定为死音
    endingSound: '无闭塞尾音',
    allowedConsonants: [],
    description: '只有声母与韵母。若为长元音则为活音 (คำเป็น)；若为短元音则为死音 (คำตาย)。'
  },
  // 🟢 活音尾（清亮鼻音与半元音，声带可无限延长）
  {
    id: 'final_ng',
    symbol: 'ง',
    groupName: 'แม่กง (-ng)',
    life: 'live',
    endingSound: '-ng 后鼻音',
    allowedConsonants: ['ง'],
    description: '活音 (คำเป็น)：后鼻音，声音悠扬自然。例如 นั่ง (坐), สงบ (平静)。'
  },
  {
    id: 'final_n',
    symbol: 'น',
    groupName: 'แม่กน (-n)',
    life: 'live',
    endingSound: '-n 前鼻音',
    allowedConsonants: ['น', 'ณ', 'ญ', 'ร', 'ล', 'ฬ'],
    description: '活音 (คำเป็น)：前鼻音。包含 น, ณ, ญ, ร, ล, ฬ。例如 คน (人), พร (祝福)。'
  },
  {
    id: 'final_m',
    symbol: 'ม',
    groupName: 'แม่กม (-m)',
    life: 'live',
    endingSound: '-m 闭唇鼻音',
    allowedConsonants: ['ม'],
    description: '活音 (คำเป็น)：双唇闭合鼻音。例如 สมาธิ (Samadhi), ลม (风/呼吸)。'
  },
  {
    id: 'final_y',
    symbol: 'ย',
    groupName: 'แม่เกย (-y)',
    life: 'live',
    endingSound: '-y 半元音',
    allowedConsonants: ['ย'],
    description: '活音 (คำเป็น)：类似 i 的柔和滑音。例如 กาย (身体)。'
  },
  {
    id: 'final_w',
    symbol: 'ว',
    groupName: 'แม่เกอว (-w)',
    life: 'live',
    endingSound: '-w 半元音',
    allowedConsonants: ['ว'],
    description: '活音 (คำเป็น)：类似 u 的圆唇滑音。例如 ดาว (星星), ขาว (白)。'
  },

  // 🔴 死音尾（急促爆破塞音，气流瞬间截断）
  {
    id: 'final_k',
    symbol: 'ก',
    groupName: 'แม่กก (-k)',
    life: 'dead',
    endingSound: '-k 软腭清爆塞音',
    allowedConsonants: ['ก', 'ข', 'ค', 'ฆ'],
    description: '死音 (คำตาย)：喉头骤然闭塞，如汉语入声。例如 ทุกข์ (苦), มาก (很多)。'
  },
  {
    id: 'final_t',
    symbol: 'ด',
    groupName: 'แม่กด (-t)',
    life: 'dead',
    endingSound: '-t 舌尖齿龈塞音',
    allowedConsonants: ['ด', 'ต', 'จ', 'ช', 'ซ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ถ', 'ท', 'ธ', 'ศ', 'ษ', 'ส'],
    description: '死音 (คำตาย)：舌尖抵住上牙龈立刻收住。例如 จิต (心), สด (新鲜)。'
  },
  {
    id: 'final_p',
    symbol: 'บ',
    groupName: 'แม่กบ (-p)',
    life: 'dead',
    endingSound: '-p 双唇闭塞音',
    allowedConsonants: ['บ', 'ป', 'พ', 'ฟ', 'ภ'],
    description: '死音 (คำตาย)：双唇紧闭不出声。例如 สงบ (宁静), รับ (接受)。'
  }
];

// 4个声调符号
export const THAI_TONE_MARKS: ToneMarkData[] = [
  { id: 0, symbol: '', nameThai: 'ไม่มีรูปวรรณยุกต์', nameZh: '无标调符', ipaSymbol: '–' },
  { id: 1, symbol: '่', nameThai: 'ไม้เอก (Mai Ek)', nameZh: '第一声调符 (一瞥)', ipaSymbol: '̀' },
  { id: 2, symbol: '้', nameThai: 'ไม้โท (Mai Tho)', nameZh: '第二声调符 (小七)', ipaSymbol: '̂' },
  { id: 3, symbol: '๊', nameThai: 'ไม้ตรี (Mai Tri)', nameZh: '第三声调符 (十字)', ipaSymbol: '́' },
  { id: 4, symbol: '๋', nameThai: 'ไม้จัตวา (Mai Chattawa)', nameZh: '第四声调符 (加号)', ipaSymbol: '̌' }
];

// 5种实际发音调（赵元任五度声学走势）
export const THAI_FIVE_TONES: Record<ToneId, ToneContourInfo> = {
  1: {
    toneId: 1,
    nameThai: 'สามัญ (Samun)',
    nameZh: '第一调 · 中平调',
    chaoNumber: '33',
    ipaSymbol: '[˧˧]',
    pitchPoints: [3, 3, 3, 3, 3], // mid flat
    description: '音高平稳居中（约 220Hz），不升不降，自然吐气。如 กา (乌鸦)。',
    color: 'emerald',
    accentColor: '#10B981'
  },
  2: {
    toneId: 2,
    nameThai: 'เอก (Ek)',
    nameZh: '第二调 · 低平微降调',
    chaoNumber: '21',
    ipaSymbol: '[˨˩]',
    pitchPoints: [2.2, 2.0, 1.8, 1.5, 1.2], // low falling
    description: '起音偏低（约 190Hz），沉稳压下并微坠（至 150Hz）。如 ก่า。',
    color: 'blue',
    accentColor: '#3B82F6'
  },
  3: {
    toneId: 3,
    nameThai: 'โท (Tho)',
    nameZh: '第三调 · 骤降调 (重音感)',
    chaoNumber: '51',
    ipaSymbol: '[˥˩]',
    pitchPoints: [4.8, 5.0, 3.8, 2.2, 1.0], // steep high falling
    description: '起音极高（约 260Hz），像叹气或汉语去声一样陡峭砸落（至 140Hz）。如 ก้า, รู้ (知)。',
    color: 'amber',
    accentColor: '#F59E0B'
  },
  4: {
    toneId: 4,
    nameThai: 'ตรี (Tri)',
    nameZh: '第四调 · 高平微升调',
    chaoNumber: '45',
    ipaSymbol: '[˦˥]',
    pitchPoints: [4.2, 4.3, 4.5, 4.8, 5.0], // high rising
    description: '高亢清脆（从 240Hz 攀升至 280Hz），饱满嘹亮。如 ก๊า, นก (鸟)。',
    color: 'purple',
    accentColor: '#A855F7'
  },
  5: {
    toneId: 5,
    nameThai: 'จัตวา (Chattawa)',
    nameZh: '第五调 · 先抑后扬升调',
    chaoNumber: '24',
    ipaSymbol: '[˨˦]',
    pitchPoints: [2.0, 1.5, 1.8, 3.2, 4.5], // dipping then rising
    description: '先微微低抑（沉至 160Hz）再悠然扬起（攀至 250Hz），类似汉语第二声问话。如 ก๋า, ขา (腿)。',
    color: 'rose',
    accentColor: '#F43F5E'
  }
};

// 预置法词与日常高频词（一键积木透视）
export interface PresetDhammaWord {
  id: string;
  thai: string;
  chinese: string;
  category: 'dhamma' | 'daily';
  explanation: string;
  syllables: Array<{
    thaiPart: string;
    leadingConsonant?: string;
    initialConsonant: string;
    vowelId: string;
    finalConsonantId: string;
    toneMarkId: number;
    expectedTone: ToneId;
    romanization: string;
  }>;
}

export const PRESET_DHAMMA_WORDS: PresetDhammaWord[] = [
  {
    id: 'sati',
    thai: 'สติ',
    chinese: '正念 / 觉知 (Sati)',
    category: 'dhamma',
    explanation: '隆波开示最核心的字眼。前缀 ส (sa) 短音轻读，核心音节 ติ (ti) 为中辅音+短元音死音，读第二调低平调！',
    syllables: [
      {
        thaiPart: 'สะ',
        initialConsonant: 'ส',
        vowelId: 'v_a_short',
        finalConsonantId: 'final_none',
        toneMarkId: 0,
        expectedTone: 2,
        romanization: 'sa-'
      },
      {
        thaiPart: 'ติ',
        initialConsonant: 'ต',
        vowelId: 'v_i_short',
        finalConsonantId: 'final_none',
        toneMarkId: 0,
        expectedTone: 2,
        romanization: 'ti'
      }
    ]
  },
  {
    id: 'ru',
    thai: 'รู้',
    chinese: '知道 / 觉察 (Ru)',
    category: 'dhamma',
    explanation: '低辅音 ร + 长元音 ◌ู + 标调符 ไม้โท ้，触发低辅音变调定律：低辅音加二号符变【第三调骤降调】！',
    syllables: [
      {
        thaiPart: 'รู้',
        initialConsonant: 'ร',
        vowelId: 'v_u_long',
        finalConsonantId: 'final_none',
        toneMarkId: 2,
        expectedTone: 3,
        romanization: 'rûu'
      }
    ]
  },
  {
    id: 'jit',
    thai: 'จิต',
    chinese: '心 / 识 (Jit)',
    category: 'dhamma',
    explanation: '中辅音 จ + 短元音 ◌ิ + 齿塞死音尾 ต (แม่กด)，构成中辅音死音节，直接发第二调低平调！',
    syllables: [
      {
        thaiPart: 'จิต',
        initialConsonant: 'จ',
        vowelId: 'v_i_short',
        finalConsonantId: 'final_t',
        toneMarkId: 0,
        expectedTone: 2,
        romanization: 'jìt'
      }
    ]
  },
  {
    id: 'jai',
    thai: 'ใจ',
    chinese: '心 / 内心感受 (Jai)',
    category: 'dhamma',
    explanation: '中辅音 จ + 20常用字卷尾艾 ใ◌，中辅音活音无调符，发第一调中平调！',
    syllables: [
      {
        thaiPart: 'ใจ',
        initialConsonant: 'จ',
        vowelId: 'v_ai_mai_muan',
        finalConsonantId: 'final_none',
        toneMarkId: 0,
        expectedTone: 1,
        romanization: 'jai'
      }
    ]
  },
  {
    id: 'dukkha',
    thai: 'ทุกข์',
    chinese: '苦 (Dukkha)',
    category: 'dhamma',
    explanation: '低辅音 ท + 短元音 ◌ุ + 塞音尾 ก (แม่กก)，死音短元音，低辅音短死音规则直发【第四调高平调】！',
    syllables: [
      {
        thaiPart: 'ทุกข์',
        initialConsonant: 'ท',
        vowelId: 'v_u_short',
        finalConsonantId: 'final_k',
        toneMarkId: 0,
        expectedTone: 4,
        romanization: 'thúk'
      }
    ]
  },
  {
    id: 'khopkhun',
    thai: 'ขอบคุณ',
    chinese: '谢谢 (Khop-khun)',
    category: 'daily',
    explanation: '高辅音 ข + 长元音 อ + 塞音尾 บ (แม่กบ) = 高辅音长死音，读第二调低平调；低辅音 ค + 隐形元音 + 活音尾 ณ = 第一调中平调。',
    syllables: [
      {
        thaiPart: 'ขอบ',
        initialConsonant: 'ข',
        vowelId: 'v_aw_long',
        finalConsonantId: 'final_p',
        toneMarkId: 0,
        expectedTone: 2,
        romanization: 'khɔ̀ɔp'
      },
      {
        thaiPart: 'คุณ',
        initialConsonant: 'ค',
        vowelId: 'v_u_short',
        finalConsonantId: 'final_n',
        toneMarkId: 0,
        expectedTone: 1,
        romanization: 'khun'
      }
    ]
  },
  {
    id: 'sawasdee',
    thai: 'สวัสดี',
    chinese: '你好 / 吉祥 (Sawasdee)',
    category: 'daily',
    explanation: '经典三音节，ส (sa 短) + วัส (wat 死音低调) + ดี (dee 中辅音长元音中平调)。',
    syllables: [
      {
        thaiPart: 'สะ',
        initialConsonant: 'ส',
        vowelId: 'v_a_short',
        finalConsonantId: 'final_none',
        toneMarkId: 0,
        expectedTone: 2,
        romanization: 'sa-'
      },
      {
        thaiPart: 'วัส',
        initialConsonant: 'ว',
        vowelId: 'v_a_short',
        finalConsonantId: 'final_t',
        toneMarkId: 0,
        expectedTone: 4,
        romanization: 'wát'
      },
      {
        thaiPart: 'ดี',
        initialConsonant: 'ด',
        vowelId: 'v_i_long',
        finalConsonantId: 'final_none',
        toneMarkId: 0,
        expectedTone: 1,
        romanization: 'dii'
      }
    ]
  }
];
