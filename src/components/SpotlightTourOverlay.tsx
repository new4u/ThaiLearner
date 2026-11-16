import React, { useState, useEffect, useCallback, useId } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, Check } from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  mobileTip?: string;
}

interface SpotlightTourOverlayProps {
  isOpen: boolean;
  modeLabel: string;
  steps: TourStep[];
  onClose: () => void;
  onFinish: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const YOUTUBE_TOUR_STEPS: TourStep[] = [
  {
    id: 'yt_nav',
    targetSelector: '[data-tour-id="tour-navbar-modes"]',
    title: '顶部精简三项导航：法谈学习、打字与打卡',
    description:
      '顶部精简为「法谈学习」「泰语打字」与「每日打卡」三项。点选后在学习区上方即可自由切换音频或视频，无需来回跳转页面。',
    mobileTip: '手机端轻点顶部标签即可快速切换。',
  },
  {
    id: 'yt_fullscreen',
    targetSelector: '[data-tour-id="tour-yt-fullscreen"]',
    title: '一键开启「全屏沉浸」',
    description:
      '点击此按钮即可将双视频与逐词字幕聚焦铺满屏幕；再点右上角「退出全屏」或按 Esc 键即可回到完整工作台。',
  },
  {
    id: 'yt_media_selector',
    targetSelector: '[data-tour-id="tour-yt-media-selector"]',
    title: '统一选课栏 · 音/视频滑块与官方双频道目录',
    description:
      '可直接切换当前开示课件，并用「音频学习 | 视频学习」滑块无缝切换载体（共用同一套字幕进度）。点击「选音/视频 · 贴链接」可按日浏览官方双频道目录（自动区分正式版、直播中、直播回放与重播），粘贴动态直播链接也会自动锁定当场唯一视频 ID。',
  },
  {
    id: 'yt_video',
    targetSelector: '[data-tour-id="tour-video-stage"]',
    title: '泰中双视频并列对照 · 中文框常驻不丢失',
    description:
      '左泰文原版支持查看泰文字幕状态与快速跳往 YouTube；右中文译版始终并排保留，支持「伴弱音量」与「收起画面」，若当前场次暂无中文视频也可直接在右侧从目录或链接一键补挂。',
  },
  {
    id: 'yt_karaoke',
    targetSelector: '[data-tour-id="tour-karaoke-stage"]',
    title: '严格绑定泰文媒体的逐词精读台',
    description:
      '字幕仅在对应当前泰语视频时展示，避免错位；每句拆解为泰文、朱拉音标与中文释义，轻触单词即可发音、查词根或跳转盲打练习。',
  },
  {
    id: 'yt_dock',
    targetSelector: '[data-tour-id="tour-bottom-dock"]',
    title: '底部随身主控台',
    description:
      '单手即可控制泰语/双轨/中文播停、单句循环、0.75x–1.25x 语速调节，以及点击当前句号/时刻以播放进度精准对齐字幕。',
  },
];

export const MAINLAND_TOUR_STEPS: TourStep[] = [
  {
    id: 'ml_hero',
    targetSelector: '[data-tour-id="tour-ml-hero"]',
    title: '泰中双音频同步对齐（默认推荐）',
    description:
      '海内外各类网络环境下皆可顺畅收听，与「视频学习」共用同一套课件、字幕与学习句进度。',
    mobileTip: '音频模式简洁轻快，打开即听。',
  },
  {
    id: 'ml_fullscreen',
    targetSelector: '[data-tour-id="tour-ml-fullscreen"]',
    title: '一键「全屏沉浸」模式',
    description:
      '点一下即可进入全屏大字字幕剧场，专注跟读而不中断音频播放；按右上角「退出全屏」或 Esc 随时返回。',
  },
  {
    id: 'ml_audio_player',
    targetSelector: '[data-tour-id="tour-ml-audio-player"]',
    title: '统一选课栏 · 切换载体与展开官方目录',
    description:
      '可在此选择当前开示、通过中间滑块一键切换「音频学习 / 视频学习」，或点击「选音/视频 · 贴链接」原地展开 2026/2025 官方音频与 YouTube 双频道目录，并支持粘贴链接与导入本地音频、字幕。',
  },
  {
    id: 'ml_direct_mp3',
    targetSelector: '[data-tour-id="tour-ml-direct-mp3"]',
    title: '紧凑双音频框 · 按日匹配与离线缓存',
    description:
      '左泰语、右中文两个音频框按当前开示日期自动匹配官方 MP3 或本机缓存；支持多场次切换、「伴弱音量」降低中文干扰，以及单轨「缓存」离线收听。',
  },
  {
    id: 'ml_subtitles',
    targetSelector: '[data-tour-id="tour-ml-subtitle-studio"]',
    title: '共用全篇字幕 · 严格匹配与逐词精读',
    description:
      '仅当当前泰语音频与课件或已导入字幕对应时才展示字幕，防止错配。点击任意词句即可发音查词根，配合「对齐此刻」可将当前时刻精准绑定到字幕句。',
  },
];

export const SpotlightTourOverlay: React.FC<SpotlightTourOverlayProps> = ({
  isOpen,
  modeLabel,
  steps,
  onClose,
  onFinish,
}) => {
  const maskId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const activeStep = steps[stepIndex];

  const measureTarget = useCallback(() => {
    if (!isOpen || !activeStep) return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    const el = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (!el) {
      setSpotRect(null);
      return;
    }

    const raw = el.getBoundingClientRect();
    if (raw.width === 0 && raw.height === 0) {
      setSpotRect(null);
      return;
    }

    const pad = window.innerWidth < 640 ? 6 : 10;
    const clampedTop = Math.max(4, raw.top - pad);
    const clampedLeft = Math.max(4, raw.left - pad);
    const clampedRight = Math.min(window.innerWidth - 4, raw.right + pad);
    const clampedBottom = Math.min(window.innerHeight - 4, raw.bottom + pad);

    setSpotRect({
      top: clampedTop,
      left: clampedLeft,
      width: Math.max(40, clampedRight - clampedLeft),
      height: Math.max(36, clampedBottom - clampedTop),
    });
  }, [isOpen, activeStep]);

  // Reset step index when tour opens
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen, steps]);

  // Scroll spotlight target smoothly into view and keep rect synced
  useEffect(() => {
    if (!isOpen || !activeStep) return;

    const el = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    const rafId = window.requestAnimationFrame(measureTarget);
    const settleTimer1 = window.setTimeout(measureTarget, 220);
    const settleTimer2 = window.setTimeout(measureTarget, 480);

    const handleUpdate = () => measureTarget();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimer1);
      window.clearTimeout(settleTimer2);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, stepIndex, activeStep, measureTarget]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (stepIndex < steps.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          onFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStepIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, stepIndex, steps.length, onClose, onFinish]);

  if (!isOpen || !activeStep) return null;

  const isMobile = viewport.w < 640;
  const isLast = stepIndex === steps.length - 1;

  // Compute responsive positioning for the tour card
  let cardStyle: React.CSSProperties = {};
  if (isMobile) {
    // Flip to top if target sits in the lower 45% of the mobile screen
    const targetCenterY = spotRect ? spotRect.top + spotRect.height / 2 : 0;
    const targetIsLow = Boolean(spotRect && targetCenterY > viewport.h * 0.55);
    cardStyle = targetIsLow
      ? { top: '12px', left: '12px', right: '12px' }
      : { bottom: '14px', left: '12px', right: '12px' };
  } else {
    const cardWidth = Math.min(400, viewport.w - 32);
    const estCardHeight = 250;
    if (!spotRect) {
      cardStyle = {
        width: `${cardWidth}px`,
        top: `${Math.max(24, (viewport.h - estCardHeight) / 2)}px`,
        left: `${(viewport.w - cardWidth) / 2}px`,
      };
    } else {
      const spaceBelow = viewport.h - (spotRect.top + spotRect.height);
      const spaceAbove = spotRect.top;
      let topPos: number;
      if (spaceBelow >= estCardHeight + 18) {
        topPos = spotRect.top + spotRect.height + 16;
      } else if (spaceAbove >= estCardHeight + 18) {
        topPos = spotRect.top - estCardHeight - 16;
      } else {
        // Large element filling screen: dock cleanly in lower-right / bottom-center without clipping
        topPos = Math.max(20, viewport.h - estCardHeight - 24);
      }
      const idealLeft = spotRect.left + spotRect.width / 2 - cardWidth / 2;
      const clampedLeft = Math.max(16, Math.min(viewport.w - cardWidth - 16, idealLeft));
      cardStyle = {
        width: `${cardWidth}px`,
        top: `${Math.max(16, Math.min(viewport.h - estCardHeight - 16, topPos))}px`,
        left: `${clampedLeft}px`,
      };
    }
  }

  return (
    <div
      className="fixed inset-0 z-[75] select-none"
      role="dialog"
      aria-modal="true"
      aria-label="功能高亮引导"
    >
      {/* 明暗 SVG 遮罩层：高亮区域完全透亮，其余区域柔和压暗 */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        width={viewport.w}
        height={viewport.h}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width={viewport.w} height={viewport.h} fill="white" />
            {spotRect && (
              <rect
                x={spotRect.left}
                y={spotRect.top}
                width={spotRect.width}
                height={spotRect.height}
                rx={16}
                ry={16}
                fill="black"
                style={{
                  transition: 'all 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            )}
          </mask>
        </defs>

        {/* 暗场层 */}
        <rect
          x="0"
          y="0"
          width={viewport.w}
          height={viewport.h}
          fill="rgba(2, 6, 23, 0.78)"
          mask={`url(#${maskId})`}
        />

        {/* 高亮边框光环 */}
        {spotRect && (
          <rect
            x={spotRect.left}
            y={spotRect.top}
            width={spotRect.width}
            height={spotRect.height}
            rx={16}
            ry={16}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2.5}
            style={{
              transition: 'all 260ms cubic-bezier(0.16, 1, 0.3, 1)',
              filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.55))',
            }}
          />
        )}
      </svg>

      {/* 交互引导卡片（桌面端智能随框浮动，手机端自适应顶/底防遮挡停靠） */}
      <div
        style={cardStyle}
        className="fixed z-[76] bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl shadow-black/80 p-4 sm:p-5 text-slate-100 transition-all duration-200"
      >
        {/* Step Metadata + Skip */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{modeLabel}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              第 {stepIndex + 1} / {steps.length} 步
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>跳过</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title & Body */}
        <h3 className="text-base font-bold text-white leading-snug">
          {activeStep.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
          {activeStep.description}
        </p>

        {isMobile && activeStep.mobileTip && (
          <p className="text-xs text-amber-300/90 mt-2">
            提示：{activeStep.mobileTip}
          </p>
        )}

        {/* Step Progress Bar */}
        <div className="flex items-center gap-1.5 mt-4 mb-3.5">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStepIndex(idx)}
              aria-label={`跳至第 ${idx + 1} 步`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === stepIndex
                  ? 'flex-[2] bg-amber-400'
                  : idx < stepIndex
                  ? 'flex-1 bg-amber-500/50'
                  : 'flex-1 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Controls (>= 44px touch friendly) */}
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一步</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isLast) {
                setStepIndex((i) => i + 1);
              } else {
                onFinish();
              }
            }}
            className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0"
          >
            {isLast ? (
              <>
                <Check className="w-4 h-4" />
                <span>完成导览，开始学习</span>
              </>
            ) : (
              <>
                <span>下一步</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
