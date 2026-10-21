import React, { useState } from 'react';
import { SubtitleLine } from '../types';
import { Download, Copy, Printer, Check, X, FileSpreadsheet, Share2, Code2 } from 'lucide-react';

interface ExportModalProps {
  subtitles: SubtitleLine[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ subtitles, onClose }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'core' | 'learning'>('all');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showAiPromptModal, setShowAiPromptModal] = useState<boolean>(false);

  // Extract all unique words
  const allWords = subtitles.flatMap(line => line.words);
  const uniqueWordsMap = new Map();
  allWords.forEach(w => {
    if (!uniqueWordsMap.has(w.thai)) {
      uniqueWordsMap.set(w.thai, w);
    }
  });
  const uniqueWords = Array.from(uniqueWordsMap.values()).filter(w => {
    if (filterMode === 'core') return w.isCore;
    if (filterMode === 'learning') return w.status === 'learning';
    return true;
  });

  const aiIdePromptText = `# 泰法语声闻共学工作台（Netlify + Supabase 免 Google/Gemini 纯净交付提示词）

你是一名资深全栈工程师。本项目是将“泰法语声闻共学工作台（泰法语声闻共学 AI 工作流）”部署上线至 Netlify，并连接 Supabase 数据库实现学员共学数据持久化。
主标题：“像玩通关游戏一样听懂隆波开示 · 玩转实战泰语”
副标/Slogan：“每周仅需 1 小时，对治‘想学泰语又学不动’的困境，把隆波的殊胜法语映入日常生活。”

## 关键架构与部署约束（绝对遵守）：
1. 绝对不要引入任何 Google、Gemini API、Google GenAI SDK 或任何依赖 Google Cloud 的鉴权/接口服务。所有外部 AI 依赖全部剥离或替换为自主配置的 API。
2. 目标部署平台为 Netlify（静态单页应用 / Netlify Functions），严禁使用仅在 Node 常驻容器中才能运行的内部专有协议，确保一键 npm run build 部署成功。
3. 彻底移除复读机循环逻辑，纯粹聚焦在“声闻课件研读流”与“实时听闻看板”。
4. 深度对接 Language Reactor (LR) 官方导出规范（TSV 制表符格式），支持无外部视频依赖的课件导入分发与微信群一键同步。
5. 数据库与用户鉴权：采用 Supabase（@supabase/supabase-js）：
   - Auth：邮箱/密码、Magic Link 或匿名学员登录；
   - Table profiles: id, email, display_name, role ('student' | 'host' | 'admin'), zoom_passcode, created_at
   - Table learning_progress: id, user_id, current_lesson_id, words_mastered, keyboard_speed, updated_at
   - Table sati_records: id, user_id, session_date, sati_count, phuru_count, long_count, total_seconds, created_at
   - Table word_notes: id, user_id, thai_word, ipa, meaning, user_notes, status ('mastered' | 'learning')
   - Table zoom_sessions: id, topic, meeting_id, passcode, join_url, host_name, scheduled_at, is_active
6. 泰语分词与朱拉 Adapted IPA 标音引擎：
   - 客户端采用纯前端轻量分词与离线朱拉词库匹配，无需调用外部大模型即可实现实时大字双语对照；
7. 请接续完成以下任务：
   - 配置 netlify.toml 路由重定向与构建命令（npm run build -> dist）。
   - 创建 src/lib/supabaseClient.ts 并读取 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。
   - 将现有前端学员登录、打卡进度、Zoom 会议室信息与 Supabase 数据表双向打通。
   - 保持极简纯净，确保在 Netlify 上一键 build 成功即可交付学员使用！`;

  const handleCopyAiIdePrompt = () => {
    navigator.clipboard.writeText(aiIdePromptText);
    setCopiedType('ai_prompt');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyAnki = () => {
    const lines = uniqueWords.map(w => 
      `${w.thai}\t${w.romanization}\t${w.chinese}\t${w.rootBreakdown || ''}\t${w.tip || ''}`
    ).join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedType('anki');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyWeChat = () => {
    const text = `📿【隆波法语·泰中双语共学打卡词帖】\n` +
      `📅 共学主题：正定 (สัมมาสมาธิ) 与 邪定 (มิจฉาสมาธิ)\n` +
      `───────────────\n` +
      uniqueWords.map((w, idx) => 
        `${idx + 1}. ${w.thai} [${w.romanization}]\n` +
        `   义：${w.chinese}${w.rootBreakdown ? `\n   析：${w.rootBreakdown}` : ''}`
      ).join('\n\n') +
      `\n───────────────\n` +
      `💡 学习寄语：只要会听、能打出泰语键盘即可！通关密语：สัมมาสมาธิ (正定) 已刻入觉知。`;
    
    navigator.clipboard.writeText(text);
    setCopiedType('wechat');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadCsv = () => {
    const headers = ['泰文', '朱拉隆功音标(Adapted IPA)', '中文释义', '词根与法义剖析', '发音规则提示'];
    const rows = uniqueWords.map(w => [
      `"${w.thai}"`,
      `"${w.romanization}"`,
      `"${w.chinese}"`,
      `"${(w.rootBreakdown || '').replace(/"/g, '""')}"`,
      `"${(w.tip || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `隆波法语-共学双语词汇表-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              导出“法音字帖”与共学词汇表 (Language Reactor Style)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              可一键打印为字帖PDF、导出Excel/Anki、或复制微信群复盘打卡文案
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Export Actions Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">词汇范围：</span>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              全部生词 ({allWords.length})
            </button>
            <button
              onClick={() => setFilterMode('core')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterMode === 'core'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              仅隆波核心佛法词
            </button>
            <button
              onClick={() => setFilterMode('learning')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                filterMode === 'learning'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              仅“学习中”高亮词
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              打印 / 存PDF
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              导出 CSV (Excel)
            </button>
            <button
              onClick={handleCopyAnki}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-700 hover:bg-indigo-600 text-white flex items-center gap-1.5 transition"
            >
              {copiedType === 'anki' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedType === 'anki' ? '已复制 Anki 格式' : '复制 Anki 卡片'}
            </button>
            <button
              onClick={handleCopyWeChat}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold flex items-center gap-1.5 transition"
            >
              {copiedType === 'wechat' ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedType === 'wechat' ? '已复制群打卡' : '复制微信群打卡'}
            </button>
            <button
              onClick={handleCopyAiIdePrompt}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 text-white flex items-center gap-1.5 transition shadow-sm"
              title="复制包含 Netlify 与 Supabase 纯净架构设计的 AI IDE 续接开发 Prompt"
            >
              {copiedType === 'ai_prompt' ? <Check className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5 text-cyan-200" />}
              {copiedType === 'ai_prompt' ? '已复制 AI IDE Prompt' : '复制 AI IDE 续接 Prompt'}
            </button>
            <button
              onClick={() => setShowAiPromptModal(!showAiPromptModal)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition"
              title="查看完整的 AI IDE 续接提示词"
            >
              {showAiPromptModal ? '返回词表' : '查看 Prompt'}
            </button>
          </div>
        </div>

        {/* AI IDE Prompt Viewer OR Table Preview */}
        {showAiPromptModal ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  其他 AI IDE 续接开发 Prompt (Netlify 部署 + Supabase 架构 · 免 Google/Gemini 依赖)
                </span>
                <button
                  onClick={handleCopyAiIdePrompt}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  {copiedType === 'ai_prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedType === 'ai_prompt' ? '已复制' : '复制全文'}
                </button>
              </div>
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap bg-slate-900/90 p-4 rounded-xl border border-slate-800 leading-relaxed overflow-x-auto select-all max-h-[50vh]">
                {aiIdePromptText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 space-y-4 print:p-0">
            <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">泰文</th>
                  <th className="p-3">朱拉音标 (Adapted IPA)</th>
                  <th className="p-3">中文释义</th>
                  <th className="p-3 hidden sm:table-cell">法味拆解 / 提示</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {uniqueWords.map((w, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-amber-300 text-base font-thai">
                      {w.thai}
                      {w.isCore && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          核心
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-cyan-300 font-medium">/{w.romanization}/</td>
                    <td className="p-3 text-slate-100 font-medium">{w.chinese}</td>
                    <td className="p-3 text-xs text-slate-400 hidden sm:table-cell">
                      {w.rootBreakdown || w.tip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-950/40">
          <span>共筛选出 {uniqueWords.length} 个词汇条目</span>
          <span>供养隆波法音共学课程 · 交付感满格</span>
        </div>
      </div>
    </div>
  );
};
