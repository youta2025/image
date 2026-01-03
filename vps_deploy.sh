#!/bin/bash

# 1. 更新系统软件包
echo "正在更新系统..."
apt-get update

# 2. 安装 Docker 和 Git
echo "正在安装 Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
else
    echo "Docker 已安装"
fi

echo "正在安装 Git..."
apt-get install -y git docker-compose-plugin

# 3. 拉取代码
# 注意：如果仓库是私有的，这里需要手动输入账号密码，或者使用 Personal Access Token
echo "正在拉取代码..."
if [ -d "coze" ]; then
    echo "目录 coze 已存在，正在更新..."
    cd coze
    git pull
else
    git clone https://github.com/youta2025/coze.git
    cd coze
fi

# 4. 启动服务
echo "正在启动服务..."
docker compose down
docker compose up -d --build

# 5. 检查状态
echo "部署完成！正在检查服务状态..."
sleep 5
curl -v http://localhost:3002/api/health

echo ""
echo "----------------------------------------"
echo "服务已在后台运行。"
echo "查看日志请运行: docker compose logs -f"
echo "公网访问地址: http://$(curl -s ifconfig.me):3002/api/screenshot"
echo "----------------------------------------"
