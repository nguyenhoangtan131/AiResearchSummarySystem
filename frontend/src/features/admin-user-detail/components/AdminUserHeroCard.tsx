import { formatCompactMetric, formatNumber, formatUsd } from '../../admin-dashboard/utils';
import type { AdminUserDetail } from '../types';

type Props = {
  userDetail: AdminUserDetail;
};

const getTierClassName = (tier: string) => {
  if (tier === 'tier 1') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-700';
  }
  if (tier === 'admin') {
    return 'border-cyan-200 bg-cyan-100 text-cyan-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-700';
};

export default function AdminUserHeroCard({ userDetail }: Props) {
  const stats = [
    {
      label: 'Tong bai viet',
      value: formatNumber(userDetail.totalArticles),
      hint: `${formatNumber(userDetail.totalLlmCalls)} calls`,
      progressClassName: 'w-3/4',
    },
    {
      label: 'Tong token',
      value: formatCompactMetric(userDetail.totalTokens),
      hint: userDetail.tier,
      progressClassName: 'w-1/2',
    },
    {
      label: 'Tong chi phi',
      value: formatUsd(userDetail.totalEstimatedCost),
      hint: `${formatNumber(userDetail.totalLlmCalls)} calls`,
      progressClassName: 'w-2/3',
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-12">
      <article className="xl:col-span-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {userDetail.fullName}
          </h2>
          <p className="mt-1 break-all text-sm text-slate-500">
            {userDetail.email}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-cyan-700">
              {userDetail.userId}
            </span>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getTierClassName(userDetail.tier)}`}
            >
              {userDetail.tier}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              Active
            </span>
          </div>
        </div>
      </article>

      <div className="xl:col-span-8 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {stat.label}
            </p>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <p className="text-2xl font-semibold text-slate-950">{stat.value}</p>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                {stat.hint}
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-cyan-500 ${stat.progressClassName}`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
