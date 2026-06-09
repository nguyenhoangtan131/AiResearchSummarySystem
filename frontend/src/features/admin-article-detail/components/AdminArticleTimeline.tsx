import { BarChart3 } from 'lucide-react';

import { formatNumber, formatUsd } from '../../admin-dashboard/utils';
import type { AdminArticleExecutionStep } from '../types';
import { formatModelLabel } from '../utils';

type Props = {
  steps: AdminArticleExecutionStep[];
};

export default function AdminArticleTimeline({ steps }: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Phân rã theo bước
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Token và lượt gọi của từng nhóm xử lý
          </h3>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {steps.map((step) => (
          <article
            key={step.stepKey}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-lg font-semibold leading-snug text-slate-950">{step.title}</h4>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                    {step.callCount} lượt gọi
                  </span>
                </div>
              </div>

              <div
                title={step.modelName}
                className="inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <BarChart3 size={16} />
                <span className="truncate font-mono">{formatModelLabel(step.modelName)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <MetricCard label="Lượt gọi" value={formatNumber(step.callCount)} accent="text-cyan-700" />
              <MetricCard label="Đầu vào" value={formatNumber(step.inputTokens)} accent="text-slate-900" />
              <MetricCard label="Đầu ra" value={formatNumber(step.outputTokens)} accent="text-slate-900" />
              <MetricCard label="Tổng token" value={formatNumber(step.totalTokens)} accent="text-slate-900" />
              <MetricCard label="Chi phí" value={formatUsd(step.estimatedCost)} accent="text-cyan-700" />
              <MetricCard label="Độ trễ TB" value={`${step.averageLatencySeconds.toFixed(1)}s`} accent="text-slate-700" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-mono text-sm font-semibold leading-none ${accent}`}>{value}</p>
    </div>
  );
}
