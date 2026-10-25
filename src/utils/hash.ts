/**
 * SHA-256 跨平台哈希工具
 * 优先使用 Web Crypto API (crypto.subtle)，旧环境降级为简易 FNV 风格哈希。
 * 用于密码哈希：在客户端计算 hash = sha256(password + '::' + salt)，数据库仅存储哈希。
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message.trim());
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // 简易备用哈希 (保底，不应用于高安全场景)
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/** 带盐密码哈希：salt 直接附加在密码后，避免相同密码产生相同哈希 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  return sha256(`${password}::${salt}`);
}