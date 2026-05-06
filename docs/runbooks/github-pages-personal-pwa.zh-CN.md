# GitHub Pages 个人部署与安卓安装流程

这份流程适合先不上架 Google Play、只给自己或少量设备使用 Quick Record。目标是把应用部署成 HTTPS PWA，然后在安卓 Chrome 里直接安装到桌面。

## 完成标准

做完后应该同时满足：

- 安卓 Chrome 能打开应用 HTTPS 地址。
- 浏览器菜单里出现 `安装应用` 或 `添加到主屏幕`。
- 桌面图标打开后是独立窗口，而不是普通浏览器标签页。
- 离线时可以保存记录。
- 点击 `同步` 后，记录写入私有 `quick-record-data` 仓库。
- 应用代码仓库中不包含 GitHub token 或本地数据导出。

## 方案选择

当前应用的资源路径按域名根目录设计，例如：

```text
/manifest.webmanifest
/sw.js
/src/app.js
/assets/icon-512.png
```

因此 GitHub Pages 推荐使用下面两种方式之一：

| 方式 | 访问地址 | 是否推荐 | 说明 |
| --- | --- | --- | --- |
| 用户主页仓库 | `https://<你的用户名>.github.io/` | 推荐 | 不需要改代码，最适合个人使用。 |
| 自定义域名 | `https://record.example.com/` | 推荐 | 可继续使用 `quick-record-app` 仓库，适合以后 Bubblewrap/TWA。 |
| 项目页路径 | `https://<你的用户名>.github.io/quick-record-app/` | 不推荐 | 当前根路径资源会错位，除非同步修改 PWA 路径配置。 |

如果只是个人应用，优先选“用户主页仓库”。如果以后考虑 Bubblewrap 打包或 TWA 去地址栏，优先选“自定义域名”。

## 安全边界

GitHub Pages 发布的是公开静态站点。这个仓库只应该放应用代码、图标和公开文档。

不要提交：

- GitHub token。
- 浏览器 localStorage 或 IndexedDB 导出。
- `quick-record-data` 里的用户记录。
- 截图中可见的 token、私有仓库名或敏感记录内容。

用户记录继续放在单独的私有 `quick-record-data` 仓库。Quick Record 只在你手动配置 token 后，通过 GitHub API 读写这个数据仓库。

## 1. 准备仓库

建议使用两个仓库：

```text
<你的用户名>.github.io  # 应用代码，Public，用于 GitHub Pages
quick-record-data      # 记录数据，Private
```

如果你已经有 `quick-record-app` 仓库，也可以继续使用它，但建议给它绑定自定义域名，避免 `/quick-record-app/` 子路径问题。

创建 `quick-record-data` 时勾选 `Add a README file`，这样仓库会自动拥有 `main` 分支。

注意：

- GitHub Pages 站点本身通常是公开访问的。
- 用户主页仓库名必须是 `<你的用户名>.github.io`。
- 每个 GitHub 账号通常只有一个用户主页仓库。如果你已经占用了这个仓库，改用自定义域名方案。

## 2. 检查 PWA 资源

部署前确认这些文件存在：

```text
.nojekyll
index.html
manifest.webmanifest
sw.js
privacy.html
src/app.js
src/styles.css
assets/icon-192.png
assets/icon-512.png
```

当前仓库提供了 `assets/generate-icons.html`。如果还没有 PNG 图标：

1. 在浏览器打开 `assets/generate-icons.html`。
2. 分别下载 `icon-192.png` 和 `icon-512.png`。
3. 将两个 PNG 放到 `assets/` 目录。
4. 提交到应用仓库。

缺少图标时页面可能还能打开，但安卓安装提示、manifest 校验和后续打包都会受影响。

`.nojekyll` 用来让 GitHub Pages 按静态文件方式发布整个目录。以后如果要部署 `/.well-known/assetlinks.json`，这个文件可以避免隐藏目录被 Pages 构建流程忽略。

本地预检：

```powershell
node --check src\app.js
node --check sw.js
node tests\run.mjs
```

再启动本地预览：

```powershell
node server.mjs
```

