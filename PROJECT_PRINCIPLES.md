# 《泰学》网站核心开发原则与产品地图 (Principal Engineering Guide)

> 本文档沉淀并继承网站主理人对产品定位、交互美学、术语规范、数据来源与权限边界的全部核心要求。后续任何功能迭代、重构或优化，必须优先对照以下原则，避免重复犯错。

---

## 一、核心产品定位与信息架构（音频优先 + 双岔路极简导航）

1. **音频优先，全球通用**
   - 网站默认主页为 **音频学习**（`mainland_offline`），因为不仅中国大陆学友顺畅可用，海外学友同样适用、轻量便捷。
   - 另一主学习岔路为 **视频学习**（`dual_sync_player`，YouTube 双视频同步）。

2. **极简三项顶部导航 + 页内音/视频一体滑块**
   - 顶部主导航永远保持干净的 3 项：**法谈学习**（点击自动回到上次使用的音频或视频模式）| **泰语打字** | **每日打卡**，不与页内滑块重复堆叠“音频/视频”按钮。
   - 音频与视频的切换通过主工作台上方 **`UnifiedMediaSelectorBar`** 内的 **「🎧 音频学习 | 🎬 视频学习」** 滑块直接切换。
   - **不再单设独立的「极简沉浸」分页**：沉浸体验通过音频/视频主播放器右上角的 **「全屏沉浸」按钮（一键切换）** 直接实现。
   - 音频学习与视频学习 **共用同一套课件、同一套字幕数组与当前句子进度**（`index.tsx` 统一状态）。

3. **产品化视觉与交互一致性**
   - **禁止把音频学习做成简陋说明书**：音频区与视频区保持同等的正式产品级打磨。
   - **统一色系与材质**：温暖米白底色（`#faf7f2`）+ 深咖黑媒体播放框（`#2d2a26` / `#3d3730`）+ 琥珀金点缀（`#b58940`）。
   - 视频是左右并列双框（即使暂无中文同传，右侧「中文译版」框也始终保留定位并提供一键关联同日/目录/链接按钮，不凭空消失），音频是 **轻量紧凑双音频框**（泰语原声 MP3 与中文同传 MP3 左右并排），选课与按日目录收纳进主界面可原地展开的 **`UnifiedMediaSelectorBar`**。
   - **半自动日期匹配**：选定课件或日期后，优先按日期（如 `YYYY-MM-DD` / 佛历 `YYMMDD`）半自动匹配 `dhamma.com` 泰语开示 MP3 与中文同传音频；未把握精准对应时不瞎编乱给，而是提供清晰的目录检索或官方网址让学友核对选取。

4. **第一步优先聚焦「隆波的开示」**
   - 泰语原声开示紧贴 **`dhamma.com`** 的官方公开音频归档与编号规律。
   - 中文同传与讲记检索贴合 **`dhamma.cn`**（基于 MediaWiki API 架构，按日期/关键词精准检索与嗅探）。

5. **导览（Tour）同步更新**
   - 导览英文统一使用 **`Tour`**（不是 `Tool`）。
   - 每次主界面结构或核心交互发生调整，必须同步检查并更新首次引导弹窗（`FirstVisitOnboardingModal.tsx`）与聚光灯导览步骤（`SpotlightTourOverlay.tsx`）。

---

## 二、用语规范与文化边界（Calm & Neutral Wording）

1. **禁止使用敏感/刺激性网络用语**
   - 界面文案、引导、导览及提示中 **严禁出现**：「翻墙」「免翻」「直连」「免流」「科学上网」「梯子」「无需梯」等词汇。
   - 如需区分使用场景，采用平静、简短、如实的表达，例如 **「中国大陆」**、**「海外环境」**、**「本地缓存」**、**「公开音频流」**，不增加冗余花哨描述。

2. **真实可听，拒绝虚构资源**
   - 音频列表与链接必须真实可用（配合 `/api/audio-proxy` 4MB 分片流与本地缓存回退），不拿未核实的错配链接充数导致学友困惑。

3. **尊称与词典规范**
   - 尊者称呼统一为 **「隆波」 / 「隆波帕默尊者」**。
   - 泰语音标遵循 **朱拉隆功大学 Adapted IPA 标准与五声调标注**，不混用 RTGS 或英语谐音。
   - 注意保留开示字幕原文中的泰译中内容（如 `luangporTalk31Oct.ts` 中的法会原话），仅规范应用 UI 与产品文案。

---

## 三、共学互助校对与权限隔离边界（极重要）

