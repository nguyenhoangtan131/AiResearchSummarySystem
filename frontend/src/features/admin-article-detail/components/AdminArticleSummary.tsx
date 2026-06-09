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
      hint: `${articleDetail.executionSteps.length} step groups`,
    },
    {
      label: 'Total Cost',
      value: formatUsd(articleDetail.totalEstimatedCost),
      hint: `${articleDetail.totalLlmCalls} calls`,
    },
    {
      label: 'Total Calls',
      value: `${articleDetail.totalLlmCalls}`,
      hint: articleDetail.status,
    },
    {
      label: 'Models Used',
      value: articleDetail.modelLabels.join(' / '),
      hint: `${articleDetail.executionSteps.length} step groups`,
    },
  ];

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="max-w-5xl text-3xl font-bold leading-tight tracking-tight text-slate-950 xl:text-4xl">
            Chi tiet tieu thu token - Bai viet: {articleDetail.articleTitle}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-sm text-slate-600">
              ID: {articleDetail.articleId}
            </span>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-mono text-sm font-semibold text-cyan-700">
              Status: {articleDetail.status}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            Re-generate
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {metric.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-3xl font-bold tracking-tight text-slate-950">{metric.value}</span>
              <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] text-cyan-700">{metric.hint}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
