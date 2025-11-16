# 项目启动指南

## 前置要求

- Node.js 18+ 
- npm 或 pnpm

## 安装步骤

### 1. 安装前端依赖

```powershell
npm install
```

### 2. 安装后端依赖

```powershell
cd server
npm install
cd ..
```

### 3. 配置 DeepSeek API Key

编辑 `server/.env` 文件：

```env
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
PORT=3000
```

⚠️ **重要**：请将 `sk-your-actual-api-key-here` 替换为你的真实 API Key

## 运行项目

### 方式 1：同时启动前后端（推荐）

```powershell
npm run dev:all
```

这会同时启动：
- 后端服务：http://localhost:3000
- 前端服务：http://localhost:5173

### 方式 2：分别启动

**终端 1 - 启动后端：**

```powershell
npm run dev:server
```

等待输出：
```
🚀 服务器运行在 http://localhost:3000
✅ API Key 已配置: 是
```

**终端 2 - 启动前端：**

```powershell
npm run dev
```

## 验证

### 1. 检查后端是否运行

在浏览器访问：http://localhost:3000/health

应该看到：
```json
{"status":"ok","message":"服务器运行中"}
```

### 2. 检查前端

访问：http://localhost:5173

应该能看到聊天界面

## 架构说明

```
┌─────────────┐          HTTP          ┌─────────────┐
│   浏览器     │ ──────────────────────> │  后端代理    │
│ (React App) │ <- /api/chat 请求       │  (Node.js)  │
│ Port: 5173  │                         │  Port: 3000 │
└─────────────┘                         └──────┬──────┘
                                               │
                                               │ HTTPS
                                               │ Authorization: Bearer sk-xxx
                                               ▼
                                        ┌─────────────┐
                                        │ DeepSeek API│
                                        │ (云端)       │
                                        └─────────────┘
```

**关键改进**：
- ✅ API Key 存储在后端 `server/.env`，不会暴露到浏览器
- ✅ 前端通过本地后端代理调用 DeepSeek API
- ✅ 其他功能（知识库匹配、UI 交互）完全不变

## 故障排查

### 问题 1：后端无法启动

```
Error: 服务器未配置 DEEPSEEK_API_KEY
```

**解决**：检查 `server/.env` 文件是否正确配置

---

### 问题 2：前端调用失败

浏览器控制台显示：
```
Failed to fetch
```

**解决**：
1. 确认后端已启动（访问 http://localhost:3000/health）
2. 检查 `.env` 中的 `VITE_API_URL` 是否为 `http://localhost:3000`

---

### 问题 3：CORS 错误

```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**解决**：后端已配置 CORS，如果仍有问题，检查 `server/server.js` 中的 `cors()` 配置

---

### 问题 4：端口占用

```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决**：
- 方式 1：关闭占用 3000 端口的程序
- 方式 2：修改 `server/.env` 中的 `PORT` 为其他端口（如 3001），并同步修改前端 `.env` 中的 `VITE_API_URL`

## 生产部署

### 后端部署

```bash
cd server
node server.js
```

### 前端部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到静态服务器（Nginx、Vercel 等）

**注意**：生产环境需修改 `.env` 中的 `VITE_API_URL` 为实际的后端地址
