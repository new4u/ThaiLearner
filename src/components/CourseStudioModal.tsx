import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X, Upload, FileText, CheckCircle2, Sparkles, Copy, Check,
  Trash2, FileCheck2, Play, Save, Eraser, ChevronDown, ChevronRight, Link2, Wrench
} from 'lucide-react';
import { TampermonkeyCopyAction } from './TampermonkeyCopyAction';
import { CuratedLesson, SubtitleLine } from '../types';
import { parseLanguageReactorText, extractThaiAndTimestampsOnly } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT, exportToEnhancedSRT } from '../utils/lrFormatParser';
import { saveCommunityLesson } from '../data/presetLessonsLibrary';
import { SOLIDIFIED_YOUTUBE_CATALOG } from '../data/solidifiedYouTubeCatalog';
import {
  extractYouTubeVideoId,
  getVideoMediaKey,
  saveBoundSubtitlesForMedia,
} from '../utils/mediaSubtitleBinding';
import {
  buildInspectionFromLinkedItem,
  inspectSubtitleImportPayload,
  TampermonkeyBundleEntry,
  TampermonkeyLinkedMetadata,
} from '../utils/tampermonkeyImport';

interface CourseStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  currentUserEmail?: string;
  currentUserName?: string;
  prefillConfig?: {
    title?: string;
    chineseTitle?: string;
    date?: string;
    thaiVideoUrl?: string;
    chineseVideoUrl?: string;
    audioMediaKey?: string;
    audioFileName?: string;
    audioUrl?: string;
    snippet?: string;
    pageId?: number;
    subtitles?: SubtitleLine[];
  };
  onLessonCreatedAndLoaded?: (lesson: CuratedLesson) => void;
}

const DEFAULT_SAMPLE_SRT = `1
00:00:01,200 --> 00:00:10,300
เวลาของพวกเราแต่ละคนมีไม่มาก มีโอกาสเรียนธรรมะรีบเรียน
[GLOSS] เวลา:时间 | ของ:的 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多 | มี:有 | โอกาส:机会 | เรียน:学习 | ธรรมะ:佛法 | รีบ:赶紧 | เรียน:学
[ROMAN] wee-laa kʰɔ̌ɔŋ pʰûak-raw tɛ̀ɛ-láʔ-kʰon mii mâj mâak mii ʔoo-kàat rian tʰam-máʔ rîip rian
我们每个人的时间都不多，有机会学习佛法就赶紧去学。

2
00:00:10,300 --> 00:00:18,500
สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ
[GLOSS] สมาธิ:禅定 | มี:有 | ๒:2 | อย่าง:种 | คือ:即是 | สัมมาสมาธิ:正定 | กับ:与 | มิจฉาสมาธิ:邪定
[ROMAN] sà-maa-tʰí mii sɔ̌ɔŋ jàaŋ kʰɯɯ sǎm-maa-sà-maa-tʰí kàp mít-cʰǎa-sà-maa-tʰí
禅定有两种：正定与邪定。`;

