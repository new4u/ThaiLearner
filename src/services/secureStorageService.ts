import { RegisteredStudent, UserLoginLog, StudyCheckinRecord, PublicZenActivity } from '../types';
import { studentStudyService } from './studentStudyService';
import { adminAuthService } from './adminAuthService';

const SECURE_STORAGE_KEYS = {
  CONFIDENTIAL_VAULT_STUDENTS: 'taixue_vault_students_confidential',
  CONFIDENTIAL_VAULT_RECORDS: 'taixue_vault_records_confidential',
  CONFIDENTIAL_VAULT_LOGS: 'taixue_vault_logs_confidential',
  PUBLIC_ZEN_FEED: 'taixue_public_zen_feed_v1'
};

// 敏感信息脱敏过滤器 (前台保护)
export function maskContact(contact: string): string {
  if (!contact) return '未留联系方式';
  const clean = contact.trim();
  // 纯手机号格式 (11位)
  if (/^1\d{10}$/.test(clean)) {
    return clean.slice(0, 3) + '****' + clean.slice(7);
  }
  // 微信号格式
  if (clean.length > 4) {
    return clean.slice(0, 2) + '***' + clean.slice(-2);
  }
  return clean.slice(0, 1) + '***';
}

export function maskName(name: string): string {
  if (!name) return '同行学员';
  const clean = name.trim();
  if (clean.length <= 1) return clean;
  if (clean.length === 2) return clean[0] + '*';
  return clean[0] + '*'.repeat(clean.length - 2) + clean[clean.length - 1];
}

class SecureStorageService {
  constructor() {
    this.ensureInitialized();
  }

  // 初始化机密金库（从原有存储或预设无缝迁移）
  private ensureInitialized() {
    try {
      const existingStudents = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS);
      if (!existingStudents) {
        // 从 studentStudyService 迁移预设数据至独立机密库
        const currentList = studentStudyService.getAllStudents();
        localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS, JSON.stringify(currentList));
      }

