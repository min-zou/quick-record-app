# Quick Record Android 使用与构建指南

这份文档覆盖两条路线：

- **个人使用路线**：部署到 GitHub Pages，直接在安卓 Chrome 安装 PWA。无需 Google Play、Bubblewrap、APK 或 AAB。
- **打包上架路线**：在 PWA 部署完成后，用 Bubblewrap 生成 APK/AAB，再按需配置 TWA 和 Google Play。

## 前置要求

1. **Node.js 18+**（已安装 v22.16.0 ✅）
2. **Bubblewrap CLI**（已全局安装 ✅）
3. **JDK 17**（Bubblewrap 会自动安装或手动指定）
4. **Android SDK**（Bubblewrap 会自动安装或手动指定）
5. **HTTPS 域名**（PWA 必须部署在 HTTPS 上）

## 步骤 1：部署 PWA 到 HTTPS 域名

Bubblewrap 需要从线上地址读取 manifest。你需要先将应用部署到一个 HTTPS 域名。

如果只是个人使用，到“安装 PWA”这一步就可以停止，不需要继续执行 Bubblewrap 和上架步骤。

### 选项 A：使用 GitHub Pages（个人使用推荐）

当前应用使用根路径资源，例如 `/manifest.webmanifest`、`/sw.js`、`/src/app.js` 和 `/assets/icon-512.png`。因此 GitHub Pages 推荐使用下面两种方式之一：

1. 使用 `<你的用户名>.github.io` 用户主页仓库，访问地址是 `https://<你的用户名>.github.io/`。
2. 使用 `quick-record-app` 仓库并绑定自定义域名，例如 `https://record.example.com/`。

不推荐直接使用 `https://<你的用户名>.github.io/quick-record-app/` 这种项目页路径，除非同步修改 PWA 的根路径配置。

GitHub Pages 设置：

```text
Settings -> Pages
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

部署后验证这些地址能访问：

```text
https://<你的用户名>.github.io/
https://<你的用户名>.github.io/manifest.webmanifest
https://<你的用户名>.github.io/sw.js
https://<你的用户名>.github.io/assets/icon-512.png
```

如果使用自定义域名，把上面的域名替换为自定义域名。完整操作流程、部署验证、日常更新和故障排查见 `docs/runbooks/github-pages-personal-pwa.zh-CN.md`。

仓库根目录保留 `.nojekyll`，让 GitHub Pages 按静态文件方式发布。以后如果要托管 `/.well-known/assetlinks.json`，这个标记文件也需要存在。

### 选项 B：使用 Vercel / Netlify / Cloudflare Pages

1. 将代码推送到 GitHub 仓库
2. 在 Vercel/Netlify/Cloudflare Pages 导入该仓库
3. 自动获得 HTTPS 域名（如 `https://quick-record.vercel.app`）

### 选项 C：使用自有服务器

确保：
- 支持 HTTPS
- 能访问到 `manifest.webmanifest`
- 图标路径可访问

### 部署前检查图标

`manifest.webmanifest` 引用了：

```text
assets/icon-192.png
assets/icon-512.png
```

如果这两个 PNG 还不存在，先在浏览器打开 `assets/generate-icons.html`，下载对应尺寸的图标并放回 `assets/` 目录，然后提交到应用仓库。

### 安装 PWA（个人使用到这里即可）

在安卓 Chrome 中打开 HTTPS 地址，例如：

```text
https://<你的用户名>.github.io/
```

然后：

```text
右上角菜单 -> 添加到主屏幕 / 安装应用 -> 安装
```

桌面出现 `Quick Record` 图标后即可个人使用。数据同步仍然配置到单独的私有 `quick-record-data` 仓库。

## 步骤 2：更新配置文件

编辑 `android-build/bubblewrap-config.json`，将 `your-domain.com` 替换为你的实际域名：

```json
{
  "host": "https://<你的用户名>.github.io",
  "iconUrl": "https://<你的用户名>.github.io/assets/icon-512.png",
  "maskableIconUrl": "https://<你的用户名>.github.io/assets/icon-512.png",
  "webManifestUrl": "https://<你的用户名>.github.io/manifest.webmanifest",
  "fullScopeUrl": "https://<你的用户名>.github.io/"
}
```

## 步骤 3：初始化 Android 工程

在 `android-build/` 目录下运行：

```bash
cd android-build
bubblewrap init --manifest https://your-domain.com/manifest.webmanifest
```

按提示操作：
- 是否安装 JDK？**Yes**（推荐让 Bubblewrap 自动安装）
- 是否安装 Android SDK？**Yes**
- 应用名称：`Quick Record`
- 短名称：`Record`
- 包名：`com.yourcompany.quickrecord`（反向域名格式）
- 签名密钥：选择创建新密钥或复用已有密钥

