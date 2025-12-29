# 部署指南

## 第一步：重启 Trae
刚刚我们为您安装了 Git，但需要重启 IDE (关闭并重新打开 Trae) 才能让系统识别到 Git 命令。

## 第二步：推送代码到 GitHub

重启后，请在 Trae 的终端中依次运行以下命令：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交代码
git commit -m "Initial commit"

# 4. 关联 GitHub 仓库
# 注意：请先在 GitHub 上创建一个空仓库，然后用您的仓库地址替换下面的 URL
git remote add origin https://github.com/您的用户名/您的仓库名.git

# 5. 推送代码
git push -u origin master
```

## 第三步：部署到服务器

推荐使用 **Render** 或 **Railway** 进行部署，它们对 Docker 支持良好且配置简单。

### 方案 A：使用 Render (推荐)
1. 注册并登录 [Render.com](https://render.com)
2. 点击 **New +** -> **Web Service**
3. 连接您的 GitHub 账号并选择刚刚推送的仓库
4. Render 会自动识别 `Dockerfile`
5. 点击 **Create Web Service** 等待部署完成

### 方案 B：使用 Railway
1. 注册并登录 [Railway.app](https://railway.app)
2. 点击 **New Project** -> **Deploy from GitHub repo**
3. 选择您的仓库
4. Railway 会自动开始构建和部署

## 注意事项
- 部署完成后，您将获得一个公网域名（例如 `https://xxx.onrender.com`）。
- 请在 Coze 中将 API 地址更新为这个新域名。
