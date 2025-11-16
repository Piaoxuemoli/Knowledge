import type { KnowledgeItem } from "../types";
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

export function loadKnowledgeBase(): KnowledgeItem[] {
  if (Array.isArray(knowledgeBaseJson) && knowledgeBaseJson.length > 0) {
    return knowledgeBaseJson;
  }

  return knowledgeBasePlaceholder;
}

export function findBestKnowledgeMatch(
  question: string,
  threshold = 0.45,
): KnowledgeItem | null {
  const knowledgeBase = loadKnowledgeBase();

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
