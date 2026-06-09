import { adminApi } from '../../../services/api';
import type { AdminArticleDetail } from '../types';
import { formatStepTitle } from '../utils';

export const adminArticleDetailService = {
  async getArticleDetail(articleId: string): Promise<AdminArticleDetail> {
    const { data } = await adminApi.getArticleDetail(articleId);
    return {
      articleId: data.articleId,
      articleTitle: data.articleTitle,
      status: data.status,
      totalTokens: Number(data.totalTokens || 0),
      totalEstimatedCost: Number(data.totalEstimatedCostUsd || 0),
      totalLlmCalls: Number(data.totalLlmCalls || 0),
      modelLabels: Array.isArray(data.modelLabels) ? data.modelLabels : [],
      executionSteps: Array.isArray(data.steps)
        ? data.steps.map((step: {
          stepKey: string;
          label: string;
          callCount: number;
          modelName: string;
          inputTokens: number;
          outputTokens: number;
          totalTokens: number;
          estimatedCostUsd: number;
          averageLatencySeconds: number;
        }) => ({
          stepKey: step.stepKey,
          title: formatStepTitle(step.stepKey, step.label),
          callCount: Number(step.callCount || 0),
          modelName: step.modelName,
          inputTokens: Number(step.inputTokens || 0),
          outputTokens: Number(step.outputTokens || 0),
          totalTokens: Number(step.totalTokens || 0),
          estimatedCost: Number(step.estimatedCostUsd || 0),
          averageLatencySeconds: Number(step.averageLatencySeconds || 0),
        }))
        : [],
    };
  },
};
