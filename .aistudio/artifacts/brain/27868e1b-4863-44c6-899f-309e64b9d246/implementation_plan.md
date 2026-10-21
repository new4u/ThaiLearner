# “泰学” (Tai Xue) 单屏一体化共学工作台与架构重构方案

针对共学工作流的深化需求，本次重构将站点全面更名为“**泰学**”（Tai Xue），彻底剥离历史遗留包袱，打造高度聚焦的**“双视频放映 + 键盘打卡实战”单屏一体化共学工作台**；全面重塑悬浮播放栏，升级键盘即时发音与朱拉隆功音标释义，并系统性梳理依赖，输出面向 Netlify 与 Supabase 的纯前端轻量化部署体系。

---

## 用户确认决策与评审要点 (User Review & Critical Decisions)

> [!IMPORTANT]
> 基于前期交互讨论与确认（Clarifying Answers），核心技术与产品决策已明确锁定，架构将以此为唯一基准实施：

- **确认决策 1（工作台架构）**：合并为**单屏一体化工作台**，取消繁琐的多标签切换，上半屏/左侧为双视频放映与卡拉OK句流，下半屏/右侧抽屉同屏联动 Kedmanee 键盘打卡，选词即练，实时呼应。
- **确认决策 2（极简悬浮播放栏）**：彻底剔除“四步法”与“数字秒数显示”，播放操作遵循“泰文单句暂停、中文随动校准、一键双轨齐播”，底部以极简悬浮播放 Bar（Play/Pause、单句循环开关、上一句/下一句、双轨同播）呈现。
- **确认决策 3（键盘发声与全规格释义）**：点击双视频中任意词汇即时发声并自动载入键盘；敲击按键即出单字母标准泰音（ก ไก่、ไม้เอก等），拼写完成后立即展示与双视频同等规格的**朱拉隆功 Adapted IPA 音标、中文释义、佛法词根**，并自动完整朗读整词。
- **确认决策 4（依赖解耦与部署架构）**：采用**纯前端无锁死架构**，所有音标与词库本地自包含运行，API 抽象接口层完全支持自定义替换，提供开箱即用打包 Netlify + Supabase 的轻量方案。

---

## 1. 概述与核心定位 (Overview & Core Concept)

- **产品定位**：面向泰语声闻修学者与高阶学习者的极简、高保真一体化听解打卡工作台。
- **目标用户**：研读隆波帕默尊者原声实况、追求中泰双语对照与逐词精准拼打的共学法友。
- **核心价值**：
  1. **零杂音播放**：听完一句即暂停，单键触发双轨合流，告别机器死板的四步定时和时差漂移。
  2. **选词即练即听**：放映机与键盘同屏联动，词卡不再是冷冰冰的弹窗，而是输入即验证、通关即掌握的闭环。
  3. **自主可控部署**：脱离任何专有平台硬编码，标准 TypeScript + Vite 构建，随时一键导出 Zip 部署至 Netlify + Supabase。

---

## 2. 界面视觉体验与一体化交互 (User Experience & Visual Design)

### 2.1 整体空间布局与视觉风格
- **品牌标识**：顶栏精简为单行三段式标准合约——品牌字样“**泰学** (Tai Xue)”，右侧仅保留导入弹窗入口与打字面板折叠开关。
- **色调与质感**（60-30-10 黄金法则）：
  - 60% 沉浸基底：深邃墨色 Slate-950 (`#020617`)，保护长时间听经视力。
  - 30% 结构层级：深岩灰 Slate-900/Slate-800 边框与柔和阴影，模块间以 1px 细线分隔。
  - 10% 聚焦强调：典雅金 Amber-400 / 暖黄 Amber-500，集中用于当前激活词高亮、键盘待打字符光环及通关提示。
- **排版字体**：
  - 中英文选用 `Plus Jakarta Sans` 与 `Noto Sans SC`；
  - 泰文核心词汇选用 `Sarabun` / `Noto Sans Thai`，确保长短元音与上下标声调符号结构清晰无重叠；
  - 音标专区采用 `JetBrains Mono` / `Chula IPA` 标准，调号与重音清晰可见。

### 2.2 核心工作流与同屏联动机制

