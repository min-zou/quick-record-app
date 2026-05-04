# Quick Record 后续优化与迭代 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将当前第一版 Quick Record PWA 迭代成稳定、可恢复、易配置、适合长期和 Obsidian 联动的多设备文字记录工具。

**Architecture:** 继续保持 HTTPS PWA 架构，Android、Ubuntu、Windows 使用同一套浏览器应用。本地仍以 IndexedDB 为主存储，GitHub 私有数据仓库作为同步层，Markdown 文件作为 Obsidian 互操作格式。

**Tech Stack:** HTML, CSS, JavaScript modules, IndexedDB, GitHub REST API, Service Worker, Node.js test runner.

---

## 迭代原则

- 不引入 Android 原生 `git`、Termux 或原生 SQLite 作为必需路径。
- 不把 token、用户记录内容或本地 IndexedDB 导出提交到仓库。
- 优先解决数据可靠性，再做体验增强。
- 每条记录继续保持一个 Markdown 文件，避免多设备写同一文件。

## Phase 1: 同步可靠性

**目标:** 让 GitHub 同步失败可诊断、可重试、不会误覆盖本地待同步记录。

**Files:**
- Modify: `src/github.js`
- Modify: `src/db.js`
- Modify: `src/app.js`
- Test: `tests/run.mjs`

**Tasks:**
1. 为记录增加 `lastSyncError`、`syncAttempts`、`remoteUpdatedAt` 字段。
2. 在 `pushPendingRecords` 中区分 401、403、404、409、rate limit。
3. 对 409 冲突执行 pull 后重试一次。
4. UI 展示具体失败原因，而不是只显示通用错误。
5. 增加 GitHub helper 单元测试。

**Acceptance:**
- token 错误、仓库不存在、分支不存在时提示明确。
- 网络失败不会清除 `pending` 状态。
- 冲突重试后仍失败时，记录保留在本地待同步列表。

## Phase 2: 首次配置向导

**目标:** 降低 Android 首次配置成本。

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `docs/runbooks/android-pwa-setup.zh-CN.md`

**Tasks:**
1. 首次打开时检测 GitHub 设置是否为空。
2. 增加三步向导：数据仓库、token、测试连接。
3. 增加“测试连接”按钮，验证 branch 和 Contents 权限。
4. 设置保存后自动执行一次 pull。

**Acceptance:**
- 新设备无需阅读源码即可完成配置。
- 配置错误时能指出是 owner/repo/branch/token 哪一项出错。

## Phase 3: PWA 与离线体验

**目标:** 让 Android 主屏安装和离线记录更可靠。

**Files:**
- Modify: `manifest.webmanifest`
- Modify: `sw.js`
- Modify: `src/app.js`
- Create: `assets/icon-192.png`
- Create: `assets/icon-512.png`

**Tasks:**
1. 增加 PWA 图标。
2. 缓存核心静态资源，避免更新后旧缓存卡住。
3. UI 增加离线状态提示。
4. 离线保存记录时明确显示“待同步”。

**Acceptance:**
- Android Chrome 可以稳定安装到主屏幕。
- 断网时可以保存文字记录。
- 恢复网络后同步不丢记录。

## Phase 4: Obsidian 联动增强

**目标:** 让记录进入 Obsidian 后更容易整理和检索。

**Files:**
- Modify: `src/markdown.js`
- Modify: `src/app.js`
- Modify: `README.md`
- Create: `docs/runbooks/obsidian-integration.zh-CN.md`
- Test: `tests/run.mjs`

**Tasks:**
1. 支持用户配置默认 tags。
2. 支持 frontmatter 增加 `status: inbox`。
3. 增加可选的 daily index 生成策略说明，暂不默认写同一 daily 文件。
4. 编写 Obsidian Git、Dataview 查询和整理流程文档。

**Acceptance:**
- 新记录可被 Obsidian Dataview 按 `source: quick-record` 查询。
- 不引入多设备同时写同一 Markdown 文件的冲突风险。

## Phase 5: 捕获效率

**目标:** 提升“随时记录”的速度。

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`

**Tasks:**
1. 支持 `Ctrl/Cmd + Enter` 保存后保持焦点。
2. 增加最近记录搜索。
3. 增加“保存后自动同步”开关，默认关闭。
4. 支持从 URL query 或 Web Share Target 接收文字，作为后续移动端分享入口。

**Acceptance:**
- 桌面端键盘输入流程不需要鼠标。
- Android 端可以更快从浏览器打开并记录。

## Phase 6: 发布与质量门禁

**目标:** 给后续迭代建立基本质量标准。

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `AGENTS.md`

**Tasks:**
1. GitHub Actions 跑 `node tests/run.mjs`。
2. 对核心模块增加 `node --check` 脚本。
3. 在 PR 指南中要求 UI 改动附截图，sync 改动附失败场景说明。

**Acceptance:**
- 每个 PR 至少执行测试和语法检查。
- 同步、Markdown 格式、设置变更必须有测试或明确的手测记录。

## 暂不做

- 原生 Android App。
- 多人协作编辑。
- CRDT 实时合并。
- 自建后端服务。
- 把记录合并写入同一个 daily note 文件。

这些方向只有在 PWA + GitHub 同步模型无法满足实际使用时再重新评估。