      const existingRecords = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS);
      if (!existingRecords) {
        const records = studentStudyService.getAllStudyRecords();
        localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS, JSON.stringify(records));
      }

      const existingLogs = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_LOGS);
      if (!existingLogs) {
        const logs = studentStudyService.getAllLoginLogs();
        localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_LOGS, JSON.stringify(logs));
      }
    } catch (e) {
      console.error('Failed to initialize secure vault', e);
    }
  }

  // 1. 获取机密数据库学员总表（需已解锁管理权限）
  public getConfidentialStudents(): RegisteredStudent[] {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) {
      throw new Error('未授权访问：请先输入管理员密码解锁');
    }
    try {
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return studentStudyService.getAllStudents();
  }

  // 2. 获取机密学修流水与打卡打字明细
  public getConfidentialStudyRecords(): StudyCheckinRecord[] {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) {
      throw new Error('未授权访问：请先输入管理员密码解锁');
    }
    try {
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return studentStudyService.getAllStudyRecords();
  }

  // 3. 获取机密登录轨迹与设备日志
  public getConfidentialLoginLogs(): UserLoginLog[] {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) {
      throw new Error('未授权访问：请先输入管理员密码解锁');
    }
    try {
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return studentStudyService.getAllLoginLogs();
  }

  // 4. 同步保存机密数据
  public saveConfidentialStudent(student: RegisteredStudent) {
    try {
      let list = [];
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS);
      if (raw) list = JSON.parse(raw);
      const idx = list.findIndex((s: RegisteredStudent) => s.id === student.id);
      if (idx >= 0) {
        list[idx] = student;
      } else {
        list.unshift(student);
      }
      localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }

  public saveConfidentialRecord(record: StudyCheckinRecord) {
    try {
      let list = [];
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS);
      if (raw) list = JSON.parse(raw);
      list.unshift(record);
      localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS, JSON.stringify(list.slice(0, 500)));

      // 同时生成一条公开脱敏的禅修共学动态
      this.pushPublicZenActivity({
        id: `zen_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        maskedStudentName: maskName(record.studentName),
        activityType: record.type,
        summary: record.summary || record.notes || '完成了一次精进打卡',
        timeAgo: '刚刚',
        timestamp: Date.now(),
        streakDay: record.streakDay
      });
    } catch (e) {
      console.error(e);
    }
  }

  // 5. 管理员删除指定学员敏感数据
  public deleteStudentConfidential(studentId: string): boolean {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) return false;

    try {
      let students = this.getConfidentialStudents();
      students = students.filter(s => s.id !== studentId);
      localStorage.setItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS, JSON.stringify(students));

      adminAuthService.recordAuditLog('record_deleted', `管理员彻底删除了学员记录 [ID: ${studentId}]`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // 6. 前台公开共学动态流（全脱敏，绝不包含手机号/微信号）
  public getPublicZenFeed(): PublicZenActivity[] {
    try {
      const raw = localStorage.getItem(SECURE_STORAGE_KEYS.PUBLIC_ZEN_FEED);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }

    // 默认高质共学律动
    return [
      {
        id: 'zen_feed_1',
        maskedStudentName: '妙***士',
        activityType: 'word_mastery',
        summary: '掌握了核心巴利生词【สติ (正念/觉知)】',
        timeAgo: '5分钟前',
        timestamp: Date.now() - 300000,
        streakDay: 6
      },
      {
        id: 'zen_feed_2',
        maskedStudentName: '觉***者',
        activityType: 'daily_checkin',
        summary: '完成 2026-10-18 双视频听法 15 分钟，体会知者心独立',
        timeAgo: '18分钟前',
        timestamp: Date.now() - 1080000,
        streakDay: 4
      },
      {
        id: 'zen_feed_3',
        maskedStudentName: '同***修',
        activityType: 'keyboard_finish',
        summary: '在 Kedmanee 键盘实验室完成了【สัมมาสมาธิ】盲打打卡',
        timeAgo: '35分钟前',
        timestamp: Date.now() - 2100000,
        streakDay: 2
      },
      {
        id: 'zen_feed_4',
        maskedStudentName: '圆***明',
        activityType: 'video_milestone',
        summary: '精读第 12 句：以四念处离析五蕴实相',
        timeAgo: '1小时前',
        timestamp: Date.now() - 3600000,
        streakDay: 9
      }
    ];
  }

  public pushPublicZenActivity(activity: PublicZenActivity) {
    try {
      const feed = this.getPublicZenFeed();
      const updated = [activity, ...feed].slice(0, 50);
      localStorage.setItem(SECURE_STORAGE_KEYS.PUBLIC_ZEN_FEED, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  }

  // 7. 生成并下载 RFC 4180 兼容的机密完整 CSV 报表（带 UTF-8 BOM）
  public exportConfidentialCsv(): { success: boolean; filename: string; count: number } {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) {
      throw new Error('未授权：请先输入管理员密码解锁管理后台');
    }

    const students = this.getConfidentialStudents();
    const records = this.getConfidentialStudyRecords();

    // 格式化 CSV 单元格（转义双引号和逗号）
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // 表头定义
    const headers = [
      '学员ID',
      '学员姓名',
      '微信号/手机号',
      '身份角色',
      '泰语基础',
      '学习目标',
      '每日打卡承诺',
      '连续打卡天数',
      '累计打卡次数',
      '生词掌握数',
      '键盘打字次数',
      '听法研习时长(分钟)',
      '注册时间',
      '最近登录时间',
      '最近打卡日期',
      '最新学修心得'
    ];

    const rows = students.map(student => {
      // 匹配最近一次打卡心得
      const lastRecord = records.find(r => r.studentId === student.id);
      const noteSummary = lastRecord ? `${lastRecord.date}: ${lastRecord.notes || lastRecord.summary}` : '暂无提交心得';

      return [
        escapeCsv(student.id),
        escapeCsv(student.name),
        escapeCsv(student.wechatOrPhone),
        escapeCsv(student.role === 'ta' ? '助教/主持人' : student.role === 'guest' ? '随喜同行' : '正式学员'),
        escapeCsv(student.thaiLevel === 'zero' ? '零基础' : student.thaiLevel === 'beginner' ? '初学者' : '进阶'),
        escapeCsv(student.learningGoal),
        escapeCsv(student.dailyTarget),
        escapeCsv(student.streakDays),
        escapeCsv(student.totalCheckins),
        escapeCsv(student.wordsMasteredCount),
        escapeCsv(student.keyboardPracticeCount),
        escapeCsv(student.videoMinutesStudied),
        escapeCsv(student.registeredAt),
        escapeCsv(student.lastLoginAt),
        escapeCsv(student.lastCheckinDate || '未打卡'),
        escapeCsv(noteSummary)
      ].join(',');
    });

    // 拼接 UTF-8 BOM 标识 (\uFEFF) 确保 Excel/Numbers 打开中文绝不乱码
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `泰语共学学员打卡机密总表_${new Date().toISOString().slice(0, 10)}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    adminAuthService.recordAuditLog('data_exported', `管理员导出了包含 ${students.length} 名学员的机密 CSV 档案`);
    return { success: true, filename, count: students.length };
  }

  // 8. 重置机密金库为演示基准数据
  public resetToDemoData() {
    const session = adminAuthService.getSession();
    if (!session.isAuthenticated) return;
    localStorage.removeItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_STUDENTS);
    localStorage.removeItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_RECORDS);
    localStorage.removeItem(SECURE_STORAGE_KEYS.CONFIDENTIAL_VAULT_LOGS);
    this.ensureInitialized();
    adminAuthService.recordAuditLog('record_deleted', '管理员执行了金库数据重置为演示基准');
  }
}

export const secureStorageService = new SecureStorageService();
