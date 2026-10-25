import { RegisteredStudent, UserLoginLog, StudyCheckinRecord } from '../types';
import { supabase, isSupabaseConfigured, SUPABASE_CONFIG_INFO } from './supabaseClient';

const STORAGE_KEYS = {
  STUDENTS: 'taixue_registered_students',
  CURRENT_ID: 'taixue_current_student_id',
  LOGIN_LOGS: 'taixue_login_logs',
  STUDY_RECORDS: 'taixue_study_records',
  LAST_SYNC: 'taixue_last_supabase_sync'
};

// 初始空学员数据（由用户真实打卡或录入产生，无虚拟假数据）
const INITIAL_STUDENTS: RegisteredStudent[] = [];
const INITIAL_LOGIN_LOGS: UserLoginLog[] = [];
const INITIAL_STUDY_RECORDS: StudyCheckinRecord[] = [];

class StudentStudyService {
  private syncListeners: Array<() => void> = [];

  public subscribeSync(listener: () => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.syncListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  private formatCurrentTime(): string {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  private getTodayDateStr(): string {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private getDeviceSummary(): string {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return '网页端';
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Safari (移动端)';
    if (/Android/i.test(ua)) return 'Android Chrome (移动端)';
    if (/Mac/i.test(ua)) return 'Mac Chrome (电脑端)';
    if (/Win/i.test(ua)) return 'Windows PC (电脑端)';
    return 'Web 客户端';
  }

  // 1. 获取所有真实注册学员 (自动清理遗留的虚拟假数据)
  public getAllStudents(): RegisteredStudent[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => s && s.id && !s.id.startsWith('stu_demo_') && s.name !== '妙心居士' && s.name !== '觉知知者');
          if (filtered.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
          }
          return filtered;
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  // 2. 获取当前登录学员
  public getCurrentStudent(): RegisteredStudent | null {
    try {
      const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_ID);
      if (currentId && currentId.startsWith('stu_demo_')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ID);
        return null;
      }
      const students = this.getAllStudents();
      if (currentId) {
        const found = students.find(s => s.id === currentId);
        if (found) return found;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 3. 免费注册新学员并自动登录 (同步更新本地与 Supabase)
  public registerStudent(params: {
    name: string;
    wechatOrPhone: string;
    learningGoal: string;
    thaiLevel?: 'zero' | 'beginner' | 'intermediate';
    dailyTarget?: string;
  }): RegisteredStudent {
    const nowStr = this.formatCurrentTime();
    const students = this.getAllStudents();

    const cleanWechat = params.wechatOrPhone.trim();
    const cleanName = params.name.trim();

    const existing = students.find(
      s => (cleanWechat && s.wechatOrPhone.toLowerCase() === cleanWechat.toLowerCase()) ||
           s.name === cleanName
    );

    if (existing) {
      return this.loginStudent(existing.wechatOrPhone || existing.name) || existing;
    }

    const newStudent: RegisteredStudent = {
      id: `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      wechatOrPhone: cleanWechat,
      learningGoal: params.learningGoal.trim() || '随喜参加泰语共学，听懂法音原声',
      thaiLevel: params.thaiLevel || 'zero',
      dailyTarget: params.dailyTarget || '每天精进共学 15 分钟',
      registeredAt: nowStr,
      lastLoginAt: nowStr,
      loginCount: 1,
      streakDays: 1,
      lastCheckinDate: undefined,
      totalCheckins: 0,
      keyboardPracticeCount: 0,
      wordsMasteredCount: 0,
      videoMinutesStudied: 0,
      avatarSeed: ['amber', 'emerald', 'sky', 'rose', 'indigo'][Math.floor(Math.random() * 5)],
      role: 'student'
    };

    const updated = [newStudent, ...students];
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
      localStorage.setItem(STORAGE_KEYS.CURRENT_ID, newStudent.id);
    } catch (e) {
      console.error(e);
    }

    // 写入注册登录日志
    this.addLoginLog({
      studentId: newStudent.id,
      studentName: newStudent.name,
      wechatOrPhone: newStudent.wechatOrPhone,
      action: 'register'
    });

    // 异步推送至 Supabase 云端
    this.pushStudentToSupabase(newStudent);

    return newStudent;
  }

  // 4. 学员登录 (支持微信号或姓名查找)
  public loginStudent(query: string): RegisteredStudent | null {
    const clean = query.trim().toLowerCase();
    if (!clean) return null;

    const students = this.getAllStudents();
    const student = students.find(
      s => s.wechatOrPhone.toLowerCase() === clean || s.name.toLowerCase() === clean || s.id === clean
    );

    if (!student) return null;

    const nowStr = this.formatCurrentTime();
    const updatedStudent: RegisteredStudent = {
      ...student,
      lastLoginAt: nowStr,
      loginCount: (student.loginCount || 0) + 1
    };

    const updatedList = students.map(s => s.id === student.id ? updatedStudent : s);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_KEYS.CURRENT_ID, updatedStudent.id);
    } catch (e) {
      console.error(e);
    }

    // 写入登录日志
    this.addLoginLog({
      studentId: updatedStudent.id,
      studentName: updatedStudent.name,
      wechatOrPhone: updatedStudent.wechatOrPhone,
      action: 'login'
    });

    // 异步推送至 Supabase
    this.pushStudentToSupabase(updatedStudent);

    return updatedStudent;
  }

  // 5. 退出当前登录
  public logoutStudent(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_ID);
    } catch (e) {
      console.error(e);
    }
  }

  // 6. 每日共学打卡
  public recordDailyCheckin(studentId: string, notes?: string): { student: RegisteredStudent; record: StudyCheckinRecord } | null {
    const students = this.getAllStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const today = this.getTodayDateStr();
    const nowStr = this.formatCurrentTime();
    const isAlreadyCheckedToday = student.lastCheckinDate === today;

    let newStreak = student.streakDays || 0;
    if (!isAlreadyCheckedToday) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

      if (student.lastCheckinDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const updatedStudent: RegisteredStudent = {
      ...student,
      lastCheckinDate: today,
      streakDays: isAlreadyCheckedToday ? student.streakDays : newStreak,
      totalCheckins: isAlreadyCheckedToday ? student.totalCheckins : (student.totalCheckins || 0) + 1
    };

    const updatedStudents = students.map(s => s.id === student.id ? updatedStudent : s);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    } catch (e) {
      console.error(e);
    }

    // 创建打卡记录
    const checkinRecord: StudyCheckinRecord = {
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: updatedStudent.id,
      studentName: updatedStudent.name,
      date: today,
      timeStr: nowStr,
      streakDay: updatedStudent.streakDays,
      notes: notes?.trim() || '随喜今日共学听法，保持清澈觉知。',
      type: 'daily_checkin',
      summary: `连续打卡第 ${updatedStudent.streakDays} 天 · 精进结缘`
    };

    this.addStudyRecord(checkinRecord);
    this.pushStudentToSupabase(updatedStudent);
    this.pushStudyRecordToSupabase(checkinRecord);

    return { student: updatedStudent, record: checkinRecord };
  }

  // 7. 记录各类学习动作 (键盘打卡完成、掌握生词、视频共学时长)
  public recordStudyEvent(
    studentId: string,
    type: 'keyboard_finish' | 'word_mastery' | 'video_milestone',
    summary: string,
    detailNotes?: string
  ): void {
    const students = this.getAllStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const today = this.getTodayDateStr();
    const nowStr = this.formatCurrentTime();

    const updatedStudent: RegisteredStudent = {
      ...student,
      keyboardPracticeCount: type === 'keyboard_finish' ? (student.keyboardPracticeCount || 0) + 1 : student.keyboardPracticeCount,
      wordsMasteredCount: type === 'word_mastery' ? (student.wordsMasteredCount || 0) + 1 : student.wordsMasteredCount,
      videoMinutesStudied: type === 'video_milestone' ? (student.videoMinutesStudied || 0) + 5 : student.videoMinutesStudied
    };

    const updatedStudents = students.map(s => s.id === student.id ? updatedStudent : s);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    } catch (e) {
      console.error(e);
    }

    const studyRecord: StudyCheckinRecord = {
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      studentName: student.name,
      date: today,
      timeStr: nowStr,
      streakDay: student.streakDays,
      notes: detailNotes || summary,
      type: type,
      summary: summary
    };

    this.addStudyRecord(studyRecord);
    this.pushStudentToSupabase(updatedStudent);
    this.pushStudyRecordToSupabase(studyRecord);
  }

  // 8. 获取所有登录记录
  public getAllLoginLogs(): UserLoginLog[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGIN_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(l => l && l.id && !l.id.startsWith('log_seed_'));
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private addLoginLog(entry: {
    studentId: string;
    studentName: string;
    wechatOrPhone: string;
    action: 'register' | 'login' | 'auto_login';
  }): void {
    const logs = this.getAllLoginLogs();
    const newLog: UserLoginLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: entry.studentId,
      studentName: entry.studentName,
      wechatOrPhone: entry.wechatOrPhone,
      timestamp: Date.now(),
      timeStr: this.formatCurrentTime(),
      action: entry.action,
      device: this.getDeviceSummary()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    try {
      localStorage.setItem(STORAGE_KEYS.LOGIN_LOGS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    this.pushLoginLogToSupabase(newLog);
  }

  // 9. 获取学习与打卡记录
  public getAllStudyRecords(): StudyCheckinRecord[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(r => r && r.id && !r.id.startsWith('rec_seed_') && r.studentName !== '妙心居士');
        }
      }
      return [];
    } catch {
      return [];
    }
  }

  private addStudyRecord(record: StudyCheckinRecord): void {
    const records = this.getAllStudyRecords();
    const updated = [record, ...records].slice(0, 200);
    try {
      localStorage.setItem(STORAGE_KEYS.STUDY_RECORDS, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }

  // ========================================================================
  // Supabase 异步后台静默数据同步与容灾机制 (Graceful Sync)
  // ========================================================================

  public async syncWithSupabase(): Promise<{ success: boolean; message: string; count?: number }> {
    if (!supabase || !isSupabaseConfigured()) {
      return { success: false, message: 'Supabase 尚未配置或处于离线模式' };
    }

    try {
      // 1. 同步学员列表
      const { data: dbStudents, error: stuError } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (stuError) {
        if (stuError.code === '42P01') {
          return { success: false, message: 'Supabase 数据表尚未创建，请在 SQL Editor 执行初始化脚本' };
        }
        return { success: false, message: `同步学员失败: ${stuError.message}` };
      }

      if (Array.isArray(dbStudents) && dbStudents.length > 0) {
        const mappedStudents: RegisteredStudent[] = dbStudents.map((row: any) => ({
          id: row.id,
          name: row.name,
          wechatOrPhone: row.wechat_or_phone || '',
          learningGoal: row.learning_goal || '',
          thaiLevel: row.thai_level || 'zero',
          dailyTarget: row.daily_target || '',
          registeredAt: row.registered_at || '',
          lastLoginAt: row.last_login_at || '',
          loginCount: row.login_count || 1,
          streakDays: row.streak_days || 1,
          lastCheckinDate: row.last_checkin_date || undefined,
          totalCheckins: row.total_checkins || 0,
          keyboardPracticeCount: row.keyboard_practice_count || 0,
          wordsMasteredCount: row.words_mastered_count || 0,
          videoMinutesStudied: row.video_minutes_studied || 0,
          avatarSeed: row.avatar_seed || 'amber',
          role: row.role || 'student'
        }));

        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mappedStudents));
      }

      // 2. 同步登录日志
      const { data: dbLogs } = await supabase
        .from('login_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (Array.isArray(dbLogs) && dbLogs.length > 0) {
        const mappedLogs: UserLoginLog[] = dbLogs.map((row: any) => ({
          id: row.id,
          studentId: row.student_id,
          studentName: row.student_name,
          wechatOrPhone: row.wechat_or_phone,
          timestamp: row.timestamp,
          timeStr: row.time_str,
          action: row.action,
          device: row.device
        }));
        localStorage.setItem(STORAGE_KEYS.LOGIN_LOGS, JSON.stringify(mappedLogs));
      }

      // 3. 同步学修记录
      const { data: dbRecords } = await supabase
        .from('study_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (Array.isArray(dbRecords) && dbRecords.length > 0) {
        const mappedRecords: StudyCheckinRecord[] = dbRecords.map((row: any) => ({
          id: row.id,
          studentId: row.student_id,
          studentName: row.student_name,
          date: row.date,
          timeStr: row.time_str,
          streakDay: row.streak_day,
          notes: row.notes,
          type: row.type,
          summary: row.summary
        }));
        localStorage.setItem(STORAGE_KEYS.STUDY_RECORDS, JSON.stringify(mappedRecords));
      }

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      this.notifyListeners();

      return { 
        success: true, 
        message: '已成功从 Supabase 云端拉取最新共学数据',
        count: dbStudents?.length || 0 
      };
    } catch (e: any) {
      console.warn('Supabase sync warning:', e);
      return { success: false, message: e?.message || '连接超时或网络受限，已切换为本地存储' };
    }
  }

  private async pushStudentToSupabase(student: RegisteredStudent): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;
    try {
      await supabase.from('students').upsert({
        id: student.id,
        name: student.name,
        wechat_or_phone: student.wechatOrPhone,
        learning_goal: student.learningGoal,
        thai_level: student.thaiLevel,
        daily_target: student.dailyTarget,
        registered_at: student.registeredAt,
        last_login_at: student.lastLoginAt,
        login_count: student.loginCount,
        streak_days: student.streakDays,
        last_checkin_date: student.lastCheckinDate || null,
        total_checkins: student.totalCheckins,
        keyboard_practice_count: student.keyboardPracticeCount,
        words_mastered_count: student.wordsMasteredCount,
        video_minutes_studied: student.videoMinutesStudied,
        avatar_seed: student.avatarSeed,
        role: student.role
      });
    } catch (err) {
      console.warn('Push student error:', err);
    }
  }

  private async pushLoginLogToSupabase(log: UserLoginLog): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;
    try {
      await supabase.from('login_logs').insert({
        id: log.id,
        student_id: log.studentId,
        student_name: log.studentName,
        wechat_or_phone: log.wechatOrPhone,
        timestamp: log.timestamp,
        time_str: log.timeStr,
        action: log.action,
        device: log.device
      });
    } catch (err) {
      console.warn('Push login log error:', err);
    }
  }

  private async pushStudyRecordToSupabase(record: StudyCheckinRecord): Promise<void> {
    if (!supabase || !isSupabaseConfigured()) return;
    try {
      await supabase.from('study_records').insert({
        id: record.id,
        student_id: record.studentId,
        student_name: record.studentName,
        date: record.date,
        time_str: record.timeStr,
        streak_day: record.streakDay,
        notes: record.notes,
        type: record.type,
        summary: record.summary
      });
    } catch (err) {
      console.warn('Push study record error:', err);
    }
  }

  public getSupabaseInfo() {
    return {
      ...SUPABASE_CONFIG_INFO,
      isConfigured: isSupabaseConfigured(),
      lastSyncTime: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.LAST_SYNC) : null
    };
  }
}

export const studentStudyService = new StudentStudyService();
