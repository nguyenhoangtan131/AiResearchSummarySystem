import { formatCompactMetric, formatUsd } from '../../admin-dashboard/utils';
import type { AdminArticleDetail } from '../types';
import { formatModelLabel } from '../utils';

type Props = {
  articleDetail: AdminArticleDetail;
};

export default function AdminArticleSummary({ articleDetail }: Props) {
  const metrics = [
    {
      label: 'Tổng token',
      value: formatCompactMetric(articleDetail.totalTokens),
      hint: `${articleDetail.executionSteps.length} nhóm bước`,
    },
    {
      label: 'Chi phí ước tính',
      value: formatUsd(articleDetail.totalEstimatedCost),
      hint: `${articleDetail.totalLlmCalls} lượt gọi`,
    },
    {
      label: 'Lượt gọi model',
      value: `${articleDetail.totalLlmCalls}`,
      hint: articleDetail.status,
    },
  ];
  const modelLabels = articleDetail.modelLabels.length > 0 ? articleDetail.modelLabels : ['Chưa có model'];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Bài viết
          </p>
          <h2 className="mt-2 max-w-5xl text-2xl font-bold leading-tight tracking-tight text-slate-950 xl:text-3xl">
            Chi tiết token: {articleDetail.articleTitle}
          </h2>
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
            <span className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600">
              ID: {articleDetail.articleId}
            </span>
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 font-mono text-xs font-semibold text-cyan-700">
              Status: {articleDetail.status}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Xuất CSV
          </button>
          <button
            type="button"
            className="rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
          >
            Tạo lại
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(240px,1.15fr)]">
        {metrics.map((metric) => (
          <article key={metric.label} className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {metric.label}
            </p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="text-3xl font-bold tracking-tight text-slate-950">{metric.value}</span>
              <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] text-cyan-700">{metric.hint}</span>
            </div>
          </article>
        ))}

        <article className="min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Model sử dụng
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {modelLabels.map((model) => (
              <span
                key={model}
                title={model}
                className="max-w-full truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                {formatModelLabel(model)}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Theo dõi {articleDetail.executionSteps.length} nhóm bước
          </p>
        </article>
      </div>
    </section>
  );
}
