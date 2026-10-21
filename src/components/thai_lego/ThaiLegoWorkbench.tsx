import React, { useState, useMemo, useCallback } from 'react';
import { 
  THAI_CONSONANTS, 
  THAI_VOWELS, 
  THAI_FINAL_CONSONANTS, 
  THAI_TONE_MARKS, 
  ConsonantData, 
  VowelData, 
  FinalConsonantData, 
  ToneMarkData,
  ToneId,
  PresetDhammaWord
} from '../../utils/thaiPhoneticData';
import { 
  calculateThaiTone, 
  AssembleInput 
} from '../../utils/thaiPhoneticEngine';
import { thaiAudio } from '../../utils/thaiAudioSynthesizer';
import { SyllableAssemblyDeck } from './SyllableAssemblyDeck';
import { ToneContourGraph } from './ToneContourGraph';
import { RulePipelineCard } from './RulePipelineCard';
import { BlockDrawer } from './BlockDrawer';

interface ThaiLegoWorkbenchProps {
  onSpeak: (text: string, rate?: number) => void;
}

export const ThaiLegoWorkbench: React.FC<ThaiLegoWorkbenchProps> = ({ onSpeak }) => {
  // 核心拼装积木状态
  const [leadingConsonant, setLeadingConsonant] = useState<ConsonantData | null>(null);
  const [initialConsonant, setInitialConsonant] = useState<ConsonantData>(
    () => THAI_CONSONANTS.find(c => c.symbol === 'ก') || THAI_CONSONANTS[0]
  );
  const [vowel, setVowel] = useState<VowelData>(
    () => THAI_VOWELS.find(v => v.id === 'v_a_long') || THAI_VOWELS[1] // กา
  );
  const [finalConsonant, setFinalConsonant] = useState<FinalConsonantData>(
    () => THAI_FINAL_CONSONANTS.find(f => f.id === 'final_none') || THAI_FINAL_CONSONANTS[0]
  );
  const [toneMark, setToneMark] = useState<ToneMarkData>(
    () => THAI_TONE_MARKS[0] // 无调符
  );

  // 抽屉当前选中 Tab
  const [activeDrawerTab, setActiveDrawerTab] = useState<'consonant' | 'vowel' | 'final' | 'tone'>('consonant');

  // 组装输入对象
  const assembleInput: AssembleInput = useMemo(() => ({
    leadingConsonant,
    initialConsonant,
    vowel,
    finalConsonant,
    toneMark
  }), [leadingConsonant, initialConsonant, vowel, finalConsonant, toneMark]);

  // 实时声学变调推导结果
  const deduction = useMemo(() => {
    return calculateThaiTone(assembleInput);
  }, [assembleInput]);

  // 触发发音
  const handleSpeakCurrent = useCallback((rate: number = 0.9) => {
    onSpeak(deduction.assembledThai, rate);
  }, [deduction.assembledThai, onSpeak]);

  // 试听单字或范例发音
  const handlePreviewSpeak = useCallback((text: string) => {
    onSpeak(text, 0.9);
  }, [onSpeak]);

  // 播放五调纯音高旋律走势
  const handlePlayToneMelody = useCallback((toneId: ToneId) => {
    thaiAudio.playToneMelody(toneId);
  }, []);

  // 清空某个插槽
  const handleClearSlot = (slot: 'leading' | 'final' | 'tone') => {
    if (slot === 'leading') setLeadingConsonant(null);
    if (slot === 'final') setFinalConsonant(THAI_FINAL_CONSONANTS.find(f => f.id === 'final_none') || THAI_FINAL_CONSONANTS[0]);
    if (slot === 'tone') setToneMark(THAI_TONE_MARKS[0]);
  };

  // 重置回中平调标准字 (ก + า = กา)
  const handleReset = () => {
    setLeadingConsonant(null);
    setInitialConsonant(THAI_CONSONANTS.find(c => c.symbol === 'ก') || THAI_CONSONANTS[0]);
    setVowel(THAI_VOWELS.find(v => v.id === 'v_a_long') || THAI_VOWELS[1]);
    setFinalConsonant(THAI_FINAL_CONSONANTS.find(f => f.id === 'final_none') || THAI_FINAL_CONSONANTS[0]);
    setToneMark(THAI_TONE_MARKS[0]);
  };

  // 随机生成一个自然发音音节
  const handleRandomize = () => {
    const validConsonants = THAI_CONSONANTS.filter(c => !c.isObsolete);
    const randConsonant = validConsonants[Math.floor(Math.random() * validConsonants.length)];
    const randVowel = THAI_VOWELS[Math.floor(Math.random() * THAI_VOWELS.length)];
    
    // 50% 概率有尾音
    const withFinal = Math.random() > 0.4;
    let randFinal = THAI_FINAL_CONSONANTS[0];
    if (withFinal) {
      const finals = THAI_FINAL_CONSONANTS.filter(f => f.id !== 'final_none');
      randFinal = finals[Math.floor(Math.random() * finals.length)];
    }

    // 40% 概率有声调符
    const withTone = Math.random() > 0.6;
    let randTone = THAI_TONE_MARKS[0];
    if (withTone) {
      const marks = THAI_TONE_MARKS.filter(m => m.id !== 0);
      randTone = marks[Math.floor(Math.random() * marks.length)];
    }

    // 15% 概率有前引字 (单低辅音才允许 ห 前引)
    let randLeading: ConsonantData | null = null;
    if (randConsonant.subClass === 'low_single' && Math.random() > 0.75) {
      randLeading = THAI_CONSONANTS.find(c => c.symbol === 'ห') || null;
    }

    setLeadingConsonant(randLeading);
    setInitialConsonant(randConsonant);
    setVowel(randVowel);
    setFinalConsonant(randFinal);
    setToneMark(randTone);

    // 播放生成音
    setTimeout(() => {
      const tempRes = calculateThaiTone({
        leadingConsonant: randLeading,
        initialConsonant: randConsonant,
        vowel: randVowel,
        finalConsonant: randFinal,
        toneMark: randTone
      });
      onSpeak(tempRes.assembledThai, 0.9);
    }, 50);
  };

  // 点击五调横向对比盘变体
  const handleSelectToneVariant = (variantText: string, toneId: ToneId) => {
    // 朗读该变体
    onSpeak(variantText, 0.9);
    // 同时寻找对应的调符切换积木台
    if (deduction.effectiveClass === 'mid') {
      const targetMark = THAI_TONE_MARKS.find(m => {
        if (toneId === 1) return m.id === 0;
        if (toneId === 2) return m.id === 1;
        if (toneId === 3) return m.id === 2;
        if (toneId === 4) return m.id === 3;
        if (toneId === 5) return m.id === 4;
        return false;
      });
      if (targetMark) setToneMark(targetMark);
    } else if (deduction.effectiveClass === 'high') {
      if (toneId === 5) setToneMark(THAI_TONE_MARKS[0]);
      if (toneId === 2) setToneMark(THAI_TONE_MARKS[1]);
      if (toneId === 3) setToneMark(THAI_TONE_MARKS[2]);
    } else { // low
      if (toneId === 1) setToneMark(THAI_TONE_MARKS[0]);
      if (toneId === 3) setToneMark(THAI_TONE_MARKS[1]); // 低辅音加 ่ 读3调
      if (toneId === 4) setToneMark(THAI_TONE_MARKS[2]); // 低辅音加 ้ 读4调
    }
  };

  // 点击音高图上的曲线
  const handleSelectToneFromGraph = (toneId: ToneId) => {
    const variant = deduction.toneContrastVariants.find(v => v.toneId === toneId);
    if (variant) {
      handleSelectToneVariant(variant.displayText, toneId);
    } else {
      thaiAudio.playToneMelody(toneId);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fadeIn pb-8">
      
      {/* 顶部主工作台视区：左侧积木台，右侧音高走势与流水线 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* 左侧 (占 7 列)：大字展示、4个积木槽、5调对比盘 */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <SyllableAssemblyDeck
            input={assembleInput}
            deduction={deduction}
            onClearSlot={handleClearSlot}
            onReset={handleReset}
            onRandomize={handleRandomize}
            onSpeak={handleSpeakCurrent}
            onPlayToneMelody={handlePlayToneMelody}
            onSelectToneVariant={handleSelectToneVariant}
            activeDrawerTab={activeDrawerTab}
            onSetDrawerTab={setActiveDrawerTab}
          />
        </div>

        {/* 右侧 (占 5 列)：SVG 五调音高走势曲线 + 4步变调流水线 */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <ToneContourGraph
            currentTone={deduction.resultingTone}
            onSelectTone={handleSelectToneFromGraph}
            onPlayToneMelody={handlePlayToneMelody}
          />

          <RulePipelineCard
            deduction={deduction}
          />
        </div>

      </div>

      {/* 底部全宽视区：声韵调高触控字母抽屉 */}
      <div className="w-full">
        <BlockDrawer
          activeTab={activeDrawerTab}
          onTabChange={setActiveDrawerTab}
          selectedConsonant={initialConsonant}
          selectedLeading={leadingConsonant}
          selectedVowel={vowel}
          selectedFinal={finalConsonant}
          selectedToneMark={toneMark}
          onSelectConsonant={setInitialConsonant}
          onSelectLeading={setLeadingConsonant}
          onSelectVowel={setVowel}
          onSelectFinal={setFinalConsonant}
          onSelectToneMark={setToneMark}
          onPreviewSpeak={handlePreviewSpeak}
        />
      </div>

    </div>
  );
};
