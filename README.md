# Model Arena - LLM 评估与竞技场

Model Arena 是一个基于 Next.js 构建的现代化大语言模型（LLM）评估平台。它允许用户在直观的界面中并排比较不同模型的输出，支持对话（Chat）和代码（Code）两种对比模式，帮助开发者和研究人员快速评估模型性能。

## ✨ 主要功能

- **多模型支持**：支持 OpenAI, Anthropic, OpenRouter 以及自定义兼容 OpenAI 接口的模型。
- **双模对比竞技场**：
  - **对话模式 (Chat Compare)**：并排展示两个模型的对话响应，直观对比回复质量。
  - **代码模式 (Code Compare)**：专门针对代码生成的对比视图，支持语法高亮和预览。
- **灵活配置**：用户可直接在界面中管理模型配置（API Key, Base URL 等）。
- **历史记录**：自动保存评估会话，方便随时回顾和分析。
- **安全认证**：集成 NextAuth.js，支持 Google OAuth 登录，确保数据安全。
- **现代化 UI**：基于 Tailwind CSS 和 Lucide React 构建的响应式、极简主义界面。
- **Docker 部署**：提供完整的 Docker 支持，轻松部署到生产环境。

## 🛠️ 技术栈

- **框架**: [Next.js 15](https://nextjs.org) (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **认证**: NextAuth.js
- **数据库**: SQLite (better-sqlite3)
- **AI 集成**: Vercel AI SDK, OpenAI SDK, Anthropic SDK
- **图标**: Lucide React

## 🚀 快速开始 (本地开发)

### 前置要求

- Node.js 18+ 
- npm / yarn / pnpm / bun

### 1. 克隆项目

```bash
git clone <repository-url>
cd model-arena
```

### 2. 安装依赖

```bash
npm install
# 或者
yarn install
# 或者
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env.local` 并填入必要的配置信息：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key # 可以使用 `openssl rand -base64 32` 生成

# Google OAuth (用于登录)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> **注意**: 获取 Google OAuth 凭证请访问 [Google Cloud Console](https://console.cloud.google.com/)。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可看到应用。

## 🐳 Docker 部署

本项目已针对 Docker 部署进行了优化（Standalone 模式）。

### 前置要求

- Docker & Docker Compose
- 一个名为 `proxy-network` 的 Docker 网络（可选，如果不需要反向代理集成可修改 docker-compose.yml）

### 部署步骤

1. **创建 Docker 网络** (如果尚未创建):
   ```bash
   docker network create proxy-network
   ```

2. **配置环境变量**:
   修改 `docker-compose.yml` 中的 `environment` 部分，填入你的生产环境配置：
   - `NEXTAUTH_URL`: 你的生产环境域名 (例如 `https://eval.yourdomain.com`)
   - `NEXTAUTH_SECRET`: 生成的安全密钥
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth 凭证

3. **构建并启动**:
   ```bash
   docker-compose up -d --build
   ```

4. **访问应用**:
   容器将在 `proxy-network` 网络中的 `3000` 端口运行。如果你需要直接访问，请取消 `docker-compose.yml` 中 `ports` 部分的注释。

## 📂 项目结构

```
model-arena/
├── app/                 # Next.js App Router 页面和 API 路由
│   ├── api/             # 后端 API (Config, Chat, Auth)
│   ├── login/           # 登录页面
│   └── page.tsx         # 主应用界面 (Model Arena)
├── components/          # React 组件
│   ├── ChatInterface    # 对话对比界面
│   ├── CodeCompare...   # 代码对比界面
│   └── Sidebar          # 侧边栏导航
├── lib/                 # 工具库
│   ├── auth.ts          # 认证配置
│   ├── db.ts            # 数据库操作 (SQLite)
│   └── types.ts         # TypeScript 类型定义
├── public/              # 静态资源
└── ...配置文件
```

## 📝 使用指南

1. **登录**: 使用 Google 账号登录系统。
2. **添加模型**: 在侧边栏或设置中，添加你想要评估的模型配置（选择提供商，输入 API Key 和 Model ID）。
3. **选择模型**: 在主界面的 "Model A" 和 "Model B" 下拉框中选择已配置的模型。
4. **开始评估**:
   - **Chat 模式**: 输入提示词，观察两个模型的回复差异。
   - **Code 模式**: 要求模型生成代码，使用 "Preview" 功能查看渲染效果。

## 🤝 贡献

欢迎提交 Pull Request 或 Issue 来改进这个项目！

## 📄 许可证

[MIT](LICENSE)
