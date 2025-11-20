import type { KnowledgeItem, FirstLevelCategory, ThirdLevelKnowledge } from "../types";
import knowledgeBaseJson from "../knowledgeBase.clean.json";
import { knowledgeBasePlaceholder } from "../knowledgeSample";

const NORMALIZED_WHITESPACE_REGEX = /\s+/g;

function normalizeText(text: string): string {
  // 小写、去除首尾空白
  const lowered = text.toLowerCase().replace(NORMALIZED_WHITESPACE_REGEX, " ").trim();
  // 去除标点符号（含中英文），仅保留字母数字及CJK文字
  // 使用 Unicode 属性转义，需启用 'u' 标志
  const cleaned = lowered.replace(/[^\p{L}\p{N}\s]+/gu, "");
  return cleaned;
}

function makeNGrams(input: string, n: number): string[] {
  const s = input.replace(NORMALIZED_WHITESPACE_REGEX, "");
  if (s.length === 0) return [];
  if (s.length <= n) return Array.from(s);
  const grams: string[] = [];
  for (let i = 0; i <= s.length - n; i++) {
    grams.push(s.slice(i, i + n));
  }
  return grams;
}

function tokenize(text: string): string[] {
  const norm = normalizeText(text);
  if (/\s/.test(norm)) {
    return norm.split(/\s+/).filter(Boolean);
  }
  // 对无空格语言（如中文）使用双字gram
  const grams2 = makeNGrams(norm, 2);
  return grams2.length > 0 ? grams2 : Array.from(norm);
}

function calculateSimilarityScore(
  targetText: string,
  candidateText: string,
): number {
  const a = normalizeText(targetText);
  const b = normalizeText(candidateText);
  if (!a || !b) return 0;
  // 强包含判定
  if (a.includes(b) || b.includes(a)) return 1;
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  setA.forEach((t) => { if (setB.has(t)) inter++; });
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
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
  threshold = 0.2,
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
  for (const category of categories) {
    // 计算一级分类关键词匹配得分
    const categoryScore = calculateKeywordScore(question, category.keywords);
    
    for (const subcategory of category.subcategories) {
      // 计算二级分类关键词匹配得分
      const subcategoryScore = calculateKeywordScore(question, subcategory.keywords);
      
      // 结合一级和二级分类的得分（加权）
      const categoryBonus = categoryScore * 0.4 + subcategoryScore * 0.6;
      
      // 在该二级分类下匹配具体问题
      for (const item of subcategory.items) {
        const questionScore = calculateSimilarityScore(question, item.question);
        
        // 最终得分：加大分类匹配的影响，适配中文场景
        const finalScore = questionScore * 0.5 + categoryBonus * 0.5;
        
        if (!bestMatch || finalScore > bestMatch.score) {
          bestMatch = {
            item,
            category: category.name,
            subcategory: subcategory.name,
            score: finalScore
          };
        }
      }
    }
  }
  
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
