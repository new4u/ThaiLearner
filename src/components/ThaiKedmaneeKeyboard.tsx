import React, { useEffect, useState } from 'react';
import { thaiAudio } from '../utils/thaiAudioSynthesizer';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

export interface KedmaneeKey {
  unshifted: string;
  shifted: string;
  qwerty: string;
}

export const THAI_KEDMANEE_LAYOUT: KedmaneeKey[][] = [
  [
    { unshifted: '_', shifted: '%', qwerty: '`' },
    { unshifted: 'ๅ', shifted: '+', qwerty: '1' },
    { unshifted: '/', shifted: '๑', qwerty: '2' },
    { unshifted: '-', shifted: '๒', qwerty: '3' },
    { unshifted: 'ภ', shifted: '๓', qwerty: '4' },
    { unshifted: 'ถ', shifted: '๔', qwerty: '5' },
    { unshifted: 'ุ', shifted: 'ู', qwerty: '6' },
    { unshifted: 'ึ', shifted: '฿', qwerty: '7' },
    { unshifted: 'ค', shifted: '๕', qwerty: '8' },
    { unshifted: 'ต', shifted: '๖', qwerty: '9' },
    { unshifted: 'จ', shifted: '๗', qwerty: '0' },
    { unshifted: 'ข', shifted: '๘', qwerty: '-' },
    { unshifted: 'ช', shifted: '๙', qwerty: '=' },
  ],
  [
    { unshifted: 'ๆ', shifted: '๐', qwerty: 'Q' },
    { unshifted: 'ไ', shifted: '"', qwerty: 'W' },
    { unshifted: 'ำ', shifted: 'ฎ', qwerty: 'E' },
    { unshifted: 'พ', shifted: 'ฑ', qwerty: 'R' },
    { unshifted: 'ะ', shifted: 'ธ', qwerty: 'T' },
    { unshifted: 'ั', shifted: 'ํ', qwerty: 'Y' },
    { unshifted: 'ี', shifted: '๊', qwerty: 'U' },
    { unshifted: 'ร', shifted: 'ณ', qwerty: 'I' },
    { unshifted: 'น', shifted: 'ฯ', qwerty: 'O' },
    { unshifted: 'ย', shifted: 'ญ', qwerty: 'P' },
    { unshifted: 'บ', shifted: 'ฐ', qwerty: '[' },
    { unshifted: 'ล', shifted: ',', qwerty: ']' },
  ],
  [
    { unshifted: 'ฟ', shifted: 'ฤ', qwerty: 'A' },
    { unshifted: 'ห', shifted: 'ฆ', qwerty: 'S' },
    { unshifted: 'ก', shifted: 'ฏ', qwerty: 'D' },
    { unshifted: 'ด', shifted: 'โ', qwerty: 'F' },
    { unshifted: 'เ', shifted: 'ฌ', qwerty: 'G' },
    { unshifted: '้', shifted: '็', qwerty: 'H' },
    { unshifted: '่', shifted: '๋', qwerty: 'J' },
    { unshifted: 'า', shifted: 'ษ', qwerty: 'K' },
    { unshifted: 'ส', shifted: 'ศ', qwerty: 'L' },
    { unshifted: 'ว', shifted: 'ซ', qwerty: ';' },
    { unshifted: 'ง', shifted: '.', qwerty: "'" },
  ],
  [
    { unshifted: 'ผ', shifted: ')', qwerty: 'Z' },
    { unshifted: 'ป', shifted: '(', qwerty: 'X' },
    { unshifted: 'อ', shifted: 'ฉ', qwerty: 'C' },
    { unshifted: 'แ', shifted: 'ฮ', qwerty: 'V' },
    { unshifted: 'ิ', shifted: 'ฺ', qwerty: 'B' },
    { unshifted: 'ื', shifted: '์', qwerty: 'N' },
    { unshifted: 'ท', shifted: '?', qwerty: 'M' },
    { unshifted: 'ม', shifted: 'ฒ', qwerty: ',' },
    { unshifted: 'ใ', shifted: 'ฬ', qwerty: '.' },
    { unshifted: 'ฝ', shifted: 'ฦ', qwerty: '/' },
  ]
];