```
┌────────────────────────────────────────────────────────────────────────┐
│                              顶栏: 泰学 (Tai Xue)                      │
├───────────────────────────────────┬────────────────────────────────────┤
│         泰文主控视窗 (原声)        │        中文译版视窗 (同传译文)      │
├───────────────────────────────────┴────────────────────────────────────┤
│  卡拉OK 逐字点亮流动条:                                                 │
│  [ สัมมาสมาธิ /sǎm-maa-sa-maa-tí/ 正定 ] (点击即读、一键同步载入键盘)   │
├────────────────────────────────────────────────────────────────────────┤
│  同屏联动打卡区:                                                       │
│  [已键入: สัมมา ] -> [待打: ส (高辅音 s)]                                │
│  Kedmanee 泰语键盘 (实体键盘同步敲击发声 + 待打键位金色呼吸环)          │
│  通关即时展示:                                                         │
│  ★ 朱拉隆功 Adapted IPA: /sǎm-maa-sa-maa-tí/                           │
│  ★ 中文释义: 正定 (心安住于所缘，不随境界流转的觉知状态)                │
├────────────────────────────────────────────────────────────────────────┤
│  底部悬浮播放 Bar:                                                     │
│  [⏮ 上一句]  [▶ 播放 / ⏸ 暂停]  [⏭ 下一句]  [🔂 单句循环: 开]  [⚡ 双轨同播]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 核心功能重构与技术决策 (Key Decisions & Trade-Offs)

### 决策 1：播放与时间显示的极致纯粹化
- **现状痛点**：原有“四步循环法”死板计时，因中泰两版口语停顿天然不同步，强行切音频经常掐断半句话；秒数显示分散用户注意力。
- **新方案**：
  1. 彻底移除 4 步状态机与倒计时秒表显示；
  2. 聚焦用户真实高效手感：“**泰文听完一句暂停，中文听完一句暂停，点击双轨同播，精准合流**”；
  3. 控制按键全部集成到底部**悬浮吸底控制条（Floating Bottom Bar）**，半透明磨砂玻璃质感，不遮挡字幕，随手可触。

### 决策 2：键盘打卡零延迟发声与全规格音标释义
- **现状痛点**：打字时因后台并发调用复杂变调逻辑导致音频线程阻塞；打完后无音标无释义，用户无法感知与双视频词卡的对应关系。
- **新方案**：
  1. **敲击发声轻量化**：解耦 Web Audio 复杂合成，直接调用已建构的 44 辅音 + 元音 + 调号发音字典，敲键即出官方泰文字音（如 ก 出 กอ ไก่），0.05 秒内利落结束，绝无卡顿。
  2. **双视频数据深绑定**：双视频中被点击的词汇对象（包含 `thai`, `romanization`, `chinese`, `rootBreakdown`, `toneRule` 等完整字段）直传键盘状态机。若为用户自定义词汇，则经由本地朱拉隆功字典库（`chulaIpaDict`）瞬时匹配生成音标与释义。
  3. **通关全规格展示**：敲击最后一个字符通关瞬间，触发成功音，自动调用整词标准朗读，并以下拉卡片形式展示与双视频词汇完全同款的“朱拉隆功 Adapted IPA”、“标准中文释义”与“法义要点”。

---

## 4. 依赖梳理与 Netlify + Supabase 部署体系 (Deployment & Extensibility)

用户明确提出将项目部署至 Netlify，后端接入 Supabase，并最终打包导出为 Zip 整合进既有项目。以下为系统性梳理：

### 4.1 全量外部依赖与 AI Studio 资产梳理

| 依赖分类 | 当前现状 | 解耦策略与 Netlify 适配方案 |
| :--- | :--- | :--- |
| **构建与运行时** | React 19, TypeScript, Vite 6, Tailwind CSS 4 | 完全标准通用现代前端栈，原生兼容 Netlify 静态托管，`npm run build` 输出全套 `/dist`。 |
| **AI Studio 特有依赖** | `metadata.json`, `.aistudio/` 内部目录 | 仅供 AI Studio 平台识别；代码中已无硬依赖。构建出的静态网页可在任何静态服务器独立运行。 |
| **Gemini API** | `@google/genai` (当前仅在离线分词预留接口) | 全面重构为**统一 API 适配器** (`src/services/aiService.ts`)。默认采用纯前端离线词典分词（零调用、零费用）；若开启外部大模型，通过环境变量 `VITE_AI_API_BASE_URL` 自由替换为 OpenAI、DeepSeek、自建代理等。 |
| **数据库与持久化** | 本地 `localStorage` (当前存放字幕与词汇进度) | 提供 **Supabase 接入中间件** (`src/services/supabaseClient.ts`)，通过 `.env` 配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，用户即可无缝同步生词本与打卡记录。 |
| **音频引擎** | Web Speech API + Web Audio API | 100% 浏览器原生原生接口，无需调用外部付费 TTS API，离线即发音。 |
| **视频播放** | YouTube IFrame Player API | 客户端标准 API，Netlify 部署只需配置好 CSP 与 Referrer 即可无缝播放。 |

### 4.2 可配置外部 API 接口架构 (Extensible API Gateway)

为满足用户后续自定义接入任何 API 的要求，代码中建立轻量接口层：

```typescript
// 1. 词典与翻译接口 (可自定接入 Supabase 或自建 API)
export interface DictionaryProvider {
  lookupWord(thai: string): Promise<WordGlossResult | null>;
  searchDhammaTerms(keyword: string): Promise<DhammaTerm[]>;
}

