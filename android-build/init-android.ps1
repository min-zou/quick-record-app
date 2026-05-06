# Quick Record Android 工程初始化脚本
# 使用方法: 在 PowerShell 中运行 ./init-android.ps1

$ErrorActionPreference = "Stop"

# 设置环境变量
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green

# 清理之前失败的下载
$bwDir = "$env:USERPROFILE\.bubblewrap"
if (Test-Path "$bwDir\jdk") {
    Write-Host "清理损坏的 JDK 下载..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "$bwDir\jdk"
}

# 创建临时输入文件来回答 bubblewrap 的交互式问题
$inputFile = "$env:TEMP\bw-input.txt"
@"
N
N
Quick Record
Record
com.example.quickrecord
Y
"@ | Set-Content -Path $inputFile -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始初始化 Bubblewrap Android 工程" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "注意: 这个脚本使用本地已安装的 JDK 21" -ForegroundColor Yellow
Write-Host "如果后续构建失败，请手动安装 JDK 17" -ForegroundColor Yellow
Write-Host ""

# 运行 bubblewrap init，通过管道输入答案
Get-Content $inputFile | bubblewrap init --manifest https://your-domain.com/manifest.webmanifest

Write-Host ""
Write-Host "初始化完成!" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Cyan
Write-Host "1. 编辑 app/build.gradle 检查 compileSdk 和 targetSdk" -ForegroundColor White
Write-Host "2. 运行 bubblewrap build 生成 AAB" -ForegroundColor White
