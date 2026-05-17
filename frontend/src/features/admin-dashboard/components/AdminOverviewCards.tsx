import {
  Activity,
  BadgeDollarSign,
  Download,
  SquareArrowDown,
} from 'lucide-react';

import { formatCompactMetric, formatUsd } from '../utils';
import type { AdminOverview } from '../types';

type Props = {
  overview: AdminOverview;
};

const cards = [
  {
    key: 'calls',
    title: 'Tổng số cuộc gọi LLM',
    valueKey: 'totalCalls',
    icon: Activity,
    accent: 'from-blue-600 to-cyan-500',
    hint: 'Số lượt gọi API Gemini trong ngày.',
  },
  {
    key: 'input',
    title: 'Tổng Input Tokens',
    valueKey: 'totalInputTokens',
    icon: SquareArrowDown,
    accent: 'from-slate-900 to-slate-700',
    hint: 'Khối lượng prompt đi vào hệ thống.',
  },
  {
    key: 'output',
    title: 'Tổng Output Tokens',
    valueKey: 'totalOutputTokens',
    icon: Download,
    accent: 'from-orange-500 to-amber-500',
    hint: 'Lượng token sinh ra từ Gemini.',
  },
  {
    key: 'cost',
    title: 'Tổng chi phí ước tính',
    valueKey: 'totalEstimatedCost',
    icon: BadgeDollarSign,
    accent: 'from-emerald-500 to-teal-500',
    hint: 'Chi phí USD được quy đổi theo log.',
  },
] as const;

export default function AdminOverviewCards({ overview }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const rawValue = overview[card.valueKey];
        const displayValue =
          card.valueKey === 'totalEstimatedCost'
            ? formatUsd(rawValue)
            : formatCompactMetric(rawValue);

        return (
          <article
            key={card.key}
            className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {card.title}
                </p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                  {displayValue}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                <Icon size={20} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{card.hint}</p>
          </article>
        );
      })}
    </div>
  );
}
