import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 环境变量配置 (请在 Netlify / .env 中配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// 创建单例 Supabase 客户端 (若未配置环境变量，提供安全空客户端避免报错)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 学习进度与打字打卡数据结构
 */
export interface StudyProgressRecord {
  id?: string;
  user_id?: string;
  course_id: string;
  current_sentence_index: number;
  total_sentences: number;
  completed_sentences?: number[];
  thai_typing_wpm?: number;
  thai_typing_accuracy?: number;
  updated_at?: string;
}

/**
 * 示例辅助函数：保存学员共学与打字进度到 Supabase
 */
export async function saveStudyProgressToSupabase(record: StudyProgressRecord) {
  if (!supabase) {
    // 未配置 Supabase 时降级静默保存至 LocalStorage
    try {
      localStorage.setItem(`study_progress_${record.course_id}`, JSON.stringify(record));
    } catch {
      // ignore
    }
    return { data: null, error: null, isOfflineFallback: true };
  }

  try {
    const { data, error } = await supabase
      .from('study_progress')
      .upsert({
        ...record,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,course_id' })
      .select();

    return { data, error, isOfflineFallback: false };
  } catch (err: any) {
    console.warn('Supabase save error:', err);
    return { data: null, error: err, isOfflineFallback: true };
  }
}

/**
 * 示例辅助函数：从 Supabase 读取学员共学进度
 */
export async function getStudyProgressFromSupabase(courseId: string, userId?: string) {
  if (!supabase) {
    try {
      const saved = localStorage.getItem(`study_progress_${courseId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  try {
    const query = supabase
      .from('study_progress')
      .select('*')
      .eq('course_id', courseId);
    
    if (userId) {
      query.eq('user_id', userId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}
