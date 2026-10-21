import React, { useState } from 'react';
import { SubtitleLine, CoursePreset } from '../types';
import { 
  parseLRExportData, exportToLRTSV, exportToWeChatGroupText,
  exportToEnhancedSRT, AI_SRT_CONVERSION_PROMPT 
} from '../utils/lrFormatParser';
import { PRESET_COURSE_LIBRARY } from '../data/luangporCourseData';
import { 
  FileSpreadsheet, Upload, Download, Copy, Check, Sparkles, 
  BookOpen, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, FileText,
  Bot, HelpCircle, Code, Layers, FileCode, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

interface CourseManagerViewProps {
  currentSubtitles: SubtitleLine[];
  onApplySubtitles: (newSubs: SubtitleLine[]) => void;
  onLoadPreset: (preset: CoursePreset) => void;
  onBackToStudy: () => void;
}

export const CourseManagerView: React.FC<CourseManagerViewProps> = ({
  currentSubtitles,
  onApplySubtitles,
  onLoadPreset,
  onBackToStudy
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'presets'>('import');
  
  // 导入状态
  const [pasteInput, setPasteInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<{ subtitles: SubtitleLine[]; format: string; count: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // 辅助状态：展示 AI Prompt 与规范文档
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);

  // 复制反馈状态
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 处理文本解析
  const handleParseText = (text: string) => {
    setParseError(null);
    setImportSuccess(false);
    try {
      const res = parseLRExportData(text);
      setParsedPreview(res);
    } catch (err: any) {
      setParsedPreview(null);
      setParseError(err.message || '解析失败，请检查格式');
    }
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPasteInput(content);
      handleParseText(content);
    };
    reader.readAsText(file);
  };

  // 确认导入应用到研读流
  const handleConfirmImport = () => {
    if (!parsedPreview || parsedPreview.subtitles.length === 0) return;
    onApplySubtitles(parsedPreview.subtitles);
    setImportSuccess(true);
    setTimeout(() => {
      onBackToStudy();
    }, 1200);
  };

  // 一键复制 AI 批量转换 Prompt
  const handleCopyAIPrompt = () => {
    navigator.clipboard.writeText(AI_SRT_CONVERSION_PROMPT);
    setCopiedType('ai_prompt');
    setTimeout(() => setCopiedType(null), 3000);
  };

  // 导出为增强型逐词对齐 SRT (.srt 文件下载)
  const handleDownloadEnhancedSRT = () => {
    const srtContent = exportToEnhancedSRT(currentSubtitles);
    const blob = new Blob(['\uFEFF' + srtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `泰法语声闻共学-增强型逐词对齐字幕-${new Date().toISOString().slice(0, 10)}.srt`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedType('srt_download');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 复制增强型 SRT 纯文本
  const handleCopyEnhancedSRTText = () => {
    const srtContent = exportToEnhancedSRT(currentSubtitles);
    navigator.clipboard.writeText(srtContent);
    setCopiedType('srt_copy');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 导出为 LR 兼容 TSV 文件
  const handleDownloadLRTSV = () => {
    const tsvContent = exportToLRTSV(currentSubtitles);
    const blob = new Blob(['\uFEFF' + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `泰法语声闻共学-LR官方导出兼容表-${new Date().toISOString().slice(0, 10)}.tsv`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedType('tsv_download');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 导出为微信群分享排版文本
  const handleCopyWeChatGroupText = () => {
    const text = exportToWeChatGroupText(currentSubtitles, '第1期·正定与邪定');
    navigator.clipboard.writeText(text);
    setCopiedType('wechat');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // 导出为 JSON 课件包
  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(currentSubtitles, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `泰法语声闻共学-课件包-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedType('json_download');
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="space-y-6 text-slate-100 max-w-7xl mx-auto">
      
      {/* 顶部标题与说明 */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              课件分发与全格式双向导入流
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              新一代 SRT-GLOSS 增强型逐词对齐架构
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              AI 批量转换 Prompt 赋能
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            声闻课件导入、分发与 AI 转换工作台
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
            支持无缝导入生肉/传统 SRT、增强型逐词对齐 SRT (SRT-GLOSS)、Language Reactor TSV 表格及 JSON 课件。
            提供专为大模型定制的批量转换 Prompt，任何生肉字幕经 ChatGPT/Claude 计算后即可秒级化为带逐词对照的高精课件！
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>课件导入</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出与备份</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'presets' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>官方预置库</span>
          </button>
        </div>
      </div>

      {/* Tab 1: 课件导入与 AI 转换工具箱 */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          
          {/* AI 转换工具箱高亮横幅卡片 */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-amber-950/40 border border-indigo-700/50 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
                    <Bot className="w-4 h-4" />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>从其他地方拿到普通 SRT？用专属 AI Prompt 一键升级！</span>
                  </h3>
                </div>
                <p className="text-xs text-indigo-200/90 leading-relaxed">
                  若您有普通的传统 SRT（只有泰文和中文整句，缺少逐词拆解）：复制下方 Prompt，连同您的生肉 SRT 发给 ChatGPT / Claude / Gemini / DeepSeek，AI 将自动计算出符合本系统标准的<strong>增强型逐词对齐 SRT</strong>，粘贴即可直接研读！
                </p>
              </div>

              {/* 动作区 */}
              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  onClick={handleCopyAIPrompt}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-amber-500 hover:from-indigo-400 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-indigo-900/40 flex items-center gap-2 transition transform active:scale-95 cursor-pointer"
                >
                  {copiedType === 'ai_prompt' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-950" />
                      <span>已复制 Prompt！可直接发给 AI</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>📋 一键复制 AI 批量转换 Prompt</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPromptDetails(!showPromptDetails)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{showPromptDetails ? '收起 Prompt 详情' : '查看 Prompt 全文'}</span>
                  {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => setShowSchemaGuide(!showSchemaGuide)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1 transition cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>SRT-GLOSS 格式规范</span>
                </button>
              </div>
            </div>

            {/* 展开查看 AI Prompt 全文 */}
            {showPromptDetails && (
              <div className="mt-4 pt-4 border-t border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span className="font-semibold">AI Prompt 原文内容（已针对大模型格式对齐调优）：</span>
                  <button
                    onClick={handleCopyAIPrompt}
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>点击复制</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-900/40 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap">
                  {AI_SRT_CONVERSION_PROMPT}
                </pre>
              </div>
            )}

            {/* 展开查看 SRT-GLOSS 格式规范图解 */}
            {showSchemaGuide && (
              <div className="mt-4 pt-4 border-t border-amber-900/50 space-y-3 text-xs text-slate-300">
                <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" />
                  <span>增强型泰汉逐词对齐 SRT (SRT-GLOSS) 架构标准</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-emerald-400 block">标准块范式：</span>
                    <pre className="text-[11px] font-mono text-slate-300 whitespace-pre leading-relaxed">
{`1
00:00:01,200 --> 00:00:10,300
เวลาของพวกเราแต่ละคนมีไม่มาก
[GLOSS] เวลา:时间 | ของ:的/属于 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多
[ROMAN] weː-laa kʰɔ̌ɔŋ pʰûak-raw tɛ̀ɛ-láʔ-kʰon mii mâj mâak
我们每个人的时间都不多。`}
                    </pre>
                  </div>
                  <div className="space-y-1.5 text-slate-400 leading-relaxed text-[11px]">
                    <p><strong className="text-white">① 100% 兼容标准播放器：</strong>保留标准序号与时间戳，PotPlayer、VLC 均可正常加载。</p>
                    <p><strong className="text-white">② [GLOSS] 逐词直译行：</strong>以冒号标示每个泰文词对应的中文释义，以竖线 ` | ` 分隔，系统自动建立词块索引。</p>
                    <p><strong className="text-white">③ [ROMAN] 音标可选：</strong>大模型若不擅长朱拉隆功精确音调，可完全省略此行，本系统会自动调用离线音标引擎补全，绝不报错。</p>
                    <p><strong className="text-white">④ 传统双语 SRT 零门槛保底：</strong>即使直接导入只有泰文与中文整句的原始 SRT，系统也会自动使用内置 1120+ 词典进行智能切词与释义！</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 左侧：输入与上传区 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  粘贴数据或上传字幕文件
                </h3>
                <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-medium border border-emerald-500/30 cursor-pointer transition flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>选择本地文件 (.srt/.tsv/.csv/.json)</span>
                  <input 
                    type="file" 
                    accept=".srt,.tsv,.csv,.json,.txt" 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                </label>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                全兼容识别：① <strong>增强型逐词对齐 SRT</strong> (带 [GLOSS] 词解)；② <strong>传统双语/单语 SRT</strong> (自动分词)；③ <strong>Language Reactor</strong> 导出的 TSV/CSV 表格；④ JSON 课件包。
              </p>

              <textarea
                value={pasteInput}
                onChange={(e) => {
                  setPasteInput(e.target.value);
                  if (e.target.value.trim()) {
                    handleParseText(e.target.value);
                  } else {
                    setParsedPreview(null);
                    setParseError(null);
                  }
                }}
                rows={12}
                placeholder={`在此直接粘贴字幕或课件数据：\n\n【示例 1：增强型逐词对齐 SRT】\n1\n00:00:01,200 --> 00:00:10,300\nเวลาของพวกเราแต่ละคนมีไม่มาก\n[GLOSS] เวลา:时间 | ของ:的/属于 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多\n我们每个人的时间都不多。\n\n【示例 2：传统生肉 SRT】\n1\n00:00:01,200 --> 00:00:10,300\nเวลาของพวกเราแต่ละคนมีไม่มาก\n我们每个人的时间都不多。`}
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />

              {parseError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* 快速填入不同格式示例测试 */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const sampleEnhanced = `1\n00:00:01,200 --> 00:00:10,300\nเวลาของพวกเราแต่ละคนมีไม่มากมีโอกาสเรียนธรรมะรีบเรียน\n[GLOSS] เวลา:时间 | ของ:的/属于 | พวกเรา:我们 | แต่ละคน:每个人 | มี:有 | ไม่มาก:不多 | มี:有 | โอกาส:机会 | เรียน:学习 | ธรรมะ:佛法 | รีบ:赶紧 | เรียน:学\n[ROMAN] weː-laa kʰɔ̌ɔŋ pʰûak-raw tɛ̀ɛ-láʔ-kʰon mii mâj mâak mii ʔoo-kàat rian tʰam-máʔ rîip rian\n我们每个人的时间都不多，有机会学习佛法就赶紧去学。\n\n2\n00:00:10,300 --> 00:00:18,500\nสมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ\n[GLOSS] สมาธิ:禅定 | มี:有 | ๒ อย่าง:两种 | คือ:即是 | สัมมาสมาธิ:正定 | กับ:与 | มิจฉาสมาธิ:邪定\n禅定有两种：那就是正定与邪定。`;
                      setPasteInput(sampleEnhanced);
                      handleParseText(sampleEnhanced);
                    }}
                    className="text-amber-400 hover:text-amber-300 transition cursor-pointer flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    填入增强型 SRT 范例 (含 [GLOSS])
                  </button>

                  <button
                    onClick={() => {
                      const sampleTraditional = `1\n00:00:01,200 --> 00:00:10,300\nเวลาของพวกเราแต่ละคนมีไม่มากมีโอกาสเรียนธรรมะรีบเรียน\n我们每个人的时间都不多，有机会学习佛法就赶紧去学。\n\n2\n00:00:10,300 --> 00:00:18,500\nสมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ\n禅定有两种：那就是正定与邪定。`;
                      setPasteInput(sampleTraditional);
                      handleParseText(sampleTraditional);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1 font-medium"
                  >
                    <span>⚡ 填入传统生肉 SRT (自动分词)</span>
                  </button>

                  <button
                    onClick={() => {
                      const sampleTSV = `เราจะฝึกสมาธิ เราต้องรู้อย่างหนึ่งก่อน\t我们要练习禅定，就必须先知道一件事。\traw càʔ fɯ̀k sà-maː-tʰí\t[00:00-00:07] 开场点题\n` +
                        `สมาธิมี ๒ อย่าง คือ สัมมาสมาธิ กับ มิจฉาสมาธิ\t禅定有 2 种：那就是“正定”与“邪定”。\tsà-maː-tʰí mii sɔ̌ɔŋ jàːŋ kʰɯɯ sǎm-maː-sà-maː-tʰí\t[00:08-00:18] 对举`;
                      setPasteInput(sampleTSV);
                      handleParseText(sampleTSV);
                    }}
                    className="text-slate-400 hover:text-slate-300 transition cursor-pointer"
                  >
                    填入 LR TSV 范例
                  </button>
                </div>

                <button
                  onClick={() => {
                    setPasteInput('');
                    setParsedPreview(null);
                    setParseError(null);
                  }}
                  className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                >
                  清空
                </button>
              </div>
            </div>

            {/* 右侧：实时表格预览与导入确认 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    智能映射与逐词拆解预览
                  </h3>
                  {parsedPreview && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      识别格式: {parsedPreview.format} · 共 {parsedPreview.count} 句
                    </span>
                  )}
                </div>

                {!parsedPreview ? (
                  <div className="text-center py-24 text-slate-500 text-xs space-y-2">
                    <FileCode className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>在左侧粘贴或上传后，此处将实时展示泰文原文、逐词中文对照、朱拉音标的结构化视听卡片。</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {parsedPreview.subtitles.map((sub, idx) => (
                      <div 
                        key={sub.id} 
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            [{sub.timeStart} - {sub.timeEnd}]
                          </span>
                        </div>

                        {/* 泰文整句 */}
                        <div className="font-thai font-bold text-sm text-white">
                          {sub.thai}
                        </div>

                        {/* 核心逐词泰中对照标签流 */}
                        {sub.words && sub.words.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sub.words.map(w => (
                              <div
                                key={w.id}
                                className="inline-flex flex-col items-center bg-slate-900 border border-slate-700/70 hover:border-amber-500/50 px-2 py-1 rounded-lg text-left shadow-xs transition"
                              >
                                <span className="font-bold text-slate-100 text-xs">{w.thai}</span>
                                <span className="text-[9px] font-mono text-indigo-300">/{w.romanization}/</span>
                                <span className="text-[10px] text-amber-300 font-medium">{w.chinese}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 整句罗马音标 */}
                        {sub.romanization && (
                          <div className="text-indigo-300 font-mono text-[11px]">
                            /{sub.romanization}/
                          </div>
                        )}

                        {/* 中文翻译 */}
                        <div className="text-amber-200/90 text-xs border-t border-slate-800/80 pt-1.5 font-medium">
                          {sub.chinese}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 确认导入按钮 */}
              <div>
                <button
                  onClick={handleConfirmImport}
                  disabled={!parsedPreview || parsedPreview.subtitles.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition hover:scale-102 active:scale-95 cursor-pointer"
                >
                  {importSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>课件导入成功！正在跳转至研读流…</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>确认导入此课件，并立即开始声闻研读 ({parsedPreview?.count || 0} 句)</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Tab 2: 课件分发与导出 */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 卡片 1: 增强型逐词对齐 SRT (SRT-GLOSS) */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-0.5 text-[10px] font-black rounded-bl-xl">
              推荐规范
            </div>
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                增强型逐词对齐 SRT (.srt)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                导出严格符合 SRT-GLOSS 标准的字幕文件，含精确时间戳、泰语原文、[GLOSS]逐词中泰对照及朱拉音标。可用于任何 AI 微调或兼容播放器。
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleDownloadEnhancedSRT}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{copiedType === 'srt_download' ? '正在下载 SRT...' : '下载增强型 SRT (.srt)'}</span>
              </button>

              <button
                onClick={handleCopyEnhancedSRTText}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedType === 'srt_copy' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>已复制增强型 SRT 文本！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>复制 SRT 纯文本</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 卡片 2: 微信群分享文本一键生成 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Copy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                微信群一键同步排版文本
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                将当前正在研读的课件生成格式整齐优美的微信文案。群友长按复制后，打开本工作台一键导入即可秒级进入同步研读状态！
              </p>
            </div>

            <button
              onClick={handleCopyWeChatGroupText}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {copiedType === 'wechat' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>已成功复制微信排版文本！</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>复制微信群排版文本</span>
                </>
              )}
            </button>
          </div>

          {/* 卡片 3: Language Reactor 官方 TSV 导出 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                LR 官方标准 TSV 表格文件
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                导出严格符合 Language Reactor 规范的制表符分隔 TSV 文件。可以直接用 Excel、Numbers 打开，或导入回 LR / Anki 词卡。
              </p>
            </div>

            <button
              onClick={handleDownloadLRTSV}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>下载 LR 兼容 TSV 表格</span>
            </button>
          </div>

          {/* 卡片 4: JSON 完整课件备份包 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-3">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                标准 JSON 课件包备份
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                导出包含完整单词词元、词根拆解、发音要诀与法义注释的 JSON 课件包，适合在多台设备间备份与迁移。
              </p>
            </div>

            <button
              onClick={handleDownloadJSON}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>下载 JSON 课件包</span>
            </button>
          </div>

        </div>
      )}

      {/* Tab 3: 官方开示预置库 */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRESET_COURSE_LIBRARY.map(preset => (
            <div
              key={preset.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {preset.tag}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    共 {preset.subtitles.length} 句
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mt-2">
                  {preset.title}
                </h3>
                <div className="text-xs text-slate-400 mt-1">
                  开示尊者：{preset.speaker} · 出处：{preset.source}
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="font-thai font-semibold text-amber-300">
                    首句例示：{preset.subtitles[0].thai}
                  </div>
                  <div className="text-slate-400">
                    译义：{preset.subtitles[0].chinese}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onLoadPreset(preset);
                  onBackToStudy();
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>载入本期开示并立即研读</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
