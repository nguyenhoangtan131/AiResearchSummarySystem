export type AdminArticleExecutionStep = {
  stepNumber: number;
  title: string;
  stageType: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencySeconds: number;
  status: 'completed' | 'cached' | 'generated';
  note: string;
};

export type AdminArticleDetail = {
  articleId: string;
  articleTitle: string;
  status: 'Completed' | 'In Progress' | 'Draft';
  totalTokens: number;
  totalEstimatedCost: number;
  averageLatencySeconds: number;
  modelLabels: string[];
  tokenDeltaPercent: number;
  costDeltaPercent: number;
  latencyDeltaSeconds: number;
  executionSteps: AdminArticleExecutionStep[];
};
