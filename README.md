# 知识驱动喵系聊天机器人

一个用于课程作业的 React + TypeScript 前端项目，展示“本地知识库优先 + DeepSeek 兜底”的多轮对话流程，并加入了傲娇猫娘人格以及耄耋系列情绪插图。

## 功能亮点

- **多轮对话界面**：消息以气泡形式呈现，可自动滚动。
- **本地知识检索**：从 `src/knowledgeBase.json` 匹配问答，命中即直接回答。
- **DeepSeek 接入**：未命中时调用 DeepSeek API，并附带傲娇猫娘口癖。
- **情绪插画**：根据状态切换“耄耋送花/疑惑/行政/愤怒”插图。
- **防刷机制**：连续提问超过 5 次会触发“本喵也是要休息的！”提示。

## 快速开始

```bash
# 安装依赖
npm install

# 复制示例环境变量
copy .env.example .env
# 或者手动创建 .env 并写入：
# VITE_DEEPSEEK_API_KEY=你的密钥

# 运行开发服务器
npm run dev
```

访问终端输出的本地地址（默认 <http://localhost:5173>）即可体验。

## 项目结构

```text
Knowledge/
├─ image/                     # 耄耋表情图片
├─ src/
│  ├─ App.tsx                 # 主界面与业务逻辑
│  ├─ App.css                 # 样式（玻璃拟态 + 猫猫元素）
│  ├─ assets/index.ts         # 表情图片导出
│  ├─ knowledgeBase.json      # 本地知识库（示例数据）
│  ├─ knowledgeSample.ts      # 空库时的占位样例
│  ├─ services/
│  │  ├─ deepseekService.ts   # DeepSeek API 封装
│  │  └─ knowledgeService.ts  # 简易相似度匹配逻辑
│  ├─ types.ts                # 类型定义
│  └─ main.tsx                # React 入口
├─ .env.example               # 环境变量示例
├─ package.json               # NPM 配置
└─ README.md                  # 使用说明（当前文件）
```

## 自定义指南

- **补充知识库**：编辑 `src/knowledgeBase.json`，按照 `question` 和 `answer` 键值对追加内容。
- **调整口癖**：修改 `src/App.tsx` 中的 `SYSTEM_PROMPT`。
- **替换插图**：将 `image/` 文件夹内同名图片替换为自己的素材。

## 常见问题

- **DeepSeek 调用失败**：确认 `.env` 中的 `VITE_DEEPSEEK_API_KEY` 已填写并重新启动。
- **未从知识库命中**：检查问题文本是否与 `question` 相似，可在 `findBestKnowledgeMatch` 中调低阈值。
- **样式调整**：修改 `src/App.css` 即可，已使用普通 CSS，易于定制。

祝你展示顺利，喵！
