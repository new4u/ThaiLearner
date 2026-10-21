// 泰语声学变调与积木组装推导引擎
// Thai Phonetic & Tone Deduction Engine

import { 
  ConsonantData, VowelData, FinalConsonantData, 
  ToneMarkData, ToneId, SyllableLife,
  THAI_FIVE_TONES, ToneContourInfo,
  THAI_TONE_MARKS,
  THAI_CONSONANTS,
  THAI_VOWELS,
  THAI_FINAL_CONSONANTS,
  PRESET_DHAMMA_WORDS,
  PresetDhammaWord
} from './thaiPhoneticData';

export interface ToneDeductionStep {
  stepNumber: number;
  title: string;
  badge: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate';
  detail: string;
  subDetail?: string;
  ruleCode: string;
}

export interface ToneDeductionResult {
  assembledThai: string;
  romanization: string;
  effectiveClass: 'mid' | 'high' | 'low';
  effectiveClassName: string;
  syllableLife: SyllableLife;
  syllableLifeName: string;
  isVowelTransformed: boolean;
  transformationNote?: string;
  resultingTone: ToneId;
  toneInfo: ToneContourInfo;
  steps: ToneDeductionStep[];
  toneContrastVariants: Array<{
    toneId: ToneId;
    toneInfo: ToneContourInfo;
    displayText: string;
    romanization: string;
    isCurrent: boolean;
    ruleSummary: string;
  }>;
}

export interface AssembleInput {
  leadingConsonant?: ConsonantData | null;
  initialConsonant: ConsonantData;
  vowel: VowelData;
  finalConsonant: FinalConsonantData;
  toneMark: ToneMarkData;
}

/**
 * 组装泰文字符串并处理元音形变与符号堆叠
 */
