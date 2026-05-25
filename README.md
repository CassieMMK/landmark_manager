# 🌍 地标管理系统 (Landmark Manager)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://landmark-manager.vercel.app/)

这是一个基于 React 和 Supabase 开发的高级地标管理系统，集成了交互式地图可视化、GIS（地理信息系统）工具以及云端数据库同步功能。

### 🔗 在线访问地址
🚀 **[https://landmark-manager.vercel.app/](https://landmark-manager.vercel.app/)**

## ✨ 功能特性

-   **交互式地图可视化**：动态投影坐标，支持缩放、平移和地标点选。
-   **GIS 工具箱**：
    -   **邻近搜索 (GEORADIUS)**：基于给定坐标 and 半径搜索周边的地标。
    -   **距离测量 (GEODIST)**：计算两个地标之间的哈弗辛 (Haversine) 距离。
-   **云端数据库同步**：集成 Supabase (PostgreSQL)，实现数据的实时增删改查。
-   **响应式设计**：完美适配桌面端和移动端浏览器。
-   **现代化 UI**：使用 Tailwind CSS 构建，拥有流畅的动画和专业的 GIS 风格界面。

## 🛠️ 技术栈

-   **前端**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
-   **后端/数据库**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **部署**: [Vercel](https://vercel.com/) (Supports Serverless Functions)
-   **图标**: [Lucide React](https://lucide.dev/)

## 🚀 本地开发指南

### 1. 克隆项目
```bash
git clone <your-repository-url>
cd landmark_manager
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
在项目根目录创建 `.env` 文件，并填写你的 Supabase 配置：
```env
VITE_SUPABASE_URL=你的_SUPABASE_项目_URL
VITE_SUPABASE_ANON_KEY=你的_SUPABASE_匿名_KEY
```
你可以参考 `.env.example` 文件进行配置。

### 4. 初始化数据库
登录 [Supabase 控制台](https://app.supabase.com/)，在 **SQL Editor** 中运行项目根目录下的 `supabase_schema.sql` 文件，以创建 `landmarks` 表及其安全策略。

### 5. 启动开发服务器
```bash
npm run dev
```
访问 `http://localhost:3000` 即可查看。