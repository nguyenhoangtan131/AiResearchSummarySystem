export type AdminArticleExecutionStep = {
  stepKey: string;
  title: string;
  callCount: number;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageLatencySeconds: number;
};

export type AdminArticleDetail = {
  articleId: string;
  articleTitle: string;
  status: 'Completed' | 'In Progress' | 'Draft';
  totalTokens: number;
  totalEstimatedCost: number;
  totalLlmCalls: number;
  modelLabels: string[];
  executionSteps: AdminArticleExecutionStep[];
};
