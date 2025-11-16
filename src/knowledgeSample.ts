import type { KnowledgeItem } from "./types";

export const knowledgeBasePlaceholder: KnowledgeItem[] = [
  {
    question: "什么是人工智能？",
    answer:
      "人工智能（AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。",
    tags: ["人工智能", "定义"],
  },
  {
    question: "如何使用本地知识库？",
    answer:
      "打开 src/knowledgeBase.json 文件，按照 question 和 answer 的键值对形式补充内容，并在应用中重新加载即可。",
    tags: ["使用说明"],
  },
];
