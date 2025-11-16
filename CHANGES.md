# 改造说明

## 改动概览

本次改造将 **API Key 从前端移至后端**，确保密钥安全性。

### 改动文件清单

#### 新增文件
- `server/server.js` - 后端代理服务器（50行代码）
- `server/package.json` - 后端依赖配置
- `server/.env` - API Key 配置（敏感信息）
- `server/.env.example` - 环境变量模板
- `SETUP.md` - 详细启动指南
- `start.bat` - Windows 批处理启动脚本
- `start.ps1` - PowerShell 启动脚本
- `CHANGES.md` - 本文件

#### 修改文件
- `src/services/deepseekService.ts` - 改为调用本地后端代理
- `src/App.tsx` - 移除 API Key 配置
- `.env` - 移除 API Key，添加后端地址配置
- `package.json` - 添加后端启动脚本
- `README.md` - 更新使用说明
- `.gitignore` - 添加环境变量忽略规则

#### 未改动文件
- `src/services/knowledgeService.ts` - 知识库匹配逻辑
- `src/App.css` - 样式
- `src/types.ts` - 类型定义
- 所有其他组件和资源文件

---

## 技术细节

### 前端改动

**src/services/deepseekService.ts**
```typescript
// 之前：直接调用 DeepSeek API
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,  // API Key 暴露在前端
  }
});

// 现在：调用本地后端代理
const response = await fetch('http://localhost:3000/api/chat', {
  headers: {
    'Content-Type': 'application/json',  // 不需要 Authorization
  }
});
```

**src/App.tsx**
```typescript
// 之前
const deepseekConfig = {
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
};

// 现在
const deepseekConfig = {
  // API Key 已移至后端
};
```

### 后端实现

**server/server.js** 核心逻辑：
```javascript
app.post('/api/chat', async (req, res) => {
  // 1. 从环境变量读取 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  // 2. 接收前端请求
  const { messages, model, temperature, max_tokens } = req.body;
  
  // 3. 转发到 DeepSeek API
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // API Key 在后端使用
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens })
  });
  
  // 4. 返回结果给前端
  const data = await response.json();
  res.json(data);
});
```

---

## 安全性改进

### 之前的问题
1. ❌ API Key 存储在 `.env` 中，但通过 `VITE_` 前缀暴露到浏览器
2. ❌ 用户可以在浏览器开发者工具中看到完整的 API Key
3. ❌ 任何人都可以复制你的 API Key 并滥用

### 现在的优势
1. ✅ API Key 存储在 `server/.env`，仅服务器可访问
2. ✅ 浏览器永远看不到真实的 API Key
3. ✅ 即使有人查看前端源代码，也无法获取密钥
4. ✅ 可以在后端添加速率限制、用量监控等安全措施

---

## 启动流程

### 开发环境

**方式 1：一键启动（推荐）**
```powershell
# Windows PowerShell
.\start.ps1

# 或者 CMD
start.bat
```

**方式 2：使用 npm 脚本**
```powershell
npm run dev:all
```

**方式 3：手动启动**
```powershell
# 终端 1
cd server
npm run dev

# 终端 2
npm run dev
```

### 生产环境

**后端**
```bash
cd server
PORT=3000 DEEPSEEK_API_KEY=sk-xxx node server.js
```

**前端**
```bash
# 构建
VITE_API_URL=https://your-backend.com npm run build

# 部署 dist/ 目录到静态服务器
```

---

## 测试清单

- [ ] 后端健康检查：访问 http://localhost:3000/health
- [ ] 前端界面正常：访问 http://localhost:5173
- [ ] 知识库匹配正常：输入 "什么是人工智能？"
- [ ] DeepSeek 调用正常：输入一个知识库没有的问题
- [ ] 错误处理正常：临时关闭后端，前端应显示错误提示

---

## 依赖说明

### 前端新增依赖
- `concurrently` (开发依赖) - 同时运行前后端

### 后端依赖
- `express` - Web 框架
- `cors` - 跨域支持
- `dotenv` - 环境变量加载

总共只增加了 **3 个后端依赖**，保持最小化。

---

## 回滚方案

如需恢复到纯前端版本：

1. 删除 `server/` 目录
2. 恢复 `src/services/deepseekService.ts` 中的原始代码
3. 恢复 `.env` 中的 `VITE_DEEPSEEK_API_KEY`
4. 恢复 `package.json` 中的脚本

---

## 下一步优化建议（可选）

如果将来想要更强的功能，可以考虑：

1. **缓存机制**：在后端缓存常见问题的答案，减少 API 调用
2. **速率限制**：防止滥用，保护 API 配额
3. **日志记录**：记录所有请求，方便调试和监控
4. **错误重试**：API 调用失败时自动重试
5. **负载均衡**：多个后端实例，提高可用性

但这些都是可选的，当前方案已经满足基本需求。

---

## 常见问题

**Q: 为什么不用 Vite 的代理功能？**
A: Vite 代理只能转发请求，无法添加 Authorization header，因为环境变量中的 API Key 仍会暴露到前端。

**Q: 后端可以用其他语言吗？**
A: 可以！任何能处理 HTTP 请求的语言都行（Python Flask、Go、Rust 等），只要实现相同的 `/api/chat` 接口即可。

**Q: 性能有影响吗？**
A: 几乎没有。多了一层代理转发，延迟增加约 1-5ms（本地网络），对用户体验无影响。

**Q: 可以部署到 Vercel 吗？**
A: 前端可以直接部署到 Vercel。后端需要部署到支持 Node.js 的平台（Vercel Serverless Functions、Railway、Render 等）。

---

祝你的项目顺利运行！喵 🐱
