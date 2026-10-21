// 泰语智能发音驱动器：Web Speech API 真人朗读 + Web Audio API 五调音高声学合成器
// Dual-Engine Thai Audio Driver with Per-Keystroke Vocalization & Tone Shift Synthesis

import { ToneId, THAI_FIVE_TONES } from './thaiPhoneticData';

export interface KeySoundInfo {
  char: string;
  nameThai: string;
  nameZh: string;
  category: 'consonant' | 'vowel' | 'tone' | 'symbol' | 'special';
  phoneticTip: string;
}

// 泰语键盘全部键位的官方官方名称字典 (用于击键发声)
export const THAI_KEY_SOUND_MAP: Record<string, KeySoundInfo> = {
  // 🟢 44 辅音字母官方全称 (กอ ไก่, ขอ ไข่...)
  'ก': { char: 'ก', nameThai: 'ก ไก่', nameZh: '中辅音 ก (鸡)', category: 'consonant', phoneticTip: '中辅音基石，不送气 k/g' },
  'ข': { char: 'ข', nameThai: 'ขอ ไข่', nameZh: '高辅音 ข (蛋)', category: 'consonant', phoneticTip: '高辅音送气 kh，自带第5调底色' },
  'ฃ': { char: 'ฃ', nameThai: 'ขอ ขวด', nameZh: '高辅音 ฃ (瓶-古废字)', category: 'consonant', phoneticTip: '已废弃，由 ข 替代' },
  'ค': { char: 'ค', nameThai: 'คอ ควาย', nameZh: '低辅音 ค (水牛)', category: 'consonant', phoneticTip: '低辅音送气 kh' },
  'ฅ': { char: 'ฅ', nameThai: 'คอ คน', nameZh: '低辅音 ฅ (人-古废字)', category: 'consonant', phoneticTip: '已废弃，由 ค 替代' },
  'ฆ': { char: 'ฆ', nameThai: 'ฆอ ระฆัง', nameZh: '低辅音 ฆ (大钟)', category: 'consonant', phoneticTip: '双低辅音 kh' },
  'ง': { char: 'ง', nameThai: 'งอ งู', nameZh: '低辅音 ง (蛇)', category: 'consonant', phoneticTip: '单低辅音鼻音 ng' },
  'จ': { char: 'จ', nameThai: 'จอ จาน', nameZh: '中辅音 จ (盘子)', category: 'consonant', phoneticTip: '中辅音不送气 ch/j' },
  'ฉ': { char: 'ฉ', nameThai: 'ฉอ ฉิ่ง', nameZh: '高辅音 ฉ (铜钹)', category: 'consonant', phoneticTip: '高辅音送气 ch' },
  'ช': { char: 'ช', nameThai: 'ชอ ช้าง', nameZh: '低辅音 ช (大象)', category: 'consonant', phoneticTip: '低辅音送气 ch' },
  'ซ': { char: 'ซ', nameThai: 'ซอ โซ่', nameZh: '低辅音 ซ (铁链)', category: 'consonant', phoneticTip: '低辅音清擦音 s' },
  'ฌ': { char: 'ฌ', nameThai: 'ฌอ เฌอ', nameZh: '低辅音 ฌ (树木)', category: 'consonant', phoneticTip: '双低辅音 ch' },
  'ญ': { char: 'ญ', nameThai: 'ญอ หญิง', nameZh: '低辅音 ญ (妇女)', category: 'consonant', phoneticTip: '单低辅音 y' },
  'ฎ': { char: 'ฎ', nameThai: 'ฎอ ชฎา', nameZh: '中辅音 ฎ (宝冠)', category: 'consonant', phoneticTip: '中辅音浊塞音 d' },
  'ฏ': { char: 'ฏ', nameThai: 'ฏอ ปฏัก', nameZh: '中辅音 ฏ (刺棒)', category: 'consonant', phoneticTip: '中辅音不送气 t' },
  'ฐ': { char: 'ฐ', nameThai: 'ฐอ ฐาน', nameZh: '高辅音 ฐ (底座)', category: 'consonant', phoneticTip: '高辅音送气 th' },
  'ฑ': { char: 'ฑ', nameThai: 'ฑอ มณโฑ', nameZh: '低辅音 ฑ (曼陀罗王妃)', category: 'consonant', phoneticTip: '双低辅音 th' },
  'ฒ': { char: 'ฒ', nameThai: 'ฒอ ผู้เฒ่า', nameZh: '低辅音 ฒ (老人)', category: 'consonant', phoneticTip: '双低辅音 th' },
  'ณ': { char: 'ณ', nameThai: 'ณอ เณร', nameZh: '低辅音 ณ (小沙弥)', category: 'consonant', phoneticTip: '单低辅音 n' },
  'ด': { char: 'ด', nameThai: 'ดอ เด็ก', nameZh: '中辅音 ด (儿童)', category: 'consonant', phoneticTip: '中辅音浊塞音 d' },
  'ต': { char: 'ต', nameThai: 'ตอ เต่า', nameZh: '中辅音 ต (乌龟)', category: 'consonant', phoneticTip: '中辅音清不送气 t' },
  'ถ': { char: 'ถ', nameThai: 'ถอ ถุง', nameZh: '高辅音 ถ (布袋)', category: 'consonant', phoneticTip: '高辅音送气 th' },
  'ท': { char: 'ท', nameThai: 'ทอ ทหาร', nameZh: '低辅音 ท (军人)', category: 'consonant', phoneticTip: '低辅音送气 th' },
  'ธ': { char: 'ธ', nameThai: 'ธอ ธง', nameZh: '低辅音 ธ (国旗)', category: 'consonant', phoneticTip: '低辅音送气 th (佛法常客)' },
  'น': { char: 'น', nameThai: 'นอ หนู', nameZh: '低辅音 น (老鼠)', category: 'consonant', phoneticTip: '单低辅音鼻音 n' },
  'บ': { char: 'บ', nameThai: 'บอ ใบไม้', nameZh: '中辅音 บ (树叶)', category: 'consonant', phoneticTip: '中辅音浊塞音 b' },
  'ป': { char: 'ป', nameThai: 'ปอ ปลา', nameZh: '中辅音 ป (鱼)', category: 'consonant', phoneticTip: '中辅音不送气 p' },
  'ผ': { char: 'ผ', nameThai: 'ผอ ผึ้ง', nameZh: '高辅音 ผ (蜜蜂)', category: 'consonant', phoneticTip: '高辅音送气 ph' },
  'ฝ': { char: 'ฝ', nameThai: 'ฝอ ฝา', nameZh: '高辅音 ฝ (锅盖)', category: 'consonant', phoneticTip: '高辅音清擦音 f' },
  'พ': { char: 'พ', nameThai: 'พอ พาน', nameZh: '低辅音 พ (托盘)', category: 'consonant', phoneticTip: '低辅音送气 ph' },
  'ฟ': { char: 'ฟ', nameThai: 'ฟอ ฟัน', nameZh: '低辅音 ฟ (牙齿)', category: 'consonant', phoneticTip: '低辅音清擦音 f' },
  'ภ': { char: 'ภ', nameThai: 'ภอ สำเภา', nameZh: '低辅音 ภ (帆船)', category: 'consonant', phoneticTip: '低辅音送气 ph' },
  'ม': { char: 'ม', nameThai: 'มอ ม้า', nameZh: '低辅音 ม (马)', category: 'consonant', phoneticTip: '单低辅音鼻音 m' },
  'ย': { char: 'ย', nameThai: 'ยอ ยักษ์', nameZh: '低辅音 ย (夜叉)', category: 'consonant', phoneticTip: '单低辅音近音 y' },
  'ร': { char: 'ร', nameThai: 'รอ เรือ', nameZh: '低辅音 ร (小船)', category: 'consonant', phoneticTip: '单低辅音颤音 r' },
  'ล': { char: 'ล', nameThai: 'ลอ ลิง', nameZh: '低辅音 ล (猴子)', category: 'consonant', phoneticTip: '单低辅音边音 l' },
  'ว': { char: 'ว', nameThai: 'วอ แหวน', nameZh: '低辅音 ว (戒指)', category: 'consonant', phoneticTip: '单低辅音近音 w' },
  'ศ': { char: 'ศ', nameThai: 'ศอ ศาลา', nameZh: '高辅音 ศ (凉亭)', category: 'consonant', phoneticTip: '高辅音清擦音 s' },
  'ษ': { char: 'ษ', nameThai: 'ษอ ฤๅษี', nameZh: '高辅音 ษ (鲁士仙人)', category: 'consonant', phoneticTip: '高辅音清擦音 s' },
  'ส': { char: 'ส', nameThai: 'สอ เสือ', nameZh: '高辅音 ส (老虎)', category: 'consonant', phoneticTip: '高辅音清擦音 s (สติ 首辅音)' },
  'ห': { char: 'ห', nameThai: 'หอ หีบ', nameZh: '高辅音 ห (木箱)', category: 'consonant', phoneticTip: '高辅音前引字基石 (ห นํา)' },
  'ฬ': { char: 'ฬ', nameThai: 'ฬอ จุฬา', nameZh: '低辅音 ฬ (风筝)', category: 'consonant', phoneticTip: '单低辅音边音 l' },
  'อ': { char: 'อ', nameThai: 'ออ อ่าง', nameZh: '中辅音 อ (水盆)', category: 'consonant', phoneticTip: '中辅音零声母载体' },
  'ฮ': { char: 'ฮ', nameThai: 'ฮอ นกฮูก', nameZh: '低辅音 ฮ (猫头鹰)', category: 'consonant', phoneticTip: '低辅音擦音 h' },

  // 🟡 元音及构形符号 (Sara / Vowels)
  'ะ': { char: 'ะ', nameThai: 'สระอะ', nameZh: '短元音 ะ (萨拉阿)', category: 'vowel', phoneticTip: '短元音 a' },
  'ั': { char: 'ั', nameThai: 'ไม้หันอากาศ', nameZh: '迈寒挨 (上标短元音形变符)', category: 'vowel', phoneticTip: '短元音 a 遇尾音形变' },
  'า': { char: 'า', nameThai: 'สระอา', nameZh: '长元音 า (萨拉阿长)', category: 'vowel', phoneticTip: '舒声活音 aa' },
  'ำ': { char: 'ำ', nameThai: 'สระอำ', nameZh: '特殊元音 ำ (萨拉昂)', category: 'vowel', phoneticTip: '自闭尾鼻元音 am' },
  'ิ': { char: 'ิ', nameThai: 'สระอิ', nameZh: '短元音 ิ (萨拉依短)', category: 'vowel', phoneticTip: '短元音 i' },
  'ี': { char: 'ี', nameThai: 'สระอี', nameZh: '长元音 ี (萨拉依长)', category: 'vowel', phoneticTip: '长元音 ee' },
  'ึ': { char: 'ึ', nameThai: 'สระอึ', nameZh: '短元音 ึ (萨拉厄短)', category: 'vowel', phoneticTip: '短后不圆唇元音 ue' },
  'ื': { char: 'ื', nameThai: 'สระอือ', nameZh: '长元音 ื (萨拉厄长)', category: 'vowel', phoneticTip: '长后不圆唇元音 uee' },
  'ุ': { char: 'ุ', nameThai: 'สระอุ', nameZh: '短元音 ุ (萨拉乌短)', category: 'vowel', phoneticTip: '短后圆唇元音 u' },
  'ู': { char: 'ู', nameThai: 'สระอู', nameZh: '长元音 ู (萨拉乌长)', category: 'vowel', phoneticTip: '长后圆唇元音 oo' },
  'เ': { char: 'เ', nameThai: 'สระเอ', nameZh: '前置长元音 เ (萨拉埃)', category: 'vowel', phoneticTip: '前置长元音 ay' },
  'แ': { char: 'แ', nameThai: 'สระแอ', nameZh: '前置长元音 แ (萨拉爱)', category: 'vowel', phoneticTip: '前置长大开口元音 ae' },
  'โ': { char: 'โ', nameThai: 'สระโอ', nameZh: '前置长元音 โ (萨拉欧)', category: 'vowel', phoneticTip: '前置长圆唇元音 oh' },
  'ใ': { char: 'ใ', nameThai: 'สระไอไม้ม้วน', nameZh: '前置元音 ใ (卷尾艾)', category: 'vowel', phoneticTip: '20常用特殊元音 ai' },
  'ไ': { char: 'ไ', nameThai: 'สระไอไม้มลาย', nameZh: '前置元音 ไ (花尾艾)', category: 'vowel', phoneticTip: '最通用的元音 ai' },
  'ๅ': { char: 'ๅ', nameThai: 'ลากข้าง', nameZh: '长尾拉长符 ๅ', category: 'vowel', phoneticTip: '搭配 ฤ ฦ 拉长音节' },
  '็': { char: '็', nameThai: 'ไม้ไต่คู้', nameZh: '迈代酷 (短音缩短符 ็)', category: 'vowel', phoneticTip: '压短元音时长为短音' },
  '์': { char: '์', nameThai: 'ไม้ทัณฑฆาต', nameZh: '迦兰静音符 ์ (Garan)', category: 'special', phoneticTip: '标在辅音上使该辅音不发音' },
  'ฤ': { char: 'ฤ', nameThai: 'ตัวรึ', nameZh: '梵文元音 ฤ (Tua Rue)', category: 'vowel', phoneticTip: '梵巴借词经典声素' },
  'ฦ': { char: 'ฦ', nameThai: 'ตัวลึ', nameZh: '梵文元音 ฦ (Tua Lue)', category: 'vowel', phoneticTip: '古典词元音' },

  // 🔴 4 大声调符号 (Tone Marks) - 击键变调最核心引擎
  '่': { char: '่', nameThai: 'ไม้เอก', nameZh: '第一调符 (迈艾 ไม้เอก)', category: 'tone', phoneticTip: '低/降变调核心符' },
  '้': { char: '้', nameThai: 'ไม้โท', nameZh: '第二调符 (迈脱 ไม้โท)', category: 'tone', phoneticTip: '高/落变调核心符' },
  '๊': { char: '๊', nameThai: 'ไม้ตรี', nameZh: '第三调符 (迈德里 ไม้ตรี)', category: 'tone', phoneticTip: '高升调符号（仅中辅音）' },
  '๋': { char: '๋', nameThai: 'ไม้จัตวา', nameZh: '第四调符 (迈扎达瓦 ไม้จัตวา)', category: 'tone', phoneticTip: '升调符号（仅中辅音）' },

  // ⚪ 常用标点及符号
  'ๆ': { char: 'ๆ', nameThai: 'ไม้ยมก', nameZh: '重复符 (迈亚木 ๆ)', category: 'symbol', phoneticTip: '重读前一个词' },
  'ฯ': { char: 'ฯ', nameThai: 'ไปยาลน้อย', nameZh: '简略符 (拜亚诺伊 ฯ)', category: 'symbol', phoneticTip: '皇家语或省写词' },
  '฿': { char: '฿', nameThai: 'บาท', nameZh: '泰铢货币符 ฿', category: 'symbol', phoneticTip: '货币单位' },
  ' ': { char: ' ', nameThai: 'วรรค', nameZh: '空格分词', category: 'special', phoneticTip: '泰语分词停顿标志' }
};

