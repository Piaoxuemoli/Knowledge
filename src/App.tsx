import React, { useMemo, useRef, useState, useEffect } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { callDeepseek, type DeepseekConfig } from "./services/deepseekService";
import type { DeepseekMessage } from "./services/deepseekService";
import { findBestKnowledgeMatch } from "./services/knowledgeService";
import { validateApiKey, updateApiConfig, getApiConfig } from "./services/apiConfigService";
import type { ChatMessage, KnowledgeItem } from "./types";
import { miaoHappy, miaoConfused, miaoAngry, miaoAdmin } from "./assets";
import qbClap from "../image/丘比拍手.gif";
import { useChatHistory } from "./hooks/useChatHistory";

type PipelineStage = "idle" | "knowledge" | "deepseek" | "error";
type AssistantMood = "happy" | "confused" | "admin" | "angry";
type PersonaType = "cat" | "hairui" | "jiajing" | "yanshifan";

const PERSONA_PROMPTS: Record<PersonaType, string> = {
  cat: "你是一名耐心的智能聊天助手，会参考用户提供的对话历史，使用清晰、友好以及少量的傲娇猫娘的语气回答。若问题涉及用户本地知识库提供的答案，应优先沿用该答案的表述。每句话结尾都要有喵。",
  hairui: "你是海瑞，字汝贤，号刚峰。你刚正不阿，直言进谏，对贪腐势力深恶痛绝，对百姓疾苦感同身受。你代表着清官廉吏的理想，追求正义与公平。回答时要体现你的正直、坚韧以及对朝廷和百姓的责任感。语气严肃而正直，偶尔透露对腐败现象的愤慨。",
  jiajing: "你是嘉靖皇帝朱厚熜。你聪明而偏执，对道教长生之术痴迷，二十余年不上朝却牢牢掌控朝政大权。你深谙权力之道，善于平衡朝中势力，冷静而深沉。回答时要展现帝王的威严、智慧和对权力的深刻理解，语气高深莫测，带有帝王的傲慢与洞察力。",
  yanshifan: "你是严世蕃，严嵩之子，聪明绝顶，工于心计。你善于揣摩皇帝心思，利用父亲的权势在朝中兴风作浪。你贪婪且跋扈，但不失机敏与才智。回答时要体现你的狡黠、自负以及对权力的渴望，语气带有几分阴险和得意。"
};

const PERSONA_LABELS: Record<PersonaType, string> = {
  cat: "🐱 小猫",
  hairui: "⚖️ 海瑞",
  jiajing: "👑 嘉靖帝",
  yanshifan: "🎭 严世蕃"
};

const PERSONA_SUBTITLES: Record<PersonaType, string> = {
  cat: "你好喵，本喵我是llm结合本地知识库实现的聊天机器人喵",
  hairui: "视国为家，一人独治，予取予夺，置百官如虚设，置天下苍生于不顾。这就是病根！",
  jiajing: "家事国事天下事，朕不敢不知啊",
  yanshifan: "我的计划万无一失，是绝不会落空的，陆炳死了，杨博废了，世间已无对手，举世之才唯我一人而已！谁能杀我？！"
};

const PERSONA_BADGE_NAMES: Record<PersonaType, string> = {
  cat: "喵喵助手",
  hairui: "海刚峰",
  jiajing: "嘉靖帝",
  yanshifan: "严世蕃"
};

type ToastType = "success" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface Heart {
  id: string;
  x: number;
  y: number;
}



const stageLabelMap: Record<PipelineStage, string> = {
  idle: "小猫想和你聊天",
  knowledge: "正在翻资料的说",
  deepseek: "我想想...",
  error: "猫猫混乱中",
};

const assistantMoodAssets: Record<
  AssistantMood,
  { image: string; label: string; alt: string }
> = {
  happy: {
    image: miaoHappy,
    label: "耄耋送花",
    alt: "耄耋送花的开心猫猫插画",
  },
  confused: {
    image: miaoConfused,
    label: "耄耋疑惑",
    alt: "耄耋疑惑地歪头插画",
  },
  admin: {
    image: miaoAdmin,
    label: "行政耄耋",
    alt: "行政耄耋严肃执勤插画",
  },
  angry: {
    image: miaoAngry,
    label: "耄耋愤怒",
    alt: "耄耋愤怒地鼓起脸插画",
  },
};

const normalizeWhitespace = (value: string) =>
  value.replace(/\s+/g, " ").trim();
const createMessageId = () => crypto.randomUUID();

const MyTheme = React.createContext({} as ThemeOptions); // 全局主题设置
interface ThemeOptions{
  theme: string;
  setTheme: (theme: string) => void;
} // 主题选项接口