export function assembleThaiString(input: AssembleInput): { text: string; transformed: boolean; transformNote?: string } {
  const { leadingConsonant, initialConsonant, vowel, finalConsonant, toneMark } = input;
  const hasFinal = finalConsonant.id !== 'final_none' && finalConsonant.symbol !== '-';
  const finalChar = hasFinal ? finalConsonant.symbol : '';

  let transformed = false;
  let transformNote: string | undefined;

  // 基础首辅音序列（如果有前引字，前引字在前，如 ห + ม -> หม）
  const baseConsonant = leadingConsonant ? `${leadingConsonant.symbol}${initialConsonant.symbol}` : initialConsonant.symbol;
  // 标调符应该附着在发音主辅音上（若有前引字，通常标在主辅音上）
  const toneChar = toneMark.symbol;

  let result = '';

  // 1. 元音变形规则检测 (Transformations)
  if (hasFinal) {
    if (vowel.id === 'v_a_short') {
      // ◌ะ + 尾音 -> ◌ั + 尾音 (เช่น กัด)
      transformed = true;
      transformNote = '短元音 ◌ะ 遇尾辅音缩变为迈寒挨 (◌ั)';
      if (leadingConsonant) {
        result = `${leadingConsonant.symbol}${initialConsonant.symbol}${toneChar}ั${finalChar}`;
      } else {
        result = `${initialConsonant.symbol}${toneChar}ั${finalChar}`;
      }
      return { text: result, transformed, transformNote };
    }

    if (vowel.id === 'v_e_short') {
      // เ◌ะ + 尾音 -> เ◌็ + 尾音 (เช่น เป็ด)
      transformed = true;
      transformNote = '短元音 เ◌ะ 遇尾辅音，后置ะ缩变为迈代酷 (◌็)';
      if (leadingConsonant) {
        result = `เ${leadingConsonant.symbol}${initialConsonant.symbol}${toneChar}็${finalChar}`;
      } else {
        result = `เ${initialConsonant.symbol}${toneChar}็${finalChar}`;
      }
      return { text: result, transformed, transformNote };
    }

    if (vowel.id === 'v_ae_short') {
      // แ◌ะ + 尾音 -> แ◌็ + 尾音 (เช่น แข็ง)
      transformed = true;
      transformNote = '短元音 แ◌ะ 遇尾辅音缩变为 แ◌็';
      result = `แ${baseConsonant}${toneChar}็${finalChar}`;
      return { text: result, transformed, transformNote };
    }

    if (vowel.id === 'v_o_short') {
      // โ◌ะ + 尾音 -> 隐形元音 (เช่น คน, นม)
      transformed = true;
      transformNote = '短元音 โ◌ะ 遇尾辅音完全隐形省略！';
      result = `${baseConsonant}${toneChar}${finalChar}`;
      return { text: result, transformed, transformNote };
    }

    if (vowel.id === 'v_oe_long') {
      // เ◌อ + 尾音 (如果是 ย 则变成 เ◌ย เช่น เคย；否则变成 เ◌ิ เช่น เดิน)
      transformed = true;
      if (finalChar === 'ย') {
        transformNote = '长元音 เ◌อ 遇尾辅音 ย 时，อ 消失省略 (เช่น เคย)';
        result = `เ${baseConsonant}${toneChar}${finalChar}`;
      } else {
        transformNote = '长元音 เ◌อ 遇尾辅音时，อ 变身为顶部短萨拉伊 ◌ิ (เช่น เดิน)';
        result = `เ${baseConsonant}ิ${toneChar}${finalChar}`;
      }
      return { text: result, transformed, transformNote };
    }

    if (vowel.id === 'v_ua_long') {
      // ◌ัว + 尾音 -> ◌ว (เช่น ชวน)
      transformed = true;
      transformNote = '双元音 ◌ัว 遇尾音时迈寒挨省略，直接写作 ◌ว (เช่น ชวน)';
      result = `${baseConsonant}${toneChar}ว${finalChar}`;
      return { text: result, transformed, transformNote };
    }
  }

  // 2. 常规位置组装
  switch (vowel.id) {
    case 'v_a_short': // ◌ะ
      result = `${baseConsonant}${toneChar}ะ`;
      break;

    case 'v_a_long': // ◌า
      result = `${baseConsonant}${toneChar}า${finalChar}`;
      break;

    case 'v_i_short': // ◌ิ
      result = `${baseConsonant}ิ${toneChar}${finalChar}`;
      break;

    case 'v_i_long': // ◌ี
      result = `${baseConsonant}ี${toneChar}${finalChar}`;
      break;

    case 'v_ue_short': // ◌ึ
      result = `${baseConsonant}ึ${toneChar}${finalChar}`;
      break;

    case 'v_ue_long': // ◌ื
      if (!hasFinal) {
        result = `${baseConsonant}ื${toneChar}อ`;
      } else {
        result = `${baseConsonant}ื${toneChar}${finalChar}`;
      }
      break;

    case 'v_u_short': // ◌ุ
      result = `${baseConsonant}ุ${toneChar}${finalChar}`;
      break;

    case 'v_u_long': // ◌ู
      result = `${baseConsonant}ู${toneChar}${finalChar}`;
      break;

    case 'v_e_short': // เ◌ะ
      result = `เ${baseConsonant}${toneChar}ะ`;
      break;

    case 'v_e_long': // เ◌
      result = `เ${baseConsonant}${toneChar}${finalChar}`;
      break;

    case 'v_ae_short': // แ◌ะ
      result = `แ${baseConsonant}${toneChar}ะ`;
      break;

    case 'v_ae_long': // แ◌
      result = `แ${baseConsonant}${toneChar}${finalChar}`;
      break;

    case 'v_o_short': // โ◌ะ
      result = `โ${baseConsonant}${toneChar}ะ`;
      break;

    case 'v_o_long': // โ◌
      result = `โ${baseConsonant}${toneChar}${finalChar}`;
      break;

    case 'v_aw_short': // เ◌าะ
      result = `เ${baseConsonant}${toneChar}าะ`;
      break;

    case 'v_aw_long': // ◌อ
      result = `${baseConsonant}${toneChar}อ${finalChar}`;
      break;

    case 'v_oe_short': // เ◌อะ
      result = `เ${baseConsonant}${toneChar}อะ`;
      break;

    case 'v_oe_long': // เ◌อ
      result = `เ${baseConsonant}${toneChar}อ`;
      break;

    case 'v_ia_short': // เ◌ียะ
      result = `เ${baseConsonant}ีย${toneChar}ะ`;
      break;

    case 'v_ia_long': // เ◌ีย
      result = `เ${baseConsonant}ีย${toneChar}${finalChar}`;
      break;

    case 'v_uea_short': // เ◌ือะ
      result = `เ${baseConsonant}ือ${toneChar}ะ`;
      break;

    case 'v_uea_long': // เ◌ือ
      result = `เ${baseConsonant}ือ${toneChar}${finalChar}`;
      break;

    case 'v_ua_short': // ◌ัวะ
      result = `${baseConsonant}ัว${toneChar}ะ`;
      break;

    case 'v_ua_long': // ◌ัว
      result = `${baseConsonant}ัว${toneChar}${finalChar}`;
      break;

    case 'v_am': // ◌ำ
      result = `${baseConsonant}ำ${toneChar}`;
      break;

    case 'v_ai_mai_muan': // ใ◌
      result = `ใ${baseConsonant}${toneChar}`;
      break;

    case 'v_ai_mai_malay': // ไ◌
      result = `ไ${baseConsonant}${toneChar}`;
      break;

    case 'v_ao': // เ◌า
      result = `เ${baseConsonant}${toneChar}า`;
      break;

    default:
      result = `${baseConsonant}${toneChar}${vowel.symbol.replace('◌', '')}${finalChar}`;
  }

  return { text: result, transformed, transformNote };
}

