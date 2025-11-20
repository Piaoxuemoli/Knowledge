export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  source?: "knowledge-base" | "deepseek";
}

export interface KnowledgeItem {
  question: string;
  answer: string;
  tags?: string[];
}

// 三级知识库结构
export interface ThirdLevelKnowledge {
  question: string;
  answer: string;
}

export interface SecondLevelCategory {
  name: string;
  keywords: string[];  // 用于匹配的关键词
  items: ThirdLevelKnowledge[];
}

export interface FirstLevelCategory {
  name: string;
  keywords: string[];  // 用于匹配的关键词
  subcategories: SecondLevelCategory[];
}

export interface ChatSession {
  id: string;       // 会话唯一标识
  title: string;    // 会话标题（取第一句话的前几个字）
  messages: ChatMessage[]; // 该会话下的所有消息
  createdAt: number; // 创建时间，用于排序
} // 用于存储多个聊天会话，最高级的结构
