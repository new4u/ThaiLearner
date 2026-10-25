import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 读取环境变量，兼顾 Vite 标准前缀与用户 Next.js 风格前缀，并内置用户提供的默认配置
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_URL || 
  'https://nvuenxamivfnrqelfsnx.supabase.co';

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (import.meta.env as any).NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  'sb_publishable_fFz4e-rajNtsCiXtng2Sqw_VX7M96LH';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL && 
    SUPABASE_URL.startsWith('https://') && 
    SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY.length > 10
  );
};

// 导出单例 Supabase 客户端
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

export const SUPABASE_CONFIG_INFO = {
  url: SUPABASE_URL,
  projectId: SUPABASE_URL ? SUPABASE_URL.replace('https://', '').split('.')[0] : '',
  isConfigured: isSupabaseConfigured()
};