/**
 * 核心泰语变调推导演算法
 */
export function calculateThaiTone(input: AssembleInput): ToneDeductionResult {
  const { leadingConsonant, initialConsonant, vowel, finalConsonant, toneMark } = input;
  const steps: ToneDeductionStep[] = [];

  // Step 1: 首辅音属性与前引字影响
  let effectiveClass = initialConsonant.class;
  let effectiveClassName = '中辅音 (Mid)';
  let step1Detail = '';

  if (leadingConsonant && leadingConsonant.symbol === 'ห') {
    if (initialConsonant.subClass === 'low_single') {
      effectiveClass = 'high';
      effectiveClassName = '低辅音经前引字 ห 提为【高辅音】';
      step1Detail = `前引字法则生效：单低辅音 ${initialConsonant.symbol} 由不发音的高辅音前引字 ห 带领，声调规则完全按【高辅音】处理！`;
    } else {
      step1Detail = `前引字 ห 与 ${initialConsonant.symbol} 组合（保持 ${initialConsonant.class === 'mid' ? '中辅音' : '低辅音'} 规则）。`;
    }
  } else if (leadingConsonant && leadingConsonant.symbol === 'อ' && initialConsonant.symbol === 'ย') {
    effectiveClass = 'mid';
    effectiveClassName = '前引字 อ นํา 生效，按【中辅音】处理';
    step1Detail = `泰语特殊前引词（如 อย่า, อยู่, อย่าง, อยาก）：辅音按中辅音规则变调。`;
  } else {
    if (initialConsonant.class === 'mid') {
      effectiveClass = 'mid';
      effectiveClassName = '中辅音 (Mid / อักษรกลาง)';
      step1Detail = `首辅音 ${initialConsonant.symbol} (${initialConsonant.nameThai}) 为中辅音，具备最完整的五调发音能力。`;
    } else if (initialConsonant.class === 'high') {
      effectiveClass = 'high';
      effectiveClassName = '高辅音 (High / อักษรสูง)';
      step1Detail = `首辅音 ${initialConsonant.symbol} (${initialConsonant.nameThai}) 为高辅音，天然带有第五调升调底色。`;
    } else {
      effectiveClass = 'low';
      effectiveClassName = initialConsonant.subClass === 'low_single' 
        ? '单低辅音 (Single Low / อักษรต่ำเดี่ยว)' 
        : '双低辅音 (Paired Low / อักษรต่ำคู่)';
      step1Detail = `首辅音 ${initialConsonant.symbol} (${initialConsonant.nameThai}) 为低辅音，标调时存在阶梯跃迁现象。`;
    }
  }

  steps.push({
    stepNumber: 1,
    title: '第一步：分析首辅音与前引声学属性',
    badge: effectiveClassName,
    badgeColor: effectiveClass === 'mid' ? 'emerald' : effectiveClass === 'high' ? 'blue' : 'amber',
    detail: step1Detail,
    subDetail: `发音器官部位：${initialConsonant.phoneticGroup} | 词义助记：${initialConsonant.nameMeaning}`,
    ruleCode: `CLASS_${effectiveClass.toUpperCase()}`
  });

  // Step 2: 韵母与尾辅音分析（活音คำเป็น vs 死音คำตาย）
  let syllableLife: SyllableLife = 'live';
  let syllableLifeName = '活音 (คำเป็น)';
  let step2Detail = '';
  const hasFinal = finalConsonant.id !== 'final_none' && finalConsonant.symbol !== '-';

  if (hasFinal) {
    if (finalConsonant.life === 'dead') {
      syllableLife = 'dead';
      syllableLifeName = '死音节 (คำตาย)';
      step2Detail = `含闭塞死音尾 ${finalConsonant.symbol} (${finalConsonant.groupName} - 塞音 ${finalConsonant.endingSound})，气流瞬间截断，判定为【死音】。`;
    } else {
      syllableLife = 'live';
      syllableLifeName = '活音节 (คำเป็น)';
      step2Detail = `含清亮活音尾 ${finalConsonant.symbol} (${finalConsonant.groupName} - 鼻音/半元音 ${finalConsonant.endingSound})，声带可持续延长，判定为【活音】。`;
    }
  } else {
    // 开音节判断
    if (vowel.category === 'special') {
      // ำ, ใ-, ไ-, เ-า 属于带鼻音/半元音滑音的特殊元音，算活音
      syllableLife = 'live';
      syllableLifeName = '活音节 (คำเป็น · 特殊滑音元音)';
      step2Detail = `特殊元音 ${vowel.symbol} (${vowel.nameThai}) 自带清亮尾音性质（如 -am, -ai, -ao），判定为【活音】。`;
    } else if (vowel.length === 'long') {
      syllableLife = 'live';
      syllableLifeName = '活音节 (คำเป็น · 长元音开音节)';
      step2Detail = `无尾辅音开音节 + 长元音 ${vowel.symbol} (${vowel.nameThai})，气流可持续延展，判定为【活音】。`;
    } else {
      syllableLife = 'dead';
      syllableLifeName = '死音节 (คำตาย · 短元音开音节)';
      step2Detail = `无尾辅音开音节 + 短元音 ${vowel.symbol} (${vowel.nameThai})，喉门急促关闭，判定为【死音】。`;
    }
  }

  steps.push({
    stepNumber: 2,
    title: '第二步：音节性质与元音长短判定',
    badge: `${syllableLifeName} · ${vowel.length === 'long' ? '长元音' : '短元音'}`,
    badgeColor: syllableLife === 'live' ? 'emerald' : 'rose',
    detail: step2Detail,
    subDetail: `元音特征：${vowel.nameThai} (${vowel.romanization}) | ${hasFinal ? `尾音归属：${finalConsonant.groupName}` : '开音节无尾音'}`,
    ruleCode: `SYLLABLE_${syllableLife.toUpperCase()}_${vowel.length.toUpperCase()}`
  });

  // Step 3 & 4: 标调符号覆盖与最终变调计算
  let resultingTone: ToneId = 1;
  let step3Detail = '';
  let ruleSummary = '';

  const markId = toneMark.id;

  if (markId === 0) {
    // ===== 无标调符号 (底调 Natural Tone) =====
    if (effectiveClass === 'mid') {
      if (syllableLife === 'live') {
        resultingTone = 1; // 中活 = 1
        ruleSummary = '中辅音 + 活音 = 第1调 (三扬 · 中平调 [˧˧])';
      } else {
        resultingTone = 2; // 中死 = 2
        ruleSummary = '中辅音 + 死音 = 第2调 (埃 · 低平微降调 [˨˩])';
      }
    } else if (effectiveClass === 'high') {
      if (syllableLife === 'live') {
        resultingTone = 5; // 高活 = 5 (自然升调)
        ruleSummary = '高辅音 + 活音 = 第5调 (扎达瓦 · 升调 [˨˦])';
      } else {
        resultingTone = 2; // 高死 = 2
        ruleSummary = '高辅音 + 死音 = 第2调 (埃 · 低平微降调 [˨˩])';
      }
    } else { // low
      if (syllableLife === 'live') {
        resultingTone = 1; // 低活 = 1
        ruleSummary = '低辅音 + 活音 = 第1调 (三扬 · 中平调 [˧˧])';
      } else {
        if (vowel.length === 'short') {
          resultingTone = 4; // 低短死 = 4
          ruleSummary = '低辅音 + 短元音死音 = 第4调 (特利 · 高平微升调 [˦˥])';
        } else {
          resultingTone = 3; // 低长死 = 3
          ruleSummary = '低辅音 + 长元音死音 = 第3调 (托 · 骤降调 [˥˩])';
        }
      }
    }
    step3Detail = `当前无声调符号，由底调公式推导：${ruleSummary}`;
  } else if (markId === 1) {
    // ===== ไม้เอก ( ่) =====
    if (effectiveClass === 'mid') {
      resultingTone = 2;
      ruleSummary = '中辅音 + 一号符 (ไม้เอก) = 第2调 (埃 · 低平微降调)';
    } else if (effectiveClass === 'high') {
      resultingTone = 2;
      ruleSummary = '高辅音 + 一号符 (ไม้เอก) = 第2调 (埃 · 低平微降调)';
    } else {
      // 低辅音标ไม้เอก变第3调！
      resultingTone = 3;
      ruleSummary = '低辅音音变定律：低辅音 + 一号符 (ไม้เอก) 跃升为【第3调 托 (骤降调 [˥˩])】！';
    }
    step3Detail = `带有第一调符 ไม้เอก ( ่)：${ruleSummary}`;
  } else if (markId === 2) {
    // ===== ไม้โท ( ้) =====
    if (effectiveClass === 'mid') {
      resultingTone = 3;
      ruleSummary = '中辅音 + 二号符 (ไม้โท) = 第3调 (托 · 骤降调)';
    } else if (effectiveClass === 'high') {
      resultingTone = 3;
      ruleSummary = '高辅音 + 二号符 (ไม้โท) = 第3调 (托 · 骤降调)';
    } else {
      // 低辅音标ไม้โท变第4调！
      resultingTone = 4;
      ruleSummary = '低辅音音变定律：低辅音 + 二号符 (ไม้โท) 跃升为【第4调 特利 (高平调 [˦˥])】！如 รู้, ม้า。';
    }
    step3Detail = `带有第二调符 ไม้โท ( ้)：${ruleSummary}`;
  } else if (markId === 3) {
    // ===== ไม้ตรี ( ๊) =====
    resultingTone = 4;
    ruleSummary = '中辅音常用三号符 (ไม้ตรี) = 第4调 (特利 · 高平微升调 [˦˥])';
    step3Detail = `带有第三调符 ไม้ตรี ( ๊)：${ruleSummary}`;
  } else if (markId === 4) {
    // ===== ไม้จัตวา ( ๋) =====
    resultingTone = 5;
    ruleSummary = '中辅音常用四号符 (ไม้จัตวา) = 第5调 (扎达瓦 · 抑扬升调 [˨˦])';
    step3Detail = `带有第四调符 ไม้จัตวา ( ๋)：${ruleSummary}`;
  }

  steps.push({
    stepNumber: 3,
    title: '第三步：声调符号影响与公式映射',
    badge: toneMark.id === 0 ? '无调符 (自然底调)' : `${toneMark.nameThai}`,
    badgeColor: 'purple',
    detail: step3Detail,
    subDetail: `变调准则：${ruleSummary}`,
    ruleCode: `TONE_MARK_${markId}`
  });

  const finalToneInfo = THAI_FIVE_TONES[resultingTone];

  steps.push({
    stepNumber: 4,
    title: '第四步：导出最终声调与声学音高走势',
    badge: `${finalToneInfo.nameZh} · ${finalToneInfo.chaoNumber} ${finalToneInfo.ipaSymbol}`,
    badgeColor: finalToneInfo.color as any,
    detail: `恭喜！该音节最终在泰语中发【${finalToneInfo.nameThai} ${finalToneInfo.nameZh}】。赵元任五度标调值为 ${finalToneInfo.chaoNumber}。`,
    subDetail: finalToneInfo.description,
    ruleCode: `FINAL_TONE_${resultingTone}`
  });

  // 拼装字符串与形变检测
  const { text: assembledThai, transformed: isVowelTransformed, transformNote: transformationNote } = assembleThaiString(input);

  // 音标合成
  const romanInit = initialConsonant.romanization.split('/')[0].trim();
  const romanVowel = vowel.romanization.split('(')[0].trim();
  const romanFinal = hasFinal ? (finalConsonant.allowedConsonants[0] || '') : '';
  const toneDiacritic = toneMark.ipaSymbol !== '–' ? toneMark.ipaSymbol : '';
  const romanization = `${romanInit}${toneDiacritic}${romanVowel}${romanFinal}`;

  // 构建同音五调横向对比变体 (5-Tone Contrast Variants)
  // 为当前音节生成 5 个调的对应拼写或发音对比
  const toneContrastVariants = [1, 2, 3, 4, 5].map((tId) => {
    const targetTone = tId as ToneId;
    const tInfo = THAI_FIVE_TONES[targetTone];
    
    // 计算产生该音调所需要的调符
    let candidateMarkId = 0;
    if (effectiveClass === 'mid') {
      if (targetTone === 1) candidateMarkId = 0;
      else if (targetTone === 2) candidateMarkId = 1;
      else if (targetTone === 3) candidateMarkId = 2;
      else if (targetTone === 4) candidateMarkId = 3;
      else if (targetTone === 5) candidateMarkId = 4;
    } else if (effectiveClass === 'high') {
      if (targetTone === 5) candidateMarkId = 0;
      else if (targetTone === 2) candidateMarkId = 1;
      else if (targetTone === 3) candidateMarkId = 2;
      else candidateMarkId = targetTone === 4 ? 3 : 0;
    } else { // low
      if (targetTone === 1) candidateMarkId = 0;
      else if (targetTone === 3) candidateMarkId = 1;
      else if (targetTone === 4) candidateMarkId = 2;
      else candidateMarkId = 0;
    }

    const markObj = THAI_TONE_MARKS.find(m => m.id === candidateMarkId) || THAI_TONE_MARKS[0];
    const { text: variantText } = assembleThaiString({
      ...input,
      toneMark: markObj
    });

    return {
      toneId: targetTone,
      toneInfo: tInfo,
      displayText: variantText,
      romanization: `${romanInit}${tInfo.ipaSymbol}${romanVowel}`,
      isCurrent: targetTone === resultingTone,
      ruleSummary: `${tInfo.nameZh} (${tInfo.chaoNumber})`
    };
  });

  return {
    assembledThai,
    romanization,
    effectiveClass,
    effectiveClassName,
    syllableLife,
    syllableLifeName,
    isVowelTransformed,
    transformationNote,
    resultingTone,
    toneInfo: finalToneInfo,
    steps,
    toneContrastVariants
  };
}

