import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, Sparkles, Copy, Check, 
  Trash2, FileCheck2, Bot, Play, Save, Info, Eraser, Download, Link2
} from 'lucide-react';
import { CuratedLesson, SubtitleLine } from '../types';
import { parseLanguageReactorText, extractThaiAndTimestampsOnly } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT, exportToEnhancedSRT } from '../utils/lrFormatParser';
import { saveCommunityLesson } from '../data/presetLessonsLibrary';
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
[GLOSS] เวลา:时间 | ของ:的 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多 | มีโอกาส:有机会 | เรียน:学习 | ธรรมะ:佛法 | รีบ:赶快/抓紧 | เรียน:学
[ROMAN] wee-laa kʰɔ̌ɔŋ pʰûak-raw tɛ̀ɛ-lá-kʰon mii mâj mâak, mii oo-kàat rian tʰam-má rîip rian
我们每个人的时间都不多，有机会学习佛法就赶紧去学。

2
00:00:10,300 --> 00:00:18,500
สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ
[GLOSS] สมาธิ:禅定 | มี:有 | ๒:2 | อย่าง:种 | คือ:即是 | สัมมาสมาธิ:正定 | กับ:与/和 | มิจฉาสมาธิ:邪定
[ROMAN] sa-maa-tʰí mii sɔ̌ɔŋ jàaŋ kʰɯɯ sǎm-maa-sa-maa-tʰí kàp mìt-cʰǎa-sa-maa-tʰí
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
  const [lessonTitle, setLessonTitle] = useState<string>(prefillConfig?.title || '共学互助校对课件');
  const [lessonDate, setLessonDate] = useState<string>(prefillConfig?.date || new Date().toISOString().slice(0, 10));
  const [contributorName, setContributorName] = useState<string>(currentUserName || '共学学友');
  const [thaiVideoUrlInput, setThaiVideoUrlInput] = useState<string>(prefillConfig?.thaiVideoUrl || '');
  const [chineseVideoUrlInput, setChineseVideoUrlInput] = useState<string>(prefillConfig?.chineseVideoUrl || '');

  const getInitialText = () => {
    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      return exportToEnhancedSRT(prefillConfig.subtitles);
    }
    if (prefillConfig?.snippet) {
      return `1\n00:00:01,000 --> 00:00:15,000\n${prefillConfig.title || '法谈开示'}\n${prefillConfig.snippet}`;
    }
    return DEFAULT_SAMPLE_SRT;
  };

  // 1. 粘贴区域文本
  const [rawText, setRawText] = useState<string>(getInitialText);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [linkedMetaInfo, setLinkedMetaInfo] = useState<TampermonkeyLinkedMetadata | null>(null);
  const [bundleEntries, setBundleEntries] = useState<TampermonkeyBundleEntry[]>([]);
  const [selectedBundleVid, setSelectedBundleVid] = useState<string>('');
  const [bundleSearch, setBundleSearch] = useState<string>('');
  
  // 2. 状态与提示
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [parseResult, setParseResult] = useState<{ total: number; lines: SubtitleLine[] }>(() => {
    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      return { total: prefillConfig.subtitles.length, lines: prefillConfig.subtitles };
    }
    try {
      const parsed = parseLanguageReactorText(getInitialText());
      return { total: parsed.totalParsed, lines: parsed.subtitles };
    } catch {
      return { total: 0, lines: [] };
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
    setLinkedMetaInfo(meta);
  };

  // 当外部传入 prefillConfig 变动或弹窗打开时，自动同步全篇内容
  useEffect(() => {
    if (!isOpen) return;
    setLessonTitle(prefillConfig?.title || '共学互助校对课件');
    if (prefillConfig?.date) setLessonDate(prefillConfig.date);
    setThaiVideoUrlInput(prefillConfig?.thaiVideoUrl || '');
    setChineseVideoUrlInput(prefillConfig?.chineseVideoUrl || '');
    setLinkedMetaInfo(null);
    setBundleEntries([]);
    setSelectedBundleVid('');
    setBundleSearch('');
    if (currentUserName) setContributorName(currentUserName);
    if (prefillConfig?.subtitles && prefillConfig.subtitles.length > 0) {
      const fullText = exportToEnhancedSRT(prefillConfig.subtitles);
      setRawText(fullText);
      setParseResult({ total: prefillConfig.subtitles.length, lines: prefillConfig.subtitles });
      setUploadedFileInfo(null);
    } else if (prefillConfig?.snippet) {
      const snippetText = `1\n00:00:01,000 --> 00:00:15,000\n${prefillConfig.title || '法谈开示'}\n${prefillConfig.snippet}`;
      setRawText(snippetText);
      try {
        const parsed = parseLanguageReactorText(snippetText);
        setParseResult({ total: parsed.totalParsed, lines: parsed.subtitles });
      } catch {
        setParseResult({ total: 0, lines: [] });
      }
      setUploadedFileInfo(null);
    }
  }, [isOpen, prefillConfig, currentUserName]);

  // 文本变化时解析字幕与关联关系
  const handleTextChange = (text: string, sourceFileName?: string) => {
    if (!text.trim()) {
      setRawText(text);
      setParseResult({ total: 0, lines: [] });
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
        setParseResult({ total: inspected.totalParsed, lines: inspected.subtitles });
        applyInspectedMeta(inspected.meta);
        showToast(
          `📦 识别到 Tampermonkey 归档包（含 ${inspected.bundleItems.length} 场），已默认载入最新场次 ${inspected.meta.date || ''}`
        );
        return;
      }

      if (inspected.kind === 'linked_json') {
        setBundleEntries([]);
        setSelectedBundleVid('');
        setRawText(inspected.normalizedSrtText || text);
        setParseResult({ total: inspected.totalParsed, lines: inspected.subtitles });
        applyInspectedMeta(inspected.meta);
        showToast(
          `🔗 已从 JSON 关联包自动填入日期/标题与泰中视频链接（${inspected.totalParsed} 句）`
        );
        return;
      }

      setBundleEntries([]);
      setSelectedBundleVid('');
      setRawText(text);
      setParseResult({ total: inspected.totalParsed, lines: inspected.subtitles });
      if (
        (sourceFileName || text.includes('@taixue')) &&
        (inspected.meta.thaiVideoUrl || inspected.meta.date || inspected.meta.title)
      ) {
        applyInspectedMeta(inspected.meta);
      }
    } catch {
      setRawText(text);
      setParseResult({ total: 0, lines: [] });
    }
  };

  const handleSelectBundleEntry = (vid: string) => {
    const entry = bundleEntries.find((e) => e.videoId === vid);
    if (!entry) return;
    setSelectedBundleVid(vid);
    const inspected = buildInspectionFromLinkedItem(entry.rawItem);
    setRawText(inspected.normalizedSrtText || '');
    setParseResult({ total: inspected.totalParsed, lines: inspected.subtitles });
    applyInspectedMeta(inspected.meta);
    showToast(`已切换至【${entry.date}】(${entry.sentenceCount} 句)`);
  };

  // 读取文件内容
  const handleFileProcess = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleTextChange(content, file.name);
        const sizeStr = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;
        setUploadedFileInfo({ name: file.name, size: sizeStr });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 拖拽事件
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // 复制 AI 提示词
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
    setCopiedPrompt(true);
    showToast('已复制 AI 提示词！可直接发给 AI (ChatGPT/Claude/DeepSeek) 转换生肉 SRT');
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // 仅保留泰文与时间戳，剥离 HTML 与机器翻译
  const handleStripMachineTranslation = () => {
    if (!rawText.trim()) return;
    const { cleanedText, blockCount, removedLinesCount } = extractThaiAndTimestampsOnly(rawText);
    if (!cleanedText.trim()) {
      showToast('未检测到有效泰文内容，请确认文本内包含泰文开示原文');
      return;
    }
    handleTextChange(cleanedText);
    showToast(`已剥离 HTML 与剔除 ${removedLinesCount} 行机翻/杂项，保留 ${blockCount} 段纯泰文+时间戳！`);
  };

  // 装载或上传至共学互助库
  const handleApply = (saveToCommunityPool: boolean = false) => {
    const subs = parseResult.lines.length > 0 ? parseResult.lines : parseLanguageReactorText(rawText).subtitles;
    if (subs.length === 0) {
      showToast('请先上传文件或在下方文本区粘贴有效字幕');
      return;
    }

    const finalTitle = lessonTitle.trim() || prefillConfig?.title || '共学互助校对课件';
    const signerName = contributorName.trim() || currentUserName || '共学学友';
    const finalThaiVideoUrl = thaiVideoUrlInput.trim();
    const finalChineseVideoUrl = chineseVideoUrlInput.trim();
    const extractedThaiId = extractYouTubeVideoId(finalThaiVideoUrl);
    const extractedChineseId = extractYouTubeVideoId(finalChineseVideoUrl);
    const finalDate = lessonDate || new Date().toISOString().slice(0, 10);

    const newLesson: CuratedLesson = {
      id: `lesson_${Date.now()}`,
      date: finalDate,
      title: finalTitle,
      chineseTitle: finalTitle,
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
          ? '✅ 已直接保存并发布至官方精校课件库！'
          : `📤 已以「学友贡献 · ${signerName}」上传提交至共学互助库，并立即载入学习！`
      );
    }

    if (onLessonCreatedAndLoaded) {
      onLessonCreatedAndLoaded(newLesson);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#faf7f2] w-full max-w-3xl rounded-2xl shadow-2xl border border-[#d9c8a9] overflow-hidden flex flex-col max-h-[92vh]">
        {/* 顶部标题栏 */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#e6d3ac] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                共学互助字幕校对与上传
              </h2>
              <p className="text-xs text-stone-500">
                每位学友皆可导入 SRT 校对、试听并上传分享给共学伙伴
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 提示气泡 */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-medium flex items-center gap-2 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 主体内容 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 课件名称、开示日期与贡献署名 */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-800 block mb-1">
                🏷️ 课件名称 / 开示标题
              </label>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="例如：2026-10-18 日常生活中的四念处（互助校对）"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#d9c8a9] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                📅 开示日期
              </label>
              <input
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#d9c8a9] bg-white text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-800 block mb-1">
                ✍️ 贡献署名
              </label>
              <input
                type="text"
                value={isAdmin ? '官方精校' : contributorName}
                disabled={isAdmin}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="共学昵称 / 署名"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#d9c8a9] bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-amber-50 disabled:text-amber-900 disabled:font-bold"
              />
            </div>
          </div>

          {/* 绑定对应的泰/中视频链接（严格关联泰文视频，不对应不出字幕） */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div>
              <label className="text-[11px] font-bold text-stone-800 block mb-1">
                🇹🇭 对应泰文原版 YouTube 链接（严格绑定字幕显示）
              </label>
              <input
                type="text"
                value={thaiVideoUrlInput}
                onChange={(e) => setThaiVideoUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=...（须对应本字幕泰语视频）"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#d9c8a9] bg-white text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-stone-800 block mb-1">
                🇨🇳 对应中文同传视频链接（可选）
              </label>
              <input
                type="text"
                value={chineseVideoUrlInput}
                onChange={(e) => setChineseVideoUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=...（单播可留空）"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#d9c8a9] bg-white text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          
          {/* 关联元信息提示条 & Tampermonkey 归档包选期选择器 */}
          {(linkedMetaInfo || bundleEntries.length > 0) && (
            <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-300 space-y-2">
              {linkedMetaInfo && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      已自动建立字幕与音视频关联
                      {linkedMetaInfo.date ? ` · ${linkedMetaInfo.date}` : ''}
                      {linkedMetaInfo.captionLang ? ` · 音轨 ${linkedMetaInfo.captionLang}` : ''}
                      {linkedMetaInfo.isManualCC === true ? ' (官方人工 CC)' : linkedMetaInfo.isManualCC === false ? ' (ASR 自动字幕)' : ''}
                    </span>
                  </div>
                  {linkedMetaInfo.matchedFromCatalog && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 font-bold text-[10px]">
                      已匹配站内官方目录双播链接
                    </span>
                  )}
                </div>
              )}

              {bundleEntries.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-emerald-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-950">
                      📦 从 Tampermonkey 导出包选择具体期数（共 {bundleEntries.length} 场）：
                    </span>
                    <input
                      type="text"
                      value={bundleSearch}
                      onChange={(e) => setBundleSearch(e.target.value)}
                      placeholder="按日期或标题筛选期数..."
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                          {it.date} | {it.title.slice(0, 48)} ({it.sentenceCount}句{it.chineseVideoUrl ? ' · 含中文同传' : ''})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 1. AI 提示词部分 */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-stone-900">
                  AI 批量转换提示词 (标准朱拉隆功音标与五声调)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/tools/taixue-youtube-cc.user.js"
                  download="taixue-youtube-cc.user.js"
                  className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                  title="下载 Tampermonkey 油猴脚本 v1.1.0：支持抓当前视频、选期抓取并直出 .srt 与 .linked.json"
                >
                  <Download className="w-3 h-3" />
                  <span>油猴抓词器 v1.1.0 (.user.js)</span>
                </a>
                <a
                  href="/tools/Luangpor_Dhamma_Colab_Pipeline.ipynb"
                  download="Luangpor_Dhamma_Colab_Pipeline.ipynb"
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                  title="下载 Google Colab GPU 全自动泰语识别+翻译流水线 (.ipynb)"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>下载 Colab GPU 流水线 (.ipynb)</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="text-[11px] text-amber-800 hover:underline cursor-pointer"
                >
                  {showPromptDetails ? '收起提示词' : '查看完整提示词'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? '已复制！' : '📋 复制 AI 提示词'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-stone-600 leading-relaxed">
              💡 <strong>工作流</strong>：① 用 <strong>油猴抓词器 (.user.js)</strong> 在 YouTube 抓取当前视频或选定期数的官方 CC（支持导出 <code>.srt</code> / <code>.linked.json</code>）；② 直接拖入下方，或发给 AI / <strong>Colab GPU 流水线</strong> 精校成 <code>.enhanced.srt</code>；③ 拖入即自动关联泰/中双视频链接与时间轴！
            </p>

            {showPromptDetails && (
              <div className="p-3 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-stone-700">
                {AI_SRT_CONVERSION_PROMPT}
              </div>
            )}
          </div>

          {/* 2. 上传文件区 */}
          <div>
            <label className="text-xs font-bold text-stone-800 block mb-1.5">
              📁 上传字幕或结构化文件 (.srt, .json, .html, .htm, .txt, .tsv)
            </label>
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
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                  : uploadedFileInfo
                  ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
                  : 'border-[#d9c8a9] bg-white hover:bg-amber-50/40 hover:border-amber-400'
              }`}
            >
              {uploadedFileInfo ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800 truncate max-w-xs">
                          {uploadedFileInfo.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {uploadedFileInfo.size}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        文件已读取 • 识别到 <strong className="text-emerald-700">{parseResult.total}</strong> 句法谈字幕
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFileInfo(null);
                      handleTextChange('');
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="清除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    点击选择 或 将字幕文件拖入此处
                  </p>
                  <p className="text-[11px] text-stone-500">
                    支持 .SRT / .HTML（Language Reactor 导出）/ .TXT，读取后自动填入下方编辑区
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. 下面能粘贴的区域 */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span>📝 字幕粘贴与编辑区 (增强型 SRT / LR HTML / 生肉 SRT)</span>
                {parseResult.total > 0 && (
                  <span className="text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                    ✓ 已识别全部 {parseResult.total} 句
                  </span>
                )}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleStripMachineTranslation}
                  disabled={!rawText.trim()}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                  title="自动剥离 HTML 标签与机器翻译，仅保留带时间戳的泰文原文，方便直接复制进 AI Studio 或第三方 AI 生产精校字幕"
                >
                  <Eraser className="w-3.5 h-3.5 text-amber-700" />
                  <span>🧹 仅留泰文+时间戳（去机翻）</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(rawText);
                    setCopiedRawText(true);
                    showToast('已复制编辑区全部字幕内容！');
                    setTimeout(() => setCopiedRawText(false), 2000);
                  }}
                  disabled={!rawText.trim()}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                  title="将当前编辑框中的全部内容复制到剪贴板，方便贴入 AI Studio 或第三方 AI 生产音标与拆词"
                >
                  {copiedRawText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRawText ? '已复制全文' : '📋 复制编辑区全文'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTextChange(DEFAULT_SAMPLE_SRT)}
                  className="text-[11px] text-amber-800 hover:underline cursor-pointer"
                >
                  填入示范样本
                </button>

                <button
                  type="button"
                  onClick={() => handleTextChange('')}
                  className="text-[11px] text-stone-400 hover:text-red-600 cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            {/* 机制透明说明 */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-stone-700 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-stone-900 mb-0.5">
                  💡 拆词与导入机制说明（完全透明，支持第三方 AI 双向互导）：
                </p>
                <div className="text-[11px] text-stone-600 space-y-0.5">
                  <div>• <strong>推荐格式（第三方 AI 完整输出）</strong>：在 SRT 时间戳下方包含 <code>[GLOSS] 词:释义 | 词:释义</code> 拆词行与 <code>[ROMAN] 音标</code> 行。系统将 100% 精确保留 AI 的拆词与释义，不漏一词。</div>
                  <div>• <strong>普通生肉格式（无拆词标注）</strong>：若仅输入泰文与中文翻译，系统会自动调用本地 <strong>1,120+ 尊者法谈专有词库与朱拉隆功音标引擎</strong> 进行智能切词与注音。</div>
                </div>
              </div>
            </div>

            <textarea
              rows={11}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="在此粘贴包含 [GLOSS] 拆词或普通生肉 SRT 的字幕全文，支持外部 AI (ChatGPT/Claude/DeepSeek) 生成结果直接全篇导入..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed shadow-inner"
            />
          </div>

        </div>

        {/* 底部操作栏 */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#e6d3ac] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {parseResult.total > 0 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                就绪：已成功识别 {parseResult.total} 句法谈字幕
              </span>
            ) : (
              <span>请输入或上传有效的 SRT 字幕</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleApply(true)}
              disabled={parseResult.total === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              title={
                isAdmin
                  ? '以 admin 身份直接保存并公开发布到课件库'
                  : '上传提交至共学互助库，并立即载入学习'
              }
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isAdmin ? '保存并直接发布上线' : '上传提交至共学互助库'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={parseResult.total === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>仅载入播放器 ({parseResult.total} 句)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