// 2. 文本分析/分词接口 (默认离线，支持配置自定义 LLM 端点)
export interface TokenizerProvider {
  tokenizeAndGloss(thaiText: string): Promise<SubtitleLine[]>;
}

// 3. 用户进度持久化接口 (支持 localStorage / Supabase 随时平滑切换)
export interface StorageProvider {
  loadSubtitles(): Promise<SubtitleLine[]>;
  saveSubtitles(subs: SubtitleLine[]): Promise<void>;
  saveWordMastery(wordId: string, status: WordStatus): Promise<void>;
}
```

### 4.3 Netlify + Supabase 完整部署步骤

1. **环境变量配置 (`.env.example`)**：
   ```env
   # Supabase 数据库与认证 (可选，配置后自动从 LocalStorage 升级为云同步)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

   # 自定义 AI / 翻译接口 (可选，留空则使用内置离线朱拉隆功引擎)
   VITE_CUSTOM_API_URL=https://api.yourdomain.com/v1
   VITE_CUSTOM_API_KEY=
   ```
2. **Netlify 配置文件 (`netlify.toml`)**：
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
3. **一键生成 Zip 包机制**：
   - 编写轻量打包脚本或直接执行打包，剔除 node_modules 与平台临时文件，包含完整的 TypeScript 源码、静态词库、Netlify 配置文件以及 Supabase schema 脚本，解压即可直接 `npm install && npm run build`。

---

## 5. 实施执行路线图 (Execution Phases)

- **阶段 1：全局元数据与品牌统一**
  - 修改 `metadata.json`：Name 设为 `Tai Xue`，Description 规范更新；
  - 同步修改 `index.html` 的 `<title>`、Meta Description 与 OpenGraph 标签；
  - 更新顶栏品牌字样为简洁的“**泰学** (Tai Xue)”。
- **阶段 2：单屏一体化工作台与悬浮播放 Bar**
  - 剔除旧四步法引擎与秒数显示；
  - 构造底部悬浮播放 Bar：播放/暂停、单句循环切换、上一句/下一句、双轨同播校准；
  - 放映机视窗与打字练打区置于同一工作台视野中，支持无缝折叠展开。
- **阶段 3：键盘即时发声与全规格音标释义补全**
  - 重构选词联动：从双视频点击词汇时不仅传文字，同时传递完整朱拉隆功音标与释义；
  - 优化击键音频调用：轻量稳定播放按键字母音，消除变调等待；
  - 制作打卡通关“全规格卡片”，同款展示 IPA、中文义项与法义词根，并自动整词发音。
- **阶段 4：API 架构解耦与 Netlify/Supabase 配置文件交付**
  - 创建 Supabase 客户端接口与适配器；
  - 规范 `.env.example` 与 `netlify.toml`；
  - 运行全量 TypeScript 静态检查与应用编译测试。
