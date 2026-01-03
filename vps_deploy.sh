#!/bin/bash

# 部署脚本 (在服务器上运行)

# 1. 检查是否安装 Docker
if ! command -v docker &> /dev/null; then
    echo "未检测到 Docker，正在安装..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# 2. 检查是否安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "未检测到 Docker Compose，正在安装..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 3. 拉取最新代码
echo "正在拉取最新代码..."
git pull origin main || {
    echo "拉取失败，尝试重新克隆..."
    cd ..
    rm -rf image
    # 注意：这里假设您已经配置好了 SSH Key 或者 Token
    # 如果是私有仓库，请确保服务器有权限
    git clone https://github.com/youta2025/image.git
    cd image
}

# 4. 启动服务
echo "正在启动服务..."
# 停止旧容器
docker-compose down
# 构建并启动新容器
docker-compose up -d --build

echo "部署完成！"
echo "请访问: http://$(curl -s ifconfig.me):3003"
