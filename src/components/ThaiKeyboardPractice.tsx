import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThaiKedmaneeKeyboard, THAI_KEDMANEE_LAYOUT } from './ThaiKedmaneeKeyboard';
import { KEYBOARD_PRACTICE_ITEMS } from '../data/luangporCourseData';
import { KeyboardPracticeItem } from '../types';
import { 
  THAI_CONSONANTS, 
  THAI_VOWELS, 
  THAI_FINAL_CONSONANTS, 
  THAI_TONE_MARKS,
  THAI_FIVE_TONES,
  ToneId,
  PRESET_DHAMMA_WORDS
} from '../utils/thaiPhoneticData';
import { 
  decomposeThaiWord, 
  decomposeSingleSyllable, 
  calculateThaiTone, 
  AssembleInput, 
  ToneDeductionResult 
} from '../utils/thaiPhoneticEngine';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { ToneShiftShowcaseCard, ToneShiftEvent } from './ToneShiftShowcaseCard';
import { ToneContourGraph } from './thai_lego/ToneContourGraph';
import { 
  Keyboard, Volume2, RotateCcw, Copy, Check, 
  Sparkles, Zap, ArrowRight, Play, CheckCircle2,
  VolumeX, Layers, Activity, BookOpen
} from 'lucide-react';

// 经典声韵变调实战演示序列预设
interface ToneShiftShowcaseItem {
  id: string;
  title: string;
  type: string;
  steps: Array<{
    text: string;
    charAdded: string;
    description: string;
    expectedTone: ToneId;
  }>;
}

const TONE_SHIFT_PRESETS: ToneShiftShowcaseItem[] = [
  {
    id: 'mid_consonant_full',
    title: '中辅音五调全变调 (ก / กา)',
    type: '中辅音规则',
    steps: [
      { text: 'ก', charAdded: 'ก', description: '中辅音原形 (第1调平声 33)', expectedTone: 1 },
      { text: 'กา', charAdded: 'า', description: '加长元音 า 构成舒声活音 (第1调平声 33)', expectedTone: 1 },
      { text: 'ก่า', charAdded: '่', description: '加 ไม้เอก ➔ 跃迁至第2调低声 (21)', expectedTone: 2 },
      { text: 'ก้า', charAdded: '้', description: '加 ไม้โท ➔ 跃迁至第3调骤降调 (51)', expectedTone: 3 },
      { text: 'ก๊า', charAdded: '๊', description: '加 ไม้ตรี ➔ 跃迁至第4调高升调 (45)', expectedTone: 4 },
      { text: 'ก๋า', charAdded: '๋', description: '加 ไม้จัตวา ➔ 跃迁至第5调升调 (24)', expectedTone: 5 }
    ]
  },
  {
    id: 'high_consonant_shift',
    title: '高辅音变调 (ข / ขา)',
    type: '高辅音规则',
    steps: [
      { text: 'ข', charAdded: 'ข', description: '高辅音原形自带第5调底色 (第5调升调 24)', expectedTone: 5 },
      { text: 'ขา', charAdded: 'า', description: '长元音活音 保持第5调升调 (24)', expectedTone: 5 },
      { text: 'ข่า', charAdded: '่', description: '加 ไม้เอก ➔ 跃迁至第2调低声 (21)', expectedTone: 2 },
      { text: 'ข้า', charAdded: '้', description: '加 ไม้โท ➔ 跃迁至第3调骤降调 (51)', expectedTone: 3 }
    ]
  },
  {
    id: 'low_consonant_shift',
    title: '低辅音越级变调 (ค / คา)',
    type: '低辅音规则',
    steps: [
      { text: 'ค', charAdded: 'ค', description: '低辅音原形 (第1调平声 33)', expectedTone: 1 },
      { text: 'คา', charAdded: 'า', description: '长元音活音 保持第1调平声 (33)', expectedTone: 1 },
      { text: 'ค่า', charAdded: '่', description: '低辅音标1调越级变第3调骤降调 (51)', expectedTone: 3 },
      { text: 'ค้า', charAdded: '้', description: '低辅音标2调越级变第4调高升调 (45)', expectedTone: 4 }
    ]
  },
  {
    id: 'live_to_dead_shift',
    title: '舒死尾音突变 (กา ➔ กาบ)',
    type: '舒死变调',
    steps: [
      { text: 'กา', charAdded: 'า', description: '长元音开音节舒声活音 (第1调平声 33)', expectedTone: 1 },
      { text: 'กาบ', charAdded: 'บ', description: '塞音死尾音 แม่กบ (-p) 气流阻断 ➔ 突变为第2调低声 (21)', expectedTone: 2 }
    ]
  }
];

