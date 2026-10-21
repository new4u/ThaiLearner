import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle, ShieldCheck, Heart, Award, 
  Headphones, Lightbulb, Keyboard, Copy, Check, ArrowRight, Video 
} from 'lucide-react';

interface StudentPromoViewProps {
  onExperienceNow: () => void;
  onOpenZoom?: () => void;
}

export const StudentPromoView: React.FC<StudentPromoViewProps> = ({ 
  onExperienceNow,
  onOpenZoom 
}) => {
  const [copiedPromo, setCopiedPromo] = useState(false);

  const handleCopyPromoPost = () => {
    const text = `📿【1小时沉浸式“泰语声闻共学”通关课 · 招募启事】\n\n` +
      `🎧 像玩通关游戏一样，听懂隆波原声开示，玩转实战泰语！\n` +
      `每周仅需 1 小时，对治“想学泰语又学不动”的困境，把隆波的殊胜法语映入日常生活。\n\n` +
      `🕒【极简 1 小时安排】\n` +
      `1️⃣ 前半小时：盲听“抓耳”测试！不看字幕纯听声音，用觉知捕捉 Sati、Samādhi 等核心法语。\n` +
      `2️⃣ 后半小时：法味与词根精析！大字双语对照，拆解“正定/邪定/知者”，朱拉 Adapted IPA 标音研读。\n\n` +
      `⌨️【现代泰语新学法】\n` +
      `现在都什么时代了？不用痛苦手写泰文！只要会听、会用泰语键盘打字打卡即可。\n` +
      `不仅精学佛法词，也带你聊泰国生活词（如坐双条车“掰聊”！）。\n\n` +
      `💰【极简收费与全勤奖】\n` +
      `仅 100 元/月！一个季度内只要做到全勤，直接免收下月费用（顺延复用）！\n` +
      `非全勤者作为支持共学运营成本的随喜供养。\n\n` +
      `🎁 课后还送专属《隆波法语双语字帖 & LR官方兼容词库》！\n` +
      `欢迎回复报名，共同精进～`;

    navigator.clipboard.writeText(text);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2500);
  };

  return (
    <div className="space-y-8 text-slate-100 max-w-6xl mx-auto pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/50 border border-amber-500/30 p-8 sm:p-12 shadow-2xl text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            泰语声闻共学 · 通关指南与心法
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            像玩通关游戏一样
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400 block mt-1">
              听懂隆波开示 · 玩转实战泰语
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-light">
            借助【泰法语声闻共学 AI 工作流】与朱拉隆功标准音标，
            每周仅需 1 小时，对治“想学泰语又学不动”的困境，把隆波的殊胜法语映入日常生活。
          </p>

          {/* Call to action buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onExperienceNow}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>立即体验声闻研读工作台</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onOpenZoom && (
              <button
                onClick={onOpenZoom}
                className="px-5 py-3.5 rounded-2xl bg-blue-950/70 hover:bg-blue-900/70 text-blue-200 border border-blue-500/40 font-bold text-sm flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Video className="w-4 h-4 text-blue-300" />
                <span>Zoom 课堂与共学室入口 (575 860 9278)</span>
              </button>
            )}
            <button
              onClick={handleCopyPromoPost}
              className="px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              {copiedPromo ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">已复制招生推文</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>一键复制招生推文</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 核心痛点与对治 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Headphones className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">
            痛点：想学泰语，但“学不动、背不住、听不懂”？
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            市面上的泰语课动辄要求默写 44 个辅音、32 个元音，规则繁复得让人望而却步；或者直接看中文翻译字幕，误以为自己听懂了，其实一旦关掉字幕脑子一片空白。
          </p>
          <div className="pt-2 text-xs text-rose-300/80 font-mono">
            × 死记硬背手写 × 看字幕伪听懂 × 缺乏真实闻法实战
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white">
            对治：1 小时声闻研读 + 抓耳觉知 + 键盘打卡
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            我们采用现代认知语言学与正念觉知结合的方法：前半小时纯盲听抓核心法词（Sati、Samādhi），后半小时大字双语对齐研读与词根剖析，收尾用 Kedmanee 键盘敲出通关密语！
          </p>
          <div className="pt-2 text-xs text-amber-300 font-mono">
            √ 30分钟盲听抓耳 √ 朱拉Adapted IPA √ Kedmanee键盘盲打
          </div>
        </div>
      </div>

      {/* 极简 1 小时安排分解 */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-xl space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            高效声闻规程
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            每周仅需 1 小时：节奏分明、直击要害
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                00:00 - 30:00
              </span>
              <span className="text-xs font-semibold text-slate-400">
                前半小时
              </span>
            </div>
            <h4 className="text-lg font-bold text-white">
              盲听抓耳 · 纯粹声闻觉知训练
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              彻底遮挡泰文与汉文字幕，直面隆波帕默尊者的清凉原声。使用工作台的【Sati 听法觉知看板】，每听到一次 Sati 或 Samādhi 就敲击键盘或点击计数，让耳识变得极其敏锐。
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                30:00 - 60:00
              </span>
              <span className="text-xs font-semibold text-slate-400">
                后半小时
              </span>
            </div>
            <h4 className="text-lg font-bold text-white">
              法味精析 · 词根剖析与键盘打卡
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              切换到大字双语研读流，拆解巴利词根与泰语造词逻辑（如“มิจฉา 邪 + สมาธิ 定 = 邪定”；“忘 + 自身 = 失去觉知”）。现场在 Kedmanee 键盘敲出正定通关密语，完成微信群交付打卡！
            </p>
          </div>
        </div>
      </div>

      {/* 现代理念：不考手写，只练键盘 */}
      <div className="rounded-3xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/30 p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
          <Keyboard className="w-4 h-4" />
          AI 时代泰语新学法
        </div>
        <h3 className="text-2xl font-black text-white">
          现在都什么时代了？不用手写，只要键盘敲得出来！
        </h3>
        <p className="text-sm text-cyan-100/80 leading-relaxed max-w-3xl">
          现代人在泰国生活或与同修交流，99% 的场景是在微信、Line、Facebook 或笔记软件里打字。本课程彻底废除痛苦的字母手写默写，聚焦“听懂音标 + 熟悉 Kedmanee 键盘布局”，会听、能打，就能畅行无阻！
        </p>
        <div className="flex flex-wrap gap-3 pt-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-cyan-900/50 text-cyan-200 border border-cyan-500/30">
            佛法高频词：สัมมาสมาธิ (正定)、สติ (正念)
          </span>
          <span className="px-3 py-1 rounded-full bg-cyan-900/50 text-cyan-200 border border-cyan-500/30">
            泰国生活词：สองแถว (双条车)、ไปแล้ว (走啦)
          </span>
        </div>
      </div>

      {/* 办学收费规程与全勤奖 */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 shadow-xl space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            纯净利他 · 办学规程
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            极简透明收费与季度全勤滚动奖
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
            <div className="text-amber-400 font-mono text-3xl font-black">
              100 元 <span className="text-xs text-slate-400 font-normal">/ 月</span>
            </div>
            <h4 className="text-base font-bold text-white">
              单月极简费用
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              每个月仅 100 元，不设繁杂套餐与商业推销，把心思完全安住在闻法与语言精进上。
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-amber-300">
              全勤季度滚动奖
            </h4>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              在一个季度内（3个月）只要保持全勤出席，这 100 元直接无缝顺延到下个月免费续学！
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 mx-auto flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <h4 className="text-base font-bold text-white">
              非全勤随喜供养
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              若因故未全勤，该月费用将作为支持工作台技术维护与共修运营成本的随喜供养，清净圆满。
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