## 步骤 4：构建 AAB 包

```bash
bubblewrap build
```

输出文件：
- `app-release-signed.aab` —— 用于 Google Play 上架
- `app-release-signed.apk` —— 用于本地测试

## 步骤 5：配置数字资产链接（去除地址栏）

为了让 TWA 应用不显示 Chrome 地址栏，需要验证域名所有权。

### 5.1 生成 assetlinks.json

运行：

```bash
bubblewrap fingerprint generateAssetLinks
```

这会输出类似以下内容：

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.quickrecord",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
    ]
  }
}]
```

### 5.2 部署 assetlinks.json

将上述内容保存到你的域名下的：

```
https://your-domain.com/.well-known/assetlinks.json
```

要求：
- Content-Type: `application/json`
- 必须能通过 HTTPS 访问
- 无重定向

### 5.3 验证

访问 Google 数字资产链接验证工具：
https://developers.google.com/digital-asset-links/tools/generator

输入你的域名和包名，验证是否通过。

## 步骤 6：Google Play 上架

### 6.1 注册开发者账号

1. 访问 https://play.google.com/console
2. 支付 $25 一次性注册费
3. 完成开发者身份验证

### 6.2 创建应用

1. 点击"创建应用"
2. 填写应用名称：`Quick Record`
3. 选择语言：中文（简体）
4. 选择应用类型：应用
5. 选择付费类型：免费

### 6.3 填写商店信息

**应用详情：**
- 简短描述：快速离线记录文字，通过 GitHub 同步到 Obsidian
- 完整描述：见下方模板
- 应用图标：上传 512x512 PNG
- 置顶大图：上传 1024x500 PNG（ feature graphic ）

**截图要求（最少 2 张，推荐 8 张）：**
- 手机：16:9 或 9:16，最小 320px，最大 3840px
- 7 英寸平板：16:9 或 9:16
- 10 英寸平板：16:9 或 9:16

### 6.4 上传 AAB

1. 进入"正式版" → "创建新版本"
2. 上传 `app-release-signed.aab`
3. 填写版本说明

### 6.5 内容分级

填写内容分级问卷：
- 类别：工具类 / 效率
- 暴力：无
- 恐怖：无
- 性内容：无
- 语言：无
- 药物：无
- 赌博：无

### 6.6 定价和分发范围

- 选择国家/地区：建议先选"所有国家/地区"
- 定价：免费

### 6.7 提交审核

确认所有项都变为绿色勾选后，点击"提交审核"。

通常审核时间：1-3 个工作日。

## 商店文案模板

### 应用标题
Quick Record - 快速记录与 GitHub 同步

### 简短描述（80 字符内）
离线快速记录文字，一键同步到 GitHub，Obsidian 直接读取。

### 完整描述
Quick Record 是一款为效率而生的快速文字记录工具。

核心功能：
✓ 极速打开，即开即写
✓ 完全离线可用，无网络也能保存
✓ 一键同步到私有 GitHub 仓库
✓ 每条记录独立 Markdown 文件，Obsidian 直接读取
✓ 多设备同步，不冲突
✓ 纯前端实现，数据完全由你掌控

适用场景：
- 灵感闪现时的快速捕捉
- 会议笔记和日常备忘
- 多设备间的文字同步
- Obsidian 用户的移动端录入入口

隐私说明：
- 数据默认保存在设备本地
- GitHub Token 仅存储在本地浏览器
- 不收集任何个人身份信息

开源项目，代码透明可查。

### 更新日志（首版）
- 首次发布
- 支持本地离线记录
- 支持 GitHub Markdown 同步
- 支持 PWA 安装

## 常见问题

### Q: 为什么需要 HTTPS 域名？
A: PWA 和 Trusted Web Activity 都要求 HTTPS。这是安全基础要求。

### Q: 可以不上架直接用吗？
A: 完全可以。Android Chrome 的"添加到主屏幕"即可获得接近原生的 PWA 体验。上架主要是为了方便分发和发现。

### Q: AAB 和 APK 有什么区别？
A: Google Play 要求上传 AAB（Android App Bundle），它会根据用户设备自动生成优化的 APK。本地测试可以用 APK。

### Q: 签名密钥丢了怎么办？
A: 无法恢复。必须妥善保存 `android.keystore` 文件和密码。Google Play 现在也支持 Play App Signing，可以额外保护。

## 相关文件

- `android-build/bubblewrap-config.json` - Bubblewrap 配置模板
- `assets/icon-192.png` - 应用图标（小）
- `assets/icon-512.png` - 应用图标（大）
- `assets/generate-icons.html` - 图标生成工具
- `privacy.html` - 隐私政策页面
