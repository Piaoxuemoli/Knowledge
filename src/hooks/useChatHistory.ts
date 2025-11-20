import { useState, useEffect } from "react";
import type { ChatMessage, ChatSession } from "../types";

const STORAGE_KEY = "cat_chat_sessions";

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // 1. 初始化加载
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { // 如果之前有储存的历史记录，就加载出来
      try {
        const parsed = JSON.parse(saved); // 将存的JSON字符串解析回对象
        setSessions(parsed); // 把解析后的对象同步到当前状态
        if (parsed.length > 0) setCurrentSessionId(parsed[0].id); // 默认选中第一个会话
        else createNewSession();
      } catch {
        createNewSession(); // 解析失败就新建一个
      }
    } else {
      createNewSession(); // 没有记录就新建一个
    }
  }, []); // 空数组依赖，只在挂载时执行一次

  // 2. 自动保存
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "新对话",
      messages: [{
        id: crypto.randomUUID(),
        role: "assistant",
        content: "你好喵！本喵是你的知识助手。输入问题后我会结合本地知识库的内容回答你愚蠢的问题喵！",
        source: "deepseek",
      }],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const updateCurrentSessionMessages = (newMessages: ChatMessage[]) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        // 自动更新标题逻辑：如果是第一条用户消息，截取前10个字作为标题
        const firstUserMsg = newMessages.find(m => m.role === "user");
        const newTitle = (session.title === "新对话" && firstUserMsg)
          ? firstUserMsg.content.slice(0, 10) + (firstUserMsg.content.length > 10 ? "..." : "")
          : session.title;
        return { ...session, messages: newMessages, title: newTitle };
      }
      return session;
    }));
  }; // 找到用户选中的对话，然后检查它的名字是否是“新对话”
     // 如果是，就用第一条用户消息的前10个字作为标题，否则就用原来的标题。

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发其他点击事件，确保只删除对话
    const newSessions = sessions.filter(s => s.id !== id); // 过滤掉要删除的对话
    setSessions(newSessions); // 更新当前的对话列表
    if (newSessions.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      createNewSession(); // 删光了就新建一个
    } else if (id === currentSessionId) {
      if (newSessions.length > 0) { // 如果删掉的是当前对话，并且还有其他对话
        setCurrentSessionId(newSessions[0].id); // 删了当前的就跳到第一个
      } else {
        createNewSession(); // 删光了就新建一个
      }
    }
  };

  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  return {
    sessions,
    currentSessionId,
    currentMessages,
    setCurrentSessionId,
    createNewSession,
    updateCurrentSessionMessages,
    deleteSession
  };
}