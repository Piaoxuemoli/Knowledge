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
