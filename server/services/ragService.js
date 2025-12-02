import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline, env } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.join(__dirname, '..', 'models');

env.allowRemoteModels = false; // 禁止远程下载
env.cacheDir = modelsDir; // 指定缓存目录
env.localModelPath = modelsDir; // 指向本地模型目录

// 简单的余弦相似度计算
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class RagService {
  constructor() {
    this.chunks = [];
    this.embeddings = [];
    this.extractor = null;
    this.isInitialized = false;
    this.modelName = 'Xenova/all-MiniLM-L6-v2'; // 轻量级嵌入模型
  }

  // 初始化：加载模型并处理数据
  async initialize() {
    if (this.isInitialized) return;

    console.log('正在加载嵌入模型...');
    // 创建特征提取 pipeline
    this.extractor = await pipeline('feature-extraction', this.modelName);
    console.log('模型加载完成');

    // 加载并处理数据
    await this.loadAndProcessData();
    this.isInitialized = true;
  }

  // 加载数据并切分
  async loadAndProcessData() {
    const dataPath = path.join(process.cwd(), 'data', 'BigMing1566.txt');
    
    try {
      if (!fs.existsSync(dataPath)) {
        console.warn(`数据文件不存在: ${dataPath}`);
        return;
      }

      const text = fs.readFileSync(dataPath, 'utf-8');
      // 简单的切分逻辑：按段落切分，或者按固定长度切分
      // 这里演示按段落切分，并合并过短的段落
      const rawParagraphs = text.split(/\n\s*\n/);
      
      this.chunks = [];
      let currentChunk = '';
      
      for (const p of rawParagraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;

        // 如果当前块加上新段落不超过限制（例如 300 字符），则合并
        if (currentChunk.length + trimmed.length < 300) {
          currentChunk += (currentChunk ? '\n' : '') + trimmed;
        } else {
          if (currentChunk) this.chunks.push(currentChunk);
          currentChunk = trimmed;
        }
      }
      if (currentChunk) this.chunks.push(currentChunk);

      console.log(`数据切分完成，共 ${this.chunks.length} 个片段，开始生成向量...`);

      // 生成向量
      this.embeddings = [];
      for (let i = 0; i < this.chunks.length; i++) {
        const output = await this.extractor(this.chunks[i], { pooling: 'mean', normalize: true });
        this.embeddings.push(output.data);
        if ((i + 1) % 10 === 0) console.log(`已处理 ${i + 1}/${this.chunks.length} 个片段`);
      }
      console.log('向量生成完成');

    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }

  // 搜索最相似的片段
  async search(query, topK = 3) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 生成查询向量
    const queryOutput = await this.extractor(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = queryOutput.data;

    // 计算相似度
    const scores = this.embeddings.map((emb, index) => ({
      index,
      score: cosineSimilarity(queryEmbedding, emb),
      content: this.chunks[index]
    }));

    // 排序并返回前 K 个
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}

export const ragService = new RagService();
