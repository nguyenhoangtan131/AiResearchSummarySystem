import { BarChart3 } from 'lucide-react';

import { formatNumber, formatUsd } from '../../admin-dashboard/utils';
import type { AdminArticleExecutionStep } from '../types';

type Props = {
  steps: AdminArticleExecutionStep[];
};

export default function AdminArticleTimeline({ steps }: Props) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Step Breakdown
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Tung buoc ton bao nhieu token va bao nhieu lan goi
          </h3>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {steps.map((step) => (
          <article
            key={step.stepKey}
            className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-lg font-semibold text-slate-950">{step.title}</h4>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                    {step.callCount} calls
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <BarChart3 size={16} />
                <span className="font-mono">{step.modelName}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <MetricCard label="Calls" value={formatNumber(step.callCount)} accent="text-cyan-700" />
              <MetricCard label="Input" value={formatNumber(step.inputTokens)} accent="text-slate-900" />
              <MetricCard label="Output" value={formatNumber(step.outputTokens)} accent="text-slate-900" />
              <MetricCard label="Total" value={formatNumber(step.totalTokens)} accent="text-slate-900" />
              <MetricCard label="Cost" value={formatUsd(step.estimatedCost)} accent="text-cyan-700" />
              <MetricCard label="Avg Latency" value={`${step.averageLatencySeconds.toFixed(1)}s`} accent="text-slate-700" />
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-mono text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
