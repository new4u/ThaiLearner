import React from 'react';
import { Upload, Library } from 'lucide-react';

interface UnmatchedSubtitleBannerProps {
  mediaKind: 'thai_video' | 'thai_audio';
  mediaIdentifier?: string;
  inferredDate?: string | null;
  canConfirmSameDateAsLesson?: boolean;
  currentLessonDate?: string;
  onConfirmSameDateAsLesson?: () => void;
  onImportSubtitles: () => void;
  onSwitchBackToMatchedLesson: () => void;
  isFullscreen?: boolean;
}

export const UnmatchedSubtitleBanner: React.FC<UnmatchedSubtitleBannerProps> = ({
  mediaKind,
  mediaIdentifier,
  inferredDate,
  canConfirmSameDateAsLesson = false,
  currentLessonDate,
  onConfirmSameDateAsLesson,
  onImportSubtitles,
  onSwitchBackToMatchedLesson,
  isFullscreen = false,
}) => {
  const isVideo = mediaKind === 'thai_video';

  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isFullscreen
          ? 'max-w-6xl w-full mx-auto bg-slate-900/85 border-slate-700 text-slate-100'
          : 'bg-white border-amber-200/90 text-[#2d2a26] shadow-sm'
      }`}
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`font-bold ${isFullscreen ? 'text-amber-300' : 'text-[#b58940]'}`}>
            {isVideo ? '字幕严格绑定泰文视频' : '字幕严格绑定泰语音频'}
          </span>
          {mediaIdentifier && (
            <>
              <span className="opacity-40">·</span>
              <span className="font-mono text-[11px] opacity-80 truncate max-w-[260px]">
                {mediaIdentifier}
                {inferredDate ? ` (${inferredDate})` : ''}
              </span>
            </>
          )}
        </div>
        <h3 className="text-sm sm:text-base font-bold">
          {isVideo ? '当前泰文视频暂未匹配到对应字幕' : '当前泰语音频暂未匹配到对应字幕'}
        </h3>
        <p className={`text-xs leading-relaxed ${isFullscreen ? 'text-slate-300' : 'text-[#7a6f5f]'}`}>
          为防止误显其他场次的字幕，系统仅在泰语源与字幕严格对应时显示字幕内容；当前仍可正常播放与对照。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onImportSubtitles}
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isVideo ? '为本视频装载字幕' : '为本音频导入对应字幕'}</span>
        </button>

        {canConfirmSameDateAsLesson && currentLessonDate && onConfirmSameDateAsLesson && (
          <button
            type="button"
            onClick={onConfirmSameDateAsLesson}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            确认属 {currentLessonDate} 同场·显示字幕
          </button>
        )}

        <button
          type="button"
          onClick={onSwitchBackToMatchedLesson}
          className={`min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border whitespace-nowrap ${
            isFullscreen
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>切回已有字幕课件</span>
        </button>
      </div>
    </div>
  );
};
