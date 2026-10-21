import React, { useState } from 'react';
import { Volume2, Table, Check, Sparkles } from 'lucide-react';
import { THAI_FIVE_TONES, ToneId } from '../../utils/thaiPhoneticData';

interface ToneRulesMatrixViewProps {
  onSpeak: (text: string) => void;
}

interface MatrixRow {
  consonantClass: '中辅音 (Mid)' | '高辅音 (High)' | '低辅音 (Low)';
  classColor: 'emerald' | 'sky' | 'amber';
  syllableType: '活音 (คำเป็น)' | '短死音 (คำตาย สระสั้น)' | '长死音 (คำตาย สระยาว)';
  naturalTone: { toneId: ToneId; example: string };
  maiEkTone?: { toneId: ToneId; example: string };
  maiThoTone?: { toneId: ToneId; example: string };
  maiTriTone?: { toneId: ToneId; example: string };
  maiChattawaTone?: { toneId: ToneId; example: string };
  mnemonic: string;
}

const MATRIX_DATA: MatrixRow[] = [
  // ========== 🟢 中辅音 (Mid Consonants: ก จ ด ต บ ป อ ฎ ฏ) ==========
  {
    consonantClass: '中辅音 (Mid)',
    classColor: 'emerald',
    syllableType: '活音 (คำเป็น)',
    naturalTone: { toneId: 1, example: 'กา (Ga)' },
    maiEkTone: { toneId: 2, example: 'ก่า (Gà)' },
    maiThoTone: { toneId: 3, example: 'ก้า (Gâ)' },
    maiTriTone: { toneId: 4, example: 'ก๊า (Gá)' },
    maiChattawaTone: { toneId: 5, example: 'ก๋า (Gǎ)' },
    mnemonic: '五调俱全！标什么符就发什么调，天然底调为第1调。'
  },
  {
    consonantClass: '中辅音 (Mid)',
    classColor: 'emerald',
    syllableType: '短死音 (คำตาย สระสั้น)',
    naturalTone: { toneId: 2, example: 'กะ (Ga)' },
    maiThoTone: { toneId: 3, example: 'ก้ะ (罕用)' },
    maiTriTone: { toneId: 4, example: 'ก๊ะ (Gá)' },
    maiChattawaTone: { toneId: 5, example: 'ก๋ะ (Gǎ)' },
    mnemonic: '短死音底调直接沉入第2调（低平调）。'
  },
  {
    consonantClass: '中辅音 (Mid)',
    classColor: 'emerald',
    syllableType: '长死音 (คำตาย สระยาว)',
    naturalTone: { toneId: 2, example: 'กาด (Gàat)' },
    maiThoTone: { toneId: 3, example: 'ก้าด' },
    maiTriTone: { toneId: 4, example: 'ก๊าด' },
    maiChattawaTone: { toneId: 5, example: 'ก๋าด' },
    mnemonic: '长死音底调同样落入第2调。'
  },

  // ========== 🔵 高辅音 (High Consonants: ข ฉ ถ ผ ฝ ส ห ศ ษ ฐ) ==========
  {
    consonantClass: '高辅音 (High)',
    classColor: 'sky',
    syllableType: '活音 (คำเป็น)',
    naturalTone: { toneId: 5, example: 'ขา (Khǎ)' },
    maiEkTone: { toneId: 2, example: 'ข่า (Khà)' },
    maiThoTone: { toneId: 3, example: 'ข้า (Khâ)' },
    mnemonic: '自带第5调（升调）底色！加一号符读第2调，加二号符读第3调。'
  },
  {
    consonantClass: '高辅音 (High)',
    classColor: 'sky',
    syllableType: '短死音 (คำตาย สระสั้น)',
    naturalTone: { toneId: 2, example: 'ขะ (Khà)' },
    maiThoTone: { toneId: 3, example: 'ข้ะ (Khâ)' },
    mnemonic: '短死音气流闭塞，底调直坠第2调。'
  },
  {
    consonantClass: '高辅音 (High)',
    classColor: 'sky',
    syllableType: '长死音 (คำตาย สระยาว)',
    naturalTone: { toneId: 2, example: 'ขาก (Khàak)' },
    maiThoTone: { toneId: 3, example: 'ข้าก (Khâak)' },
    mnemonic: '长死音底调为第2调。'
  },

  // ========== 🟠 低辅音 (Low Consonants: ค ง ช ซ ท น พ ฟ ม ย ร ล ว ฮ...) ==========
  {
    consonantClass: '低辅音 (Low)',
    classColor: 'amber',
    syllableType: '活音 (คำเป็น)',
    naturalTone: { toneId: 1, example: 'คา (Kha)' },
    maiEkTone: { toneId: 3, example: 'ค่า (Khâ)' },
    maiThoTone: { toneId: 4, example: 'ค้า (Khá)' },
    mnemonic: '【阶梯跃升核心定律】底调第1调；标一号符 ่ 跃升读【第3调 托】；标二号符 ้ 跃升读【第4调 特利】！'
  },
  {
    consonantClass: '低辅音 (Low)',
    classColor: 'amber',
    syllableType: '短死音 (คำตาย สระสั้น)',
    naturalTone: { toneId: 4, example: 'คะ / คัก (Khá)' },
    maiEkTone: { toneId: 3, example: 'ค่ะ (Khâ)' },
    maiChattawaTone: { toneId: 5, example: 'ค๋ะ (口语罕用)' },
    mnemonic: '低辅短死音底调冲入【第4调高平调】！如 สวัสดีค่ะ (ค่ะ 为第3调，คะ 为第4调)。'
  },
  {
    consonantClass: '低辅音 (Low)',
    classColor: 'amber',
    syllableType: '长死音 (คำตาย สระยาว)',
    naturalTone: { toneId: 3, example: 'คาก / มาก (Mâak)' },
    maiThoTone: { toneId: 4, example: 'ค้าง (Kháang)' },
    mnemonic: '低辅长死音底调落入【第3调骤降调】！例如 มาก (很多)、ยาก (困难)。'
  }
];