1. **是「共学互助校对」，不是「法工专属」**
   - 界面与工作流定位为 **「共学互助」 / 「共学互助校对」**，**每个人（所有学友）都可以参与字幕校对并上传分享课件**，绝不将校对工具窄化或包装成“法工团队专属”。

2. **严格隐藏 `admin`：普通学友零感知，仅 `admin` 登录后才显现**
   - 统一使用 **`admin`**（严禁使用 `ADM`、`adm` 或 `法工` 等错用/泄露命名）。
   - **未登录 `admin` 时（默认状态）**：
     - 网站前台及 **「共学互助」** 弹窗内 **绝不出现** 任何 `admin 登录` 按钮、权限验证条、`admin` 徽章或“待管理员审核 / 管理后台”等暗示性文案。
     - **严禁展示** 任何高权限功能：课件审核（批准/驳回/下架/删除）、官方基准时间轴调校、学员隐私档案/导出 CSV/删除、操作审计日志与系统重置。
     - `AdminAuthService` 默认会话必须为未认证（`isAuthenticated: false`），绝不允许无密码自动解锁或密码绕过。
   - **仅当 `admin` 登录后（`isAuthenticated === true`）**：
     - 才显示导航栏 `admin` 标识与弹窗内的 `admin` 专属管理界面（**课件审核**、**时间轴调校**、**学员记录**、**数据与日志** + **退出 admin**）。
   - **隐藏式 `admin` 登录路径**（前台界面不可见）：
     - 浏览器地址栏直接访问 `#/admin` 触发 `admin` 口令验证弹窗；
     - 或在 **「每日打卡」** 账号登录口使用 `admin` 账号及口令验证登录。

---

## 四、技术架构地图（关键模块一览）

| 模块领域 | 核心文件 | 职责说明 |
| :--- | :--- | :--- |
| 应用入口与共享状态 | `/index.tsx`, `/server.ts` | 管理统一课件/字幕/句子索引状态、音画偏好、`#/admin` 隐藏入口，及代理/流媒体 API (`/api/audio-proxy`, `/api/thai-tts`, `/api/luangpor-catalog`) |
| 顶部导航与导览 | `/src/components/Navbar.tsx`, `/src/components/FirstVisitOnboardingModal.tsx`, `/src/components/SpotlightTourOverlay.tsx`, `/src/hooks/useFullscreenStage.ts` | 极简 3 项导航、Tour 高亮导览（随 UI 改动同步维护）、一键全屏沉浸 Hook |
| 两大学习主视图与复用底座 | `/src/components/MainlandOfflinePage.tsx`, `/src/components/DualVideoSyncAlignPlayer.tsx`, `/src/components/UnifiedMediaSelectorBar.tsx`, `/src/components/UnmatchedSubtitleBanner.tsx`, `/src/components/UnifiedPlayerDock.tsx` | 音频学习（默认）与视频学习共用主界面选课/音视频切换条、严格绑定空字幕横幅与底部悬浮主控台 |
| 共学互助与 `admin` 后台 | `/src/components/AdminSanctuaryModal.tsx`, `/src/components/CourseStudioModal.tsx` | 普通用户仅见互助校对与上传、开示检索、AI 优化词、学习资源；仅 `admin` 登录后解锁审核/校准/学员档案/日志 |
| 权限、隐私与学员体系 | `/src/services/adminAuthService.ts`, `/src/services/secureStorageService.ts`, `/src/services/studentStudyService.ts`, `/src/components/RegistrationCheckinView.tsx` | `admin` 会话认证、防爆破锁定、学员隐私金库、打卡与发心认领 |
| 字幕解析、词库与语音 | `/src/utils/lrFormatParser.ts`, `/src/utils/languageReactorParser.ts`, `/src/utils/chulaIpaDict.ts`, `/src/utils/thaiAudioSynthesizer.ts`, `/src/utils/dhammaLookup.ts`, `/src/utils/mediaSubtitleBinding.ts`, `/src/data/presetLessonsLibrary.ts` | 朱拉音标分词、LR HTML 去机翻清洗、1120+ 佛法词典、开示目录与 MediaWiki 检索、泰文音/视频唯一绑定字幕校验 |

---

## 五、YouTube 双频道按日对照与周度精校生态

