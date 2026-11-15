# 《泰学》网站核心开发原则与产品地图 (Principal Engineering Guide)

> 本文档沉淀并继承网站主理人对产品定位、交互美学、术语规范、数据来源与权限边界的全部核心要求。后续任何功能迭代、重构或优化，必须优先对照以下原则，避免重复犯错。

---

## 一、核心产品定位与信息架构（音频优先 + 双岔路极简导航）

1. **音频优先，全球通用**
   - 网站默认主页为 **音频学习**（`mainland_offline`），因为不仅中国大陆学友顺畅可用，海外学友同样适用、轻量便捷。
   - 另一主学习岔路为 **视频学习**（`dual_sync_player`，YouTube 双视频同步）。

2. **极简四项顶部导航**
   - 顶部主导航永远保持干净的 4 项：**音频学习** | **视频学习** | **泰语打字** | **每日打卡**。
   - **不再单设独立的「极简沉浸」分页**：沉浸体验通过音频/视频主播放器右上角的 **「全屏沉浸」按钮（一键切换）** 直接实现。
   - 音频学习与视频学习 **共用同一套课件、同一套字幕数组与当前句子进度**（`index.tsx` 统一状态）。

3. **产品化视觉与交互一致性**
   - **禁止把音频学习做成简陋说明书**：音频区与视频区保持同等的正式产品级打磨。
   - **统一色系与材质**：温暖米白底色（`#faf7f2`）+ 深咖黑媒体播放框（`#2d2a26` / `#3d3730`）+ 琥珀金点缀（`#b58940`）。
   - 视频是大双框，音频是 **轻量紧凑双音频框**（泰语原声 MP3 与中文同传 MP3 左右并排），次要工具（目录浏览、本地导入、录音缓存）收纳进按需弹窗。
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
| 顶部导航与导览 | `/src/components/Navbar.tsx`, `/src/components/FirstVisitOnboardingModal.tsx`, `/src/components/SpotlightTourOverlay.tsx`, `/src/hooks/useFullscreenStage.ts` | 极简 4 项导航、Tour 高亮导览（随 UI 改动同步维护）、一键全屏沉浸 Hook |
| 两大学习主视图 | `/src/components/MainlandOfflinePage.tsx`, `/src/components/DualVideoSyncAlignPlayer.tsx` | 音频学习（默认，紧凑双音频框 + 半自动日期匹配）与视频学习（YouTube 双播），共用同一字幕与逐句进度 |
| 共学互助与 `admin` 后台 | `/src/components/AdminSanctuaryModal.tsx`, `/src/components/CourseStudioModal.tsx` | 普通用户仅见互助校对与上传、开示检索、AI 优化词、学习资源；仅 `admin` 登录后解锁审核/校准/学员档案/日志 |
| 权限、隐私与学员体系 | `/src/services/adminAuthService.ts`, `/src/services/secureStorageService.ts`, `/src/services/studentStudyService.ts`, `/src/components/RegistrationCheckinView.tsx` | `admin` 会话认证、防爆破锁定、学员隐私金库、打卡与发心认领 |
| 字幕解析、词库与语音 | `/src/utils/lrFormatParser.ts`, `/src/utils/chulaIpaDict.ts`, `/src/utils/thaiAudioSynthesizer.ts`, `/src/utils/dhammaLookup.ts`, `/src/data/presetLessonsLibrary.ts` | 朱拉音标分词、1120+ 佛法词典、开示目录与 MediaWiki 检索、预置及社区课件库 |

---

## 五、工程质量红线

- 修改 React 回调/受控状态时，严禁在 `setState(prev => ...)` 纯函数内部触发父组件 `setState`（使用 `ref` 计算并在外部调用回调）。
- 每次改动后必须同时执行生产构建（`vite build`）与 TypeScript 类型检查（`tsc --noEmit`），确保零报错后再重启服务交付。
