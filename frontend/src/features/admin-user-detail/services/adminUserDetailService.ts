import { adminApi } from '../../../services/api';
import type { AdminUserDetail } from '../types';

export const adminUserDetailService = {
  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const { data } = await adminApi.getUserDetail(userId);
    return {
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      tier: data.tier,
      totalArticles: Number(data.totalArticles || 0),
      totalTokens: Number(data.totalTokens || 0),
      totalEstimatedCost: Number(data.totalEstimatedCostUsd || 0),
      totalLlmCalls: Number(data.totalLlmCalls || 0),
      articles: Array.isArray(data.articles)
        ? data.articles.map((article: {
          articleId: string;
          title: string;
          createdAt: string;
          llmCalls: number;
          totalTokens: number;
          estimatedCostUsd: number;
        }) => ({
          articleId: article.articleId,
          title: article.title,
          createdAt: article.createdAt,
          llmCalls: Number(article.llmCalls || 0),
          totalTokens: Number(article.totalTokens || 0),
          estimatedCost: Number(article.estimatedCostUsd || 0),
        }))
        : [],
    };
  },
};
