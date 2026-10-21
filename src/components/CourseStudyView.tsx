import React, { useState, useEffect, useCallback } from 'react';
import { SubtitleLine, WordToken, MaskMode, CoursePreset } from '../types';
import { LUANGPOR_EXCERPT_METADATA, PRESET_COURSE_LIBRARY } from '../data/luangporCourseData';
import { 
  Headphones, Volume2, Eye, EyeOff, Sparkles, ExternalLink,
  SkipBack, SkipForward, BookOpen, Layers, Type, CheckCircle,
  FileSpreadsheet, Activity, ChevronRight, Play
} from 'lucide-react';

interface CourseStudyViewProps {
  subtitles: SubtitleLine[];
  onSelectWord: (word: WordToken) => void;
  onOpenKeyboard: () => void;
  onOpenSatiCounter: () => void;
  onOpenCourseManager: () => void;
  onLoadPresetCourse: (preset: CoursePreset) => void;
  onSpeak: (text: string, rate?: number) => void;
  onOpenDualSync?: () => void;
  onOpenSlides?: () => void;
}

export const CourseStudyView: React.FC<CourseStudyViewProps> = ({
  subtitles,
  onSelectWord,
  onOpenKeyboard,
  onOpenSatiCounter,
  onOpenCourseManager,
  onLoadPresetCourse,
  onSpeak,
  onOpenDualSync,
  onOpenSlides
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [maskMode, setMaskMode] = useState<MaskMode>('all');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [selectedFont, setSelectedFont] = useState("'Noto Sans Thai'");
  const [isSpeakingThisLine, setIsSpeakingThisLine] = useState(false);

  const currentLine = subtitles[currentLineIndex] || subtitles[0];

  // 单次发音试听（仅播放一遍，彻底移除复读机循环逻辑）
  const handleListenOnce = useCallback(() => {
    if (!currentLine) return;
    setIsSpeakingThisLine(true);
    onSpeak(currentLine.thai, playbackRate);
    // 预估朗读时长后恢复状态
    const estDuration = Math.max(2000, currentLine.thai.length * 280 / playbackRate);
    setTimeout(() => {
      setIsSpeakingThisLine(false);
    }, estDuration);
  }, [currentLine, playbackRate, onSpeak]);

  const handlePrevLine = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeakingThisLine(false);
    setCurrentLineIndex(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextLine = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeakingThisLine(false);
    setCurrentLineIndex(prev => Math.min(subtitles.length - 1, prev + 1));
  }, [subtitles.length]);

  // 键盘快捷键支持（A: 上一句, D: 下一句, 空格: 单次试听）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'KeyA') {
        e.preventDefault();
        handlePrevLine();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        handleNextLine();
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleListenOnce();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevLine, handleNextLine, handleListenOnce]);

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* 顶部开示导航条与课件选择器 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
              <Headphones className="w-3.5 h-3.5" />
              {LUANGPOR_EXCERPT_METADATA.speaker}
            </span>
            <a
              href="https://www.dhamma.com"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition flex items-center gap-1 shadow-sm"
              title="访问 dhamma.com 官方开示网站"
            >
              <span>dhamma.com 官方开示</span>
              <ExternalLink className="w-3 h-3 text-emerald-400" />
            </a>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              朱拉隆功大学 Adapted IPA 标音
            </span>
            <span className="text-xs text-amber-400/90 font-medium hidden lg:inline">
              泰法语声闻共学 AI 工作流
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {LUANGPOR_EXCERPT_METADATA.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-medium">像玩通关游戏一样听懂隆波开示 · 玩转实战泰语</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-400">每周仅需 1 小时，把隆波的殊胜法语映入日常生活</span>
          </p>
        </div>

        {/* 课件快速切换与操作入口 */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
            <span className="text-slate-500 px-1 font-medium">课件库:</span>
            {PRESET_COURSE_LIBRARY.map(preset => (
              <button
                key={preset.id}
                onClick={() => onLoadPresetCourse(preset)}
                className="px-2.5 py-1 rounded-lg font-medium transition text-slate-300 hover:text-white hover:bg-slate-800"
                title={preset.title}
              >
                {preset.tag.split('·')[0].trim()}
              </button>
            ))}
          </div>

          {onOpenDualSync && (
            <button
              onClick={onOpenDualSync}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-900/30 flex items-center gap-1.5 transition cursor-pointer"
              title="切换至泰中双视频同步对齐放映机（听一句泰文·停一下·再听中文）"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>泰中双视频同步</span>
            </button>
          )}

          {onOpenSlides && (
            <button
              onClick={onOpenSlides}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="打开 Zoom 讲义"
            >
              <span>🎴</span>
              <span className="hidden sm:inline">共学讲义</span>
            </button>
          )}

          <button
            onClick={onOpenCourseManager}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition cursor-pointer"
            title="导入 LR 格式课件、微信群分发与导出"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            课件分发
          </button>
        </div>
      </div>

      {/* 主研读流区域（大字逐句研读卡片 + 句轨导航） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧 2 列：主声闻研读卡片 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-slate-950 border border-slate-800/90 shadow-2xl p-6 sm:p-8 relative flex flex-col justify-between min-h-[460px]">
            
            {/* 卡片顶栏：当前句子序号与时间标记 */}
            <div className="flex items-center justify-between text-xs pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                  第 {currentLineIndex + 1} / {subtitles.length} 句
                </span>
                <span className="text-slate-500 font-mono text-xs">
                  [{currentLine?.timeStart || '00:00'} - {currentLine?.timeEnd || '00:10'}]
                </span>
              </div>

              {/* 遮挡模式指示器 */}
              <div className="flex items-center gap-2">
                {maskMode === 'blind_audio' ? (
                  <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold text-[11px] animate-pulse">
                    🎧 盲听觉知专注模式
                  </span>
                ) : maskMode === 'blur_cn' ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px]">
                    模糊中文强化耳力
                  </span>
                ) : null}
              </div>
            </div>

            {/* 卡片核心：泰文原文、Adapted IPA 音标、中文法义与单词拆解 */}
            <div className="my-auto py-4 space-y-6">
              {maskMode === 'blind_audio' ? (
                /* 30 分钟盲听模式状态 */
                <div className="text-center space-y-4 py-12">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center animate-pulse">
                    <Headphones className="w-10 h-10 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-300">
                      盲听觉知模式：完全遮挡字幕
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                      不看任何文字，只用耳朵辨别声音。听到每一次出现的 <strong className="text-amber-300">สติ (Sati/正念)</strong> 与 <strong className="text-amber-300">สมาธิ (禅定)</strong> 时，在右侧看板或快捷键中打卡！
                    </p>
                  </div>
                </div>
              ) : (
                /* 大字双语排版 */
                <div className="space-y-6">
                  {/* 1. 泰文原文 */}
                  {maskMode !== 'hide_th' && (
                    <div>
                      <div className="text-[11px] font-bold text-amber-400/80 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5" />
                        泰文原声原句
                      </div>
                      <div 
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-relaxed tracking-wide select-text"
                        style={{ fontFamily: selectedFont }}
                      >
                        {currentLine?.thai}
                      </div>
                    </div>
                  )}

                  {/* 2. 朱拉隆功大学 Adapted IPA 音标 */}
                  <div>
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                      朱拉 Adapted IPA 音标 (严格 8 大原则)
                    </div>
                    <div className="text-base sm:text-lg font-mono text-indigo-200 tracking-wide font-medium">
                      /{currentLine?.romanization}/
                    </div>
                  </div>

                  {/* 3. 中文法义译文 */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      中文殊胜法义
                    </div>
                    <div className={`text-lg sm:text-xl font-medium leading-relaxed transition ${
                      maskMode === 'blur_cn' 
                        ? 'filter blur-sm hover:blur-none cursor-pointer text-slate-300 select-none' 
                        : 'text-amber-300'
                    }`}>
                      {currentLine?.chinese}
                    </div>
                    {maskMode === 'blur_cn' && (
                      <span className="text-[11px] text-slate-500 mt-1 inline-block">
                        （鼠标悬停或轻触可临时查看中文）
                      </span>
                    )}
                  </div>

                  {/* 4. 单词拆解卡片流（点击打开生词词典与发音） */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      核心单词拆解（点击查看音标与词根）
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentLine?.words.map(token => (
                        <button
                          key={token.id}
                          onClick={() => onSelectWord(token)}
                          className={`px-3 py-2 rounded-xl text-left transition border cursor-pointer ${
                            token.isCore
                              ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-200'
                              : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                          }`}
                          title={`点击解构: ${token.thai} /${token.romanization}/`}
                        >
                          <div className="font-bold text-sm" style={{ fontFamily: selectedFont }}>
                            {token.thai}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            /{token.romanization}/
                          </div>
                          <div className="text-[10px] text-amber-400 font-medium">
                            {token.chinese}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. 隆波法义注释 */}
                  {currentLine?.dhammaNote && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 block mb-0.5">法义背景要点：</strong>
                        <span>{currentLine.dhammaNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 卡片底栏：单次试听播放控制、字体切换与遮挡模式 */}
            <div className="border-t border-slate-800/80 pt-5 mt-6 flex flex-wrap items-center justify-between gap-4">
              
              {/* 左右切句与单次试听（不循环复读） */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevLine}
                  disabled={currentLineIndex === 0}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                  title="上一句 (快捷键 A)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handleListenOnce}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    isSpeakingThisLine
                      ? 'bg-amber-400 text-slate-950 scale-105 shadow-amber-500/30 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20 active:scale-95'
                  }`}
                  title="单次试听本句真人发音 (快捷键 空格)"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isSpeakingThisLine ? '正在发音…' : '单次发音试听'}</span>
                </button>

                <button
                  onClick={handleNextLine}
                  disabled={currentLineIndex === subtitles.length - 1}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition cursor-pointer"
                  title="下一句 (快捷键 D)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* 语速选择 */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                {[0.75, 1.0, 1.25].map(rate => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-0.5 rounded-lg font-mono font-semibold transition cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* 遮挡模式切换 */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setMaskMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    maskMode === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="双语对照全显"
                >
                  双语全显
                </button>
                <button
                  onClick={() => setMaskMode('blur_cn')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    maskMode === 'blur_cn' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="模糊中文（练习听力）"
                >
                  模糊中文
                </button>
                <button
                  onClick={() => setMaskMode('hide_th')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    maskMode === 'hide_th' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="仅中文释义"
                >
                  仅中文
                </button>
                <button
                  onClick={() => setMaskMode('blind_audio')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    maskMode === 'blind_audio' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="盲听专注训练"
                >
                  盲听
                </button>
              </div>

              {/* 泰文字体切换 */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <span className="text-slate-500 px-1">字体:</span>
                {[
                  { name: 'Noto', font: "'Noto Sans Thai'" },
                  { name: 'Sarabun', font: "'Sarabun'" },
                  { name: 'Mitr', font: "'Mitr'" },
                  { name: 'Prompt', font: "'Prompt'" }
                ].map(f => (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFont(f.font)}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                      selectedFont === f.font ? 'bg-slate-700 text-amber-300 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* 全篇课件句轨列表（点击直达某一句） */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-3">
              <span>全篇开示声闻句轨（点击直达）</span>
              <span>共 {subtitles.length} 个句群</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {subtitles.map((sub, idx) => {
                const isSelected = idx === currentLineIndex;
                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      setIsSpeakingThisLine(false);
                      setCurrentLineIndex(idx);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500 w-8">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-amber-300" style={{ fontFamily: selectedFont }}>
                          {sub.thai}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {sub.chinese}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-slate-500 text-xs shrink-0">
                      {sub.timeStart}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧 1 列：随听随点直达卡片 + 泰语键盘实战入口 */}
        <div className="space-y-6">
          
          {/* 直达 Sati 觉知看板卡片 */}
          <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                听法现场觉知看板
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                S/R/L 快捷键
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              随听随点：记录听到了多少个 Sati
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              在听闻开示过程中，只要耳朵捕捉到 <strong className="text-amber-300">สติ (正念)</strong>、<strong className="text-amber-300">ผู้รู้ (知者)</strong> 或觉察到 <strong className="text-amber-300">หลง (走神)</strong>，立即随按记录，生成专属听法觉知报告！
            </p>

            <button
              onClick={onOpenSatiCounter}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>打开 Sati 实时觉知看板</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 泰语键盘实战卡片 */}
          <div className="bg-gradient-to-br from-cyan-950/30 to-slate-900 border border-cyan-800/30 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-2">
              <Sparkles className="w-4 h-4" />
              现代泰语学法新理念
            </div>
            <h4 className="text-base font-bold text-white">
              不要求痛苦手写 · 只要键盘敲得出来！
            </h4>
            <p className="text-xs text-cyan-200/80 mt-2 leading-relaxed">
              交流泰国日常生活词（如坐双条车“掰聊”）与佛法通关密语，在 Kedmanee 泰语键盘中无痛训练。
            </p>
            <button
              onClick={onOpenKeyboard}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>进入泰语键盘实战打卡室</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 课件分发与群分享指引 */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              微信群课件一键同步
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              支持一键将本期开示导出为微信群打卡格式或 LR 标准 TSV 文件。群友复制全文后，即可在本工作台秒级导入！
            </p>
            <button
              onClick={onOpenCourseManager}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>查看课件导入与分发管理</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
