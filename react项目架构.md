# 明粉小助手 - React 项目架构

## 项目概述
这是一个基于 React + Node.js 的智能对话应用，结合了本地 RAG（检索增强生成）和 DeepSeek API，提供《大明王朝1566》主题的多人设对话体验。

## 核心特性

### 1. 多人设系统
应用内置四种对话人格，每种人格拥有独特的对话风格和系统提示词：

- **🐱 小猫**（默认）：傲娇猫娘助手，语气活泼可爱，每句话结尾带"喵"
- **⚖️ 海瑞**：刚正不阿的清官，语气严肃正直，体现清官廉吏的理想
- **👑 嘉靖帝**：高深莫测的帝王，语气威严智慧，展现对权力的深刻理解
- **🎭 严世蕃**：狡黠自负的权臣之子，语气阴险得意，善于心计

**实现细节**：
```typescript
type PersonaType = "cat" | "hairui" | "jiajing" | "yanshifan";

const PERSONA_PROMPTS: Record<PersonaType, string> = {
  cat: "你是一名耐心的智能聊天助手...",
  hairui: "你是海瑞，字汝贤，号刚峰...",
  jiajing: "你是嘉靖皇帝朱厚熜...",
  yanshifan: "你是严世蕃，严嵩之子..."
};
```

每个人设对应：
- 专属的系统提示词（`PERSONA_PROMPTS`）
- 独特的欢迎语（`PERSONA_SUBTITLES`）
- 下拉菜单快速切换

### 2. 本地 RAG 系统
基于 `@xenova/transformers` 实现的完全本地化向量检索系统，无需外部 API。

**工作流程**：
1. **文本切分**：将 `server/data/BigMing1566.txt` 按段落切分成 Chunks（每块约 300 字符）
2. **向量化**：使用 `all-MiniLM-L6-v2` 模型将每个 Chunk 转换为向量
3. **语义检索**：用户提问时，计算问题向量与所有 Chunk 的余弦相似度，返回最相关片段
4. **上下文融合**：将检索到的知识片段作为上下文传递给 DeepSeek 模型

**技术实现**：
```javascript
// server/services/ragService.js
class RagService {
  async initialize() {
    this.extractor = await pipeline('feature-extraction', 'all-MiniLM-L6-v2');
    await this.loadAndProcessData(); // 加载并向量化文本
  }
  
  async search(query, topK = 3) {
    const queryEmbedding = await this.extractor(query);
    // 计算余弦相似度并返回 top-K 结果
  }
}
```

**优势**：
- 完全离线运行，保护隐私
- 无需额外 API 费用
- 响应速度快（模型约 80MB）

### 3. 多轮对话管理
支持启用/禁用多轮对话上下文，灵活控制对话历史。

**实现逻辑**：
```typescript
if (multiTurnEnabled) {
  // 保留最近 5 轮对话（10 条消息）
  contextHistory = history.slice(-10);
} else {
  // 仅使用最后一条用户消息
  contextHistory = history.slice(-1);
}
```

**特点**：
- 勾选"多轮对话"时，AI 会记住最近 5 轮的对话内容
- 关闭时每次提问相互独立，适合快速查询
- 动态调整上下文窗口，平衡记忆能力与 token 消耗

## 技术栈

### 前端
- **框架**: React 19.1.1 + TypeScript
- **构建工具**: Vite 7.1.7
- **UI 组件**: react-virtuoso（虚拟滚动）
- **状态管理**: React Hooks + 自定义 Hook (`useChatHistory`)
- **样式**: CSS Modules + 主题切换

### 后端
- **运行时**: Node.js + Express
- **AI 模型**: @xenova/transformers（本地 Embedding）
- **LLM**: DeepSeek API
- **向量检索**: 余弦相似度算法（纯 JS 实现）

## 目录结构
```
├── src/                      # 前端源码
│   ├── App.tsx              # 主应用组件（人设切换、多轮对话逻辑）
│   ├── App.css              # 主样式（含人设菜单、主题切换样式）
│   ├── main.tsx             # 应用入口
│   ├── types.ts             # TypeScript 类型定义
│   ├── assets/              # 静态资源（猫猫表情图）
│   ├── hooks/               # 自定义 Hooks
│   │   └── useChatHistory.ts   # 会话历史管理
│   └── services/            # 业务逻辑服务
│       ├── deepseekService.ts  # DeepSeek API 调用
│       ├── knowledgeService.ts # RAG 检索调用
│       └── apiConfigService.ts # API 配置管理
├── server/                   # 后端服务
│   ├── server.js            # Express 服务器入口
│   ├── services/
│   │   └── ragService.js    # RAG 向量检索服务
│   ├── data/
│   │   └── BigMing1566.txt  # 知识库文本
│   └── models/
│       └── Xenova/
│           └── all-MiniLM-L6-v2/  # 本地 Embedding 模型
├── start.bat / start.ps1     # 一键启动脚本
└── package.json              # 依赖配置
```