浏览器打开：

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/manifest.webmanifest
http://127.0.0.1:4173/sw.js
http://127.0.0.1:4173/assets/icon-512.png
http://127.0.0.1:4173/privacy.html
```

这些地址都正常后再推送。

## 3. 推送应用代码

如果使用用户主页仓库，远端地址类似：

```text
https://github.com/<你的用户名>/<你的用户名>.github.io.git
```

在项目目录执行：

```powershell
cd D:\Code\record
git init
git add .
git commit -m "feat: initial quick record pwa"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<你的用户名>.github.io.git
git push -u origin main
```

如果仓库已经初始化过，只需要确认远端并推送：

```powershell
git remote -v
git status
git push
```

## 4. 开启 GitHub Pages

进入应用仓库页面：

```text
Settings -> Pages
```

在 `Build and deployment` 中设置：

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

保存后等待 GitHub Pages 部署完成。用户主页仓库的访问地址是：

```text
https://<你的用户名>.github.io/
```

首次部署通常需要几十秒到几分钟；GitHub 官方文档提示，推送后的站点发布最多可能需要约 10 分钟。可以在仓库的 `Actions` 页面查看 Pages 构建状态；构建成功后，`Settings -> Pages` 会显示可访问地址。

如果打开后看到的是 README 或 404，优先检查：

- Pages 的 `Branch` 是否选中 `main`。
- `Folder` 是否是 `/ (root)`。
- `index.html` 是否在仓库根目录。
- 最新提交是否已经 push 到 GitHub。

## 5. 可选：绑定自定义域名

如果使用 `quick-record-app` 仓库，建议绑定自定义域名，例如：

```text
record.example.com
```

GitHub Pages 设置：

```text
Settings -> Pages -> Custom domain: record.example.com
勾选 Enforce HTTPS
```

DNS 侧常见配置：

```text
Type: CNAME
Name: record
Value: <你的用户名>.github.io
```

如果使用根域名，例如 `example.com`，通常需要配置 A/AAAA 记录指向 GitHub Pages 的地址；如果使用子域名，例如 `record.example.com`，优先用 CNAME。

DNS 生效后，访问地址变为：

```text
https://record.example.com/
```

这个地址位于域名根目录，和当前 PWA 路径设计匹配。

建议顺序：

1. 先在 GitHub Pages 的 `Custom domain` 填入域名并保存。
2. 再到 DNS 服务商添加 CNAME 或 A/AAAA 记录。
3. 等待 DNS 检查通过。
4. 勾选 `Enforce HTTPS`。

HTTPS 证书签发可能需要一段时间。如果 `Enforce HTTPS` 暂时不能勾选，先等 DNS 生效后再回来检查。

## 6. 验证部署

打开下面几个地址，确认都能返回正常内容：

```text
https://<你的用户名>.github.io/
https://<你的用户名>.github.io/manifest.webmanifest
https://<你的用户名>.github.io/sw.js
https://<你的用户名>.github.io/src/app.js
https://<你的用户名>.github.io/assets/icon-512.png
https://<你的用户名>.github.io/privacy.html
```

如果使用自定义域名，把域名替换成你的自定义域名。

如果 `manifest.webmanifest` 或 `sw.js` 访问 404，安卓安装会失败或退化成普通网页快捷方式。

也可以用 PowerShell 快速检查：

```powershell
$base = "https://<你的用户名>.github.io"
$paths = @("/", "/manifest.webmanifest", "/sw.js", "/src/app.js", "/assets/icon-192.png", "/assets/icon-512.png", "/privacy.html")
$paths | ForEach-Object {
  $r = Invoke-WebRequest -UseBasicParsing "$base$_"
  "$($r.StatusCode) $_ $($r.Headers['Content-Type'])"
}
```

期望所有路径都是 `200`。

## 7. 创建数据仓库 Token

进入 GitHub：

```text
头像 -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token
```

建议配置：

```text
Token name: quick-record-android
Repository access: Only select repositories
Selected repositories: quick-record-data
Repository permissions:
  Contents: Read and write
