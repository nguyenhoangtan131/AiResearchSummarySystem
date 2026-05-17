import { adminArticleDetailSeed } from '../mockData';
import type { AdminArticleDetail } from '../types';

const buildFallbackArticle = (articleId: string): AdminArticleDetail => ({
  articleId,
  articleTitle: 'Bai nghien cuu mock cho admin review',
  status: 'Draft',
  totalTokens: 6400,
  totalEstimatedCost: 0.034,
  averageLatencySeconds: 3.8,
  modelLabels: ['Gemini Flash'],
  tokenDeltaPercent: 1,
  costDeltaPercent: 0.3,
  latencyDeltaSeconds: 0.2,
  executionSteps: [
    {
      stepNumber: 1,
      title: 'Khoi tao quy trinh bai nghien cuu',
      stageType: 'Bootstrap',
      modelName: 'gemini-2.5-flash',
      inputTokens: 900,
      outputTokens: 500,
      totalTokens: 1400,
      estimatedCost: 0.008,
      latencySeconds: 2.4,
      status: 'completed',
      note: 'Ban ghi mock duoc tao vi article nay chua co payload chi tiet.',
    },
  ],
});

export const adminArticleDetailService = {
  async getArticleDetail(articleId: string): Promise<AdminArticleDetail> {
    return adminArticleDetailSeed[articleId] ?? buildFallbackArticle(articleId);
  },
};