export interface DecomposedSyllable {
  thaiPart: string;
  input: AssembleInput;
  deduction: ToneDeductionResult;
  meaning?: string;
}

/**
 * 将单个音节或片段逆向拆解为积木输入对象
 */
export function decomposeSingleSyllable(rawText: string): DecomposedSyllable {
  if (!rawText || !rawText.trim()) {
    const input: AssembleInput = {
      initialConsonant: THAI_CONSONANTS.find(c => c.symbol === 'ก') || THAI_CONSONANTS[0],
      vowel: THAI_VOWELS.find(v => v.id === 'v_a_long') || THAI_VOWELS[1],
      finalConsonant: THAI_FINAL_CONSONANTS[0],
      toneMark: THAI_TONE_MARKS[0]
    };
    return {
      thaiPart: 'กา',
      input,
      deduction: calculateThaiTone(input)
    };
  }

  // 1. 声调符号识别
  let toneMark = THAI_TONE_MARKS[0];
  if (rawText.includes('่')) toneMark = THAI_TONE_MARKS.find(m => m.id === 1) || toneMark;
  else if (rawText.includes('้')) toneMark = THAI_TONE_MARKS.find(m => m.id === 2) || toneMark;
  else if (rawText.includes('๊')) toneMark = THAI_TONE_MARKS.find(m => m.id === 3) || toneMark;
  else if (rawText.includes('๋')) toneMark = THAI_TONE_MARKS.find(m => m.id === 4) || toneMark;

  // 2. 提取字符序列
  const cleaned = rawText.replace(/[่้๊๋์]/g, '');
  const chars = Array.from(cleaned);
  const frontVowels = ['เ', 'แ', 'โ', 'ใ', 'ไ'];
  const hasFrontVowel = frontVowels.find(fv => chars.includes(fv));

  // 找出所有辅音
  const consonantSymbols = chars.filter(ch => THAI_CONSONANTS.some(c => c.symbol === ch));

  let leadingConsonant: ConsonantData | null = null;
  let initialConsonant: ConsonantData = THAI_CONSONANTS.find(c => c.symbol === 'ก') || THAI_CONSONANTS[0];
  let finalConsonant: FinalConsonantData = THAI_FINAL_CONSONANTS[0];

  if (consonantSymbols.length > 0) {
    if (consonantSymbols.length >= 2 && consonantSymbols[0] === 'ห') {
      const secondCons = THAI_CONSONANTS.find(c => c.symbol === consonantSymbols[1]);
      if (secondCons && secondCons.subClass === 'low_single') {
        leadingConsonant = THAI_CONSONANTS.find(c => c.symbol === 'ห') || null;
        initialConsonant = secondCons;
        if (consonantSymbols.length >= 3) {
          const finalSym = consonantSymbols[consonantSymbols.length - 1];
          const matchedFinal = THAI_FINAL_CONSONANTS.find(f => f.allowedConsonants.includes(finalSym));
          if (matchedFinal) finalConsonant = matchedFinal;
        }
      } else {
        initialConsonant = THAI_CONSONANTS.find(c => c.symbol === consonantSymbols[0]) || initialConsonant;
        if (consonantSymbols.length >= 2) {
          const finalSym = consonantSymbols[consonantSymbols.length - 1];
          const matchedFinal = THAI_FINAL_CONSONANTS.find(f => f.allowedConsonants.includes(finalSym));
          if (matchedFinal) finalConsonant = matchedFinal;
        }
      }
    } else {
      initialConsonant = THAI_CONSONANTS.find(c => c.symbol === consonantSymbols[0]) || initialConsonant;
      if (consonantSymbols.length >= 2) {
        const finalSym = consonantSymbols[consonantSymbols.length - 1];
        const matchedFinal = THAI_FINAL_CONSONANTS.find(f => f.allowedConsonants.includes(finalSym));
        if (matchedFinal) finalConsonant = matchedFinal;
      }
    }
  }

  // 3. 元音识别
  let vowel: VowelData = THAI_VOWELS.find(v => v.id === 'v_a_long') || THAI_VOWELS[1];
  if (chars.includes('ะ')) {
    if (hasFrontVowel === 'เ') vowel = THAI_VOWELS.find(v => v.id === 'v_e_short') || vowel;
    else if (hasFrontVowel === 'แ') vowel = THAI_VOWELS.find(v => v.id === 'v_ae_short') || vowel;
    else if (hasFrontVowel === 'โ') vowel = THAI_VOWELS.find(v => v.id === 'v_o_short') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_a_short') || vowel;
  } else if (chars.includes('า') || chars.includes('ๅ')) {
    if (hasFrontVowel === 'เ' && chars.includes('ะ')) vowel = THAI_VOWELS.find(v => v.id === 'v_aw_short') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_a_long') || vowel;
  } else if (chars.includes('ิ')) {
    vowel = THAI_VOWELS.find(v => v.id === 'v_i_short') || vowel;
  } else if (chars.includes('ี')) {
    if (chars.includes('ย') && hasFrontVowel === 'เ') vowel = THAI_VOWELS.find(v => v.id === 'v_ia_long') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_i_long') || vowel;
  } else if (chars.includes('ึ')) {
    vowel = THAI_VOWELS.find(v => v.id === 'v_ue_short') || vowel;
  } else if (chars.includes('ื')) {
    if (chars.includes('อ') && hasFrontVowel === 'เ') vowel = THAI_VOWELS.find(v => v.id === 'v_uea_long') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_ue_long') || vowel;
  } else if (chars.includes('ุ')) {
    vowel = THAI_VOWELS.find(v => v.id === 'v_u_short') || vowel;
  } else if (chars.includes('ู')) {
    vowel = THAI_VOWELS.find(v => v.id === 'v_u_long') || vowel;
  } else if (chars.includes('ั')) {
    if (chars.includes('ว')) vowel = THAI_VOWELS.find(v => v.id === 'v_ua_long') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_a_short') || vowel;
  } else if (chars.includes('ำ')) {
    vowel = THAI_VOWELS.find(v => v.id === 'v_am') || vowel;
  } else if (hasFrontVowel === 'ใ') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_ai_mai_muan') || vowel;
  } else if (hasFrontVowel === 'ไ') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_ai_mai_malay') || vowel;
  } else if (hasFrontVowel === 'เ') {
    if (chars.includes('า')) vowel = THAI_VOWELS.find(v => v.id === 'v_ao') || vowel;
    else if (chars.includes('อ')) vowel = THAI_VOWELS.find(v => v.id === 'v_oe_long') || vowel;
    else vowel = THAI_VOWELS.find(v => v.id === 'v_e_long') || vowel;
  } else if (hasFrontVowel === 'แ') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_ae_long') || vowel;
  } else if (hasFrontVowel === 'โ') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_o_long') || vowel;
  } else if (chars.includes('อ') && consonantSymbols.length > 0 && consonantSymbols[0] !== 'อ') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_aw_long') || vowel;
  } else if (chars.includes('ว') && consonantSymbols.length >= 2 && consonantSymbols[0] !== 'ว') {
    vowel = THAI_VOWELS.find(v => v.id === 'v_ua_long') || vowel;
  }

  const input: AssembleInput = {
    leadingConsonant,
    initialConsonant,
    vowel,
    finalConsonant,
    toneMark
  };

  return {
    thaiPart: rawText,
    input,
    deduction: calculateThaiTone(input)
  };
}

