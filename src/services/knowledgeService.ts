import type { KnowledgeItem } from "../types";

/**
 * 远程 RAG 搜索
 */
export async function findBestKnowledgeMatch(
  question: string,
  threshold = 0.55, // 与后端保持一致的默认阈值
): Promise<KnowledgeItem | null> {
  try {
    // 直接使用后端地址，不需要 getApiConfig
    const serverUrl = 'http://localhost:3000'; 

    const response = await fetch(`${serverUrl}/api/knowledge/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: question, topK: 3 }),
    });

    if (!response.ok) {
      console.warn('知识库搜索请求失败');
      return null;
    }

    const data = await response.json();
    
    // 如果有最佳匹配且分数达标
    if (data.bestMatch && data.bestMatch.score >= threshold) {
      return {
        question: data.bestMatch.question,
        answer: data.bestMatch.answer,
        tags: ['RAG', 'Knowledge']
      };
    }
    
    return null;
  } catch (error) {
    console.error('知识库搜索出错:', error);
    return null;
  }
}