export const ToneRulesMatrixView: React.FC<ToneRulesMatrixViewProps> = ({ onSpeak }) => {
  const [highlightTone, setHighlightTone] = useState<ToneId | null>(null);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl flex flex-col gap-5">
      
      {/* 头部介绍 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-amber-400" />
            泰语变调全景全息对照大矩阵
            <span className="text-xs font-semibold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              官方语法规范
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            横纵交叉透视：首辅音等级 × 音节性质 (活/死音) × 标调符号 = 实际发音调值。点击任意单元格即可听读范例！
          </p>
        </div>

        {/* 声调高亮选择器 */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
          <span className="text-slate-400 text-[11px] px-1.5 font-medium">滤镜：</span>
          <button
            onClick={() => setHighlightTone(null)}
            className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              highlightTone === null ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部
          </button>
          {[1, 2, 3, 4, 5].map((tId) => {
            const isHl = highlightTone === tId;
            return (
              <button
                key={`hl-${tId}`}
                onClick={() => setHighlightTone(tId as ToneId)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isHl ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                第{tId}调
              </button>
            );
          })}
        </div>
      </div>

      {/* 矩阵大表格 */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800">
              <th className="py-3 px-3 font-bold">辅音等级</th>
              <th className="py-3 px-3 font-bold">音节类别</th>
              <th className="py-3 px-3 font-bold">无标调 (底调)</th>
              <th className="py-3 px-3 font-bold">一号符 ไม้เอก ( ่)</th>
              <th className="py-3 px-3 font-bold">二号符 ไม้โท ( ้)</th>
              <th className="py-3 px-3 font-bold">三号符 ไม้ตรี ( ๊)</th>
              <th className="py-3 px-3 font-bold">四号符 ไม้จัตวา ( ๋)</th>
              <th className="py-3 px-3 font-bold min-w-44">变调核心法则口诀</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {MATRIX_DATA.map((row, idx) => {
              const renderCell = (cellData?: { toneId: ToneId; example: string }) => {
                if (!cellData) {
                  return <span className="text-slate-600 font-mono">–</span>;
                }
                const tone = THAI_FIVE_TONES[cellData.toneId];
                const isMatching = highlightTone === null || highlightTone === cellData.toneId;

                return (
                  <button
                    onClick={() => onSpeak(cellData.example.split(' ')[0])}
                    className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-0.5 w-full cursor-pointer select-none ${
                      isMatching
                        ? 'bg-slate-800/80 hover:bg-slate-700/90 border-slate-700/80 text-white'
                        : 'opacity-30 bg-slate-900 border-slate-800/40 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-amber-300">
                        {cellData.example.split(' ')[0]}
                      </span>
                      <Volume2 className="w-3 h-3 text-slate-400 hover:text-amber-300" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tone.nameZh.split('·')[0].trim()} [{tone.chaoNumber}]
                    </span>
                  </button>
                );
              };

              return (
                <tr key={`matrix-row-${idx}`} className="hover:bg-slate-800/20 transition">
                  <td className="py-3 px-3 font-bold">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      row.classColor === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : row.classColor === 'sky'
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {row.consonantClass}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-300">
                    {row.syllableType}
                  </td>

                  <td className="py-3 px-2 text-center">{renderCell(row.naturalTone)}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.maiEkTone)}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.maiThoTone)}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.maiTriTone)}</td>
                  <td className="py-3 px-2 text-center">{renderCell(row.maiChattawaTone)}</td>

                  <td className="py-3 px-3 text-xs text-slate-300 leading-relaxed font-mono">
                    {row.mnemonic}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 底部三个黄金铁律卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
            🟢 铁律一：中辅音全五调通吃
          </span>
          <p className="text-[11px] text-slate-300 leading-normal">
            中辅音最温和标准，标什么调符就发什么调。活音底调为第1调，死音底调为第2调。
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-500/30 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
            🔵 铁律二：高辅音自带第5调
          </span>
          <p className="text-[11px] text-slate-300 leading-normal">
            高辅音发音天生上扬，活音底调直接就是第5调（升调）；标 ่ 读第2调，标 ้ 读第3调。
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
            🟠 铁律三：低辅音标1读3、标2读4
          </span>
          <p className="text-[11px] text-slate-300 leading-normal">
            低辅音最容易混淆！遇一号符 ่ 跃升为【第3调 托】，遇二号符 ้ 跃升为【第4调 特利】。
          </p>
        </div>
      </div>

    </div>
  );
};
