-- ==============================================================================
-- 泰学 · 安全升级脚本 (Security Upgrade)
-- 用法: 复制全部 -> Supabase SQL Editor -> RUN
-- 内容:
--   1) students 增加 password_hash 列 (注册/登录密码, 客户端 sha256 哈希+盐)
--   2) 新建 admin_credentials 表 (管理员密码哈希, 前端不可直接读写)
--   3) 两个 RPC 函数: verify_admin / change_admin_password (SECURITY DEFINER)
-- 幂等可重复执行
-- ==============================================================================

-- 1. 学员表增加密码哈希列 (幂等)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. 管理员凭据表：只存哈希，前端无任何密码可破解
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id TEXT PRIMARY KEY DEFAULT 'admin',
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS 全开：任何人都不允许通过表直连读写 (验证只能走 RPC 函数)
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_credentials FROM anon, authenticated;

-- 初始管理员密码哈希 = sha256("suan2026")，登录后台后请立即修改
INSERT INTO public.admin_credentials (id, password_hash)
VALUES ('admin', '6b4e062d0ba9ea6c3dc947fb7d1217e132e4d0d04cce877399589d89bbd8b517')
ON CONFLICT (id) DO NOTHING;

-- 3a. RPC: 验证管理员密码 (仅返回布尔, 不泄露任何信息)
CREATE OR REPLACE FUNCTION public.verify_admin(p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_credentials
    WHERE id = 'admin' AND password_hash = p_hash
  );
$$;

-- 3b. RPC: 修改管理员密码 (先比对旧哈希, 一致才更新)
CREATE OR REPLACE FUNCTION public.change_admin_password(p_old_hash TEXT, p_new_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_credentials
    WHERE id = 'admin' AND password_hash = p_old_hash
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.admin_credentials
  SET password_hash = p_new_hash, updated_at = now()
  WHERE id = 'admin';

  RETURN TRUE;
END;
$$;

-- 4. 允许匿名用户(前端)调用这两个 RPC 函数
GRANT EXECUTE ON FUNCTION public.verify_admin(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_admin_password(TEXT, TEXT) TO anon, authenticated;