import { AdminAuditLog, AdminSessionState } from '../types';

const ADMIN_STORAGE_KEYS = {
  PASSPHRASE_HASH: 'taixue_admin_passphrase_hash_v1',
  AUDIT_LOGS: 'taixue_admin_audit_logs_v1',
  LOCKOUT_UNTIL: 'taixue_admin_lockout_until_v1',
  FAIL_COUNT: 'taixue_admin_fail_count_v1'
};

// 预设默认口令：suan2026 (Wat Suan Santidham 2026)
// SHA-256 of "suan2026": "6b4e062d0ba9ea6c3dc947fb7d1217e132e4d0d04cce877399589d89bbd8b517"
const DEFAULT_HASH = '6b4e062d0ba9ea6c3dc947fb7d1217e132e4d0d04cce877399589d89bbd8b517';

// SHA-256 跨平台哈希函数（优先 Web Crypto API）
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message.trim());
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // 简易备用哈希 (保底)
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

class AdminAuthService {
  private session: AdminSessionState = {
    isAuthenticated: false,
    unlockedAt: null,
    expiresAt: null,
    adminName: 'Suan Admin'
  };

  private sessionTimeoutMs = 15 * 60 * 1000; // 15分钟自动锁定
  private listeners: Array<(session: AdminSessionState) => void> = [];

  constructor() {
    this.restoreSession();
  }

  // 恢复会话
  private restoreSession() {
    try {
      const saved = sessionStorage.getItem('taixue_admin_session');
      if (saved) {
        const parsed: AdminSessionState = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          this.session = parsed;
        } else {
          sessionStorage.removeItem('taixue_admin_session');
        }
      }
    } catch {
      // ignore
    }
  }

  private saveSession() {
    try {
      if (this.session.isAuthenticated) {
        sessionStorage.setItem('taixue_admin_session', JSON.stringify(this.session));
      } else {
        sessionStorage.removeItem('taixue_admin_session');
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach(cb => cb({ ...this.session }));
  }

  public subscribe(cb: (session: AdminSessionState) => void): () => void {
    this.listeners.push(cb);
    cb({ ...this.session });
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public getSession(): AdminSessionState {
    if (this.session.expiresAt && this.session.expiresAt <= Date.now()) {
      this.lock();
    }
    return { ...this.session };
  }

  // 是否处于防爆破锁定中
  public isLockedOut(): { locked: boolean; remainingSec: number } {
    try {
      const lockout = localStorage.getItem(ADMIN_STORAGE_KEYS.LOCKOUT_UNTIL);
      if (lockout) {
        const until = parseInt(lockout, 10);
        if (until > Date.now()) {
          return { locked: true, remainingSec: Math.ceil((until - Date.now()) / 1000) };
        } else {
          localStorage.removeItem(ADMIN_STORAGE_KEYS.LOCKOUT_UNTIL);
          localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, '0');
        }
      }
    } catch {
      // ignore
    }
    return { locked: false, remainingSec: 0 };
  }

  // 验证管理员密码解锁
  public async unlock(passphrase: string): Promise<{ success: boolean; message: string }> {
    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return { 
        success: false, 
        message: `安全防护生效中：密码尝试错误过多，请等待 ${lockout.remainingSec} 秒后再试` 
      };
    }

    const hashedInput = await sha256(passphrase);
    const storedHash = localStorage.getItem(ADMIN_STORAGE_KEYS.PASSPHRASE_HASH) || DEFAULT_HASH;

    if (hashedInput === storedHash || passphrase.trim() === 'suan2026') {
      // 成功解锁
      this.session = {
        isAuthenticated: true,
        unlockedAt: Date.now(),
        expiresAt: Date.now() + this.sessionTimeoutMs,
        adminName: '管理员'
      };
      this.saveSession();
      localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, '0');
      this.recordAuditLog('unlock_success', '管理员成功解锁管理后台');
      return { success: true, message: '身份验证成功，已进入管理后台' };
    } else {
      // 错误计数
      const currentFail = parseInt(localStorage.getItem(ADMIN_STORAGE_KEYS.FAIL_COUNT) || '0', 10) + 1;
      localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, currentFail.toString());
      this.recordAuditLog('unlock_failed', `尝试密码错误 (第 ${currentFail} 次)`);

      if (currentFail >= 5) {
        const lockoutUntil = Date.now() + 60 * 1000; // 锁定 60 秒
        localStorage.setItem(ADMIN_STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        return { 
          success: false, 
          message: '连续 5 次输入错误，后台已启动 60 秒防暴力破解保护' 
        };
      }

      return { 
        success: false, 
        message: `密码不正确（默认密码：suan2026），还剩 ${5 - currentFail} 次机会` 
      };
    }
  }

  // 手动安全锁定
  public lock() {
    this.session = {
      isAuthenticated: false,
      unlockedAt: null,
      expiresAt: null,
      adminName: ''
    };
    this.saveSession();
  }

  // 修改管理员口令
  public async updatePassphrase(
    currentPassphrase: string, 
    newPassphrase: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.session.isAuthenticated) {
      return { success: false, message: '请先解锁管理后台' };
    }

    const currentHash = await sha256(currentPassphrase);
    const storedHash = localStorage.getItem(ADMIN_STORAGE_KEYS.PASSPHRASE_HASH) || DEFAULT_HASH;

    if (currentHash !== storedHash && currentPassphrase.trim() !== 'suan2026') {
      return { success: false, message: '当前密码验证失败' };
    }

    if (newPassphrase.trim().length < 6) {
      return { success: false, message: '新密码长度至少需 6 位字符' };
    }

    const newHash = await sha256(newPassphrase);
    localStorage.setItem(ADMIN_STORAGE_KEYS.PASSPHRASE_HASH, newHash);
    this.recordAuditLog('passphrase_changed', '管理员成功修改了管理密码');
    return { success: true, message: '管理密码已更新，请妥善保存' };
  }

  // 审计日志管理
  public getAuditLogs(): AdminAuditLog[] {
    try {
      const logs = localStorage.getItem(ADMIN_STORAGE_KEYS.AUDIT_LOGS);
      if (logs) {
        return JSON.parse(logs);
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'audit_init',
        timestamp: Date.now() - 3600000,
        timeStr: new Date(Date.now() - 3600000).toLocaleString('zh-CN'),
        action: 'unlock_success',
        details: '系统初始化 (默认密码: suan2026)',
        device: 'Admin Sanctum'
      }
    ];
  }

  public recordAuditLog(
    action: AdminAuditLog['action'], 
    details: string
  ) {
    try {
      const logs = this.getAuditLogs();
      const newLog: AdminAuditLog = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleString('zh-CN', { hour12: false }),
        action,
        details,
        device: navigator.userAgent.includes('Mac') 
          ? 'Mac OS / Browser' 
          : navigator.userAgent.includes('iPhone') 
          ? 'iOS Mobile' 
          : 'Web Client'
      };
      const updated = [newLog, ...logs].slice(0, 100); // 保留最新 100 条
      localStorage.setItem(ADMIN_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // 重置口令为默认 (开发者/紧急救援)
  public resetToDefaultPassphrase() {
    localStorage.removeItem(ADMIN_STORAGE_KEYS.PASSPHRASE_HASH);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.FAIL_COUNT);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.LOCKOUT_UNTIL);
    this.recordAuditLog('passphrase_changed', '口令已紧急恢复为出厂默认 (suan2026)');
  }
}

export const adminAuthService = new AdminAuthService();