## 工程细节

### 启动流程
1. 执行 `start.ps1` 或 `start.bat`
2. 自动检查并安装依赖（前端 + 后端）
3. 同时启动后端（`http://localhost:3000`）和前端（`http://localhost:5173`）
4. 后端加载 Embedding 模型并生成向量（首次约 5-10 秒）
5. 前端自动连接后端 RAG 服务

### 核心交互流程

**用户提问** → **前端调用 RAG 检索**（`knowledgeService.ts`）  
→ **后端向量搜索**（`ragService.js`）  
→ **返回最相关片段**  
→ **构建 Prompt**（System Prompt + 知识片段 + 历史对话）  
→ **调用 DeepSeek API**（`deepseekService.ts`）  
→ **返回回答并显示**

### 数据持久化
- **会话历史**：存储在 `localStorage`（`useChatHistory.ts`）
- **API 配置**：存储在后端配置文件（`.env`）
- **向量数据**：每次启动时重新生成（未持久化）

### 性能优化
- **虚拟滚动**：使用 `react-virtuoso` 处理大量消息，避免 DOM 节点过多
- **向量缓存**：模型加载后常驻内存，避免重复初始化
- **按需加载**：仅在用户切换会话时加载对应历史记录

## 使用说明

1. **首次启动**：
   ```pwsh
   .\start.ps1
   ```
   等待后端输出"向量生成完成"后即可使用。

2. **切换人设**：点击右上角人设按钮，选择对应角色。

3. **多轮对话**：勾选输入框上方的"多轮对话"开关，启用上下文记忆。

4. **API 配置**：点击⚙️按钮配置 DeepSeek API Key。

5. **主题切换**：点击🌙/☀️按钮切换深浅色主题。

## 扩展建议

- **向量持久化**：将生成的 Embeddings 保存为 JSON 文件，避免每次重启都重新计算
- **更多人设**：添加徐阶、张居正等角色，丰富对话体验
- **流式输出**：接入 DeepSeek 流式 API，实现打字机效果
- **知识库管理**：提供 UI 界面上传/编辑 TXT 文件，动态更新知识库

### 3. Context模式
```jsx
const MyTheme = React.createContext({} as ThemeOptions);

function App() {
  const [theme, setTheme] = useState("dark");
  
  return (
    <MyTheme value={{ theme, setTheme }}>
      <div className="app" data-theme={theme}>
        {/* 应用内容 */}
      </div>
    </MyTheme>
  );
}
```

## 性能优化策略

### 1. 虚拟滚动
- 使用`react-virtuoso`处理大量消息
- 只渲染可见区域的消息
- 支持自动滚动到底部

### 2. 状态优化
- 使用`useMemo`缓存计算结果
- 合理的state拆分避免不必要的重渲染
- 使用`useCallback`优化事件处理函数

### 3. CSS性能
- 使用CSS变量减少重复计算
- 合理使用`transform`和`opacity`进行动画
- 避免过度的box-shadow和gradient

## 可访问性设计

### 1. 语义化HTML
- 正确使用HTML5语义标签
- 表单元素的label关联
- 按钮和链接的可访问性

### 2. ARIA属性
```jsx
<div className="easter-overlay" role="dialog" aria-modal="true">
<section className="chat-messages" aria-live="polite">
```

### 3. 键盘导航
- 表单元素的Tab顺序
- 按钮的键盘事件支持
- 模态框的焦点管理

## 工程化实践

### 1. TypeScript集成
- 严格的类型检查
- 完整的接口定义
- 类型安全的组件通信

### 2. 代码规范
- ESLint静态检查
- 统一的代码格式化
- 组件命名规范

### 3. 构建优化
- Vite快速构建
- 代码分割和懒加载
- 生产环境优化

## 总结

这个项目展现了现代React应用的最佳实践：

1. **架构设计**：清晰的分层架构，组件化设计
2. **CSS系统**：完整的主题系统，响应式设计，丰富的动画效果
3. **性能优化**：虚拟滚动，状态优化，CSS性能考虑
4. **用户体验**：流畅的交互动画，完整的反馈机制
5. **代码质量**：TypeScript类型安全，现代化的工具链
6. **可维护性**：模块化设计，清晰的代码组织

这是一个高质量、工程化完善的React项目，值得学习和参考。