class ThaiAudioEngine {
  private audioCtx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * 获取任意泰语字符的官方发音名与说明
   */
  public getCharInfo(char: string): KeySoundInfo {
    if (THAI_KEY_SOUND_MAP[char]) {
      return THAI_KEY_SOUND_MAP[char];
    }
    return {
      char,
      nameThai: char,
      nameZh: `按键 ${char}`,
      category: 'special',
      phoneticTip: '泰语按键字符'
    };
  }

  /**
   * 朗读泰文字符串 (Web Speech API)
   */
  public speakThai(text: string, rate: number = 0.95): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = rate;

      const thaiVoice = this.voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * 朗读泰文单词或句子（speakThai 别名）
   */
  public speakWord(text: string, rate: number = 0.95): Promise<boolean> {
    return this.speakThai(text, rate);
  }

  /**
   * 敲击按键即刻发声：播报按键字母官方全称 (如 ก -> กอ ไก่; ่ -> ไม้เอก)
   * 伴随机械触感滴答音
   */
  public speakKeyChar(char: string): Promise<boolean> {
    // 1. 立即播放按键滴答声 (0延迟触觉)
    this.playKeyTick();

    // 2. 查表获取官方泰语发音名称
    const info = this.getCharInfo(char);
    const spokenName = info.nameThai;

    // 3. 朗读该键名字
    return this.speakThai(spokenName, 1.05);
  }

