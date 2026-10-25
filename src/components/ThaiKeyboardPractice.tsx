import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ThaiKedmaneeKeyboard, THAI_KEDMANEE_LAYOUT } from './ThaiKedmaneeKeyboard';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { 
  Keyboard, Volume2, RotateCcw, CheckCircle2, 
  Sparkles, ArrowLeft, VolumeX, Edit3
} from 'lucide-react';

interface ThaiKeyboardPracticeProps {
  initialTargetWord?: string;
  onSpeak: (text: string, rate?: number) => void;
  onBackToStudy?: () => void;
  onPracticeCompleted?: (targetWord: string) => void;
}

// 常用共学核心法词快速切换选项 (均已清除旧的邪见等无关内容)
const CORE_DHAMMA_QUICK_PRESETS = [
  { thai: 'สัมมาสมาธิ', zh: '正定' },
  { thai: 'สติปัฏฐาน', zh: '四念处' },
  { thai: 'สัมมาทิฏฐิ', zh: '正见' },
  { thai: 'รู้สึกตัว', zh: '觉知当下' },
  { thai: 'ผู้รู้', zh: '知者心' },
  { thai: 'สติ', zh: '正念' },
  { thai: 'ธรรมะ', zh: '佛法' },
];

export const ThaiKeyboardPractice: React.FC<ThaiKeyboardPracticeProps> = ({
  initialTargetWord = 'สัมมาสมาธิ',
  onSpeak,
  onBackToStudy,
  onPracticeCompleted
}) => {
  // 当前打字目标文本 (支持从双视频传过来的词句，也支持自定义)
  const [targetText, setTargetText] = useState<string>(() => initialTargetWord.trim() || 'สัมมาสมาธิ');
  // 用户当前已敲击输入的文本
  const [inputVal, setInputVal] = useState<string>('');
  // 引用最新输入值，防止高频击键时闭包过期
  const inputValRef = React.useRef<string>(inputVal);
  inputValRef.current = inputVal;

  // 是否启用敲击发声
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Shift 状态
  const [isShifted, setIsShifted] = useState<boolean>(false);
  // 是否打卡通关
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  // 自定义目标输入框展开状态
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [customInputText, setCustomInputText] = useState<string>('');

  // 最近敲击的字符信息
  const [lastVocalizedInfo, setLastVocalizedInfo] = useState<{
    char: string;
    nameThai: string;
    nameZh: string;
  } | null>(null);

  // 监听双视频传来的外部目标词更新
  useEffect(() => {
    if (initialTargetWord && initialTargetWord.trim() !== targetText) {
      const trimmed = initialTargetWord.trim();
      setTargetText(trimmed);
      inputValRef.current = '';
      setInputVal('');
      setIsCompleted(false);
    }
  }, [initialTargetWord]);

  // 将目标词拆解为单个字符序列，用于字符级精准对齐反馈
  const targetChars = useMemo(() => {
    return Array.from(targetText);
  }, [targetText]);

  // 当前待打的下一个字符下标
  const currentPendingIndex = useMemo(() => {
    let i = 0;
    while (i < inputVal.length && i < targetChars.length) {
      if (inputVal[i] !== targetChars[i]) {
        return i; // 出现输入错误的位置
      }
      i++;
    }
    return i;
  }, [inputVal, targetChars]);

  // 当前需要输入的字符
  const nextTargetChar = targetChars[currentPendingIndex] || null;

  // 检查待打字符是否需要按住 Shift
  const nextCharRequiresShift = useMemo(() => {
    if (!nextTargetChar) return false;
    for (const row of THAI_KEDMANEE_LAYOUT) {
      for (const k of row) {
        if (k.shifted === nextTargetChar) return true;
      }
    }
    return false;
  }, [nextTargetChar]);

  // 查找对应键盘 QWERTY 键位名称
  const nextCharKeyPrompt = useMemo(() => {
    if (!nextTargetChar) return null;
    for (const row of THAI_KEDMANEE_LAYOUT) {
      for (const k of row) {
        if (k.unshifted === nextTargetChar) {
          return { key: k.qwerty.toUpperCase(), shift: false, char: nextTargetChar };
        }
        if (k.shifted === nextTargetChar) {
          return { key: k.qwerty.toUpperCase(), shift: true, char: nextTargetChar };
        }
      }
    }
    return null;
  }, [nextTargetChar]);

  // 核心：单键敲击发声并上屏，打卡结束时干净朗读泰文词
  const handleKeyPress = useCallback((char: string) => {
    // 1. 获取字符发音信息并更新最近发声指示
    const info = thaiAudio.getCharInfo(char);
    setLastVocalizedInfo({
      char,
      nameThai: info.nameThai,
      nameZh: info.nameZh
    });

    const nextVal = inputValRef.current + char;
    inputValRef.current = nextVal;
    setInputVal(nextVal);

    // 2. 检查按键敲击结束之后是否完成目标词
    if (nextVal === targetText) {
      setIsCompleted(true);
      // 键入结束，完成打卡！播放成功和弦音，并在 260ms 后清晰朗读泰文词整词 (避免字符音冲突)
      thaiAudio.playSuccessChime();
      onPracticeCompleted?.(targetText);
      setTimeout(() => {
        onSpeak(targetText, 0.95);
      }, 260);
    } else {
      // 未达到整词，打字过程中发出干净利落的单字符泰文发声
      if (soundEnabled) {
        thaiAudio.speakKeyChar(char);
      } else {
        thaiAudio.playKeyTick();
      }
    }
  }, [soundEnabled, targetText, onSpeak, onPracticeCompleted]);

  // 退格处理
  const handleBackspace = useCallback(() => {
    thaiAudio.playKeyTick();
    const nextVal = inputValRef.current.slice(0, -1);
    inputValRef.current = nextVal;
    setInputVal(nextVal);
    setIsCompleted(false);
  }, []);

  // 空格键处理：优先朗读泰文词；若待打字符本身恰好是空格，则输入空格
  const handleSpace = useCallback(() => {
    if (nextTargetChar === ' ') {
      handleKeyPress(' ');
    } else {
      thaiAudio.playKeyTick();
      onSpeak(targetText || inputValRef.current, 0.95);
    }
  }, [nextTargetChar, handleKeyPress, onSpeak, targetText]);

  // 回车键处理：朗读当前泰文词
  const handleEnter = useCallback(() => {
    thaiAudio.playKeyTick();
    onSpeak(targetText || inputValRef.current, 0.95);
  }, [onSpeak, targetText]);

  // 重置清空当前输入
  const handleReset = useCallback(() => {
    inputValRef.current = '';
    setInputVal('');
    setIsCompleted(false);
  }, []);

  // 朗读当前目标词/句
  const handleSpeakTarget = useCallback(() => {
    if (targetText) {
      onSpeak(targetText, 0.95);
    }
  }, [targetText, onSpeak]);

  // 切换目标词
  const handleSelectPreset = (thai: string) => {
    setTargetText(thai);
    inputValRef.current = '';
    setInputVal('');
    setIsCompleted(false);
    onSpeak(thai, 0.95);
  };

  // 应用自定义输入的新目标
  const handleApplyCustomTarget = () => {
    const trimmed = customInputText.trim();
    if (!trimmed) return;
    setTargetText(trimmed);
    inputValRef.current = '';
    setInputVal('');
    setIsCompleted(false);
    setIsEditingTarget(false);
    onSpeak(trimmed, 0.95);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-slate-100 select-none animate-fadeIn pb-12">
      
      {/* 顶部轻量控制条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg">
        {/* 左侧：返回与当前状态 */}
        <div className="flex items-center gap-2">
          {onBackToStudy && (
            <button
              onClick={onBackToStudy}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回共学</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md shadow-amber-500/20">
              ⌨️
            </span>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>泰语打字练习</span>
                {isCompleted && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-bounce">
                    🎉 打卡成功！
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                敲击按键即出泰文字音 · 物理键盘与屏幕按键同步响应
              </p>
            </div>
          </div>
        </div>

        {/* 右侧：声音开关与自定义词入口 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-slate-800 text-stone-400 border-slate-700 hover:text-white'
            }`}
            title="切换按键发音"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? '按键发声开' : '静音'}</span>
          </button>

          <button
            onClick={() => setIsEditingTarget(!isEditingTarget)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>自定义练打</span>
          </button>
        </div>
      </div>

      {/* 自定义输入弹开条 */}
      {isEditingTarget && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-2 shadow-lg">
          <input
            type="text"
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            placeholder="粘贴或输入任意泰文词汇/句子进行打字练习..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            onClick={handleApplyCustomTarget}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
          >
            设为练打目标
          </button>
        </div>
      )}

      {/* 快速选词胶囊栏 */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
        <span className="text-[11px] text-stone-400 shrink-0 font-medium">快速换词：</span>
        {CORE_DHAMMA_QUICK_PRESETS.map((item) => {
          const isSelected = targetText === item.thai;
          return (
            <button
              key={item.thai}
              onClick={() => handleSelectPreset(item.thai)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-extrabold'
                  : 'bg-slate-900 text-stone-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.thai}</span>
              <span className={`text-[10px] ${isSelected ? 'text-slate-900 font-semibold' : 'text-stone-400'}`}>
                {item.zh}
              </span>
            </button>
          );
        })}
      </div>

      {/* 核心打字展示大卡 (The Typing Stage) */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative">
        
        {/* 卡片顶部动作组 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>当前练打目标</span>
            </span>
            <span className="text-xs text-stone-400 font-mono">
              ({inputVal.length} / {targetChars.length} 字符)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSpeakTarget}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="朗读完整目标词"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>听整词发音</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="清空重新打"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重来</span>
            </button>
          </div>
        </div>

        {/* 逐字字符对比看板 (已打对绿色高亮，待打跳动提示) */}
        <div className="flex flex-wrap gap-2 items-center my-4 p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl min-h-[90px]">
          {targetChars.map((char, idx) => {
            const isTypedCorrectly = idx < inputVal.length && inputVal[idx] === char;
            const isTypo = idx < inputVal.length && inputVal[idx] !== char;
            const isCurrentPending = idx === currentPendingIndex && !isCompleted;

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center min-w-[40px] sm:min-w-[46px] h-14 rounded-xl border font-bold text-xl sm:text-2xl transition-all ${
                  isTypedCorrectly
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : isTypo
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-shake'
                    : isCurrentPending
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400 ring-2 ring-amber-400 scale-105 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900/60 text-slate-500 border-slate-800'
                }`}
              >
                <span>{char === ' ' ? '␣' : char}</span>
                {isCurrentPending && nextCharKeyPrompt && (
                  <span className="text-[9px] font-mono font-bold text-amber-400 mt-0.5">
                    {nextCharKeyPrompt.shift ? 'Shift+' : ''}{nextCharKeyPrompt.key}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 输入进度与实时反馈提示 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-800/80">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">当前已键入：</span>
              <span className="font-mono text-base font-bold text-white tracking-wider">
                {inputVal || <span className="text-slate-600 text-xs font-normal">请敲击键盘开始打字...</span>}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onSpeak(targetText || inputVal, 0.95)}
              className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="朗读泰文词 (按空格或回车亦可朗读)"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>朗读泰文词</span>
              <span className="text-[10px] text-amber-400/80 bg-slate-950 px-1 py-0.5 rounded border border-amber-500/20 font-mono">
                Space/Enter
              </span>
            </button>
          </div>

          {/* 实时按键声音反馈徽章 */}
          {lastVocalizedInfo && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
              <span className="text-amber-400 font-bold">{lastVocalizedInfo.char}</span>
              <span className="text-stone-300">({lastVocalizedInfo.nameThai})</span>
              <span className="text-stone-500 text-[11px]">{lastVocalizedInfo.nameZh}</span>
            </div>
          )}
        </div>

        {/* 通关成功浮层 */}
        {isCompleted && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-emerald-200">
                  🎉 恭喜！完美打卡完成：{targetText}
                </div>
                <div className="text-xs text-stone-300">
                  已准确敲击每一个字符并朗读纯正泰语发音
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSpeak(targetText, 0.95)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="再次朗读泰文词"
              >
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>再次朗读泰文词</span>
              </button>
              <button
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                再练一次
              </button>
              {onBackToStudy && (
                <button
                  onClick={onBackToStudy}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer"
                >
                  继续共学下一句 →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 虚拟泰语 Kedmanee 键盘 (带待打字符金色光环指示) */}
      <ThaiKedmaneeKeyboard
        highlightChar={nextTargetChar}
        onKeyPress={handleKeyPress}
        isShifted={isShifted || nextCharRequiresShift}
        onToggleShift={() => setIsShifted(!isShifted)}
        onBackspace={handleBackspace}
        onSpace={handleSpace}
        onEnter={handleEnter}
        enablePhysicalKeyboard={true}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        lastVocalizedInfo={lastVocalizedInfo}
      />
    </div>
  );
};
