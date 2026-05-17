import { formatCompactMetric, formatUsd } from '../../admin-dashboard/utils';
import type { AdminArticleDetail } from '../types';

type Props = {
  articleDetail: AdminArticleDetail;
};

export default function AdminArticleSummary({ articleDetail }: Props) {
  const metrics = [
    {
      label: 'Total Tokens',
      value: formatCompactMetric(articleDetail.totalTokens),
      hint: `+${articleDetail.tokenDeltaPercent}%`,
    },
    {
      label: 'Total Cost',
      value: formatUsd(articleDetail.totalEstimatedCost),
      hint: `+${articleDetail.costDeltaPercent}%`,
    },
    {
      label: 'Avg Latency',
      value: `${articleDetail.averageLatencySeconds.toFixed(1)}s`,
      hint: `-${articleDetail.latencyDeltaSeconds.toFixed(1)}s`,
    },
    {
      label: 'Models Used',
      value: articleDetail.modelLabels.join(' / '),
      hint: `${articleDetail.executionSteps.length} stages`,
    },
  ];

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            Chi tiet tieu thu token - Bai viet: {articleDetail.articleTitle}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm text-slate-600">
              ID: {articleDetail.articleId}
            </span>
            <span className="rounded-full bg-cyan-100 px-3 py-1 font-mono text-sm font-semibold text-cyan-700">
              Status: {articleDetail.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            Re-generate
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {metric.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-950">{metric.value}</span>
              <span className="font-mono text-xs text-cyan-700">{metric.hint}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