interface ThaiKeyboardPracticeProps {
  initialTargetWord?: string;
  onSpeak: (text: string, rate?: number) => void;
}

export const ThaiKeyboardPractice: React.FC<ThaiKeyboardPracticeProps> = ({
  initialTargetWord,
  onSpeak
}) => {
  // 综合词库列表 (基础打卡词 + 经典法语高频词)
  const allPracticeItems: KeyboardPracticeItem[] = useMemo(() => {
    const list: KeyboardPracticeItem[] = [...KEYBOARD_PRACTICE_ITEMS];
    PRESET_DHAMMA_WORDS.forEach(dw => {
      if (!list.some(item => item.thai === dw.thai)) {
        list.push({
          id: `preset_${dw.id}`,
          category: dw.category,
          thai: dw.thai,
          romanization: dw.syllables.map(s => s.romanization).join('-'),
          chinese: dw.chinese,
          explanation: dw.explanation
        });
      }
    });
    return list;
  }, []);

  // 练习模式：'follow_word' (跟打通关) | 'free_sandbox' (自由变调探索)
  const [practiceMode, setPracticeMode] = useState<'follow_word' | 'free_sandbox'>('follow_word');

  // 当前选中的目标练习词
  const [selectedItem, setSelectedItem] = useState<KeyboardPracticeItem>(() => {
    if (initialTargetWord) {
      const match = allPracticeItems.find(i => i.thai === initialTargetWord);
      if (match) return match;
    }
    return allPracticeItems[0];
  });

  const [inputVal, setInputVal] = useState('');
  const [isShifted, setIsShifted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedCheckIn, setCopiedCheckIn] = useState(false);

  // 最近一次按键发声记录
  const [lastVocalizedInfo, setLastVocalizedInfo] = useState<{
    char: string;
    nameThai: string;
    nameZh: string;
  } | null>(null);

  // 变调事件状态：当击键产生音调变化时触发呈现
  const [activeToneShift, setActiveToneShift] = useState<ToneShiftEvent | null>(null);

  const targetText = practiceMode === 'follow_word' ? selectedItem.thai : inputVal;

  // 目标词音节拆解与推导
  const decomposedData = useMemo(() => {
    return decomposeThaiWord(targetText || 'กา');
  }, [targetText]);

  // 当前输入字符串的声学推导状态
  const currentInputDeduction = useMemo(() => {
    const textToAnalyze = inputVal.trim() || targetText;
    return decomposeSingleSyllable(textToAnalyze);
  }, [inputVal, targetText]);

  // 下一个需要输入的字符（跟打模式）
  const nextTargetChar = practiceMode === 'follow_word' && inputVal.length < targetText.length
    ? targetText[inputVal.length]
    : null;

  // 智能辅助：当下一个字符需要 Shift 时自动提示
  useEffect(() => {
    if (!nextTargetChar) return;
    let needsShift = false;
    for (const row of THAI_KEDMANEE_LAYOUT) {
      for (const k of row) {
        if (k.shifted === nextTargetChar) {
          needsShift = true;
          break;
        }
      }
    }
    setIsShifted(needsShift);
  }, [nextTargetChar]);

  // 检查是否通关完成 (跟打模式)
  useEffect(() => {
    if (practiceMode === 'follow_word' && inputVal === targetText && targetText.length > 0) {
      setIsSuccess(true);
      thaiAudio.playSuccessChime();
      // 通关时朗读整词发音
      setTimeout(() => {
        thaiAudio.speakThai(targetText, 0.9);
      }, 350);
    } else {
      setIsSuccess(false);
    }
  }, [inputVal, targetText, practiceMode]);

  /**
   * 变调检测与推导核心逻辑
   * 在击键前后比较音节调值，若发生跃迁则构建变调事件并触发变调声学对比
   */
  const detectAndTriggerToneShift = (prevText: string, newText: string, keyChar: string) => {
    if (!prevText || !newText) return;

    try {
      const prevDeduction = decomposeSingleSyllable(prevText);
      const nextDeduction = decomposeSingleSyllable(newText);

      const fromTone = prevDeduction.deduction.resultingTone;
      const toTone = nextDeduction.deduction.resultingTone;

      if (fromTone !== toTone) {
        // 发现核心变调！
        const keyInfo = thaiAudio.getCharInfo(keyChar);
        let ruleExplanation = '';

        if (['่', '้', '๊', '๋'].includes(keyChar)) {
          ruleExplanation = `${nextDeduction.deduction.effectiveClassName} + 添加调符 ${keyInfo.nameThai} ➔ 由第 ${fromTone} 调【${THAI_FIVE_TONES[fromTone].nameZh}】跃迁为第 ${toTone} 调【${THAI_FIVE_TONES[toTone].nameZh}】`;
        } else if (['บ', 'ด', 'ก', 'ป', 'ต', 'จ', 'ช', 'ซ', 'ถ', 'ท', 'พ', 'ฟ'].includes(keyChar)) {
          ruleExplanation = `开音节舒声活音遇闭塞死尾音 (${keyChar}) ➔ 气流阻断转为死音 (คำตาย)，由第 ${fromTone} 调【${THAI_FIVE_TONES[fromTone].nameZh}】突变为第 ${toTone} 调【${THAI_FIVE_TONES[toTone].nameZh}】`;
        } else if (keyChar === 'ห' || keyChar === 'อ') {
          ruleExplanation = `前引字 (${keyChar}) 介入 ➔ 提升辅音调级规则，由第 ${fromTone} 调【${THAI_FIVE_TONES[fromTone].nameZh}】变调为第 ${toTone} 调【${THAI_FIVE_TONES[toTone].nameZh}】`;
        } else {
          ruleExplanation = `字母组合规则突变：由第 ${fromTone} 调【${THAI_FIVE_TONES[fromTone].nameZh}】跃迁至第 ${toTone} 调【${THAI_FIVE_TONES[toTone].nameZh}】`;
        }

        const shiftEvent: ToneShiftEvent = {
          fromTone,
          toTone,
          fromText: prevDeduction.thaiPart,
          toText: nextDeduction.thaiPart,
          triggerChar: keyChar,
          triggerName: keyInfo.nameThai,
          ruleExplanation,
          timestamp: Date.now()
        };

        setActiveToneShift(shiftEvent);

        // 自动播放变调前后声学对比
        if (soundEnabled) {
          // 稍延迟给刚按下的字母名发声留出间隔 (0.65s 之后进入对比)
          setTimeout(() => {
            thaiAudio.playToneTransitionContrast(fromTone, toTone, nextDeduction.thaiPart);
          }, 650);
        }
      }
    } catch (e) {
      // 容错处理
    }
  };

  /**
   * 键盘敲击统一入口 (点击或物理键盘敲击)
   */
  const handleKeyPress = (char: string) => {
    const keyInfo = thaiAudio.getCharInfo(char);
    setLastVocalizedInfo({
      char,
      nameThai: keyInfo.nameThai,
      nameZh: keyInfo.nameZh
    });

    const prevInput = inputVal;
    const nextInput = inputVal + char;

    setInputVal(nextInput);

    // 变调检测与推导
    detectAndTriggerToneShift(prevInput, nextInput, char);
  };

  const handleBackspace = () => {
    setInputVal(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    // 敲击空格：按用户要求，朗读当前已拼合的整词
    const textToSpeak = inputVal.trim() || targetText;
    if (textToSpeak) {
      thaiAudio.speakThai(textToSpeak, 0.95);
    }
  };

  const handleReset = () => {
    setInputVal('');
    setIsSuccess(false);
    setActiveToneShift(null);
  };

  const handleSelectWord = (item: KeyboardPracticeItem) => {
    setSelectedItem(item);
    setPracticeMode('follow_word');
    setInputVal('');
    setIsSuccess(false);
    setActiveToneShift(null);
  };

  // 载入变调预设序列中的某一步
  const handleLoadPresetStep = (preset: ToneShiftShowcaseItem, stepIndex: number) => {
    const step = preset.steps[stepIndex];
    const prevStep = stepIndex > 0 ? preset.steps[stepIndex - 1] : null;

    setPracticeMode('free_sandbox');
    setInputVal(step.text);
    setIsSuccess(false);

    if (prevStep && prevStep.expectedTone !== step.expectedTone) {
      const shiftEvent: ToneShiftEvent = {
        fromTone: prevStep.expectedTone,
        toTone: step.expectedTone,
        fromText: prevStep.text,
        toText: step.text,
        triggerChar: step.charAdded,
        triggerName: thaiAudio.getCharInfo(step.charAdded).nameThai,
        ruleExplanation: `${preset.title}：${step.description}`,
        timestamp: Date.now()
      };
      setActiveToneShift(shiftEvent);
      thaiAudio.playToneTransitionContrast(prevStep.expectedTone, step.expectedTone, step.text);
    } else {
      thaiAudio.speakThai(step.text, 0.9);
    }
  };

  // 复制通关打卡文案 (含变调法则与五调认证)
  const handleCopyCheckIn = () => {
    const toneSummary = decomposedData.fullDeductionSummary;
    const currentToneInfo = currentInputDeduction.deduction.toneInfo;

    const text = 
`🎉【泰语 Kedmanee 键盘盲打 & 击键变调通关认证】
━━━━━━━━━━━━━━━━━━━━━━━━
🎯 打卡词汇：${targetText} [${selectedItem.romanization}]
📖 核心释义：${selectedItem.chinese}
💡 义理要旨：${selectedItem.explanation}
🧩 声韵变调全景推导认证：
  ${toneSummary}
📈 声调音高走势认证：
  • 命中调型：第${currentInputDeduction.deduction.resultingTone}调 【${currentToneInfo.nameThai} · ${currentToneInfo.nameZh}】
  • 赵元任五度调值：${currentToneInfo.chaoNumber} (${currentToneInfo.ipaSymbol})
  • 走势特征：${currentToneInfo.description}
⌨️ Kedmanee 打键验证：敲击即刻发声 · 变调过程声学验证通过
✨ 现代学泰语心法：打破传统死记硬背，敲键出声，组合变调，听音识字！`;

    navigator.clipboard.writeText(text);
    setCopiedCheckIn(true);
    setTimeout(() => setCopiedCheckIn(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-slate-100 max-w-5xl mx-auto pb-10 animate-fadeIn select-none">
      
      {/* 1. Header Toolbar (模式切换与轻量精选词库) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
        
        {/* Left: Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setPracticeMode('follow_word');
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                practiceMode === 'follow_word'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>词汇打卡跟打模式</span>
            </button>
            <button
              onClick={() => {
                setPracticeMode('free_sandbox');
                handleReset();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                practiceMode === 'free_sandbox'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>自由敲击变调探索</span>
            </button>
          </div>
        </div>

        {/* Right: Rapid Word Switcher */}
        {practiceMode === 'follow_word' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">选词打卡：</span>
            {allPracticeItems.slice(0, 8).map(item => {
              const isSelected = selectedItem.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectWord(item)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 border shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <span className="font-thai">{item.thai}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Top Hero Card: 超大字符全焦卡 (Hero Phonetic Card) */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        
        {/* Success celebration glow */}
        {isSuccess && (
          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-4">
          
          {/* Main Giant Character & Romanization */}
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              {/* Giant Thai Display */}
              <span className="text-4xl sm:text-6xl font-black font-thai text-amber-400 tracking-wider">
                {practiceMode === 'follow_word' ? selectedItem.thai : (inputVal || 'ก')}
              </span>

              {/* Listen Full Word Audio */}
              <button
                type="button"
                onClick={() => thaiAudio.speakThai(targetText || 'ก', 0.9)}
                className="p-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/30 transition shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                title="朗读当前词汇完整发音"
              >
                <Volume2 className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold font-mono">朗读整词</span>
              </button>

              {/* Success Badge */}
              {isSuccess && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>盲打全对通关！</span>
                </div>
              )}
            </div>

            {/* Sub-info: Romanization & Meaning */}
            <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm font-medium flex-wrap">
              <span className="font-mono text-cyan-300 font-bold">
                /{practiceMode === 'follow_word' ? selectedItem.romanization : currentInputDeduction.deduction.romanization}/
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-200 font-bold">
                {practiceMode === 'follow_word' ? selectedItem.chinese : '实时自由输入'}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-300 font-bold">
                第 {currentInputDeduction.deduction.resultingTone} 调 · {currentInputDeduction.deduction.toneInfo.nameZh}
              </span>
            </div>

            {practiceMode === 'follow_word' && selectedItem.explanation && (
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                💡 {selectedItem.explanation}
              </p>
            )}
          </div>

          {/* Typing Progress & Actions */}
          <div className="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0">
            {practiceMode === 'follow_word' ? (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">击键打字进度</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                  {inputVal.length} <span className="text-sm text-slate-500 font-normal">/ {targetText.length}</span>
                </div>
              </div>
            ) : (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">自由输入字数</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
                  {inputVal.length} <span className="text-sm text-slate-500 font-normal">字</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>清空重打</span>
              </button>

              {isSuccess && (
                <button
                  type="button"
                  onClick={handleCopyCheckIn}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  {copiedCheckIn ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCheckIn ? '打卡文案已复制！' : '复制打卡文案'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Character By Character Guided Tiles */}
        <div className="bg-slate-950/90 border-2 border-slate-800 rounded-2xl p-3 sm:p-4 shadow-inner">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono flex items-center gap-1">
              ⌨️ {practiceMode === 'follow_word' ? '逐键敲击跟打轨迹：' : '当前实时输入串：'}
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              黄色高亮为当前待击键位
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap min-h-[52px]">
            {practiceMode === 'follow_word' ? (
              // 跟打模式：逐字方块
              Array.from(targetText).map((char, index) => {
                const isTyped = index < inputVal.length;
                const isCurrent = index === inputVal.length;
                const isCorrect = isTyped && inputVal[index] === char;
                const isWrong = isTyped && inputVal[index] !== char;

                return (
                  <div
                    key={index}
                    className={`w-11 h-13 sm:w-13 sm:h-15 rounded-xl flex flex-col items-center justify-center font-thai transition-all relative border ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/20 scale-105 ring-2 ring-amber-400/50'
                        : isCorrect
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : isWrong
                        ? 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl font-black">
                      {isTyped ? inputVal[index] : char}
                    </span>
                    <span className="text-[9px] font-mono mt-0.5 text-slate-400">
                      {index + 1}
                    </span>
                    {isCurrent && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    )}
                  </div>
                );
              })
            ) : (
              // 自由探索模式：直接显示输入流
              inputVal.length > 0 ? (
                Array.from(inputVal).map((char, index) => (
                  <div
                    key={index}
                    className="w-11 h-13 sm:w-13 sm:h-15 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center font-thai text-amber-300 text-xl sm:text-2xl font-bold shadow-sm"
                  >
                    <span>{char}</span>
                    <span className="text-[9px] font-mono text-slate-500">{index + 1}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-xs font-mono py-2 italic">
                  请直接在下方 Kedmanee 键盘或物理键盘敲击泰文字符，实时体验击键发声与组合变调...
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* 3. Middle Stage: 核心变调过程走势展台 (Dynamic Tone Shift Stage) */}
      {activeToneShift ? (
        <ToneShiftShowcaseCard
          shiftEvent={activeToneShift}
          onReplayTransition={() => {
            thaiAudio.playToneTransitionContrast(
              activeToneShift.fromTone,
              activeToneShift.toTone,
              activeToneShift.toText
            );
          }}
        />
      ) : (
        /* 静默状态展示当前的声学变调与音高状态 */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">当前声学状态：</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {currentInputDeduction.deduction.effectiveClassName}
                </span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  {currentInputDeduction.deduction.syllableLifeName}
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  第 {currentInputDeduction.deduction.resultingTone} 调 [{currentInputDeduction.deduction.toneInfo.chaoNumber}]
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                💡 敲击声调符 (่ ้ ๊ ๋) 或死尾音 (ก บ ด) 会立即触发动态变调过程与音高走势！
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => thaiAudio.playToneMelody(currentInputDeduction.deduction.resultingTone, 0.45)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer active:scale-95 shrink-0"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            <span>听当前调值 ({currentInputDeduction.deduction.toneInfo.chaoNumber})</span>
          </button>
        </div>
      )}

      {/* 4. Interactive Talking Thai Kedmanee Keyboard */}
      <ThaiKedmaneeKeyboard
        highlightChar={nextTargetChar}
        onKeyPress={handleKeyPress}
        isShifted={isShifted}
        onToggleShift={() => setIsShifted(prev => !prev)}
        onBackspace={handleBackspace}
        onSpace={handleSpace}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(prev => !prev)}
        lastVocalizedInfo={lastVocalizedInfo}
      />

      {/* 5. Bottom Showcase Bar: 经典变调速查预设 (一键载入体验变调) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs sm:text-sm font-bold text-white">
              经典变调演示序列 (点击逐步体会变调过程与声调走势)
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            4 大典型变调法则实战
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TONE_SHIFT_PRESETS.map(preset => (
            <div
              key={preset.id}
              className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-amber-400">{preset.title}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                    {preset.type}
                  </span>
                </div>
              </div>

              {/* Step Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {preset.steps.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadPresetStep(preset, idx)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold font-thai transition border border-slate-700 cursor-pointer active:scale-95 flex items-center gap-1"
                    title={`${step.description} (第${step.expectedTone}调)`}
                  >
                    <span>{step.text}</span>
                    <span className="text-[9px] font-mono opacity-70">T{step.expectedTone}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
