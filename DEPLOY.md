# 部署指南 (Deployment Guide)

本项目支持 Docker 容器化部署，方便您快速部署到自己的服务器。

## 准备工作

1.  确保您的服务器已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。
2.  将项目代码上传到您的服务器。

## 部署步骤

### 方法一：使用 Docker Compose (推荐)

这是最简单的部署方式，只需一条命令。

1.  在项目根目录下运行：

    ```bash
    docker-compose up -d --build
    ```

    *   `--build`: 强制重新构建镜像。
    *   `-d`: 后台运行。

2.  部署完成后，应用将在 **3002** 端口运行。
    您可以通过浏览器访问 `http://your-server-ip:3002`。

3.  查看日志：

    ```bash
    docker-compose logs -f
    ```

4.  停止服务：

    ```bash
    docker-compose down
    ```

### 方法二：手动构建 Docker 镜像

如果您不使用 Docker Compose，可以手动构建和运行。

1.  构建镜像：

    ```bash
    docker build -t image-workshop .
    ```

2.  运行容器：

    ```bash
    docker run -d -p 3002:3002 \
      -v $(pwd)/public/uploads:/app/public/uploads \
      --name my-workshop \
      image-workshop
    ```

## 注意事项

*   **端口映射**：默认端口为 `3002`。如果您想使用 80 或 443 端口，可以使用 Nginx 进行反向代理，或者修改 `docker-compose.yml` 中的端口映射（例如 `"80:3002"`）。
*   **数据持久化**：`docker-compose.yml` 已经配置了 Volume，将上传的图片 (`/public/uploads`) 映射到了宿主机，因此即使重启容器，图片数据也不会丢失。
*   **前端构建**：Dockerfile 会自动执行 `npm run build`，将 React 前端构建为静态文件，并由后端 Node.js 服务统一托管。因此您不需要额外部署 Nginx 来托管前端。

## Nginx 反向代理配置示例 (可选)

如果您希望通过域名访问（例如 `workshop.example.com`），建议使用 Nginx。

```nginx
server {
    listen 80;
    server_name workshop.example.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
