# 安卓端 PWA 安装与同步教程

这是 Quick Record 在安卓端运行的标准方案：**应用部署为 HTTPS PWA，记录数据单独同步到私有 GitHub 仓库**。

## 固定规则

- 安卓端不依赖本机 `git`、Termux 或原生 SQLite。
- 应用代码放在一个仓库，例如 `quick-record-app`。
- 用户记录放在单独的私有仓库，例如 `quick-record-data`。
- 每条记录保存为一个独立 Markdown 文件，方便 GitHub 同步和 Obsidian 读取。

## 1. 创建 GitHub 仓库

在 GitHub 创建两个仓库：

```text
quick-record-app   # 存放当前应用代码
quick-record-data  # 存放记录数据，建议设为 Private
```

创建 `quick-record-data` 时勾选 `Add a README file`，这样仓库会自动拥有 `main` 分支。

## 2. 推送应用代码

在电脑上进入项目目录：

```powershell
cd D:\Code\record
git init
git add .
git commit -m "feat: initial quick record pwa"
git branch -M main
git remote add origin https://github.com/<你的用户名>/quick-record-app.git
git push -u origin main
```

如果 Git 提示缺少用户名或邮箱，先执行：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

## 3. 创建 GitHub Token

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

## 4. 部署应用到 Cloudflare Pages

进入 Cloudflare 控制台：

```text
Workers & Pages -> Create application -> Pages -> Connect to Git
```

选择 `quick-record-app` 仓库，构建配置填写：

```text
Framework preset: None
Production branch: main
Build command: 留空
Build output directory: .
```

部署完成后会得到一个地址，例如：

```text
https://quick-record-app.pages.dev
```

## 5. 安卓安装应用

在安卓 Chrome 中打开 Cloudflare Pages 地址：

```text
https://quick-record-app.pages.dev
```

然后：

```text
右上角菜单 -> 添加到主屏幕 / 安装应用 -> 安装
```

安装完成后，桌面会出现 `Quick Record` 图标。以后从这个图标打开即可。

## 6. 配置 GitHub 同步向导

首次打开 Quick Record 时，如果还没有同步配置，应用会自动打开 `GitHub 同步` 设置窗口。也可以手动点击右上角 `设置`。

设置窗口按三步组织：

```text
数据仓库 -> 访问令牌 -> 连接测试
```

填写：

```text
Owner: 你的 GitHub 用户名
Repo: quick-record-data
Branch: main
Root Path: QuickRecord
Token: 第 3 步生成的 token
```

先点击 `测试连接`。如果 owner、repo、branch 或 token 有问题，应用会显示对应错误原因。连接成功后点击 `保存设置`，应用会自动拉取一次远端记录。

每台设备都会把 token 存在自己的浏览器本地存储中，不会写入 GitHub 仓库。

## 7. 验证同步

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

如果同步失败，最近记录中会保留 `待同步` 或 `同步失败` 状态，并显示失败原因。修正配置或网络后再次点击 `同步` 即可重试。

## 8. Windows 和 Ubuntu 使用

Windows 和 Ubuntu 不需要单独安装客户端，直接打开同一个 PWA 地址：

```text
https://quick-record-app.pages.dev
```

填写同一套 GitHub 同步配置即可。每台设备本地各自保存 IndexedDB 数据，通过 `quick-record-data` 仓库交换记录。

常见错误含义：

| 提示 | 处理方式 |
| --- | --- |
| token 无效或已过期 | 重新生成 fine-grained token。 |
| 权限不足 | 确认 `Contents` 权限是 `Read and write`。 |
| 仓库、分支或路径不存在 | 检查 Owner、Repo 和 Branch。 |
| API 频率限制 | 稍后再同步。 |
| 远端文件冲突 | 应用会保留本地待同步记录，可再次同步。 |

## 9. Obsidian 联动

推荐把 `quick-record-data` 仓库克隆到 Obsidian vault 中，例如：

```text
ObsidianVault/
  QuickRecord/
    records/
```

桌面端可以使用 Obsidian Git 插件定期 pull。安卓端先用 Quick Record 快速记录，之后在 Obsidian 中整理。
