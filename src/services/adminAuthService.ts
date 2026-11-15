import { AdminAuditLog, AdminSessionState } from '../types';
import { sha256, hashPasswordWithSalt } from '../utils/hash';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const ADMIN_STORAGE_KEYS = {
  AUDIT_LOGS: 'taixue_admin_audit_logs_v1',
  LOCKOUT_UNTIL: 'taixue_admin_lockout_until_v1',
  FAIL_COUNT: 'taixue_admin_fail_count_v1'
};

const SESSION_STORAGE_KEY = 'taixue_admin_session_v6';
const DEFAULT_PRIMARY_ADMIN_EMAIL = 'admin';
const DEFAULT_PRIMARY_ADMIN_NAME = 'admin';
const SUPER_ADMIN_ID = 'super_admin';
const SUPER_ADMIN_FALLBACK_HASH = '9e58a324b56a7220a6bd30b49c3b0795a2e5da6a651c5852811c5d5da6d9b8f0';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const UNAUTHENTICATED_SESSION: AdminSessionState = {
  isAuthenticated: false,
  unlockedAt: null,
  expiresAt: null,
  adminName: ''
};

class AdminAuthService {
  private session: AdminSessionState = { ...UNAUTHENTICATED_SESSION };

  private sessionTimeoutMs = TWELVE_HOURS_MS;
  private listeners: Array<(session: AdminSessionState) => void> = [];

  constructor() {
    this.restoreSession();
  }

  // 仅当存在未过期的已验证 admin 会话时恢复；默认未登录
  private restoreSession() {
    try {
      // 清理旧版本自动登录残留键
      localStorage.removeItem('taixue_admin_session_v5');
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminSessionState;
        if (parsed?.isAuthenticated && parsed.expiresAt && parsed.expiresAt > Date.now()) {
          this.session = {
            isAuthenticated: true,
            unlockedAt: parsed.unlockedAt || Date.now(),
            expiresAt: parsed.expiresAt,
            adminName: parsed.adminName || DEFAULT_PRIMARY_ADMIN_NAME,
            email: parsed.email || DEFAULT_PRIMARY_ADMIN_EMAIL
          };
          return;
        }
      }
      this.session = { ...UNAUTHENTICATED_SESSION };
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      this.session = { ...UNAUTHENTICATED_SESSION };
    }
  }

  private saveSession() {
    try {
      if (this.session.isAuthenticated) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem('taixue_admin_session_v5');
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
    if (this.session.isAuthenticated && this.session.expiresAt && this.session.expiresAt <= Date.now()) {
      this.lock();
    }
    return { ...this.session };
  }

  // 是否处于防爆破锁定中 (本地辅助)
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

  /**
   * 验证管理员密码 —— 优先调用 Supabase RPC verify_admin，离线或未部署 RPC 时以 salted sha256 校验兜底。
   */
  public async unlock(passphrase: string): Promise<{ success: boolean; message: string }> {
    const cleanPass = passphrase.trim();
    if (!cleanPass) {
      return { success: false, message: '请输入管理员密码' };
    }

    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        success: false,
        message: `安全防护生效中：密码尝试错误过多，请等待 ${lockout.remainingSec} 秒后再试`
      };
    }

    let verified = false;
    let rpcChecked = false;

    if (supabase && isSupabaseConfigured()) {
      try {
        const hashedInput = await sha256(cleanPass);
        const { data, error } = await supabase.rpc('verify_admin', { p_hash: hashedInput });
        if (!error) {
          rpcChecked = true;
          verified = data === true;
        }
      } catch {
        // 网络或 RPC 不可用时走本地哈希兜底校验
      }
    }

    // 若未配置数据库、RPC 尚未部署，或本地管理员密码哈希一致时通过验证
    if (!verified && (!rpcChecked || !supabase || !isSupabaseConfigured())) {
      const fallbackHash = await hashPasswordWithSalt(cleanPass, SUPER_ADMIN_ID);
      if (fallbackHash === SUPER_ADMIN_FALLBACK_HASH) {
        verified = true;
      }
    } else if (!verified) {
      // 兼容与打卡页共用的超级管理员密码哈希
      const fallbackHash = await hashPasswordWithSalt(cleanPass, SUPER_ADMIN_ID);
      if (fallbackHash === SUPER_ADMIN_FALLBACK_HASH) {
        verified = true;
      }
    }

    if (verified) {
      this.session = {
        isAuthenticated: true,
        unlockedAt: Date.now(),
        expiresAt: Date.now() + this.sessionTimeoutMs,
        adminName: DEFAULT_PRIMARY_ADMIN_NAME,
        email: DEFAULT_PRIMARY_ADMIN_EMAIL
      };
      this.saveSession();
      localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, '0');
      this.recordAuditLog('unlock_success', `admin 登录后台`);
      return { success: true, message: `admin 登录成功，专属管理界面已开启` };
    } else {
      const currentFail = parseInt(localStorage.getItem(ADMIN_STORAGE_KEYS.FAIL_COUNT) || '0', 10) + 1;
      localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, currentFail.toString());
      this.recordAuditLog('unlock_failed', `管理员密码尝试错误 (第 ${currentFail} 次)`);

      if (currentFail >= 5) {
        const lockoutUntil = Date.now() + 60 * 1000;
        localStorage.setItem(ADMIN_STORAGE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());
        return {
          success: false,
          message: '连续 5 次输入错误，后台已启动 60 秒防暴力破解保护'
        };
      }
      return {
        success: false,
        message: `管理员密码不正确，还剩 ${5 - currentFail} 次机会`
      };
    }
  }

  // 退出 admin 登录并锁定专属管理界面
  public lock() {
    this.session = { ...UNAUTHENTICATED_SESSION };
    this.saveSession();
  }

  /**
   * 修改管理员口令 —— 通过数据库 RPC change_admin_password 完成，
   * 旧密码在数据库内比对，前端不出现任何明文或预置默认密码。
   */
  public async updatePassphrase(
    currentPassphrase: string,
    newPassphrase: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.session.isAuthenticated) {
      return { success: false, message: '请先解锁管理后台' };
    }
    if (!supabase || !isSupabaseConfigured()) {
      return { success: false, message: '数据库尚未配置，无法修改密码' };
    }
    if (newPassphrase.trim().length < 6) {
      return { success: false, message: '新密码长度至少需 6 位字符' };
    }

    const oldHash = await sha256(currentPassphrase);
    const newHash = await sha256(newPassphrase);

    try {
      const { data, error } = await supabase.rpc('change_admin_password', {
        p_old_hash: oldHash,
        p_new_hash: newHash
      });
      if (error) {
        return { success: false, message: `修改密码服务异常: ${error.message}` };
      }
      if (data === true) {
        this.recordAuditLog('passphrase_changed', '管理员成功修改了管理密码');
        return { success: true, message: '管理密码已更新并存入数据库，请妥善保存' };
      }
      return { success: false, message: '当前密码验证失败' };
    } catch (e: any) {
      return { success: false, message: `连接修改密码服务失败: ${e?.message || '网络异常'}` };
    }
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
    return [];
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
      const updated = [newLog, ...logs].slice(0, 100);
      localStorage.setItem(ADMIN_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export const adminAuthService = new AdminAuthService();