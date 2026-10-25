import React, { useState } from 'react';
import { MessageSquare, ZoomIn, X } from 'lucide-react';
import { ASSISTANT_QR_CODE_URL } from './WechatAssistantCard';

/**
 * 站点通用页脚：常驻展示「小助手微信二维码」与共学说明
 * 让老同修在任何页面底部都能扫码添加小助手，无需切换任何 tab
 */
export const AppFooter: React.FC = () => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <footer className="mt-8 border-t border-slate-800/80 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* 页脚主内容：左为品牌说明，右为小助手二维码常驻入口 */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2 max-w-md">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-lg">📿</span>
              <span className="text-sm font-bold text-white">泰学 · 泰语声闻共学</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              像玩通关游戏一样听懂隆波开示，玩转实战泰语。
              每周仅需 1 小时，把隆波的殊胜法语映入日常生活。
            </p>
            <p className="text-[11px] text-stone-500">
              共学完全免费、随喜发心，绝不收取任何费用。
            </p>
          </div>

          {/* 小助手二维码常驻卡片（点击放大） */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 px-5 py-4 shadow-lg">
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="w-20 h-20 rounded-xl bg-white p-1.5 flex items-center justify-center cursor-pointer hover:scale-105 transition shrink-0"
              title="点击放大查看微信二维码"
            >
              <img
                src={ASSISTANT_QR_CODE_URL}
                alt="小助手微信二维码"
                className="w-full h-full object-contain select-none"
                loading="lazy"
              />
            </button>
            <div className="text-left space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>微信扫码加小助手</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                扫码添加小助手，免费邀请进入微信群与自习室
              </p>
              <button
                type="button"
                onClick={() => setIsZoomed(true)}
                className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 transition cursor-pointer px-2 py-1 rounded-lg bg-stone-800/80 border border-stone-700"
              >
                <ZoomIn className="w-3 h-3" />
                <span>点击放大二维码</span>
              </button>
            </div>
          </div>
        </div>

        {/* 版权与出处一行 */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center text-[11px] text-stone-600 flex items-center justify-center gap-1.5 flex-wrap">
          <span>© 2026 泰学 · 泰语声闻共学工作台</span>
          <span className="hidden sm:inline">·</span>
          <span>法谈出处：dhamma.com</span>
        </div>
      </div>

      {/* 放大查看二维码弹窗 */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center gap-4 shadow-2xl border border-stone-200 relative text-slate-900"
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">小助手微信二维码</h4>
              <p className="text-xs text-stone-500 mt-0.5">使用微信「扫一扫」对准下方二维码</p>
            </div>

            <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white rounded-2xl p-2 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center">
              <img
                src={ASSISTANT_QR_CODE_URL}
                alt="小助手微信二维码高清大图"
                className="w-full h-full object-contain select-none"
              />
            </div>

            <p className="text-[11px] text-stone-400 text-center">
              长按上方二维码亦可直接在微信中识别添加
            </p>

            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="py-2 px-6 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};