interface ThaiKedmaneeKeyboardProps {
  highlightChar?: string | null;
  onKeyPress?: (char: string) => void;
  isShifted?: boolean;
  onToggleShift?: () => void;
  onBackspace?: () => void;
  onSpace?: () => void;
  enablePhysicalKeyboard?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  lastVocalizedInfo?: { char: string; nameThai: string; nameZh: string } | null;
}

export const ThaiKedmaneeKeyboard: React.FC<ThaiKedmaneeKeyboardProps> = ({
  highlightChar,
  onKeyPress,
  isShifted = false,
  onToggleShift,
  onBackspace,
  onSpace,
  enablePhysicalKeyboard = true,
  soundEnabled = true,
  onToggleSound,
  lastVocalizedInfo
}) => {
  // 当前按下的键帽（提供即时高亮反馈）
  const [activePressedChar, setActivePressedChar] = useState<string | null>(null);

  // 检查目标字符是否在 Shift 上层
  const isTargetNeedsShift = React.useMemo(() => {
    if (!highlightChar) return false;
    for (const row of THAI_KEDMANEE_LAYOUT) {
      for (const k of row) {
        if (k.shifted === highlightChar) return true;
      }
    }
    return false;
  }, [highlightChar]);

  // 触发击键核心动作：声学播报 + 回调
  const triggerKeyAction = (char: string) => {
    setActivePressedChar(char);
    setTimeout(() => setActivePressedChar(null), 180);

    // 1. 发音（击键发字母全称）
    if (soundEnabled) {
      thaiAudio.speakKeyChar(char);
    } else {
      thaiAudio.playKeyTick();
    }

    // 2. 传给业务逻辑组件
    onKeyPress?.(char);
  };

  // 物理键盘联动监听 (当未在 input/textarea 聚焦时拦截)
  useEffect(() => {
    if (!enablePhysicalKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 若当前焦点在普通文本框中，不拦截物理按键
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        thaiAudio.playKeyTick();
        onBackspace?.();
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (soundEnabled) {
          thaiAudio.speakThai('วรรค', 1.0);
        } else {
          thaiAudio.playKeyTick();
        }
        onSpace?.();
        return;
      }

      if (e.key === 'Shift') {
        onToggleShift?.();
        return;
      }

      // 1. 如果用户键盘输出的就是泰文字符
      if (/[\u0E00-\u0E7F]/.test(e.key)) {
        e.preventDefault();
        triggerKeyAction(e.key);
        return;
      }

      // 2. 如果用户使用普通英文物理键盘，映射 QWERTY 键位
      const pressedKeyUpper = e.key.toUpperCase();
      const isShift = e.shiftKey || isShifted;

      for (const row of THAI_KEDMANEE_LAYOUT) {
        for (const k of row) {
          const matchQwerty = k.qwerty.toUpperCase() === pressedKeyUpper || k.qwerty === e.key;
          if (matchQwerty) {
            e.preventDefault();
            const charToEmit = isShift ? k.shifted : k.unshifted;
            triggerKeyAction(charToEmit);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enablePhysicalKeyboard, isShifted, soundEnabled, onKeyPress, onBackspace, onSpace, onToggleShift]);

  // 判断是否为声调符号键位
  const isToneKey = (char: string) => ['่', '้', '๊', '๋'].includes(char);
  // 判断是否为元音键位
  const isVowelKey = (char: string) => ['ะ', 'ั', 'า', 'ำ', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'เ', 'แ', 'โ', 'ใ', 'ไ'].includes(char);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl select-none relative overflow-hidden">
      
      {/* Keyboard Header & Vocal Status Bar */}
      <div className="flex items-center justify-between mb-3 px-1.5 flex-wrap gap-2 text-xs">
        
        {/* Left: Talking Mode Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>发声键盘 (Talking Kedmanee)</span>
          </div>

          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            ⌨️ 敲击按键即读字母全名 · 空格朗读整词
          </span>
        </div>

        {/* Right: Sound Toggle & Target Guide */}
        <div className="flex items-center gap-2">
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="切换击键即时真人语音发声"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>按键真人发声中</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>按键静音模式</span>
                </>
              )}
            </button>
          )}

          {highlightChar && (
            <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
              <span className="text-slate-300 text-[11px]">目标按键:</span>
              <strong className="text-base font-extrabold font-thai text-amber-400">{highlightChar}</strong>
              {isTargetNeedsShift && (
                <span className="text-[10px] text-cyan-300 font-black ml-1 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-500/40">
                  (按 ⇧ Shift)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Keystroke Voice Floating Pill */}
      {lastVocalizedInfo && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold font-mono">击键已播报：</span>
            <span className="text-base font-bold font-thai text-white">{lastVocalizedInfo.char}</span>
            <span className="text-amber-300 font-thai font-semibold">【{lastVocalizedInfo.nameThai}】</span>
            <span className="text-slate-400 text-[11px]">({lastVocalizedInfo.nameZh})</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            官方全名语音已激活
          </span>
        </div>
      )}

      {/* Kedmanee Rows */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        {THAI_KEDMANEE_LAYOUT.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
            {/* Left Shift on Row 4 */}
            {rowIndex === 3 && (
              <button
                type="button"
                onClick={() => {
                  thaiAudio.playKeyTick();
                  onToggleShift?.();
                }}
                className={`px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all border cursor-pointer ${
                  isShifted
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                    : isTargetNeedsShift
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse font-extrabold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="切换 Shift (上层字符)"
              >
                ⇧ SHIFT
              </button>
            )}

            {row.map((key, keyIndex) => {
              const isTargetUnshifted = highlightChar === key.unshifted;
              const isTargetShifted = highlightChar === key.shifted;
              const isHighlighted = isTargetUnshifted || isTargetShifted;
              const activeChar = isShifted ? key.shifted : key.unshifted;
              const isCurrentlyPressed = activePressedChar === activeChar;

              // 样式微调：调符与元音特别着色辨识
              const isTone = isToneKey(activeChar);
              const isVowel = isVowelKey(activeChar);

              return (
                <button
                  key={keyIndex}
                  type="button"
                  onClick={() => triggerKeyAction(activeChar)}
                  className={`relative flex flex-col items-center justify-center h-12 sm:h-13 flex-1 max-w-[50px] min-w-[28px] rounded-xl border transition-all text-sm font-medium cursor-pointer ${
                    isCurrentlyPressed
                      ? 'bg-amber-400 text-slate-950 font-black scale-95 shadow-inner border-amber-200 z-20'
                      : isHighlighted
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-500/40 scale-105 z-10 animate-bounce'
                      : isTone
                      ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-800/60'
                      : isVowel
                      ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-100 border-amber-800/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 active:scale-95'
                  }`}
                  title={`${activeChar} (${key.qwerty})`}
                >
                  {/* Shifted Char (Top Left) */}
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] sm:text-[10px] leading-tight font-thai ${
                      isTargetShifted
                        ? 'text-slate-950 font-black'
                        : isShifted
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {key.shifted}
                  </span>

                  {/* English QWERTY key reference (Top Right) */}
                  <span
                    className={`absolute top-0.5 right-1 text-[8px] sm:text-[9px] font-mono leading-tight ${
                      isHighlighted || isCurrentlyPressed
                        ? 'text-slate-900 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {key.qwerty}
                  </span>

                  {/* Unshifted Main Char */}
                  <span
                    className={`mt-2 text-base sm:text-lg font-thai leading-none ${
                      isHighlighted || isCurrentlyPressed
                        ? 'text-slate-950 font-black'
                        : !isShifted
                        ? 'text-slate-100 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {key.unshifted}
                  </span>
                </button>
              );
            })}

            {/* Backspace on Row 1 */}
            {rowIndex === 0 && (
              <button
                type="button"
                onClick={() => {
                  thaiAudio.playKeyTick();
                  onBackspace?.();
                }}
                className="px-2 sm:px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 border border-slate-700 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="删除退格 (Backspace)"
              >
                ⌫
              </button>
            )}

            {/* Right Shift on Row 4 */}
            {rowIndex === 3 && (
              <button
                type="button"
                onClick={() => {
                  thaiAudio.playKeyTick();
                  onToggleShift?.();
                }}
                className={`px-2 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all border cursor-pointer ${
                  isShifted
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                    : isTargetNeedsShift
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse font-extrabold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="切换 Shift (上层字符)"
              >
                ⇧ SHIFT
              </button>
            )}
          </div>
        ))}

        {/* Space Bar Row */}
        <div className="flex justify-center items-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => {
              if (soundEnabled) {
                thaiAudio.speakThai('วรรค', 1.0);
              } else {
                thaiAudio.playKeyTick();
              }
              onSpace?.();
            }}
            className="w-1/2 sm:w-2/5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <span>SPACE (空格 · 朗读已拼整词)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
