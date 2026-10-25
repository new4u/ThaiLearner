-- ==============================================================================
-- 泰语尊者法谈共学平台 · Supabase 数据表初始化脚本 (One-Click Setup)
-- 使用方法：复制本脚本全部内容 -> 登录 Supabase 控制台 -> 进入 SQL Editor -> 粘贴并点击 RUN
-- ==============================================================================

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

-- 4. 开启行级安全策略 (Row Level Security)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_records ENABLE ROW LEVEL SECURITY;

-- 5. 配置开放式共学 RLS 策略 (允许前端轻量免密注册与打卡读写)
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

-- 6. 插入共学示范同修数据
INSERT INTO public.students (id, name, wechat_or_phone, learning_goal, thai_level, daily_target, registered_at, last_login_at, login_count, streak_days, last_checkin_date, total_checkins, keyboard_practice_count, words_mastered_count, video_minutes_studied, avatar_seed, role)
VALUES 
    ('stu_demo_1', '妙心居士', 'miaoxin_dhamma', '能够听懂尊者实况开示中关于五蕴、正定与知者心的巴利核心法词', 'beginner', '每天打卡 20 分钟 · 练习泰语键盘打卡', '2026-10-18 19:30', '2026-10-23 09:15', 14, 6, '2026-10-23', 14, 42, 38, 185, 'amber', 'student'),
    ('stu_demo_2', '觉知知者', 'sati_watcher_88', '零基础从头学，想在今年年底去泰国 Wat Suan Santidham 禅修参访', 'zero', '每天跟读 10 句泰文双语字幕', '2026-10-19 20:00', '2026-10-22 21:40', 9, 4, '2026-10-22', 9, 26, 19, 120, 'emerald', 'student'),
    ('stu_demo_3', '知行助教 (圆明)', 'yuanming_ta', '带读共学班主持人，熟练掌握 746 句朱拉音标与巴利词源', 'intermediate', '主持每周二、四共学双视频放映', '2026-10-15 14:00', '2026-10-23 10:00', 28, 9, '2026-10-23', 28, 88, 75, 320, 'indigo', 'ta')
ON CONFLICT (id) DO NOTHING;

-- 插入共学示范打卡与日志
INSERT INTO public.login_logs (id, student_id, student_name, wechat_or_phone, timestamp, time_str, action, device)
VALUES 
    ('log_seed_1', 'stu_demo_3', '知行助教 (圆明)', 'yuanming_ta', 1792750000000, '2026-10-23 08:10:22', 'login', 'Mac OS Chrome (网页端)'),
    ('log_seed_2', 'stu_demo_1', '妙心居士', 'miaoxin_dhamma', 1792742800000, '2026-10-23 06:15:30', 'login', 'iOS Safari (移动端)')
ON CONFLICT (id) DO NOTHING;