```

生成后复制 token。不要把 token 写进代码、README、截图或提交记录。

## 8. 安卓安装

在安卓 Chrome 打开 Pages 地址：

```text
https://<你的用户名>.github.io/
```

然后执行：

```text
右上角菜单 -> 添加到主屏幕 / 安装应用 -> 安装
```

安装完成后，桌面会出现 `Quick Record` 图标。以后从这个图标打开即可。

个人使用到这里就够了，不需要 Bubblewrap、APK、AAB 或 Google Play。

如果菜单里只有普通的 `添加到主屏幕`，没有安装体验，先检查：

- 页面是否是 HTTPS。
- `manifest.webmanifest` 是否能访问。
- `assets/icon-192.png` 和 `assets/icon-512.png` 是否能访问。
- `sw.js` 是否能访问，并且浏览器没有旧 service worker 缓存。

## 9. 配置 Quick Record 同步

首次打开 Quick Record 时，应用会提示配置 GitHub 同步。填写：

```text
Owner: 你的 GitHub 用户名
Repo: quick-record-data
Branch: main
Root Path: QuickRecord
Token: 第 7 步生成的 token
```

先点击 `测试连接`，成功后点击 `保存设置`。

每台设备都会把 token 存在自己的浏览器本地存储中，不会写入 GitHub 仓库。

## 10. 验证同步

1. 在安卓端输入一条测试记录。
2. 点击 `保存`。
3. 点击 `同步`。
4. 打开 GitHub 的 `quick-record-data` 仓库。
5. 确认出现类似路径：

```text
QuickRecord/
  records/
    2026/
      05/
        04/
          20260504-221301-dev12345-rec67890.md
```

看到 Markdown 文件后，说明安卓端已经成功同步到 GitHub。

## 11. 日常更新发布

修改应用或文档后：

```powershell
node tests\run.mjs
git status
git add .
git commit -m "docs: update github pages deployment flow"
git push
```

推送后等待 GitHub Pages 自动重新部署。

如果改了 `index.html`、`src/`、`manifest.webmanifest`、`assets/` 或 `privacy.html` 这类被 `sw.js` 缓存的文件，建议同时更新 `sw.js` 里的 `CACHE_NAME`，例如从：

```js
const CACHE_NAME = 'quick-record-v2';
```

改成：

```js
const CACHE_NAME = 'quick-record-v3';
```

这样安卓端更容易拿到新版本。若仍看到旧页面，可以在 Chrome 的站点设置里清除该站点数据后重新打开。

## 12. 常见问题

| 问题 | 可能原因 | 处理方式 |
| --- | --- | --- |
| Pages 地址 404 | Pages 未开启、分支/目录选错、部署未完成 | 检查 `Settings -> Pages` 和 `Actions`。 |
| 首页打开但没有样式 | `/src/styles.css` 404 | 确认使用根域名部署，不要用项目子路径。 |
| 安卓不能安装成应用 | manifest、图标或 service worker 访问失败 | 逐个打开验证地址，确认都是 `200`。 |
| 安装后一直是旧版本 | service worker 缓存旧资源 | 更新 `CACHE_NAME`，或清除站点数据后重开。 |
| 同步提示 token 无效 | token 过期、复制错误或权限不够 | 重新生成 fine-grained token，只授权 `quick-record-data`，`Contents` 设为 `Read and write`。 |
| 同步提示仓库不存在 | Owner、Repo、Branch 填错 | 检查大小写和分支名，确认数据仓库已有 `main` 分支。 |
| 自定义域名不能开启 HTTPS | DNS 未生效或域名未通过检查 | 等待 DNS 生效，确认 CNAME/A 记录正确后再勾选。 |
| 项目页路径下资源 404 | 当前代码使用 `/...` 根路径 | 改用用户主页仓库或自定义域名。 |

## 13. 如果必须使用项目页路径

不建议，但如果只能用：

```text
https://<你的用户名>.github.io/quick-record-app/
```

需要同步修改：

- `index.html` 中的 manifest、CSS 和 JS 路径。
- `manifest.webmanifest` 的 `start_url`、`scope`、图标路径。
- `src/app.js` 中的 service worker 注册路径。
- `sw.js` 中的缓存资源列表和离线回退路径。

这会让 PWA、service worker 和 Bubblewrap 配置都变复杂。个人使用时，用户主页仓库或自定义域名更稳。

## 14. 以后要打包安卓应用

个人使用不需要打包。如果以后想生成 APK/AAB，再使用 Bubblewrap：

```powershell
cd android-build
bubblewrap init --manifest https://<你的域名>/manifest.webmanifest
bubblewrap build --apk
```

如果要做 TWA 并去掉地址栏，还需要把 Bubblewrap 生成的数字资产链接部署到：

```text
https://<你的域名>/.well-known/assetlinks.json
```

使用 GitHub Pages 托管 `assetlinks.json` 时，保持仓库根目录存在 `.nojekyll`，并提交 `.well-known/assetlinks.json`。

这也是为什么建议使用用户主页根域名或自定义域名，而不是 GitHub Pages 项目子路径。

## 参考资料

- [GitHub Docs: Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [GitHub Docs: Configuring a publishing source for your GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Docs: Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Docs: Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
