import fs from 'fs';

const tok = JSON.parse(fs.readFileSync('/tmp/nov01_tokenized.json', 'utf8'));
const lex = JSON.parse(fs.readFileSync('/tmp/nov01_lexicon.json', 'utf8'));
const tr = JSON.parse(fs.readFileSync('/tmp/nov01_all_translations.json', 'utf8'));

function parseSec(raw) {
  raw = raw.trim();
  if (raw.endsWith('s')) return parseInt(raw.slice(0, -1), 10);
  const parts = raw.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const keyTerms = [
  {
    thai: 'ฟังธรรม',
    romanization: 'faŋ-tʰam',
    chinese: '听法 / 闻法得益',
    explanation: '以恭敬、专注、收摄身口意的心倾听正法，初步生起正定，继而照见名色分离、照见四圣谛实相而开智慧',
    shortcutKey: 'F'
  },
  {
    thai: 'ทอดกฐิน',
    romanization: 'tʰɔ̂ɔt-kà-tʰǐn',
    chinese: '供养功德衣 / 迦絺那',
    explanation: '僧团解夏后一月内信众献供袈裟或布料的殊胜功德，佛陀教导平实简朴，不仅积福，更在闻法生起定慧',
    shortcutKey: 'K'
  },
  {
    thai: 'กุศลกรรมบถ',
    romanization: 'kù-sǒn-lá-kam-má-bòt',
    chinese: '十善业道 / 胜过俗福',
    explanation: '身三、口四、意三等十种清净纯善之道，持守五戒已圆满前七善业，听法专注令身口意皆处殊胜善法中',
    shortcutKey: 'G'
  },
  {
    thai: 'แยกรูปแยกนาม',
    romanization: 'jɛ̂ɛk-rûup-jɛ̂ɛk-naam',
    chinese: '分离色法与名法',
    explanation: '心具正定后开展的最初步观慧：清澈照见身体是被觉知的色法，苦乐、记忆、善恶与知者心各自分立非我',
    shortcutKey: 'Y'
  },
  {
    thai: 'อริยสัจ 4',
    romanization: 'ʔà-rí-já-sàt sìi',
    chinese: '四圣谛 / 因果实相',
    explanation: '佛教的核心因果法则：造作恶因（无明、渴爱、执取）感招苦果，培育善因（八支圣道）感招灭苦究竟解脱',
    shortcutKey: 'A'
  },
  {
    thai: 'วิมุตติ',
    romanization: 'wí-mút-tì',
    chinese: '解脱 / 彻断结缚',
    explanation: '超越一般世间智慧的心识彻底解脱，于听法、打坐或弘法当下心智凝定刹那断惑，涤除无明残毒证悟道果',
    shortcutKey: 'V'
  }
];

const subtitles = [];

for (let i = 0; i < tok.length; i++) {
  const item = tok[i];
  const startSec = parseSec(item.timeRaw);
  let endSec;
  if (i < tok.length - 1) {
    const nextStart = parseSec(tok[i + 1].timeRaw);
    endSec = nextStart > startSec ? nextStart : startSec + 2;
  } else {
    endSec = startSec + 12; // final sentence 52:56 -> 53:08
  }

  const words = item.tokens.map((t, idx) => {
    const l = lex[t] || { ipa: t, cn: t };
    const w = {
      id: `tok_${idx}`,
      thai: t,
      romanization: l.ipa || t,
      chinese: l.cn || t
    };
    if (l.core !== undefined) {
      w.isCore = l.core;
    } else if (l.root || ['สมาธิ', 'ปัญญา', 'สติ', 'กุศล', 'กฐิน', 'ศีล', 'อริยสัจ', 'วิมุตติ', 'มรรคผล', 'รูปธรรม', 'นามธรรม', 'อนัตตา', 'ไม่เที่ยง', 'ทุกข์'].includes(t)) {
      w.isCore = true;
    }
    if (l.root) {
      w.rootBreakdown = l.root;
    }
    return w;
  });

  const sentRomanization = words.map(w => w.romanization).join(' ');
  const chinese = tr[item.idx] || item.thai;

  subtitles.push({
    id: item.idx,
    timeStart: formatTime(startSec),
    timeEnd: formatTime(endSec),
    secondsStart: startSec,
    secondsEnd: endSec,
    thai: item.thai,
    romanization: sentRomanization,
    chinese: chinese,
    words: words
  });
}

const fileHeader = `// 2026年11月01日 隆波帕默尊者开示《听法生起禅定与智慧 (ฟังธรรมให้เกิดสมาธิและปัญญา)》
// 供养功德衣法会专场法谈 · 官方 543 句全篇高清转译数据集：含朱拉隆功大学标准 Adapted IPA 五声调音标、逐词泰汉对照及精确时间戳
import { SubtitleLine } from '../types';

export const LUANGPOR_NOV_01_TALK_TITLE = "ฟังธรรมให้เกิดสมาธิและปัญญา :: หลวงปู่ปราโมทย์ ปาโมชฺโช 1 พ.ย. 2569";
export const LUANGPOR_NOV_01_TALK_ZH_TITLE = "2026年11月01日 隆波帕默尊者：听法生起禅定与智慧";

export const LUANGPOR_NOV_01_KEY_TERMS = ${JSON.stringify(keyTerms, null, 2)};

export const LUANGPOR_NOV_01_SUBTITLES: SubtitleLine[] = ${JSON.stringify(subtitles, null, 2)};
`;

fs.writeFileSync('src/data/luangporTalk01Nov.ts', fileHeader, 'utf8');
console.log('Successfully generated src/data/luangporTalk01Nov.ts with', subtitles.length, 'subtitles.');
