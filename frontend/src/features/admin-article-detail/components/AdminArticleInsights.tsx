import { formatNumber } from '../../admin-dashboard/utils';
import type { AdminArticleDetail } from '../types';

type Props = {
  articleDetail: AdminArticleDetail;
};

export default function AdminArticleInsights({ articleDetail }: Props) {
  const maxTokenStep = Math.max(
    ...articleDetail.executionSteps.map((step) => step.inputTokens),
    1,
  );

  const modelLatencyMap = articleDetail.executionSteps.reduce<Record<string, number[]>>(
    (accumulator, step) => {
      const existing = accumulator[step.modelName] ?? [];
      existing.push(step.latencySeconds);
      accumulator[step.modelName] = existing;
      return accumulator;
    },
    {},
  );

  const modelAverages = Object.entries(modelLatencyMap).map(([modelName, values]) => ({
    modelName,
    averageLatency:
      values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1),
  }));
  const maxLatency = Math.max(...modelAverages.map((item) => item.averageLatency), 1);

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Token Ratio Analysis
        </p>
        <div className="mt-6 flex h-56 items-end gap-4">
          {articleDetail.executionSteps.map((step) => (
            <div key={step.stepNumber} className="flex flex-1 flex-col items-center gap-3">
              <div className="flex h-full w-full items-end">
                <div
                  className="w-full rounded-t-[18px] bg-gradient-to-t from-cyan-600 to-cyan-300"
                  style={{
                    height: `${Math.max((step.inputTokens / maxTokenStep) * 100, 12)}%`,
                  }}
                />
              </div>
              <div className="text-center">
                <p className="font-mono text-xs text-slate-500">
                  {formatNumber(step.inputTokens)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Step {step.stepNumber}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Latency Distribution
        </p>
        <div className="mt-6 space-y-5">
          {modelAverages.map((item) => (
            <div key={item.modelName} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-slate-700">{item.modelName}</span>
                <span className="font-mono text-sm text-slate-500">
                  {item.averageLatency.toFixed(1)}s
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{
                    width: `${Math.max((item.averageLatency / maxLatency) * 100, 18)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm italic leading-6 text-slate-600">
            "Timeline nay da doi ten buoc de phu hop voi flow that cua he thong: recommend structure, confirm chapter, recommend source va generate article."
          </p>
        </div>
      </article>
    </section>
  );
}
