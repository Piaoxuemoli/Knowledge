const DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";

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
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callDeepseek(
  conversationMessages: DeepseekMessage[],
  config: DeepseekConfig,
): Promise<string> {
  const {
    apiKey,
    model = "deepseek-chat",
    temperature = 0.6,
    maxTokens = 1024,
  } = config;

  if (!apiKey) {
    throw new Error(
      "未检测到 DeepSeek API Key，请在 .env 文件中配置 VITE_DEEPSEEK_API_KEY。",
    );
  }

  const requestBody: DeepseekChatPayload = {
    model,
    messages: conversationMessages,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(`${DEEPSEEK_API_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 调用失败: ${errorText}`);
  }

  const responseBody = (await response.json()) as DeepseekChatResponse;
  const assistantReply = responseBody.choices?.[0]?.message?.content ?? "";

  if (!assistantReply) {
    throw new Error("DeepSeek API 未返回有效回复，请稍后再试。");
  }

  return assistantReply.trim();
}
