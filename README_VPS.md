# ☁️ VPS 私有服务器部署指南

如果您拥有一台云服务器（如阿里云、腾讯云、AWS、DigitalOcean），您可以自己部署这个服务。
**优势**：
1. **IP 固定**：比共享的 Render/Railway IP 更稳定，不容易被抖音风控。
2. **数据持久化**：生成的截图文件会永久保存在服务器上，不会重启消失。
3. **性能更强**：没有冷启动时间，响应更快。

---

## 🚀 部署步骤 (以 Ubuntu/Debian 为例)

### 1. 准备环境
登录您的服务器，安装 Docker 和 Git：

```bash
# 更新系统
sudo apt-get update

# 安装 Docker (如果没有)
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
sudo apt-get install -y docker-compose-plugin
# 或者旧版
sudo apt-get install -y docker-compose
```

### 2. 获取代码
```bash
# 拉取代码
git clone https://github.com/youta2025/coze.git
cd coze
```

### 3. 启动服务
只需一行命令：

```bash
sudo docker compose up -d --build
```
*(如果是旧版 docker-compose，使用 `sudo docker-compose up -d --build`)*

### 4. 验证
部署完成后，服务会在 **3002** 端口运行。

测试命令（在服务器上）：
```bash
curl http://localhost:3002/api/health
```

### 5. 公网访问
您可以通过 IP 直接访问：
`http://<您的服务器IP>:3002/api/screenshot`

或者配置 Nginx 反向代理绑定域名（推荐）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ⚠️ 常见问题

**Q: 截图还是白屏？**
A: 即使是私有服务器，数据中心 IP 也可能被标记。如果遇到这种情况，您需要：
1. 购买一个 **住宅 IP 代理 (Residential Proxy)**。
2. 在代码中配置代理（我可以帮您修改代码支持代理）。

**Q: 如何查看日志？**
```bash
sudo docker compose logs -f
```

**Q: 如何更新代码？**
```bash
git pull
sudo docker compose up -d --build
```
