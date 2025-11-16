import type { KnowledgeItem, FirstLevelCategory, SecondLevelCategory, ThirdLevelKnowledge } from "../types";
import knowledgeBaseJson from "../knowledgeBase.json";
import { knowledgeBasePlaceholder } from "../knowledgeSample";

const NORMALIZED_WHITESPACE_REGEX = /\s+/g;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(NORMALIZED_WHITESPACE_REGEX, " ").trim();
}

function calculateSimilarityScore(
  targetText: string,
  candidateText: string,
): number {
  const normalizedTargetTokens = normalizeText(targetText).split(" ");
  const normalizedCandidateTokens = normalizeText(candidateText).split(" ");

  if (
    normalizedTargetTokens.length === 0 ||
    normalizedCandidateTokens.length === 0
  ) {
    return 0;
  }

  const candidateTokenSet = new Set(normalizedCandidateTokens);
  let matchCount = 0;

  normalizedTargetTokens.forEach((token) => {
    if (candidateTokenSet.has(token)) {
      matchCount += 1;
    }
  });

  return matchCount / normalizedTargetTokens.length;
}

/**
 * 通过关键词匹配计算分类得分
 */
function calculateKeywordScore(question: string, keywords: string[]): number {
  const normalizedQuestion = normalizeText(question);
  let matchCount = 0;
  
  keywords.forEach(keyword => {
    if (normalizedQuestion.includes(normalizeText(keyword))) {
      matchCount += 1;
    }
  });
  
  return keywords.length > 0 ? matchCount / keywords.length : 0;
}

/**
 * 加载三级知识库
 */
export function loadKnowledgeBase(): FirstLevelCategory[] {
  if (Array.isArray(knowledgeBaseJson) && knowledgeBaseJson.length > 0) {
    return knowledgeBaseJson as FirstLevelCategory[];
  }
  return [];
}

/**
 * 扁平化知识库（兼容旧接口）
 */
export function loadFlatKnowledgeBase(): KnowledgeItem[] {
  const categories = loadKnowledgeBase();
  const flatItems: KnowledgeItem[] = [];
  
  categories.forEach(category => {
    category.subcategories.forEach(subcategory => {
      subcategory.items.forEach(item => {
        flatItems.push({
          question: item.question,
          answer: item.answer,
          tags: [category.name, subcategory.name]
        });
      });
    });
  });
  
  if (flatItems.length === 0) {
    return knowledgeBasePlaceholder;
  }
  
  return flatItems;
}

/**
 * 三级匹配：智能识别一级、二级分类，然后在对应分类下匹配问题
 */
export function findBestKnowledgeMatch(
  question: string,
  threshold = 0.45,
): KnowledgeItem | null {
  const categories = loadKnowledgeBase();
  
  if (categories.length === 0) {
    // 如果没有三级结构，使用扁平化数据
    return findBestKnowledgeMatchFlat(question, threshold);
  }
  
  let bestMatch: {
    item: ThirdLevelKnowledge;
    category: string;
    subcategory: string;
    score: number;
  } | null = null;
  
  // 遍历所有分类
  categories.forEach(category => {
    // 计算一级分类关键词匹配得分
    const categoryScore = calculateKeywordScore(question, category.keywords);
    
    category.subcategories.forEach(subcategory => {
      // 计算二级分类关键词匹配得分
      const subcategoryScore = calculateKeywordScore(question, subcategory.keywords);
      
      // 结合一级和二级分类的得分（加权）
      const categoryBonus = categoryScore * 0.3 + subcategoryScore * 0.4;
      
      // 在该二级分类下匹配具体问题
      subcategory.items.forEach(item => {
        const questionScore = calculateSimilarityScore(question, item.question);
        
        // 最终得分 = 问题相似度(60%) + 分类匹配度(40%)
        const finalScore = questionScore * 0.6 + categoryBonus;
        
        if (!bestMatch || finalScore > bestMatch.score) {
          bestMatch = {
            item,
            category: category.name,
            subcategory: subcategory.name,
            score: finalScore
          };
        }
      });
    });
  });
  
  // 如果找到匹配且得分超过阈值
  if (bestMatch && bestMatch.score >= threshold) {
    return {
      question: bestMatch.item.question,
      answer: bestMatch.item.answer,
      tags: [bestMatch.category, bestMatch.subcategory]
    };
  }
  
  return null;
}

/**
 * 扁平化匹配（兼容旧数据结构）
 */
function findBestKnowledgeMatchFlat(
  question: string,
  threshold: number,
): KnowledgeItem | null {
  const knowledgeBase = loadFlatKnowledgeBase();

  let bestScore = 0;
  let bestMatch: KnowledgeItem | null = null;

  knowledgeBase.forEach((item) => {
    const similarityScore = calculateSimilarityScore(question, item.question);

    if (similarityScore > bestScore) {
      bestScore = similarityScore;
      bestMatch = item;
    }
  });

  if (bestScore >= threshold && bestMatch) {
    return bestMatch;
  }

  return null;
}
