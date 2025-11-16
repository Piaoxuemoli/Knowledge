import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { callDeepseek, type DeepseekConfig } from "./services/deepseekService";
import type { DeepseekMessage } from "./services/deepseekService";
import { findBestKnowledgeMatch } from "./services/knowledgeService";
import type { ChatMessage, KnowledgeItem } from "./types";
import { miaoHappy, miaoConfused, miaoAngry, miaoAdmin } from "./assets";
import qbClap from "../image/丘比拍手.gif";

const SYSTEM_PROMPT =
  "你是一名耐心的智能聊天助手，会参考用户提供的对话历史，使用清晰、友好以及少量的傲娇猫娘的语气回答。若问题涉及用户本地知识库提供的答案，应优先沿用该答案的表述。每句话结尾都要有喵。";

type PipelineStage = "idle" | "knowledge" | "deepseek" | "error";
type AssistantMood = "happy" | "confused" | "admin" | "angry";

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

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content:
        "你好喵！本喵是你的知识助手。输入问题后我会结合本地知识库的内容回答你愚蠢的问题喵！",
      source: "deepseek",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [assistantMood, setAssistantMood] = useState<AssistantMood>("happy");
  const [hearts, setHearts] = useState<string[]>([]);
  const [showEaster, setShowEaster] = useState(false);
  const [multiTurnEnabled, setMultiTurnEnabled] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const spawnHeart = () => {
    const id = createMessageId();
    setHearts((prev) => [...prev, id]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h !== id));
    }, 2000);
  };

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const deepseekConfig = useMemo<DeepseekConfig>(
    () => ({
      // API Key 已移至后端，前端不再需要配置
    }),
    [],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = normalizeWhitespace(inputValue);

    const isExactCreatorQuestion = /^你的创造者是谁[？?]?$/.test(trimmedContent);
    if (isExactCreatorQuestion) {
      setShowEaster((prev) => !prev);
      setInputValue("");
      return;
    }

    if (!trimmedContent) {
      setInputValue("");
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmedContent,
    };

    const nextMessagesAfterUser = [...messages, userMessage];
    setMessages(nextMessagesAfterUser);
    setInputValue("");

    const nextQuestionCount = questionCount + 1;
    setQuestionCount(nextQuestionCount);

    if (nextQuestionCount > 5) {
      setAssistantMood("angry");
      setPipelineStage("idle");
      setIsLoading(false);

      const restReply: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "本喵也是要休息的！",
      };

      setMessages([...nextMessagesAfterUser, restReply]);
      setPipelineStage("idle");
      setAssistantMood("angry");
      return;
    }

    setIsLoading(true);
    setPipelineStage("knowledge");
    setAssistantMood("confused");

    try {
      const knowledgeMatch = findBestKnowledgeMatch(trimmedContent);

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

        const baseHistory = contextHistory.map(mapToDeepseekMessage);
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
            "请输出一条合并后的最终回复：\n1) 若提供了知识库命中答案，请优先复用其表述，并在必要处进行简洁补充；\n2) 若知识库未命中，请先用一句话说明未命中，然后直接给出回答；\n3) 全文语气保持清晰友好并带一点傲娇猫娘风，整段话必须以喵结尾。",
        });

        return [
          {
            role: "system",
            content: SYSTEM_PROMPT,
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
        };

        setMessages([...nextMessagesAfterUser, deepseekReply]);
        setPipelineStage("idle");
        setAssistantMood("happy");
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
        };

        setMessages([...nextMessagesAfterUser, deepseekReply]);
        setPipelineStage("idle");
        setAssistantMood("happy");
      }
    } catch (error) {
      const failureReply: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "你这样的小猫还无权问我这样的问题",
      };

      setMessages((prev) => [...prev, failureReply]);
      setPipelineStage("error");
      setAssistantMood("admin");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const assistantMoodAsset = assistantMoodAssets[assistantMood];

  return (
    <div className="app">
      <main className="chat-shell">
        <div className="heart-layer" aria-hidden>
          {hearts.map((id) => (
            <span key={id} className="floating-heart">❤</span>
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
            <h1 className="chat-title">知识助手</h1>
            <p className="chat-subtitle">
              你好喵，本喵我是llm结合本地知识库实现的聊天机器人喵
            </p>
          </div>
          <div className="chat-header-side">
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
          {messages.map((message) => {
            const isUser = message.role === "user";
            const badgeText =
              message.source === "knowledge-base"
                ? "来自知识库"
                : message.source === "deepseek"
                  ? "哈基米"
                  : undefined;

            return (
              <article
                key={message.id}
                className={`message ${isUser ? "message-user" : "message-assistant"}`}
              >
                <div className="message-meta">
                  <span className="message-role">{isUser ? "你" : "助手"}</span>
                  {badgeText ? (
                    <span className="message-badge">{badgeText}</span>
                  ) : null}
                </div>
                <p className="message-content">{message.content}</p>
              </article>
            );
          })}
          <div ref={messageEndRef} />
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
    </div>
  );
}

export default App;