export const CourseStudioModal: React.FC<CourseStudioModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  currentUserEmail = 'community_user',
  currentUserName = '共学学友',
  prefillConfig,
  onLessonCreatedAndLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lessonTitle, setLessonTitle] = useState<string>(prefillConfig?.title || '');
  const [lessonChineseTitle, setLessonChineseTitle] = useState<string>(prefillConfig?.chineseTitle || '');
  const [lessonDate, setLessonDate] = useState<string>(prefillConfig?.date || new Date().toISOString().slice(0, 10));
  const [contributorName, setContributorName] = useState<string>(currentUserName || '共学学友');
  const [thaiVideoUrlInput, setThaiVideoUrlInput] = useState<string>(prefillConfig?.thaiVideoUrl || '');
  const [chineseVideoUrlInput, setChineseVideoUrlInput] = useState<string>(prefillConfig?.chineseVideoUrl || '');

  const [showManualMeta, setShowManualMeta] = useState(false);
  const [showHelperTools, setShowHelperTools] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  const catalogOptions = useMemo(() => {
    return SOLIDIFIED_YOUTUBE_CATALOG.items.map((it) => ({
      id: it.id,
      date: it.date,
      thaiTitle: it.thai?.title || it.chinese?.title || it.date,
      chineseTitle: it.chinese?.title || '',
      thaiVideoId: it.thai?.videoId || '',
      thaiVideoUrl: it.thai?.url || '',
      chineseVideoUrl: it.chinese?.url || '',
      hasChinese: Boolean(it.chinese?.url),
      matchedLessonId: it.matchedLessonId || '',
    }));
  }, []);

  const getInitialText = () => {
    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      return exportToEnhancedSRT(prefillConfig.subtitles);
    }
    if (prefillConfig?.snippet) {
      return `1\n00:00:01,000 --> 00:00:15,000\n${prefillConfig.title || '法谈开示'}\n${prefillConfig.snippet}`;
    }
    return '';
  };

  const [rawText, setRawText] = useState<string>(getInitialText);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [linkedMetaInfo, setLinkedMetaInfo] = useState<TampermonkeyLinkedMetadata | null>(null);
  const [bundleEntries, setBundleEntries] = useState<TampermonkeyBundleEntry[]>([]);
  const [selectedBundleVid, setSelectedBundleVid] = useState<string>('');
  const [bundleSearch, setBundleSearch] = useState<string>('');

  const [parseResult, setParseResult] = useState<{
    total: number;
    formatLabel: string;
    lines: SubtitleLine[];
  }>(() => {
    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      return {
        total: prefillConfig.subtitles.length,
        formatLabel: '已精校字幕',
        lines: prefillConfig.subtitles,
      };
    }
    const initTxt = getInitialText();
    if (!initTxt.trim()) {
      return { total: 0, formatLabel: '', lines: [] };
    }
    try {
      const parsed = parseLanguageReactorText(initTxt);
      return {
        total: parsed.totalParsed,
        formatLabel: initTxt.includes('[GLOSS]') ? '增强型逐词 SRT' : 'SRT 自动分词注音',
        lines: parsed.subtitles,
      };
    } catch {
      return { total: 0, formatLabel: '', lines: [] };
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applyInspectedMeta = (meta: TampermonkeyLinkedMetadata) => {
    if (meta.title) setLessonTitle(meta.title);
    if (meta.date) setLessonDate(meta.date);
    if (meta.thaiVideoUrl) setThaiVideoUrlInput(meta.thaiVideoUrl);
    if (meta.chineseVideoUrl !== undefined) setChineseVideoUrlInput(meta.chineseVideoUrl || '');
    const matchedCatalog = catalogOptions.find(
      (c) =>
        (meta.videoId && c.thaiVideoId === meta.videoId) ||
        (meta.date && c.date === meta.date)
    );
    if (matchedCatalog?.chineseTitle) {
      setLessonChineseTitle(matchedCatalog.chineseTitle);
    }
    setLinkedMetaInfo(meta);
  };

  useEffect(() => {
    if (!isOpen) return;
    setLessonTitle(prefillConfig?.title || '');
    setLessonChineseTitle(prefillConfig?.chineseTitle || '');
    setLessonDate(prefillConfig?.date || new Date().toISOString().slice(0, 10));
    setThaiVideoUrlInput(prefillConfig?.thaiVideoUrl || '');
    setChineseVideoUrlInput(prefillConfig?.chineseVideoUrl || '');
    setLinkedMetaInfo(null);
    setBundleEntries([]);
    setSelectedBundleVid('');
    setBundleSearch('');
    setShowManualMeta(false);
    if (currentUserName) setContributorName(currentUserName);

    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      const fullText = exportToEnhancedSRT(prefillConfig.subtitles);
      setRawText(fullText);
      setParseResult({
        total: prefillConfig.subtitles.length,
        formatLabel: '当前课件精校字幕',
        lines: prefillConfig.subtitles,
      });
      setUploadedFileInfo(null);
    } else if (prefillConfig?.snippet) {
      const snippetText = `1\n00:00:01,000 --> 00:00:15,000\n${prefillConfig.title || '法谈开示'}\n${prefillConfig.snippet}`;
      setRawText(snippetText);
      try {
        const parsed = parseLanguageReactorText(snippetText);
        setParseResult({
          total: parsed.totalParsed,
          formatLabel: '文本片段',
          lines: parsed.subtitles,
        });
      } catch {
        setParseResult({ total: 0, formatLabel: '', lines: [] });
      }
      setUploadedFileInfo(null);
    } else {
      setRawText('');
      setParseResult({ total: 0, formatLabel: '', lines: [] });
      setUploadedFileInfo(null);
    }
  }, [isOpen, prefillConfig, currentUserName]);

  const currentCatalogId = useMemo(() => {
    const vid = extractYouTubeVideoId(thaiVideoUrlInput);
    if (vid) {
      const byVid = catalogOptions.find((c) => c.thaiVideoId === vid);
      if (byVid) return byVid.id;
    }
    if (lessonDate) {
      const byDate = catalogOptions.find((c) => c.date === lessonDate);
      if (byDate) return byDate.id;
    }
    return '';
  }, [thaiVideoUrlInput, lessonDate, catalogOptions]);

  const handleSelectCatalogEntry = (catalogId: string) => {
    const picked = catalogOptions.find((c) => c.id === catalogId);
    if (!picked) return;
    setLessonDate(picked.date);
    setLessonTitle(picked.thaiTitle);
    setLessonChineseTitle(picked.chineseTitle);
    setThaiVideoUrlInput(picked.thaiVideoUrl);
    setChineseVideoUrlInput(picked.chineseVideoUrl);
    showToast(`已关联 ${picked.date} 原版视频对轨`);
  };

  const handleTextChange = (text: string, sourceFileName?: string) => {
    if (!text.trim()) {
      setRawText(text);
      setParseResult({ total: 0, formatLabel: '', lines: [] });
      setLinkedMetaInfo(null);
      setBundleEntries([]);
      setSelectedBundleVid('');
      return;
    }

    try {
      const inspected = inspectSubtitleImportPayload(text, sourceFileName);

      if (inspected.kind === 'archive_bundle' && inspected.bundleItems && inspected.bundleItems.length > 0) {
        setBundleEntries(inspected.bundleItems);
        setSelectedBundleVid(inspected.bundleItems[0].videoId);
        setRawText(inspected.normalizedSrtText || text);
        setParseResult({
          total: inspected.totalParsed,
          formatLabel: 'Tampermonkey 归档包',
          lines: inspected.subtitles,
        });
        applyInspectedMeta(inspected.meta);
        showToast(
          `已识别 Tampermonkey 归档包（${inspected.bundleItems.length} 场），默认载入 ${inspected.meta.date || ''}`
        );
        return;
      }

      if (inspected.kind === 'linked_json') {
        setBundleEntries([]);
        setSelectedBundleVid('');
        setRawText(inspected.normalizedSrtText || text);
        setParseResult({
          total: inspected.totalParsed,
          formatLabel: 'Linked JSON 关联包',
          lines: inspected.subtitles,
        });
        applyInspectedMeta(inspected.meta);
        showToast(
          `已从 JSON 关联包自动绑定日期、标题与双语视频（${inspected.totalParsed} 句）`
        );
        return;
      }

      setBundleEntries([]);
      setSelectedBundleVid('');
      setRawText(text);
      setParseResult({
        total: inspected.totalParsed,
        formatLabel: /\[GLOSS\]/i.test(text) ? '增强型逐词 SRT' : '标准 SRT 自动注音',
        lines: inspected.subtitles,
      });
      if (
        inspected.meta.thaiVideoUrl ||
        inspected.meta.date ||
        inspected.meta.title
      ) {
        applyInspectedMeta(inspected.meta);
      }
    } catch {
      setRawText(text);
      setParseResult({ total: 0, formatLabel: '', lines: [] });
    }
  };

  const handleSelectBundleEntry = (vid: string) => {
    const entry = bundleEntries.find((e) => e.videoId === vid);
    if (!entry) return;
    setSelectedBundleVid(vid);
    const inspected = buildInspectionFromLinkedItem(entry.rawItem);
    setRawText(inspected.normalizedSrtText || '');
    setParseResult({
      total: inspected.totalParsed,
      formatLabel: 'Linked JSON 关联包',
      lines: inspected.subtitles,
    });
    applyInspectedMeta(inspected.meta);
    showToast(`已切换至 ${entry.date}（${entry.sentenceCount} 句）`);
  };

  const handleFileProcess = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleTextChange(content, file.name);
        const sizeStr =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`;
        setUploadedFileInfo({ name: file.name, size: sizeStr });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
    setCopiedPrompt(true);
    showToast('已复制 AI 精校提示词');
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleStripMachineTranslation = () => {
    if (!rawText.trim()) return;
    const { cleanedText, blockCount, removedLinesCount } = extractThaiAndTimestampsOnly(rawText);
    if (!cleanedText.trim()) {
      showToast('未检测到有效泰文内容，请确认文本包含泰文原文');
      return;
    }
    handleTextChange(cleanedText);
    showToast(`已剥离杂项 ${removedLinesCount} 行，保留 ${blockCount} 段纯泰文与时间戳`);
  };

  const handleApply = (saveToCommunityPool: boolean = false) => {
    const subs = parseResult.lines.length > 0 ? parseResult.lines : parseLanguageReactorText(rawText).subtitles;
    if (subs.length === 0) {
      showToast('请先拖入文件或粘贴有效的 SRT 字幕');
      return;
    }

    const finalDate = lessonDate || new Date().toISOString().slice(0, 10);
    const finalTitle =
      lessonTitle.trim() ||
      lessonChineseTitle.trim() ||
      prefillConfig?.title ||
      `หลวงปู่ปราโมทย์ ปาโมชฺโช ${finalDate}`;
    const finalChineseTitle =
      lessonChineseTitle.trim() ||
      prefillConfig?.chineseTitle ||
      lessonTitle.trim() ||
      `${finalDate} 隆波帕默尊者开示`;
    const signerName = contributorName.trim() || currentUserName || '共学学友';
    const finalThaiVideoUrl = thaiVideoUrlInput.trim();
    const finalChineseVideoUrl = chineseVideoUrlInput.trim();
    const extractedThaiId = extractYouTubeVideoId(finalThaiVideoUrl);
    const extractedChineseId = extractYouTubeVideoId(finalChineseVideoUrl);

    const newLesson: CuratedLesson = {
      id: `lesson_${Date.now()}`,
      date: finalDate,
      title: finalTitle,
      chineseTitle: finalChineseTitle,
      speaker: '隆波帕默尊者',
      source: isAdmin ? '官方周度精校' : `共学互助 · ${signerName}`,
      thaiVideoUrl: finalThaiVideoUrl,
      chineseVideoUrl: finalChineseVideoUrl,
      thaiVideoId: extractedThaiId,
      chineseVideoId: extractedChineseId,
      chineseMediaType: 'youtube',
      defaultOffsetSeconds: 0,
      totalSentences: subs.length,
      curationType: isAdmin ? 'official' : 'community',
      alignedBy: isAdmin ? '官方周度精校' : signerName,
      tags: isAdmin ? ['官方精校', '全篇对齐'] : ['共学互助', '学友贡献'],
      keyTerms: [],
      subtitles: subs,
      status: isAdmin ? 'approved' : 'pending',
      submittedBy: {
        id: currentUserEmail || 'community_user',
        name: isAdmin ? '官方精校' : signerName,
        emailOrPhone: currentUserEmail || '共学互助提交',
      },
      submittedAt: new Date().toISOString(),
    };

    const videoMediaKey = getVideoMediaKey(finalThaiVideoUrl);
    if (videoMediaKey) {
      saveBoundSubtitlesForMedia({
        mediaKey: videoMediaKey,
        mediaKind: 'thai_video',
        thaiVideoId: extractedThaiId || undefined,
        thaiVideoUrl: finalThaiVideoUrl,
        chineseVideoUrl: finalChineseVideoUrl || undefined,
        date: finalDate,
        title: finalTitle,
        subtitles: subs,
        updatedAt: Date.now(),
      });
    }

    if (prefillConfig?.audioMediaKey) {
      saveBoundSubtitlesForMedia({
        mediaKey: prefillConfig.audioMediaKey,
        mediaKind: 'thai_audio',
        thaiAudioUrl: prefillConfig.audioUrl,
        thaiAudioFileName: prefillConfig.audioFileName,
        date: finalDate,
        title: finalTitle,
        subtitles: subs,
        updatedAt: Date.now(),
      });
    }

    if (saveToCommunityPool) {
      saveCommunityLesson(newLesson);
      showToast(
        isAdmin
          ? '已保存并发布至官方课件库'
          : `已以「${signerName}」提交至共学互助库并载入播放器`
      );
    }

    if (onLessonCreatedAndLoaded) {
      onLessonCreatedAndLoaded(newLesson);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isAudioBindingMode = Boolean(prefillConfig?.audioMediaKey);
  const displayTargetTitle = lessonChineseTitle || lessonTitle || '尚未选择关联开示';
  const hasThaiLink = Boolean(extractYouTubeVideoId(thaiVideoUrlInput));
  const hasChineseLink = Boolean(extractYouTubeVideoId(chineseVideoUrlInput));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#faf8f4] w-full max-w-3xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* 顶部标题栏 */}
        <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-stone-900 truncate">
              共学字幕导入与校对
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              选择对应期数并粘贴或拖入 .srt / .linked.json，自动配齐朱拉隆功音标并绑定双语媒体
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer shrink-0"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 轻量通知条 */}
        {toastMessage && (
          <div className="bg-emerald-700 text-white text-xs px-5 py-2 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 主体区域 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 第 1 步：绑定对应期数 / 音视频 */}
          <section className="space-y-2.5 pb-4 border-b border-stone-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-stone-800">
                1. 关联开示期数
              </span>
              {!isAudioBindingMode && (
                <button
                  type="button"
                  onClick={() => setShowManualMeta((v) => !v)}
                  className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
                >
                  {showManualMeta ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span>调整标题、署名或手动链接</span>
                </button>
              )}
            </div>

            {isAudioBindingMode ? (
              <div className="text-xs text-stone-700 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-stone-900">本地/在线音频绑定</span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="font-mono tabular-nums text-stone-600">{lessonDate}</span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span className="truncate max-w-md">{prefillConfig?.audioFileName || displayTargetTitle}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={currentCatalogId}
                  onChange={(e) => handleSelectCatalogEntry(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- 从官方目录选择要配对的视频期数（或直接粘贴带标题的 v1.1.1 SRT 自动匹配） --</option>
                  {catalogOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.date} · {c.chineseTitle || c.thaiTitle} ({c.hasChinese ? '泰/中双播' : '纯泰原声'}
                      {c.matchedLessonId ? ' · 已有内置课件' : ''})
                    </option>
                  ))}
                </select>

                {/* 简洁无胶囊的当前绑定摘要 */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
                  <span className="font-mono tabular-nums text-stone-700">{lessonDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-stone-800 font-medium truncate max-w-md">{displayTargetTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span className={hasThaiLink ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                    {hasThaiLink ? '泰文原版视频已关联' : '待关联泰文视频'}
                  </span>
                  {hasChineseLink && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-medium">含中文同传</span>
                    </>
                  )}
                  {linkedMetaInfo?.matchedFromCatalog && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 inline-flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        <span>已由字幕头自动对轨</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 归档包多场次选择器（仅在导入多场 JSON 包时出现） */}
            {bundleEntries.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-900">
                    从归档包选择场次（共 <span className="tabular-nums">{bundleEntries.length}</span> 场）
                  </span>
                  <input
                    type="text"
                    value={bundleSearch}
                    onChange={(e) => setBundleSearch(e.target.value)}
                    placeholder="按日期或标题筛选..."
                    className="text-xs px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <select
                  value={selectedBundleVid}
                  onChange={(e) => handleSelectBundleEntry(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-emerald-300 bg-white text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bundleEntries
                    .filter((it) => {
                      const q = bundleSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        it.date.toLowerCase().includes(q) ||
                        it.title.toLowerCase().includes(q) ||
                        it.videoId.toLowerCase().includes(q)
                      );
                    })
                    .map((it) => (
                      <option key={it.videoId} value={it.videoId}>
                        {it.date} · {it.title.slice(0, 48)} ({it.sentenceCount} 句{it.chineseVideoUrl ? ' · 含中文同传' : ''})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 折叠的手动元数据编辑区 */}
            {showManualMeta && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">原版开示标题</label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="保留原泰文/中文标题"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-stone-700 block mb-1">开示日期</label>
                    <input
                      type="date"
                      value={lessonDate}
                      onChange={(e) => setLessonDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-700 block mb-1">署名</label>
                    <input
                      type="text"
                      value={isAdmin ? '官方精校' : contributorName}
                      disabled={isAdmin}
                      onChange={(e) => setContributorName(e.target.value)}
                      placeholder="共学昵称"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-100 disabled:text-stone-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">泰文原版 YouTube 链接</label>
                  <input
                    type="text"
                    value={thaiVideoUrlInput}
                    onChange={(e) => setThaiVideoUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-700 block mb-1">中文同传 YouTube 链接（可选）</label>
                  <input
                    type="text"
                    value={chineseVideoUrlInput}
                    onChange={(e) => setChineseVideoUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </section>

          {/* 第 2 步：统一字幕导入区 */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-stone-800">2. 导入或粘贴字幕文本</span>
                {parseResult.total > 0 && (
                  <span className="text-emerald-700 font-medium tabular-nums">
                    · 已解析 {parseResult.total} 句
                    {parseResult.formatLabel ? ` · ${parseResult.formatLabel}` : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => handleTextChange(DEFAULT_SAMPLE_SRT)}
                  className="text-amber-800 hover:underline cursor-pointer whitespace-nowrap"
                >
                  载入示范样本
                </button>
                {rawText.trim() && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(rawText);
                        setCopiedRawText(true);
                        showToast('已复制编辑区全文');
                        setTimeout(() => setCopiedRawText(false), 2000);
                      }}
                      className="text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      {copiedRawText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRawText ? '已复制' : '复制全文'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileInfo(null);
                        handleTextChange('');
                      }}
                      className="text-stone-400 hover:text-red-600 cursor-pointer whitespace-nowrap"
                    >
                      清空
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 紧凑拖放条 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".srt,.txt,.html,.htm,.tsv,.vtt,.json,text/plain,text/html"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-xl px-4 py-3 transition cursor-pointer flex items-center justify-between gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : uploadedFileInfo
                  ? 'border-emerald-400 bg-white'
                  : 'border-stone-300 bg-white hover:border-amber-500'
              }`}
            >
              {uploadedFileInfo ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-stone-900 truncate">{uploadedFileInfo.name}</span>
                    <span className="text-xs text-stone-400 font-mono tabular-nums shrink-0">
                      · {uploadedFileInfo.size}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFileInfo(null);
                      handleTextChange('');
                    }}
                    className="p-1 text-stone-400 hover:text-red-600 transition cursor-pointer shrink-0"
                    title="移除文件"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <Upload className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong className="text-stone-900">点击选择或拖入字幕文件</strong>（.srt / .linked.json / .html / .tsv），或在下方直接粘贴
                  </span>
                </div>
              )}
            </div>

            {/* 字幕粘贴与编辑区 */}
            <textarea
              rows={9}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="在此直接粘贴油猴脚本 v1.1.1 复制的 SRT（含 # 标题 与 @taixue_meta 自动识别期数）、AI 精校增强版 SRT 或生肉字幕..."
              className="w-full text-xs font-mono p-3.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
            />

            {/* 实时预览前 2 句转译结果 */}
            {parseResult.total > 0 && (
              <div className="rounded-xl bg-white border border-stone-200 px-3.5 py-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-medium text-stone-700">转译效果预览（前 2 句）</span>
                  <span className="font-mono tabular-nums">
                    首尾时间：{parseResult.lines[0]?.timeStart} – {parseResult.lines[parseResult.lines.length - 1]?.timeEnd}
                  </span>
                </div>
                <div className="space-y-1.5 divide-y divide-stone-100">
                  {parseResult.lines.slice(0, 2).map((ln) => (
                    <div key={ln.id} className="pt-1.5 first:pt-0 text-xs space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] text-stone-400 tabular-nums shrink-0">{ln.timeStart}</span>
                        <span className="text-stone-900 font-medium">{ln.thai}</span>
                      </div>
                      <div className="pl-11 text-[11px] text-amber-800 font-mono">/{ln.romanization}/</div>
                      <div className="pl-11 text-[11px] text-stone-600">{ln.chinese}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 折叠的抓词与精校工具 */}
          <section className="pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowHelperTools((v) => !v)}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition cursor-pointer"
            >
              {showHelperTools ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <Wrench className="w-3.5 h-3.5 text-stone-400" />
              <span>抓词与 AI 精校辅助工具（油猴脚本 v1.1.1 · 去机翻 · AI 提示词 · Colab）</span>
            </button>

            {showHelperTools && (
              <div className="mt-3 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <TampermonkeyCopyAction
                    variant="amber-light"
                    label="📋 复制油猴脚本 v1.1.1"
                    onCopiedSuccess={() => showToast('已复制油猴脚本 v1.1.1，可直接粘贴到 Tampermonkey 保存')}
                  />
                  <button
                    type="button"
                    onClick={handleStripMachineTranslation}
                    disabled={!rawText.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 whitespace-nowrap"
                  >
                    <Eraser className="w-3.5 h-3.5 text-amber-700" />
                    <span>仅留泰文+时间戳（去机翻）</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? '已复制提示词' : '复制 AI 提示词'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPromptDetails((v) => !v)}
                    className="text-xs text-amber-800 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {showPromptDetails ? '收起提示词' : '查看提示词'}
                  </button>
                  <a
                    href="/tools/Luangpor_Dhamma_Colab_Pipeline.ipynb"
                    download="Luangpor_Dhamma_Colab_Pipeline.ipynb"
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-medium inline-flex items-center gap-1.5 transition whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Colab GPU 流水线</span>
                  </a>
                </div>

                {showPromptDetails && (
                  <div className="p-3 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-stone-700">
                    {AI_SRT_CONVERSION_PROMPT}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* 底部操作栏 */}
        <div className="px-5 py-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-500 tabular-nums">
            {parseResult.total > 0 ? (
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>就绪：共 {parseResult.total} 句字幕</span>
              </span>
            ) : (
              <span>请先选择期数并贴入或拖入字幕</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleApply(true)}
              disabled={parseResult.total === 0}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-semibold transition cursor-pointer disabled:opacity-45 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isAdmin ? '保存并发布上线' : '提交至共学互助库'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={parseResult.total === 0}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-45 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="tabular-nums">仅载入播放器 ({parseResult.total} 句)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
