#!/bin/bash
set -e

echo "=========================================="
echo "Coze 平台专用构建脚本: 系统级 Chromium 模式 (优化版)"
echo "=========================================="

# 1. 优先尝试 apt-get 安装系统 Chromium (速度快，稳定)
# Coze 环境通常支持 apt-get，这是最可靠的方式
echo ">>> [Step 1] 尝试安装系统级 Chromium..."
if command -v apt-get >/dev/null 2>&1; then
    # 避免更新失败导致脚本退出，加上 || true
    apt-get update || true
    
    # 安装 Chromium 及必要的图形库依赖
    # chromium-driver 包含了 chromium
    echo ">>> 正在通过 apt-get 安装依赖..."
    apt-get install -y chromium chromium-driver \
        libnss3 libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 \
        fonts-liberation libgbm1 xdg-utils
        
    echo ">>> ✅ 系统 Chromium 安装命令执行完成"
    
    # 验证安装位置
    if [ -f "/usr/bin/chromium" ]; then
        echo ">>> 验证成功: 找到 /usr/bin/chromium"
        chromium --version || true
    elif [ -f "/usr/bin/chromium-browser" ]; then
        echo ">>> 验证成功: 找到 /usr/bin/chromium-browser"
        chromium-browser --version || true
    else
        echo ">>> ⚠ 警告: apt-get 执行成功但未找到预期二进制文件"
    fi
else
    echo ">>> ⚠ 未发现 apt-get，跳过系统安装步骤"
fi

# 2. 安装 Python 依赖
echo ">>> [Step 2] 安装 Python 依赖..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi
pip install playwright==1.57.0

# 3. 备用方案: 只有在系统浏览器不存在时，才尝试 Playwright 自动下载
# 这样可以避免因网络超时导致的部署失败
if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
    echo ">>> ⚠ 未检测到系统浏览器，尝试使用 Playwright 下载 (可能会很慢)..."
    export PLAYWRIGHT_BROWSERS_PATH="$(pwd)/browsers"
    mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
    
    # 尝试下载，如果超时则忽略错误，让运行时去处理
    python -m playwright install chromium || echo ">>> ⚠ Playwright 下载失败或超时 (将依赖运行时修复)"
else
    echo ">>> ✅ 检测到系统浏览器，跳过 Playwright 下载"
fi

echo ">>> 构建脚本执行完毕"
