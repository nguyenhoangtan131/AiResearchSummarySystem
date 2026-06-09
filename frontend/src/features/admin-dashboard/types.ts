export type UserTier = 'free' | 'tier 1' | 'admin';

export type AdminOverview = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
};

export type AdminDashboardUser = {
  userId: string;
  fullName: string;
  email: string;
  articleCount: number;
  llmCalls: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type AdminDashboardResponse = {
  selectedDate: string;
  overview: AdminOverview;
  users: AdminDashboardUser[];
  totalRecords: number;
  page: number;
  pageSize: number;
};
