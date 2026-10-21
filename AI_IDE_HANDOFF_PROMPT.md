# 泰法语声闻共学工作台 · AI IDE 完整接盘与生产部署 Prompt

> **使用指南**：将本文档内容完整复制，直接粘贴到 **Cursor / Windsurf / Claude Code / Bolt / Lovable** 等 AI IDE 的首条提示词对话框中，让其无缝接管本项目，完成 Netlify 生产部署与 Supabase 数据库集成。

---

```markdown
# 任务目标：接管并完成《泰法语声闻共学工作台》在 Netlify 平台的生产级部署与 Supabase 数据持久化

你现在是一名资深全栈工程师与前端架构师。请完整接管当前代码库，根据以下业务规范、技术架构约束与部署需求，完成项目的后续工程化改造。

---

## 一、核心业务规范与底线原则（必须 100% 遵守，违背即判定失败）

1. **统一品牌与课程命名**：
   - 全项目命名为**“泰法语声闻共学工作台”**，对外共学体系统一命名为**“泰语声闻共学”**。
   - 彻底不向学员暴露 “Language Reactor”，所有功能与工作流统一称为**“泰法语声闻共学 AI 工作流”**或**“声闻课件”**。
2. **尊称规范（严禁变更）**：
   - 尊者称谓一律统一使用**“隆波”**（如：隆波帕默尊者、隆波原声、隆波开示、隆波法语）。严禁使用“师傅/师父”等称呼。
3. **官方出处规范（严禁拼错）**：
   - 官方网站出处统一为 **`dhamma.com`**。严禁出现 `dama.cn` 或 `dhamma .cn` 等错误拼写。
4. **禁用词（严格过滤）**：
   - 全项目中严禁出现单词 **“aids”** 或 **“AIDS”**。统一使用“声闻共学引擎”、“辅助系统”或“工具流”。
5. **严禁复读机功能（严格遵照）**：
   - 彻底移除复读机循环逻辑，纯粹聚焦在“声闻课件研读流”与“实时听闻看板”。
6. **统一宣传金句与办学规程**：
   - **主标题**：像玩通关游戏一样听懂隆波开示 · 玩转实战泰语
   - **核心副标/Slogan**：每周仅需 1 小时，对治“想学泰语又学不动”的困境，把隆波的殊胜法语映入日常生活。
   - **办学收费**：每个月 100 元；在一个季度内全勤者，这 100 元顺延到下个月免费续学；非全勤者作为支持共修成本的随喜供养。
   - **1小时共学节奏**：前半小时（30分钟）纯盲听抓耳觉知测试 + 后半小时（30分钟）大字双语逐句精析与发音试听。
   - **现代学法理念**：不考死记硬背手写泰文，只要会听、会音标、能用 Kedmanee 泰语键盘在微信群或聊天室打出来即可。

---

## 二、音标核心宪法：朱拉隆功大学 8 大音标原则（Adapted IPA）

系统内的泰语音标必须严格遵循朱拉隆功大学《Communicative Thai for Foreigners》课程标准，严禁混入 RTGS、Paiboon 或英语式拼写（如严禁使用 ja, ch, oo 代替标准音标）：
1. **只用 Adapted IPA 标注**：格式为：泰文 → /音标/（意思）。音节用空格隔开，复合词用连字符 `-` 连接。
2. **元音系统（区分长短）**：
   - 短元音：a [อะ]、i [ิ]、ɯ [ึ]、u [ุ]、e [เ◌ะ]、ɛ [แ◌ะ]、o [โ◌ะ]、ɔ [เ◌าะ]、ə [เ◌อะ]
   - 长元音（必须带冒号 ː）：aː [า]、iː [ี]、ɯː [ื]、uː [ู]、eː [เ◌]、ɛː [แ◌]、oː [โ◌]、ɔː [อ]、əː [เ◌อ]
   - 双元音：ia [เ◌ีย]、ɯa [เ◌ือ]、ua [◌ัว]；特殊元音：am [◌ำ]、aj [ไ◌/ใ◌]、aw [เ◌า]
3. **辅音系统（21个初始音 + 8个结尾音）**：
   - 初始音：ʔ (声门塞音), h, k, kʰ, ŋ, j, c, cʰ, l, r, t, d, tʰ, s, n, f, p, b, pʰ, m, w
   - 结尾塞/鼻音（不释放）：-k, -t, -p, -n, -ŋ, -m, -j, -w。辅音群（kr, kl, kw, kʰr）连写。
4. **声调系统（5声调打在主要元音上）**：
   - 中调：不标（平调）
   - 低调：` (grave) 如 à
   - 高调：´ (acute) 如 á
   - 降调：ˆ (circumflex) 如 â
   - 升调：ˇ (caron) 如 ǎ
   - 礼貌词固定：ครับ = kʰráp，ค่ะ = kʰâ。
5. **连读与零幻觉**：保留自然语流，遇到不确定词标 `[?]`，严禁自由发挥或听音猜测。

---

## 三、Language Reactor (LR) 官方导出规范与课件双向流

本项目通过无外部视频依赖的课件流实现高可靠性：
1. **LR 导出格式标准**：
   - LR 的 “Export to Excel (saved_items.csv)” 实际上是 **TSV（制表符分隔）** 格式。
   - 列格式规范：
     - Column 1: 泰语原词/句子 (Phrase / Target Language)
     - Column 2: 中文释义 (Translation)
     - Column 3: 罗马音/朱拉 Adapted IPA (Transliteration / Romanization)
     - Column 4: 上下文/时间戳/法义笔记 (Context / Timestamp / Notes)
