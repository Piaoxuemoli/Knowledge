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
