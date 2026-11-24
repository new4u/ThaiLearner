let cachedScriptText: string | null = null;

/**
 * 拉取并严格校验油猴脚本原文，确保首行即为 `// ==UserScript==` 的纯 JS 源码，
 * 绝不把预览容器返回的重定向 HTML/DOM 页面误复制到剪贴板。
 */
export async function fetchPureTampermonkeyScript(): Promise<string> {
  if (cachedScriptText) {
    return cachedScriptText;
  }

  const endpoints = ['/api/tampermonkey-script?v=1.1.1', '/tools/taixue-youtube-cc.user.js?v=1.1.1'];
  let lastError: string | null = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        lastError = `${url} returned HTTP ${res.status}`;
        continue;
      }
      const raw = (await res.text()).replace(/^\uFEFF/, '');
      const trimmed = raw.trimStart();
      if (trimmed.startsWith('<') || /<!doctype|<html|<head|<body/i.test(trimmed.slice(0, 300))) {
        lastError = `${url} 返回了网页 HTML/DOM 内容而非纯 JS 脚本`;
        continue;
      }
      if (!trimmed.startsWith('// ==UserScript==')) {
        lastError = `${url} 开头不是标准 // ==UserScript== 头`;
        continue;
      }
      cachedScriptText = raw;
      return raw;
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(lastError || '无法读取油猴脚本纯文本源码');
}

/**
 * 兼容 iframe / 受限剪贴板策略的可靠纯文本复制
 */
export async function copyTextReliable(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to textarea + execCommand
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