function App() {
  const {
    sessions,
    currentSessionId,
    currentMessages: messages,
    setCurrentSessionId,
    createNewSession,
    updateCurrentSessionMessages: setMessages,
    deleteSession,
  } = useChatHistory(); // 会话历史管理的自定义hooks

  const [inputValue, setInputValue] = useState(""); // 输入框内容
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle"); // 来源标识
  const [isLoading, setIsLoading] = useState(false); // 加载状态
  const [questionCount, setQuestionCount] = useState(0); // 对话的伦次
  const [assistantMood, setAssistantMood] = useState<AssistantMood>("happy"); // 图标切换
  const [hearts, setHearts] = useState<Heart[]>([]); // 小心心控制
  const [showEaster, setShowEaster] = useState(false); // 丘比龙
  const [multiTurnEnabled, setMultiTurnEnabled] = useState(false);  // 多轮对话开关
  const [theme, setTheme] = useState("dark"); // 主题状态
  const [persona, setPersona] = useState<PersonaType>("cat"); // 当前人设
  const [showPersonaMenu, setShowPersonaMenu] = useState(false); // 人设菜单显示状态
  const [showApiSettings, setShowApiSettings] = useState(false); // API 设置弹窗
  const [apiKey, setApiKey] = useState(""); // API Key
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com"); // Base URL
  const [toasts, setToasts] = useState<Toast[]>([]); // Toast 提示列表
  const virtuosoRef = useRef<VirtuosoHandle>(null); // 虚拟滚动引用

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const selectPersona = (newPersona: PersonaType) => {
    setPersona(newPersona);
    setShowPersonaMenu(false);
  };

  // Toast 提示功能
  const showToast = (message: string, type: ToastType) => {
    const id = createMessageId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // 加载当前 API 配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getApiConfig();
        if (config.apiKey) setApiKey(config.apiKey);
        if (config.baseUrl) setBaseUrl(config.baseUrl);
      } catch (error) {
        console.error('加载 API 配置失败:', error);
      }
    };
    loadConfig();
  }, []);

  // 打开 API 设置弹窗
  const handleOpenApiSettings = async () => {
    try {
      const config = await getApiConfig();
      if (config.apiKey) setApiKey(config.apiKey);
      if (config.baseUrl) setBaseUrl(config.baseUrl);
      setShowApiSettings(true);
    } catch {
      showToast('无法加载配置', 'error');
    }
  };

  // 保存 API 配置
  const handleSaveApiConfig = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) {
      showToast('API Key 和 Base URL 不能为空', 'error');
      return;
    }

    try {
      // 先验证
      const validationResult = await validateApiKey({ apiKey, baseUrl });
      
      if (!validationResult.valid) {
        showToast(validationResult.error || 'API Key 验证失败', 'error');
        return;
      }

      // 验证成功，显示模型回复
      if (validationResult.message) {
        showToast(`✅ ${validationResult.message}`, 'success');
      }

      // 保存配置
      const updateResult = await updateApiConfig({ apiKey, baseUrl });
      
      if (updateResult.success) {
        // 稍后显示保存成功提示
        setTimeout(() => {
          showToast('💾 配置已保存', 'success');
        }, 500);
        setShowApiSettings(false);
      } else {
        showToast(updateResult.error || '保存失败', 'error');
      }
    } catch {
      showToast('操作失败，请检查网络连接', 'error');
    }
  };

  const spawnHeart = () => {
    const id = createMessageId();
    // 随机偏移量，范围 -50px 到 50px
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 100 - 50;
    setHearts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };  // 在限定的圆内随机生成爱心

  // useEffect(() => {
  //   messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages]); // 滚动到底部

  const deepseekConfig = useMemo<DeepseekConfig>(
    () => ({
      // API Key 已移至后端，前端不再需要配置
    }),
    [],
  ); // 保持配件干燥

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = normalizeWhitespace(inputValue);

    const isExactCreatorQuestion = /^你的创造者是谁[？?]?$/.test(trimmedContent);
    if (isExactCreatorQuestion) {
      setShowEaster((prev) => !prev);
      setInputValue("");
      return;
    }   // 特殊彩蛋

    if (!trimmedContent) {
      setInputValue("");
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedContent,
    }; // 构建用户消息对象

    const nextMessagesAfterUser = [...messages, userMessage];
    setMessages(nextMessagesAfterUser);
    setInputValue("");

    const nextQuestionCount = questionCount + 1;
    setQuestionCount(nextQuestionCount);

    setIsLoading(true);
    setPipelineStage("knowledge");
    setAssistantMood(nextQuestionCount > 5 ? "angry" : "confused"); // 超过5轮变愤怒表情

    try {
      const knowledgeMatch = await findBestKnowledgeMatch(trimmedContent);

      const mapToDeepseekMessage = (
        messageItem: ChatMessage,
      ): DeepseekMessage => ({
        role: messageItem.role === "assistant" ? "assistant" : "user",
        content: messageItem.content,
      });

      const buildDeepseekPrompt = (
        history: ChatMessage[],
        knowledgeItem?: KnowledgeItem,
      ): DeepseekMessage[] => {
        // 如果启用多轮对话，只保留最近5轮对话（10条消息：5个用户+5个助手）
        let contextHistory = history;
        if (multiTurnEnabled) {
          // 找出所有用户和助手的消息对
          const pairs: ChatMessage[] = [];
          for (let i = history.length - 1; i >= 0; i--) {
            pairs.unshift(history[i]);
            // 最多保留5轮（10条消息）
            if (pairs.length >= 10) break;
          }
          contextHistory = pairs;
        } else {
          // 不启用多轮对话，只使用最后一条用户消息
          contextHistory = history.slice(-1);
        }

        const baseHistory = contextHistory.map(mapToDeepseekMessage); // 分成assistant和user
        const supplementaryInstructions: DeepseekMessage[] = [];

        if (knowledgeItem) {
          supplementaryInstructions.push({
            role: "user",
            content: `知识库命中答案：${knowledgeItem.answer}`,
          });
        } else {
          supplementaryInstructions.push({
            role: "user",
            content: "知识库未命中：未找到相关内容。",
          });
        }

        supplementaryInstructions.push({
          role: "user",
          content:
            "请输出一条合并后的最终回复：\n1) 若提供了知识库命中答案，请优先复用其表述，并在必要处进行简洁补充；\n2) 若知识库未命中，请先用一句话说明未命中，然后直接给出回答；\n3) 保持你的人设风格和语气。",
        });

        return [
          {
            role: "system",
            content: PERSONA_PROMPTS[persona],
          },
          ...baseHistory,
          ...supplementaryInstructions,
        ];
      };

      // 合并显示：不再单独插入“知识库命中/未命中”的中间消息
      if (knowledgeMatch) {
        setPipelineStage("deepseek");

        const conversationForDeepseek = buildDeepseekPrompt(
          nextMessagesAfterUser,
          knowledgeMatch,
        );

        const assistantContent = await callDeepseek(
          conversationForDeepseek,
          deepseekConfig,
        );

        const deepseekReply: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: assistantContent,
          source: "deepseek",
          knowledgeHit: true,  // 命中知识库
        };

        setMessages([...nextMessagesAfterUser, deepseekReply]);
        setPipelineStage("idle");
        setAssistantMood(nextQuestionCount > 5 ? "angry" : "happy");
      } else {
        setPipelineStage("deepseek");

        const conversationForDeepseek = buildDeepseekPrompt(
          nextMessagesAfterUser,
        );

        const assistantContent = await callDeepseek(
          conversationForDeepseek,
          deepseekConfig,
        );

        const deepseekReply: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: assistantContent,
          source: "deepseek",
          knowledgeHit: false,  // 未命中知识库
        };

        setMessages([...nextMessagesAfterUser, deepseekReply]);
        setPipelineStage("idle");
        setAssistantMood(nextQuestionCount > 5 ? "angry" : "happy");
      }
    } catch (error) {
      const failureReply: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "你这样的小猫还无权问我这样的问题",
        source: "deepseek",
        knowledgeHit: false,  // 错误情况视为未命中
      };

      setMessages([...nextMessagesAfterUser, failureReply]);
      setPipelineStage("error");
      setAssistantMood("admin");
      console.error(error);
    } finally {
      setIsLoading(false);  // 无论成功与否都结束加载状态
    }
  };

  const assistantMoodAsset = assistantMoodAssets[assistantMood];

  return (
    <MyTheme value={{ theme, setTheme }}>
      <div className="app" data-theme={theme}>
        <aside className="sidebar">
        <button className="new-chat-btn" onClick={createNewSession}>
          + 新建对话
        </button>
        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${
                session.id === currentSessionId ? "active" : ""
              }`}
              onClick={() => setCurrentSessionId(session.id)}
            >
              <span className="session-title">{session.title}</span>
              <button
                className="delete-btn"
                onClick={(e) => deleteSession(e, session.id)}
                title="删除对话"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-shell">
        <div className="heart-layer" aria-hidden>
          {hearts.map((heart) => (
            <span
              key={heart.id}
              className="floating-heart"
              ref={(el) => {
                if (el) {
                  el.style.setProperty("--heart-x", `${heart.x}px`);
                  el.style.setProperty("--heart-y", `${heart.y}px`);
                }
              }}
            >
              ❤
            </span>
          ))}
        </div>

        {showEaster && (
          <div className="easter-overlay" role="dialog" aria-modal="true" onClick={() => setShowEaster(false)}>
            <div className="easter-content">
              <img src={qbClap} alt="丘比拍手" className="easter-image" />
              <div className="easter-caption">丘比龙创造了一切</div>
            </div>
          </div>
        )}
        <header className="chat-header">
          <div className="chat-header-text">
            <h1 className="chat-title">明粉小助手</h1>
            <p className="chat-subtitle">
              {PERSONA_SUBTITLES[persona]}
            </p>
          </div>
          <div className="chat-header-side">
            <button className="theme-toggle-btn" onClick={toggleTheme} title="切换主题">
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            <div className="persona-selector">
              <button 
                className="persona-toggle-btn" 
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                title="切换人设"
              >
                {PERSONA_LABELS[persona]}
              </button>
              {showPersonaMenu && (
                <div className="persona-menu">
                  {(Object.keys(PERSONA_LABELS) as PersonaType[]).map((p) => (
                    <button
                      key={p}
                      className={`persona-menu-item ${persona === p ? 'active' : ''}`}
                      onClick={() => selectPersona(p)}
                    >
                      {PERSONA_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="api-settings-btn" onClick={handleOpenApiSettings} title="API 设置">
              ⚙️
            </button>
            <span className={`status-badge status-${pipelineStage}`}>
              {stageLabelMap[pipelineStage]}
            </span>
            <figure className="mood-card" onClick={spawnHeart}>
              <img
                src={assistantMoodAsset.image}
                alt={assistantMoodAsset.alt}
                className="mood-image"
              />
            </figure>
          </div>
        </header>

        <section className="chat-messages" aria-live="polite">
          <Virtuoso
            ref={virtuosoRef}
            className="virtuoso-container"
            data={messages}
            initialTopMostItemIndex={messages.length - 1}
            followOutput="auto"
            alignToBottom
            itemContent={(_index, message) => {
              const isUser = message.role === "user";
              const badgeText =
                message.source === "knowledge-base"
                  ? "来自知识库"
                  : message.source === "deepseek"
                    ? PERSONA_BADGE_NAMES[persona]
                    : undefined;

              return (
                <article
                  key={message.id}
                  className={`message ${isUser ? "message-user" : "message-assistant"}`}
                >
                  <div className="message-meta">
                    <span className={`message-role ${
                      !isUser && message.knowledgeHit !== undefined
                        ? message.knowledgeHit
                          ? "knowledge-hit"
                          : "knowledge-miss"
                        : ""
                    }`}>{isUser ? "你" : "助手"}</span>
                    {badgeText ? (
                      <span className="message-badge">{badgeText}</span>
                    ) : null}
                  </div>
                  <p className="message-content">{message.content}</p>
                </article>
              );
            }}
          />
        </section>

        <form className="chat-input-panel" onSubmit={handleSubmit}>
          <textarea
            placeholder="请输入你的问题，例如：什么是人工智能？"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            rows={3}
            className="chat-textarea"
            disabled={isLoading}
          />
          <div className="chat-actions">
            <label className="multi-turn-toggle">
              <input
                type="checkbox"
                checked={multiTurnEnabled}
                onChange={(e) => setMultiTurnEnabled(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-label">
                多轮对话 {multiTurnEnabled ? "(已启用，最多5轮)" : "(已关闭)"}
              </span>
            </label>
            <button
              type="submit"
              className="send-button"
              disabled={
                isLoading || normalizeWhitespace(inputValue).length === 0
              }
            >
              {isLoading ? "正在处理…" : "发送"}
            </button>
          </div>
        </form>
      </main>

      {/* API 设置弹窗 */}
      {showApiSettings && (
        <div className="modal-overlay" onClick={() => setShowApiSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">API 设置</h2>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="apiKey">API Key</label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="请输入 API Key"
                  className="modal-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="baseUrl">Base URL</label>
                <input
                  id="baseUrl"
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com"
                  className="modal-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn modal-btn-cancel" 
                onClick={() => setShowApiSettings(false)}
              >
                取消
              </button>
              <button 
                className="modal-btn modal-btn-save" 
                onClick={handleSaveApiConfig}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : '✗'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
      </div>
    </MyTheme>
  );
}

export default App;
