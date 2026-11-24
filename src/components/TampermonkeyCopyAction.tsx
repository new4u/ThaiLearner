import React, { useState, useRef } from 'react';
import { Copy, Check, Code2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { copyTextReliable, fetchPureTampermonkeyScript } from '../utils/tampermonkeyScriptCopy';

interface TampermonkeyCopyActionProps {
  variant?: 'dark' | 'amber-solid' | 'amber-light' | 'amber-badge';
  label?: string;
  showSourceButton?: boolean;
  onCopiedSuccess?: (scriptText: string) => void;
}

export const TampermonkeyCopyAction: React.FC<TampermonkeyCopyActionProps> = ({
  variant = 'dark',
  label = '📋 复制油猴脚本 v1.1.1',
  showSourceButton = true,
  onCopiedSuccess,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [scriptText, setScriptText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadScript = async (): Promise<string> => {
    const text = await fetchPureTampermonkeyScript();
    setScriptText(text);
    return text;
  };

  const handleCopy = async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const text = await loadScript();
      const ok = await copyTextReliable(text);
      if (ok) {
        setStatus('copied');
        onCopiedSuccess?.(text);
        setTimeout(() => setStatus('idle'), 3500);
      } else {
        setStatus('error');
        setErrorMsg('当前浏览器限制了自动写入剪贴板，请点右侧「源码」框内手动全选复制');
        setShowSourceModal(true);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || '脚本获取失败');
    }
  };

  const handleOpenSource = async () => {
    setErrorMsg(null);
    if (!scriptText) {
      setStatus('loading');
      try {
        await loadScript();
        setStatus('idle');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.message || '脚本加载失败');
        return;
      }
    }
    setShowSourceModal(true);
  };

  const handleSelectAllInBox = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  };

  const buttonClass = (() => {
    switch (variant) {
      case 'amber-light':
        return 'px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer';
      case 'amber-badge':
        return 'px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition cursor-pointer';
      case 'amber-solid':
        return 'px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer';
      case 'dark':
      default:
        return 'px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer';
    }
  })();

  const sourceBtnClass =
    variant === 'amber-light'
      ? 'px-2 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer'
      : 'px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer';

  const lineCount = scriptText ? scriptText.split('\n').length : 0;

  return (
    <>
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={handleCopy}
          disabled={status === 'loading'}
          className={buttonClass}
          title="无需下载文件：直接复制纯 // ==UserScript== 脚本代码，打开 Tampermonkey 新建脚本粘贴保存即可"
        >
          {status === 'copied' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>已复制纯 JS！去油猴粘贴即可</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>{status === 'loading' ? '读取纯 JS 中...' : label}</span>
            </>
          )}
        </button>

        {showSourceButton && (
          <button
            type="button"
            onClick={handleOpenSource}
            className={sourceBtnClass}
            title="直接查看或手动全选复制 // ==UserScript== 纯 JS 源码（无需下载）"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>查看源码</span>
          </button>
        )}
      </div>

      {errorMsg && !showSourceModal && (
        <span className="text-[11px] text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </span>
      )}

      {showSourceModal && (
        <div
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowSourceModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-amber-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
              <div className="flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  油猴脚本源码 v1.1.1（纯 JS · 无需下载，直接复制到 Tampermonkey）
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSourceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2.5 bg-emerald-950/50 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  已验证：首行为 <code className="text-amber-300 font-mono">// ==UserScript==</code>，纯 JS 无任何 HTML/DOM
                  {lineCount > 0 ? ` · 共 ${lineCount} 行 · ${(scriptText.length / 1024).toFixed(0)} KB` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllInBox}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer"
                >
                  全选文本框
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1 cursor-pointer"
                >
                  {status === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{status === 'copied' ? '已复制全部源码！' : '一键复制全部源码'}</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] text-slate-300 leading-relaxed">
              安装步骤：① 浏览器打开 Tampermonkey → 点击「添加新脚本」 ② 全选清空默认内容 ③ 粘贴下方纯 JS 源码并 <code className="text-amber-300">Ctrl+S / Cmd+S</code> 保存，然后刷新 YouTube 页面即可。
            </div>

            {errorMsg && (
              <div className="px-4 py-2 bg-rose-950/60 border-b border-rose-500/30 text-[11px] text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="p-3 flex-1 min-h-0 flex">
              <textarea
                ref={textareaRef}
                readOnly
                value={scriptText}
                onFocus={(e) => e.currentTarget.select()}
                spellCheck={false}
                className="w-full h-[55vh] rounded-xl bg-slate-900 border border-slate-800 p-3 text-[11px] font-mono text-amber-100/95 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