2. **群分享与一键导入闭环**：
   - 主持人可在后台或工作台中一键复制“微信群排版文本”发送给同修；
   - 同修在微信长按复制后，打开本工作台点击【一键导入】，内置解析器自动根据制表符/换行完成解析并映射为研读课件；
   - 亦支持一键导出标准 TSV 文件，可直接用 Excel 或 Numbers 打开。

---

## 四、Netlify 部署规范（绝对严禁预设任何 Google / Gemini API）

### 1. 彻底移除 Google / Gemini API 预设
- 本项目严禁在前端或部署配置中硬编码任何 Google Cloud、Gemini API、Google GenAI SDK 的鉴权依赖。
- 系统所有分词、音标标注和词典查询**默认全部走前端纯离线词库与规则引擎**（`src/utils/lrFormatParser.ts`）。
- 后续如需接入大模型功能，采用标准的 **Netlify Serverless Functions** 代理或用户自主配置的 OpenAI/DeepSeek 兼容端点，通过服务端环境变量注入，严禁在前端泄露 Key。

### 2. Netlify 生产部署配置文件 (`netlify.toml`)
在项目根目录创建或补全 `netlify.toml`，确保 SPA 路由与构建正常：
```toml
[build]
  command = "npm run build"
  publish = "dist"

# 解决 React 单页应用刷新 404
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

---

## 五、Supabase 数据库架构设计与全套 DDL

为了让学员的登录状态、打卡考勤、Sati 觉知记录、生词本、自定义课件以及 Zoom 会议链接在多设备间实时同步，请使用 **Supabase (PostgreSQL)** 进行持久化存储。

### 1. Supabase SQL DDL 建表脚本（在 Supabase SQL Editor 中执行）
```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 学员档案表 (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dharma_name TEXT NOT NULL,                  -- 学员法名/称谓 (如: 法喜师兄)
  phone_or_wechat TEXT,                       -- 手机号/微信 (用于考勤核对)
  role TEXT DEFAULT 'student',                 -- 角色: student(学员) / ta(带读助教) / guest
  attended_classes INT DEFAULT 0,              -- 累计共学课次
  streak_days INT DEFAULT 0,                   -- 连续打卡天数
  is_full_attendance_this_quarter BOOLEAN DEFAULT true, -- 本季度是否全勤 (享受100元顺延)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sati 听法觉知打卡记录表 (sati_records)
CREATE TABLE IF NOT EXISTS public.sati_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  total_seconds INT NOT NULL DEFAULT 0,        -- 听法时长(秒)
  total_captured INT NOT NULL DEFAULT 0,       -- 觉知捕获总数
  sati_count INT NOT NULL DEFAULT 0,           -- Sati (正念) 次数
  phuru_count INT NOT NULL DEFAULT 0,          -- Phu Ru (知者) 次数
  long_count INT NOT NULL DEFAULT 0,           -- Long (走神) 次数
  samma_count INT NOT NULL DEFAULT 0,          -- Sammā (正定) 次数
  report_text TEXT,                            -- 生成的打卡文案备份
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 课件文稿表 (course_lessons)
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,                         -- 课件标题 (如: 第1期·正定与邪定)
  speaker TEXT DEFAULT '隆波帕默尊者',
  source TEXT DEFAULT 'dhamma.com 官方开示',
  tag TEXT DEFAULT '正定与邪定',
  subtitles_json JSONB NOT NULL,               -- 完整字幕句子数组 (SubtitleLine[])
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 学员生词掌握表 (word_notes)
CREATE TABLE IF NOT EXISTS public.word_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  thai_word TEXT NOT NULL,
  romanization TEXT NOT NULL,
  chinese TEXT NOT NULL,
  status TEXT DEFAULT 'learning',              -- 'learning' | 'mastered'
  user_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Zoom 课堂与会议室配置表 (zoom_sessions)
CREATE TABLE IF NOT EXISTS public.zoom_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_topic TEXT NOT NULL DEFAULT 'AC''s Personal Meeting Room',
  meeting_id TEXT NOT NULL DEFAULT '575 860 9278',
  passcode TEXT NOT NULL DEFAULT '5dAUk1',
  join_url TEXT NOT NULL DEFAULT 'https://us05web.zoom.us/j/5758609278?pwd=NG5INjF4dzdER09CQW1FN25TOE9hUT09',
  practice_room_url TEXT,
  schedule_notice TEXT DEFAULT '每周日晚 20:00 - 21:00 (北京时间)',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 开启 Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sati_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_sessions ENABLE ROW LEVEL SECURITY;

-- 允许匿名或已验证用户读取与打卡 (适合轻量共修场景)
CREATE POLICY "Allow public read zoom_sessions" ON public.zoom_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read course_lessons" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert sati_records" ON public.sati_records FOR ALL USING (true);
CREATE POLICY "Allow public update word_notes" ON public.word_notes FOR ALL USING (true);
```

### 2. Supabase 客户端配置代码示例 (`src/lib/supabaseClient.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

---

## 六、接管后的待办任务清单

1. **构建验证**：
   - 运行 `npm run build`，确认代码无 TypeScript 编译错误且打包产物输出至 `dist/`。
2. **Netlify 准备**：
   - 确认根目录下 `netlify.toml` 已配置正确的构建目录与 SPA 重定向规则。
3. **Supabase 连通**：
   - 在 Netlify 后台配置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`；
   - 替换 `localStorage` 中的降级存储，对接 Supabase 数据表。
4. **验证功能闭环**：
   - 顶栏单行紧凑布局与 Zoom 快捷入口；
   - 声闻研读流的大字双语展示与轻量单次试听；
   - Sati 听法觉知实时打卡与微信群报告生成；
   - LR TSV 课件导入与微信群一键同步。

请立即按此规范接管并推进部署！
```
