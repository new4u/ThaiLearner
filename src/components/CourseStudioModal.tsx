import React, { useState, useRef } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, Sparkles, Copy, Check, 
  Trash2, FileCheck2, Bot, Play, Save
} from 'lucide-react';
import { CuratedLesson, SubtitleLine } from '../types';
import { parseLanguageReactorText } from '../utils/languageReactorParser';
import { AI_SRT_CONVERSION_PROMPT } from '../utils/lrFormatParser';
import { saveCommunityLesson } from '../data/presetLessonsLibrary';

interface CourseStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  currentUserName?: string;
  prefillConfig?: {
    title?: string;
    thaiVideoUrl?: string;
    chineseVideoUrl?: string;
    snippet?: string;
    pageId?: number;
  };
  onLessonCreatedAndLoaded?: (lesson: CuratedLesson) => void;
}

const DEFAULT_SAMPLE_SRT = `1
00:00:01,200 --> 00:00:10,300
เวลาของพวกเราแต่ละคนมีไม่มาก มีโอกาสเรียนธรรมะรีบเรียน
我们每个人的时间都不多，有机会学习佛法就赶紧去学。

2
00:00:10,300 --> 00:00:18,500
สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ
禅定有两种：正定与邪定。`;

export const CourseStudioModal: React.FC<CourseStudioModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = 'dhamma_worker',
  currentUserName = '法工团队',
  prefillConfig,
  onLessonCreatedAndLoaded,
}) => {
  const isAdmin = true;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 粘贴区域文本
  const [rawText, setRawText] = useState(prefillConfig?.snippet ? `1\n00:00:01,000 --> 00:00:15,000\n${prefillConfig.title || '法谈开示'}\n${prefillConfig.snippet}` : DEFAULT_SAMPLE_SRT);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 2. 状态与提示
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [parseResult, setParseResult] = useState<{ total: number; lines: SubtitleLine[] }>(() => {
    try {
      const parsed = parseLanguageReactorText(DEFAULT_SAMPLE_SRT);
      return { total: parsed.totalParsed, lines: parsed.subtitles };
    } catch {
      return { total: 0, lines: [] };
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 文本变化时解析字幕
  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParseResult({ total: 0, lines: [] });
      return;
    }
    try {
      const parsed = parseLanguageReactorText(text);
      setParseResult({ total: parsed.totalParsed, lines: parsed.subtitles });
    } catch {
      setParseResult({ total: 0, lines: [] });
    }
  };

  // 读取文件内容
  const handleFileProcess = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleTextChange(content);
        const sizeStr = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;
        setUploadedFileInfo({ name: file.name, size: sizeStr });
        showToast(`已成功读取文件【${file.name}】！`);
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

  // 装载或发布
  const handleApply = (saveToCurated: boolean = false) => {
    const subs = parseResult.lines.length > 0 ? parseResult.lines : parseLanguageReactorText(rawText).subtitles;
    if (subs.length === 0) {
      alert('请先上传文件或在下方文本区粘贴有效字幕！');
      return;
    }

    const lessonTitle = prefillConfig?.title || '新制作法谈字幕课件';
    const newLesson: CuratedLesson = {
      id: `lesson_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      title: lessonTitle,
      chineseTitle: lessonTitle,
      speaker: '隆波帕默尊者',
      source: '法谈字幕工坊',
      thaiVideoUrl: prefillConfig?.thaiVideoUrl || 'https://www.youtube.com/watch?v=F4-tJNYDpss',
      chineseVideoUrl: prefillConfig?.chineseVideoUrl || 'https://www.youtube.com/watch?v=HR-O2XYifbI',
      thaiVideoId: prefillConfig?.thaiVideoUrl || 'F4-tJNYDpss',
      chineseVideoId: prefillConfig?.chineseVideoUrl || 'HR-O2XYifbI',
      chineseMediaType: 'youtube',
      defaultOffsetSeconds: 0,
      totalSentences: subs.length,
      tags: ['最新开示', '制作法谈'],
      keyTerms: [],
      subtitles: subs,
      status: 'approved',
      submittedBy: {
        id: currentUserEmail || 'admin',
        name: currentUserName || '主理人',
      },
      submittedAt: new Date().toISOString(),
    };

    if (saveToCurated) {
      saveCommunityLesson(newLesson);
      showToast('🎉 已成功保存并发布到课件库！');
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
                制作法谈字幕 (Subtitle Production)
              </h2>
              <p className="text-xs text-stone-500">
                保留极简三要素：AI 提示词、上传文件与字幕粘贴区
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
          
          {/* 1. AI 提示词部分 */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-stone-900">
                  AI 批量转换提示词 (标准朱拉隆功音标与五声调)
                </span>
              </div>
              <div className="flex items-center gap-2">
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
              💡 将你的原始生肉 SRT 与此提示词发给 AI（ChatGPT、Claude、DeepSeek、Gemini），AI 将自动为你生成带标准朱拉隆功实用音标（5声调 <code>mid, à, â, á, ǎ</code>）、音节连字符断词以及核心法义对照的增强型字幕。
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
              📁 上传字幕文件 (.srt, .txt)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".srt,.txt,text/plain"
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
                    支持 .SRT 与 .TXT 文件，读取后自动填入下方粘贴区
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. 下面能粘贴的区域 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span>📝 字幕粘贴与编辑区</span>
                {parseResult.total > 0 && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-normal">
                    已识别 {parseResult.total} 句
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => handleTextChange(DEFAULT_SAMPLE_SRT)}
                className="text-[11px] text-amber-800 hover:underline cursor-pointer"
              >
                填入示范样本
              </button>
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="在此粘贴 SRT 格式字幕内容，或点击上方【上传文件】自动载入..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer"
            >
              取消
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleApply(true)}
                disabled={parseResult.total === 0}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存至课件库</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleApply(false)}
              disabled={parseResult.total === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>⚡ 装载到双播播放器</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
