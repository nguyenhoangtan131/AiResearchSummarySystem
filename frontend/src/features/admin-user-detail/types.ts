import type { UserTier } from '../admin-dashboard/types';

export type AdminUserArticleSummary = {
  articleId: string;
  title: string;
  createdAt: string;
  llmCalls: number;
  totalTokens: number;
  estimatedCost: number;
};

export type AdminUserDetail = {
  userId: string;
  fullName: string;
  email: string;
  tier: Exclude<UserTier, 'admin'> | 'admin';
  totalArticles: number;
  totalTokens: number;
  totalEstimatedCost: number;
  totalLlmCalls: number;
  articles: AdminUserArticleSummary[];
};