1. **YouTube 官方频道自动对照 (`/api/luangpor-youtube-catalog` + `/api/youtube-resolve`)**
   - 同时爬取 **`@luangpupramote/videos`**（正式精编版）、**`@luangpupramote/streams`**（直播/回放/重播）与 **`@JieTuoYuan/streams` + `@JieTuoYuan/videos`**（严格过滤普通话同传，排除 Cantonese/粵語/English/Rerun）。
   - 准确识别 **正在直播 (`🔴 直播中`)**、**正式精编版 (`🎬 正式版`)**、**直播回放 (`📺 直播回放`)** 与 **重播 (`🔁 重播`)**，保留同日多版本候选并优先以正式版/直播原版压过重播。
   - 若粘贴动态 `/live` 频道入口，通过 `/api/youtube-resolve` 自动解析并固定为该场唯一 11 位 `videoId`，确保字幕唯一绑定不随直播状态漂移。
   - 泰文字幕检测遵循如实原则：若配置了 `YOUTUBE_API_KEY` 则由服务端调官方 Captions API 识别人工/自动字幕；未配置时不在服务端伪造状态，由学习者浏览器端 `YT.Player` 播放状态检测并直通 YouTube 原网页核对。

2. **主理人 + 共学互助字幕生产工作流**
   - 有泰文字幕的新视频：可直接导出或进入校对。
   - 尚无泰文字幕的新视频：通过 Language Reactor 导出带时间戳的 `.html` / 文本 -> 在「共学互助校对」或「装载字幕」一键点击 **「仅留泰文+时间戳（去机翻）」** 剔除机器翻译与 HTML 杂项 -> 复制进 AI Studio 从代码底层生产标准朱拉音标、逐词卡拉 OK 与鼠标“打伞”词卡。
   - 主理人每周可在 `admin`「时间轴调校」一键复制 **「本周官方对齐配置」** 发回 AI Studio 固化到底层；共学学友也可自由上传校对课件。

3. **课件来源透明标识（官方精校 vs 学友贡献）**
   - 所有官方内置与主理人周度精校课件标记为 **`🌟 官方精校`**（`curationType: 'official'`）。
   - 社群学友互助上传的课件标记为 **`🤝 学友贡献 · {上传者署名}`**（`curationType: 'community'`），不对外暴露 `admin` 术语。

4. **泰文音/视频唯一绑定字幕原则（不匹配不出字幕）**
   - 字幕只属于对应的 **原泰语视频 / 原泰语音频**（由 `src/utils/mediaSubtitleBinding.ts` 按 YouTube Video ID、官方音频网址或文件名/佛历日期严格校验，并持久化于带媒体主键的绑定表 `taixue_bound_subtitles_by_media_v1`）。
   - 切换或加载一个新的泰语 YouTube 视频或新的泰语 MP3/本地音频时，若该泰语媒体既不对应任何已有精校/共学课件，也没有为该媒体键显式导入过字幕，**严禁沿用上一场课件的字幕**，必须清空并展示空字幕引导卡片（可正常播放收听，或一键为当前音/视频导入专属字幕、或切回已有字幕课件）。
   - 仅切换中文同传视频或中文同传音频时，不清除当前已正确绑定的泰语字幕。

5. **目录静态固化与零依赖离线发布原则（Solidified Catalogs）**
   - **根本原因**：在 Netlify/Vercel 等静态托管部署时，不存在 Node.js 后端服务器，所有 `/api/*` 请求会被路由重定向到 `index.html`（HTML 文本），导致 `res.json()` 抛出 `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`（即用户所指的 "JSON document invalid" 报错）。同时外部站点（如 dhamma.cn）的防爬 WAF 会对非白名单环境直接返回 403 HTML 拦截页。
   - **机制与实现**：
     - 在代码库内置 `src/data/solidifiedYouTubeCatalog.ts`、`src/data/solidifiedAudioCatalog2026.ts`、`src/data/solidifiedAudioCatalog2025.ts` 与 `public/data/` 静态 JSON 文件。
     - 前端组件（`UnifiedMediaSelectorBar.tsx` 与 `offlineAudioStorage.ts`）默认直接从固化文件初始化；在尝试拉取 `/api/...` 时，严格检查 `res.headers.get('content-type')?.includes('application/json')`，绝不对非 JSON/HTML 调用 `.json()`，直接安全回退至固化目录。
     - 主理人仅在 AI Studio 开发环境下进行实时抓取与同步，点击选课栏的 **「⚡ 固化到代码库」** 按钮或执行 `npm run sync:solidify`，即可把最新目录冻结写入代码库，部署后即可离线且永不报错。

---

## 六、工程质量红线

- 修改 React 回调/受控状态时，严禁在 `setState(prev => ...)` 纯函数内部触发父组件 `setState`（使用 `ref` 计算并在外部调用回调）。
- 禁止使用 `window.alert` / `window.open`，外链一律使用 `<a target="_blank" rel="noreferrer">` 或状态提示。
- 每次改动后必须同时执行生产构建（`vite build`）与 TypeScript 类型检查（`tsc --noEmit`），确保零报错后再重启服务交付。
