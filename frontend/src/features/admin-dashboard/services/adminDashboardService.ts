import { adminApi } from '../../../services/api';
import type { AdminDashboardResponse } from '../types';

export const adminDashboardService = {
  async getUsageByDate(selectedDate: string): Promise<AdminDashboardResponse> {
    const { data } = await adminApi.getDashboard(selectedDate);
    return {
      selectedDate: data.selectedDate,
      overview: {
        totalCalls: Number(data.overview?.totalCalls || 0),
        totalInputTokens: Number(data.overview?.totalInputTokens || 0),
        totalOutputTokens: Number(data.overview?.totalOutputTokens || 0),
        totalEstimatedCost: Number(data.overview?.totalEstimatedCostUsd || 0),
      },
      users: Array.isArray(data.users)
        ? data.users.map((user: {
          userId: string;
          fullName: string;
          email: string;
          articleCount: number;
          llmCalls: number;
          totalTokens: number;
          estimatedCostUsd: number;
        }) => ({
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          articleCount: Number(user.articleCount || 0),
          llmCalls: Number(user.llmCalls || 0),
          totalTokens: Number(user.totalTokens || 0),
          estimatedCostUsd: Number(user.estimatedCostUsd || 0),
        }))
        : [],
      totalRecords: Number(data.totalRecords || 0),
      page: Number(data.page || 1),
      pageSize: Number(data.pageSize || 6),
    };
  },
};
