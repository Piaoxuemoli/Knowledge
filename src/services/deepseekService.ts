// 使用本地后端代理，不再直接调用 DeepSeek API
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface DeepseekMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DeepseekChatPayload {
  model: string;
  messages: DeepseekMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface DeepseekChatResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
  }>;
}

export interface DeepseekConfig {
  apiKey?: string; // 已废弃，保留仅为兼容性
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callDeepseek(
  conversationMessages: DeepseekMessage[],
  config: DeepseekConfig,
): Promise<string> {
  const {
    model = "deepseek-chat",
    temperature = 0.6,
    maxTokens = 1024,
  } = config;

  const requestBody: DeepseekChatPayload = {
    model,
    messages: conversationMessages,
    temperature,
    max_tokens: maxTokens,
  };

  // 调用本地后端代理
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`后端 API 调用失败: ${errorText}`);
  }

  const responseBody = (await response.json()) as DeepseekChatResponse;
  const assistantReply = responseBody.choices?.[0]?.message?.content ?? "";

  if (!assistantReply) {
    throw new Error("API 未返回有效回复，请稍后再试。");
  }

  return assistantReply.trim();
}