  /**
   * 声学音高走势合成器 (Web Audio API)
   * 精确模拟赵元任五度调值 (33, 21, 51, 45, 24) 的精确基频调制轨迹
   */
  public playToneMelody(toneId: ToneId, durationSec: number = 0.45) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 双极点低通滤波让发音柔和圆润，接近人声元音共振峰
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);

    osc.type = 'sawtooth';

    // 基于五度音高的基准频率 (Base pitch around 220Hz = A3)
    // 5度: ~290Hz, 4度: ~250Hz, 3度: ~220Hz, 2度: ~185Hz, 1度: ~145Hz
    const pitchMap: Record<number, number> = {
      1: 145,
      2: 185,
      3: 220,
      4: 252,
      5: 292
    };

    const tone = THAI_FIVE_TONES[toneId];
    const points = tone.pitchPoints; // e.g. [3,3,3,3,3] or [4.8, 5.0, 3.8, 2.2, 1.0]

    // 建立音高频率包络
    const timeStep = durationSec / (points.length - 1);
    points.forEach((p, index) => {
      const low = Math.floor(p);
      const high = Math.min(5, Math.ceil(p));
      const frac = p - low;
      const freq = pitchMap[low] + (pitchMap[high] - pitchMap[low]) * frac;
      
      const targetTime = now + index * timeStep;
      if (index === 0) {
        osc.frequency.setValueAtTime(freq, targetTime);
      } else {
        osc.frequency.exponentialRampToValueAtTime(Math.max(80, freq), targetTime);
      }
    });

    // 音量平滑包络
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    gain.gain.setValueAtTime(0.28, now + durationSec - 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  /**
   * 变调对比过渡跃迁声 (Transition Glissando Walkthrough)
   * 依次播放：原音调走势 ➔ 跃迁提示音 ➔ 变调后新调走势 ➔ 朗读变调后整词
   */
  public async playToneTransitionContrast(
    fromToneId: ToneId, 
    toToneId: ToneId, 
    finalWordText?: string
  ): Promise<void> {
    const ctx = this.getAudioContext();
    if (!ctx) {
      if (finalWordText) await this.speakThai(finalWordText, 0.9);
      return;
    }

    // 1. 播放变调前原调音高 (0.35s)
    this.playToneMelody(fromToneId, 0.35);

    // 2. 在 0.4s 处播放变调提示跃迁音
    setTimeout(() => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } catch (e) {
        // audio context safe
      }
    }, 380);

    // 3. 在 0.58s 处播放变调后的新调音高走势 (0.45s)
    setTimeout(() => {
      this.playToneMelody(toToneId, 0.45);
    }, 580);

    // 4. 在 1.1s 处朗读变调后的最新完整词汇
    if (finalWordText) {
      setTimeout(() => {
        this.speakThai(finalWordText, 0.9);
      }, 1080);
    }
  }

  /**
   * 键盘敲击清脆机械声 (Tactile Key Tick)
   */
  public playKeyTick() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.035);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // AudioContext fallback
    }
  }

  /**
   * 通关成功清澈和弦音 (Celebration Chime)
   */
  public playSuccessChime() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        const startTime = now + idx * 0.07;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } catch {
      // AudioContext fallback
    }
  }
}

export const thaiAudio = new ThaiAudioEngine();
