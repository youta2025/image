
## 私有仓库部署指南

如果您的 GitHub 仓库是私有的，服务器无法直接克隆代码。您需要配置身份验证。推荐使用 **SSH Deploy Key** 方式。

### 方法一：使用 SSH Deploy Key (推荐)

这种方法最安全，且只授予服务器对该特定仓库的只读权限。

1.  **在服务器上生成 SSH 密钥**：
    登录到您的服务器，运行：
    ```bash
    ssh-keygen -t ed25519 -C "deploy-key"
    ```
    (一路按回车即可，不要设置密码)

2.  **获取公钥内容**：
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
    复制输出的内容（以 `ssh-ed25519` 开头的一长串字符）。

3.  **添加到 GitHub**：
    *   打开您的 GitHub 仓库页面。
    *   进入 **Settings** -> **Deploy keys**。
    *   点击 **Add deploy key**。
    *   **Title**: 填写 "My VPS" 或任意名称。
    *   **Key**: 粘贴刚才复制的公钥内容。
    *   不要勾选 "Allow write access" (部署通常只需要读取权限)。
    *   点击 **Add key**。

4.  **在服务器上克隆代码**：
    现在您可以使用 SSH 地址来克隆了（注意是 `git@github.com:...` 而不是 `https://...`）：
    ```bash
    git clone git@github.com:your-username/image-workshop.git
    ```

### HTTPS / SSL 配置

为了满足 HTTPS 需求，本项目新增了 Nginx 容器来处理 SSL 终止。

1.  **准备 SSL 证书**：
    您需要将您的 SSL 证书文件（`server.crt` 和 `server.key`）放置在项目的 `nginx/ssl/` 目录下。
    *   `nginx/ssl/server.crt`
    *   `nginx/ssl/server.key`

    > 如果没有证书，可以使用 OpenSSL 生成自签名证书（仅用于测试）：
    > `openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/server.key -out nginx/ssl/server.crt`

2.  **端口映射**：
    *   **HTTP (3003)**: 会自动重定向到 HTTPS。
    *   **HTTPS (3004)**: 安全访问入口。

3.  **启动**：
    ```bash
    docker-compose up -d --build
    ```

    访问地址：`https://115.191.14.89:3004`

    > 注意：由于您使用的是非标准 HTTPS 端口 (3004)，浏览器访问时必须带上端口号。

### Cloudflare HTTPS Setup (推荐)

如果您希望使用 Cloudflare 提供的免费 HTTPS，有以下几种方式：

#### 方式一：快速临时隧道 (Quick Tunnel) - **最简单，无需域名**
这是您提到的生成 `trycloudflare.com` 网址的方法。它不需要您拥有域名，也不需要配置 DNS。

1.  **安装 cloudflared** (如果已安装可跳过):
    ```bash
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    ```

2.  **直接运行命令**:
    ```bash
    cloudflared tunnel --url http://localhost:3003
    ```

3.  **获取网址**:
    终端会输出一个类似这样的框，里面的 `https://xxxx-xxxx.trycloudflare.com` 就是您的公网 HTTPS 地址：
    ```
    +--------------------------------------------------------------------------------------------+
    |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
    |  https://haven-insertion-climb-must.trycloudflare.com                                    |
    +--------------------------------------------------------------------------------------------+
    ```
    *注意：这种方式生成的网址是临时的，每次重启命令网址可能会变。*

#### 方式二：绑定自定义域名 (稳定长期使用)
如果您希望使用固定的域名（如 `api.yourdomain.com`），请使用此方法。

1.  **登录 Cloudflare**:

    ```bash
    # 下载并安装
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    ```

2.  **登录 Cloudflare**:
    ```bash
    cloudflared tunnel login
    ```
    (这将给出一个 URL，复制到浏览器中登录并授权)

3.  **创建隧道**:
    ```bash
    cloudflared tunnel create my-tunnel
    ```
    (记下输出的 Tunnel ID)

4.  **配置路由 (DNS)**:
    将域名指向这个隧道：
    ```bash
    cloudflared tunnel route dns my-tunnel your-domain.com
    ```

5.  **运行隧道**:
    将隧道流量转发到本地应用 (端口 3003)：
    ```bash
    cloudflared tunnel run --url http://localhost:3003 my-tunnel
    ```

6.  **作为服务运行 (推荐)**:
    为了让隧道在后台稳定运行，建议将其安装为系统服务：
    ```bash
    cloudflared service install
    systemctl start cloudflared
    systemctl enable cloudflared
    ```

### 多项目部署说明

由于您服务器上已经运行了其他项目，为了避免端口冲突，本项目的 Docker 配置已默认将对外端口映射为 **3003**。

*   **容器内部端口**: 3002 (应用监听端口)
*   **宿主机对外端口**: 3003 (您访问的端口)

因此，部署后请访问：`http://115.191.14.89:3003`

如果 3003 端口也被占用，请修改 `docker-compose.yml` 中的 `ports` 部分：
```yaml
ports:
  - "3004:3002"  # 将 3003 改为其他未被占用的端口
```

### 方法二：使用 Personal Access Token (PAT)

如果您不想配置 SSH，也可以使用 HTTPS + Token。

1.  在 GitHub 生成 Token：**Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)** -> **Generate new token**。
2.  克隆时使用 Token 作为密码：
    ```bash
    git clone https://<your-username>:<your-token>@github.com/your-username/image-workshop.git
    ```

### API 调用示例

**使用新的 Cloudflare 地址：**
`https://practitioner-brothers-protest-owned.trycloudflare.com`

**cURL 示例：**
```bash
curl -X POST https://practitioner-brothers-protest-owned.trycloudflare.com/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://practitioner-brothers-protest-owned.trycloudflare.com/uploads/your-image-id.jpg",
    "options": {
      "subtitle": "STEP 01 接收用户指令",
      "themeColor": "#3B82F6",
      "textColor": "#cccccc",
      "footerColor": "#000000",
      "footerOpacity": 0.7,
      "strokeWidth": 4,
      "borderStyle": "double",
      "borderRadius": { "tl": 20, "tr": 20, "bl": 20, "br": 20 },
      "perspective": true
    }
  }'
```

> **注意**：新增的 `"perspective": true` 参数可以开启 3D 透视变形效果。为了支持此功能，您需要重新构建 Docker 镜像（因为需要安装系统依赖 ImageMagick）。
>
> **更新部署命令**：
> ```bash
> git pull
> docker-compose up -d --build
> ```
