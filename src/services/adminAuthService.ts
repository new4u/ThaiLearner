import { AdminAuditLog, AdminSessionState } from '../types';
import { sha256 } from '../utils/hash';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const ADMIN_STORAGE_KEYS = {
  AUDIT_LOGS: 'taixue_admin_audit_logs_v1',
  LOCKOUT_UNTIL: 'taixue_admin_lockout_until_v1',
  FAIL_COUNT: 'taixue_admin_fail_count_v1'
};

class AdminAuthService {
  private session: AdminSessionState = {
    isAuthenticated: false,
    unlockedAt: null,
    expiresAt: null,
    adminName: '管理员'
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
   * 验证管理员密码 —— 凭据存在 Supabase 数据库，前端不存放任何密码。
   * 流程: sha256(密码) -> RPC verify_admin -> 返回布尔。
   */
  public async unlock(passphrase: string): Promise<{ success: boolean; message: string }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: false, message: '数据库尚未配置，管理后台暂不可用' };
    }

    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        success: false,
        message: `安全防护生效中：密码尝试错误过多，请等待 ${lockout.remainingSec} 秒后再试`
      };
    }

    const hashedInput = await sha256(passphrase);
    let verified = false;
    try {
      const { data, error } = await supabase.rpc('verify_admin', { p_hash: hashedInput });
      if (error) {
        if (error.code === '42883') {
          // 函数不存在 → 数据库未执行安全升级脚本
          return { success: false, message: '数据库尚未启用安全校验，请先在 SQL Editor 执行安全升级脚本' };
        }
        return { success: false, message: `验证服务异常: ${error.message}` };
      }
      verified = data === true;
    } catch (e: any) {
      return { success: false, message: `连接验证服务失败: ${e?.message || '网络异常'}` };
    }

    if (verified) {
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
      const currentFail = parseInt(localStorage.getItem(ADMIN_STORAGE_KEYS.FAIL_COUNT) || '0', 10) + 1;
      localStorage.setItem(ADMIN_STORAGE_KEYS.FAIL_COUNT, currentFail.toString());
      this.recordAuditLog('unlock_failed', `尝试密码错误 (第 ${currentFail} 次)`);

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
        message: `密码不正确，还剩 ${5 - currentFail} 次机会`
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