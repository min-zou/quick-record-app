# Bubblewrap JDK 下载失败 - 手动解决方案

## 问题原因

Bubblewrap 自动下载的 JDK 17 压缩包损坏或网络中断，导致解压失败：
```
cli ERROR end of central directory record signature not found
```

## 解决方案

### 方案 A：使用本地已安装的 JDK（推荐）

你的系统已安装 **OpenJDK 21**（位于 `C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot`），可以直接使用。

**步骤：**

1. **清理损坏的下载**
   ```powershell
   Remove-Item -Recurse -Force "$env:USERPROFILE\.bubblewrap\jdk"
   ```

2. **设置 JAVA_HOME 环境变量**
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
   ```

3. **运行 Bubblewrap 并选择不使用自动 JDK**
   ```powershell
   bubblewrap init --manifest https://your-domain.com/manifest.webmanifest
   ```
   
   当问到 `Do you want Bubblewrap to install the JDK?` 时输入 **N**

4. **同样对 Android SDK 问题选择 N**
   如果问你 `Do you want Bubblewrap to install the Android SDK?` 也输入 **N**
   
   然后你需要手动安装 Android SDK 命令行工具。

### 方案 B：手动下载 JDK 17

如果必须使用 JDK 17：

1. 访问 https://adoptium.net/temurin/releases/?version=17
2. 下载 Windows x64 MSI 安装包
3. 安装到默认位置
4. 设置 `JAVA_HOME` 指向安装目录
5. 重新运行 `bubblewrap init`

### 方案 C：使用 PWABuilder（更简单）

如果不想处理命令行工具，可以使用微软的在线工具：

1. 访问 https://www.pwabuilder.com/
2. 输入你的 PWA 网址
3. 点击 "Package for Stores"
4. 选择 "Google Play Store"
5. 下载生成的 AAB 文件

PWABuilder 是云端打包，不需要本地安装 JDK 或 Android SDK。

## 手动回答 Bubblewrap 的问题

运行 `bubblewrap init` 时需要回答以下问题：

```
? Do you want Bubblewrap to install the JDK? (Y/n) → N
? Do you want Bubblewrap to install the Android SDK? (Y/n) → N
? Application name: Quick Record
? Short name: Record
? Package name: (com.example.quickrecord) → com.yourcompany.quickrecord
? Version name: (1.0.0) → 1.0.0
? Version code: (1) → 1
? Display mode: (standalone) → standalone
? Orientation: (portrait) → portrait
? Theme color: (#f7f4ec) → #f7f4ec
? Background color: (#f7f4ec) → #f7f4ec
? Start URL: (/) → /
? Icon URL: (https://your-domain.com/assets/icon-512.png) → 回车
? Maskable icon URL: (https://your-domain.com/assets/icon-512.png) → 回车
? Include app shortcuts? (Y/n) → N
? Key store location: (android.keystore) → 回车
? Key name: (android) → quickrecord
? Key store password: → 输入密码（记住它！）
? Key password: → 输入密码（记住它！）
```

## 签名密钥备份

**非常重要！**

生成的 `android.keystore` 文件是你更新应用的唯一凭证。丢失后无法更新应用。

请：
1. 备份 `android.keystore` 文件到安全位置
2. 记录密钥密码和别名密码
3. 考虑启用 Google Play App Signing 作为额外保护

## 下一步

初始化成功后：

```powershell
# 构建 AAB（用于 Google Play）
bubblewrap build

# 或构建 APK（用于本地测试）
bubblewrap build --apk
```
