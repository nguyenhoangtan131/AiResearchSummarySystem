import { DatabaseZap, FileCog, FolderSync, Sparkles } from 'lucide-react';

import { formatNumber, formatUsd } from '../../admin-dashboard/utils';
import type { AdminArticleExecutionStep } from '../types';

type Props = {
  steps: AdminArticleExecutionStep[];
};

const iconMap = {
  'Structure Recommendation': FileCog,
  'Chapter Confirm': DatabaseZap,
  'Chapter Recommendation': Sparkles,
  'Chapter Generation': Sparkles,
  'Article Finalization': FolderSync,
  Bootstrap: FileCog,
} as const;

const statusClasses = {
  completed: 'border-cyan-200 bg-cyan-100 text-cyan-700',
  cached: 'border-amber-200 bg-amber-100 text-amber-700',
  generated: 'border-emerald-200 bg-emerald-100 text-emerald-700',
};

export default function AdminArticleTimeline({ steps }: Props) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Execution Timeline
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Dong thoi gian xu ly bai nghien cuu
          </h3>
        </div>
      </div>

      <div className="space-y-0 p-6">
        {steps.map((step, index) => {
          const Icon = iconMap[step.stageType as keyof typeof iconMap] ?? Sparkles;
          const isLast = index === steps.length - 1;

          return (
            <div key={`${step.stepNumber}-${step.title}`} className="relative pl-16">
              {!isLast && (
                <div className="absolute left-5 top-12 h-[calc(100%-1rem)] w-px bg-slate-200" />
              )}
              <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-cyan-300 shadow-sm">
                {String(step.stepNumber).padStart(2, '0')}
              </div>

              <article className={`mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm ${isLast ? 'mb-0' : ''}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-slate-950">
                        {step.title}
                      </h4>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${statusClasses[step.status]}`}>
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {step.note}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <Icon size={16} />
                    <span className="font-mono">{step.modelName}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Stage Type" value={step.stageType} accent="text-slate-700" />
                  <MetricCard label="Input" value={formatNumber(step.inputTokens)} accent="text-slate-900" />
                  <MetricCard label="Output" value={formatNumber(step.outputTokens)} accent="text-slate-900" />
                  <MetricCard label="Total" value={formatNumber(step.totalTokens)} accent="text-slate-900" />
                  <MetricCard label="Cost" value={formatUsd(step.estimatedCost)} accent="text-cyan-700" />
                </div>
                <p className="mt-4 font-mono text-xs text-slate-500">
                  Latency: {step.latencySeconds.toFixed(1)}s
                </p>
              </article>
            </div>
          );
        })}
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 font-mono text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