/**
 * 将整词逆向拆解为逐音节积木列表与完整声韵推导
 */
export function decomposeThaiWord(thaiWord: string): {
  syllables: DecomposedSyllable[];
  fullDeductionSummary: string;
} {
  const trimmed = thaiWord.trim();

  // 1. 优先查核心法词精装修库
  const preset = PRESET_DHAMMA_WORDS.find(w => w.thai === trimmed);
  if (preset) {
    const syllables: DecomposedSyllable[] = preset.syllables.map(s => {
      const initCons = THAI_CONSONANTS.find(c => c.symbol === s.initialConsonant) || THAI_CONSONANTS[0];
      const vowel = THAI_VOWELS.find(v => v.id === s.vowelId) || THAI_VOWELS[1];
      const finalCons = THAI_FINAL_CONSONANTS.find(f => f.id === s.finalConsonantId) || THAI_FINAL_CONSONANTS[0];
      const toneMark = THAI_TONE_MARKS.find(m => m.id === s.toneMarkId) || THAI_TONE_MARKS[0];
      const input: AssembleInput = {
        initialConsonant: initCons,
        vowel,
        finalConsonant: finalCons,
        toneMark
      };
      return {
        thaiPart: s.thaiPart,
        input,
        deduction: calculateThaiTone(input)
      };
    });

    const summary = syllables
      .map(s => `${s.thaiPart}: ${s.deduction.effectiveClassName} + ${s.deduction.syllableLifeName} = 【第${s.deduction.resultingTone}调 ${s.deduction.toneInfo.nameZh}】`)
      .join('；');

    return { syllables, fullDeductionSummary: summary };
  }

  // 2. 经典预置词特定拆解规则
  if (trimmed === 'สัมมาสมาธิ') {
    const parts = [
      { text: 'สัม', init: 'ส', v: 'v_a_short', f: 'final_m', m: 0 },
      { text: 'มา', init: 'ม', v: 'v_a_long', f: 'final_none', m: 0 },
      { text: 'สะ', init: 'ส', v: 'v_a_short', f: 'final_none', m: 0 },
      { text: 'มา', init: 'ม', v: 'v_a_long', f: 'final_none', m: 0 },
      { text: 'ธิ', init: 'ธ', v: 'v_i_short', f: 'final_none', m: 0 }
    ];
    const syllables = parts.map(p => {
      const input: AssembleInput = {
        initialConsonant: THAI_CONSONANTS.find(c => c.symbol === p.init) || THAI_CONSONANTS[0],
        vowel: THAI_VOWELS.find(v => v.id === p.v) || THAI_VOWELS[1],
        finalConsonant: THAI_FINAL_CONSONANTS.find(f => f.id === p.f) || THAI_FINAL_CONSONANTS[0],
        toneMark: THAI_TONE_MARKS[p.m]
      };
      return {
        thaiPart: p.text,
        input,
        deduction: calculateThaiTone(input)
      };
    });
    return {
      syllables,
      fullDeductionSummary: 'สัม (5调升) + มา (1调平) + สะ (2调低) + มา (1调平) + ธิ (4调高)'
    };
  }

  if (trimmed === 'ผู้รู้') {
    const parts = [
      { text: 'ผู้', init: 'ผ', v: 'v_u_long', f: 'final_none', m: 2 },
      { text: 'รู้', init: 'ร', v: 'v_u_long', f: 'final_none', m: 2 }
    ];
    const syllables = parts.map(p => {
      const input: AssembleInput = {
        initialConsonant: THAI_CONSONANTS.find(c => c.symbol === p.init) || THAI_CONSONANTS[0],
        vowel: THAI_VOWELS.find(v => v.id === p.v) || THAI_VOWELS[1],
        finalConsonant: THAI_FINAL_CONSONANTS.find(f => f.id === p.f) || THAI_FINAL_CONSONANTS[0],
        toneMark: THAI_TONE_MARKS[p.m]
      };
      return {
        thaiPart: p.text,
        input,
        deduction: calculateThaiTone(input)
      };
    });
    return {
      syllables,
      fullDeductionSummary: 'ผู้ (高辅音加ไม้โท=3调落) + รู้ (低辅音加ไม้โท=4调高)'
    };
  }

  if (trimmed === 'สองแถว') {
    const parts = [
      { text: 'สอง', init: 'ส', v: 'v_aw_long', f: 'final_ng', m: 0 },
      { text: 'แถว', init: 'ถ', v: 'v_ae_long', f: 'final_w', m: 0 }
    ];
    const syllables = parts.map(p => {
      const input: AssembleInput = {
        initialConsonant: THAI_CONSONANTS.find(c => c.symbol === p.init) || THAI_CONSONANTS[0],
        vowel: THAI_VOWELS.find(v => v.id === p.v) || THAI_VOWELS[1],
        finalConsonant: THAI_FINAL_CONSONANTS.find(f => f.id === p.f) || THAI_FINAL_CONSONANTS[0],
        toneMark: THAI_TONE_MARKS[p.m]
      };
      return {
        thaiPart: p.text,
        input,
        deduction: calculateThaiTone(input)
      };
    });
    return {
      syllables,
      fullDeductionSummary: 'สอง (高辅音长活音=5调升) + แถว (高辅音长活音=5调升)'
    };
  }

  if (trimmed === 'ไปแล้ว') {
    const parts = [
      { text: 'ไป', init: 'ป', v: 'v_ai_mai_malay', f: 'final_none', m: 0 },
      { text: 'แล้ว', init: 'ล', v: 'v_ae_long', f: 'final_w', m: 2 }
    ];
    const syllables = parts.map(p => {
      const input: AssembleInput = {
        initialConsonant: THAI_CONSONANTS.find(c => c.symbol === p.init) || THAI_CONSONANTS[0],
        vowel: THAI_VOWELS.find(v => v.id === p.v) || THAI_VOWELS[1],
        finalConsonant: THAI_FINAL_CONSONANTS.find(f => f.id === p.f) || THAI_FINAL_CONSONANTS[0],
        toneMark: THAI_TONE_MARKS[p.m]
      };
      return {
        thaiPart: p.text,
        input,
        deduction: calculateThaiTone(input)
      };
    });
    return {
      syllables,
      fullDeductionSummary: 'ไป (中辅音特殊元音=1调平) + แล้ว (低辅音加ไม้โท=4调高)'
    };
  }

  // 3. 通用单音节或当前输入
  const single = decomposeSingleSyllable(trimmed);
  return {
    syllables: [single],
    fullDeductionSummary: `${single.thaiPart}: ${single.deduction.effectiveClassName} + ${single.deduction.syllableLifeName} = 【第${single.deduction.resultingTone}调 ${single.deduction.toneInfo.nameZh}】`
  };
}

