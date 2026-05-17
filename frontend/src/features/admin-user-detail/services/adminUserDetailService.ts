import { adminUserDetailSeed } from '../mockData';
import type { AdminUserDetail } from '../types';

const buildFallbackUser = (userId: string): AdminUserDetail => ({
  userId,
  fullName: `Mock User ${userId.toUpperCase()}`,
  email: `${userId}@example.com`,
  tier: 'free',
  totalArticles: 18,
  totalTokens: 124000,
  totalEstimatedCost: 9.45,
  totalLlmCalls: 64,
  growthRate: 3,
  tokenLevelLabel: 'Level 1',
  avatarImageUrl:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  articles: [
    {
      articleId: 'ART-MOCK-01',
      title: 'Ho so nguoi dung dang o che do mock',
      createdAt: '2024-05-30',
      llmCalls: 14,
      totalTokens: 8400,
      estimatedCost: 1.15,
    },
  ],
});

export const adminUserDetailService = {
  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    return adminUserDetailSeed[userId] ?? buildFallbackUser(userId);
  },
};
