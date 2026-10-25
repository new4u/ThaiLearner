-- ==============================================================================
-- 泰语尊者法谈共学平台 · 数据库初始化脚本 (One-Click Setup)
-- 使用方法：复制本脚本全部内容 -> 登录 Supabase 控制台 -> 进入 SQL Editor -> 粘贴并点击 RUN
-- 覆盖表: students / login_logs / study_records / study_progress
-- 本脚本幂等可重复执行，并会自动清理历史演示假数据
-- ==============================================================================

-- 0. 启用 UUID 扩展 (study_progress 主键使用)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 创建学员档案表 (students)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    wechat_or_phone TEXT NOT NULL,
    learning_goal TEXT DEFAULT '随喜参加泰语共学，听懂法音原声',
    thai_level TEXT DEFAULT 'zero',
    daily_target TEXT DEFAULT '每天精进共学 15 分钟',
    registered_at TEXT,
    last_login_at TEXT,
    login_count INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 1,
    last_checkin_date TEXT,
    total_checkins INTEGER DEFAULT 0,
    keyboard_practice_count INTEGER DEFAULT 0,
    words_mastered_count INTEGER DEFAULT 0,
    video_minutes_studied INTEGER DEFAULT 0,
    avatar_seed TEXT DEFAULT 'amber',
    role TEXT DEFAULT 'student',
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. 创建登录日志表 (login_logs)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    wechat_or_phone TEXT,
    timestamp BIGINT,
    time_str TEXT,
    action TEXT DEFAULT 'login',
    device TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. 创建学修与打卡流水表 (study_records)
CREATE TABLE IF NOT EXISTS public.study_records (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    date TEXT,
    time_str TEXT,
    streak_day INTEGER DEFAULT 1,
    notes TEXT,
    type TEXT DEFAULT 'daily_checkin',
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. 创建学习进度表 (study_progress, 前端 src/lib/supabase.ts 预留, 按 user_id+course_id 去重)
CREATE TABLE IF NOT EXISTS public.study_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT,
    course_id TEXT NOT NULL,
    current_sentence_index INTEGER DEFAULT 0,
    total_sentences INTEGER DEFAULT 0,
    completed_sentences JSONB DEFAULT '[]',
    thai_typing_wpm NUMERIC,
    thai_typing_accuracy NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, course_id)
);

-- 5. 开启行级安全策略 (Row Level Security)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

-- 6. 配置开放式共学 RLS 策略 (允许前端轻量免密注册与打卡读写)
DROP POLICY IF EXISTS "Public select students" ON public.students;
CREATE POLICY "Public select students" ON public.students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update students" ON public.students;
CREATE POLICY "Public insert/update students" ON public.students FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select login_logs" ON public.login_logs;
CREATE POLICY "Public select login_logs" ON public.login_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert login_logs" ON public.login_logs;
CREATE POLICY "Public insert login_logs" ON public.login_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public select study_records" ON public.study_records;
CREATE POLICY "Public select study_records" ON public.study_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update study_records" ON public.study_records;
CREATE POLICY "Public insert/update study_records" ON public.study_records FOR ALL USING (true);

DROP POLICY IF EXISTS "Public select study_progress" ON public.study_progress;
CREATE POLICY "Public select study_progress" ON public.study_progress FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update study_progress" ON public.study_progress;
CREATE POLICY "Public insert/update study_progress" ON public.study_progress FOR ALL USING (true);

-- 7. 清理历史演示假数据 (若曾在旧版脚本中插入过虚拟同修数据)
DELETE FROM public.students WHERE id LIKE 'stu_demo_%' OR name IN ('妙心居士', '觉知知者', '知行助教 (圆明)');
DELETE FROM public.login_logs WHERE id LIKE 'log_seed_%';
DELETE FROM public.study_records WHERE id LIKE 'rec_seed_%';