# 知识驱动喵系聊天机器人

一个用于练习的 React + TypeScript 前端项目，展示“本地知识库优先 + DeepSeek 兜底”的多轮对话流程，并加入了傲娇猫娘人格以及耄耋系列情绪插图。

## 功能亮点

- **多轮对话界面**：消息以气泡形式呈现，可自动滚动。
- **本地知识检索**：从 `src/knowledgeBase.json` 匹配问答，命中即直接回答。
- **DeepSeek 接入**：未命中时调用 DeepSeek API，并附带傲娇猫娘口癖。
- **情绪插画**：根据状态切换“耄耋送花/疑惑/行政/愤怒”插图。
- **防刷机制**：连续提问超过 5 次会触发“本喵也是要休息的！”提示。

## 快速开始

```bash
# 1. 安装前端依赖
npm install

# 2. 安装后端依赖
cd server
npm install
cd ..

# 3. 配置 API Key（重要！）
# 编辑 server/.env 文件，填入你的 DeepSeek API Key：
# DEEPSEEK_API_KEY=sk-your-api-key-here

# 4. 同时启动前后端（推荐）
npm run dev:all

# 或者分别启动：
# 终端 1：启动后端（端口 3000）
npm run dev:server

# 终端 2：启动前端（端口 5173）
npm run dev
```

访问 [http://localhost:5173](http://localhost:5173) 即可体验。

**注意**：

- API Key 现在存储在 `server/.env` 中，**不会暴露到浏览器**
- 前端通过 `http://localhost:3000` 调用后端代理接口
- 后端会代理请求到 DeepSeek API

## 项目结构

```text
Knowledge/
├─ server/                    # 后端代理服务器
│  ├─ server.js              # 简单的 Express 服务器
│  ├─ package.json           # 后端依赖
│  └─ .env                   # API Key 配置（重要！）
├─ image/                     # 耄耋表情图片
├─ src/
│  ├─ App.tsx                 # 主界面与业务逻辑
│  ├─ App.css                 # 样式（玻璃拟态 + 猫猫元素）
│  ├─ assets/index.ts         # 表情图片导出
│  ├─ knowledgeBase.json      # 本地知识库（示例数据）
│  ├─ knowledgeSample.ts      # 空库时的占位样例
│  ├─ services/
│  │  ├─ deepseekService.ts   # 调用后端代理接口
│  │  └─ knowledgeService.ts  # 简易相似度匹配逻辑
│  ├─ types.ts                # 类型定义
│  └─ main.tsx                # React 入口
├─ .env                       # 前端环境变量（后端地址）
├─ package.json               # 前端 NPM 配置
└─ README.md                  # 使用说明（当前文件）
```

## 自定义指南

- **补充知识库**：编辑 `src/knowledgeBase.json`，按照 `question` 和 `answer` 键值对追加内容。
- **调整口癖**：修改 `src/App.tsx` 中的 `SYSTEM_PROMPT`。
- **替换插图**：将 `image/` 文件夹内同名图片替换为自己的素材。

## 常见问题

- **后端无法启动**：

  1. 确认 `server/.env` 中的 `DEEPSEEK_API_KEY` 已填写
  2. 检查端口 3000 是否被占用
  3. 确保已在 `server` 目录下运行 `npm install`
- **前端调用失败**：

  1. 确认后端服务已启动（访问 http://localhost:3000/health 应返回 `{"status":"ok"}`）
  2. 检查浏览器控制台是否有 CORS 错误
  3. 确认 `.env` 中的 `VITE_API_URL` 正确指向后端地址
- **DeepSeek 调用失败**：

  1. 验证 API Key 是否正确
  2. 检查网络连接
  3. 查看后端终端输出的错误信息
- **未从知识库命中**：检查问题文本是否与 `question` 相似，可在 `findBestKnowledgeMatch` 中调低阈值。
- **样式调整**：修改 `src/App.css` 即可，已使用普通 CSS，易于定制。

祝你展示顺利，喵！
