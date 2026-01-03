
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
