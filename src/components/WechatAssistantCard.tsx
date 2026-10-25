import React, { useState } from 'react';
import { MessageSquare, Sparkles, ShieldCheck, HelpCircle, ZoomIn, Download, X, QrCode } from 'lucide-react';

// 官方小助手真实微信二维码（本地静态资产，无需手动输入微信号或名字）
export const ASSISTANT_QR_CODE_URL = '/assets/aistudio/mmexport1792919318586_33bc4639.jpg';

interface WechatAssistantCardProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export const WechatAssistantCard: React.FC<WechatAssistantCardProps> = ({
  className = '',
  variant = 'full'
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  // 下载二维码图片到本地相册
  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = ASSISTANT_QR_CODE_URL;
    link.download = 'taixue_assistant_wechat_qr.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={`rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 p-5 sm:p-7 shadow-2xl relative overflow-hidden ${className}`}>
        
        {/* 优雅禅意微光背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 顶部标签 */}
        <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>小助手微信 · 免费参加共学</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>官方认证服务</span>
            </span>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>扫码即可连接小助手</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* 左侧：专属微信二维码展示卡（只给二维码，大图清晰，支持点击放大与保存） */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative group p-4 bg-white rounded-3xl shadow-2xl border-2 border-emerald-400/60 flex flex-col items-center transition hover:border-emerald-400 hover:shadow-emerald-500/20">
              
              {/* 二维码容器 */}
              <div 
                onClick={() => setIsZoomed(true)}
                className="relative w-52 h-52 sm:w-56 sm:h-56 bg-white flex items-center justify-center p-2 rounded-2xl overflow-hidden cursor-pointer group-hover:scale-[1.02] transition"
                title="点击放大查看或长按识别"
              >
                <img
                  src={ASSISTANT_QR_CODE_URL}
                  alt="小助手微信二维码"
                  className="w-full h-full object-contain select-none"
                  loading="eager"
                />

                {/* 悬停放大指引 */}
                <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/20">
                    <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>点击放大二维码</span>
                  </span>
                </div>
              </div>

              {/* 扫码提示与下载按钮 */}
              <div className="mt-3 w-full flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-bold text-slate-900 flex items-center justify-center gap-1">
                  <span>📱 微信扫一扫加小助手</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  （长按图片可保存或直接识别二维码）
                </span>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsZoomed(true)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <ZoomIn className="w-3 h-3 text-stone-600" />
                    <span>放大查看</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 border border-emerald-200 transition cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-emerald-700" />
                    <span>保存二维码</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：入群说明与流程指引（不显露微信号与任何姓名，仅尊称小助手） */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>微信扫码加小助手</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    免费邀请进群
                  </span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
                使用手机微信扫描左侧二维码添加小助手，小助手将邀请您进入微信共学大群，并为您发送 Zoom 在线自习室信息与全套法谈讲义。
              </p>
            </div>

            {/* 核心提示条：只给二维码，扫码秒连接 */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-500/40">
                <QrCode className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs leading-relaxed">
                <div className="font-bold text-emerald-300">
                  扫一扫即可添加，无需手动输入微信号
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  打开微信「扫一扫」对准屏幕，或保存图片在微信中识别添加即可。
                </div>
              </div>
            </div>

            {/* 入群三步指引 */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>入群共学三步流程：</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                  <span className="font-mono font-bold text-amber-400 text-[11px]">STEP 01</span>
                  <span className="font-bold text-white text-xs">学习打卡</span>
                  <span className="text-[11px] text-stone-400">每日闻思法谈与泰语键盘练习</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 bg-emerald-950/20 flex flex-col gap-1">
                  <span className="font-mono font-bold text-emerald-400 text-[11px]">STEP 02</span>
                  <span className="font-bold text-white text-xs">扫码加小助手</span>
                  <span className="text-[11px] text-emerald-200/80">微信扫码添加，小助手邀请进群</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1">
                  <span className="font-mono font-bold text-cyan-400 text-[11px]">STEP 03</span>
                  <span className="font-bold text-white text-xs">进入共学大群</span>
                  <span className="text-[11px] text-stone-400">获取 Zoom 自习室信息与每日提醒</span>
                </div>
              </div>
            </div>

            {/* 发心随喜声明 */}
            <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-1">
              <HelpCircle className="w-3 h-3 text-stone-400 shrink-0" />
              <span>注：共学完全免费、随喜发心，绝不收取任何费用。小助手仅用于班级服务与学修通知。</span>
            </p>

          </div>

        </div>

      </div>

      {/* 放大查看二维码弹窗 (便于大屏幕或远距离扫描) */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center gap-4 shadow-2xl border border-stone-200 relative text-slate-900"
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                小助手微信二维码
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                使用微信「扫一扫」对准下方二维码
              </p>
            </div>

            <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white rounded-2xl p-2 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center">
              <img
                src={ASSISTANT_QR_CODE_URL}
                alt="小助手微信二维码高清大图"
                className="w-full h-full object-contain select-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>保存二维码图片</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
              >
                关闭
              </button>
            </div>

            <p className="text-[11px] text-stone-400 text-center">
              长按上方二维码亦可直接在微信中识别添加
            </p>
          </div>
        </div>
      )}
    </>
  );
};
