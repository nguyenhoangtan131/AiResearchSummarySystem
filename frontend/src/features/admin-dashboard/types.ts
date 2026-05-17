export type UserTier = 'free' | 'tier 1' | 'admin';

export type AdminOverview = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCost: number;
};

export type AdminUsageLog = {
  id: string;
  createdAt: string;
  userId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
};

export type AdminDashboardResponse = {
  selectedDate: string;
  overview: AdminOverview;
  logs: AdminUsageLog[];
  totalRecords: number;
  page: number;
  pageSize: number;
};
