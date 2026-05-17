import { Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

import { formatNumber, formatUsd } from '../../admin-dashboard/utils';
import { formatShortDate } from '../utils';
import type { AdminUserArticleSummary } from '../types';

type Props = {
  articles: AdminUserArticleSummary[];
  totalArticles: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export default function AdminUserArticlesTable({
  articles,
  totalArticles,
  searchValue,
  onSearchChange,
}: Props) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            User Articles
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Danh sach bai nghien cuu
          </h3>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-[280px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tim kiem bai viet..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-cyan-400"
            />
          </label>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Filter size={16} />
            Loc
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              {[
                'Article ID',
                'Tieu de bai nghien cuu',
                'Ngay tao',
                'So lan goi LLM',
                'Tong token',
                'Chi phi ($)',
              ].map((label) => (
                <th
                  key={label}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {articles.map((article) => (
              <tr key={article.articleId} className="transition hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-sm font-semibold text-cyan-700">
                  <Link
                    to={`/admin/articles/${article.articleId}`}
                    className="transition hover:text-cyan-500 hover:underline"
                  >
                    {article.articleId}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  {article.title}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {formatShortDate(article.createdAt)}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(article.llmCalls)}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(article.totalTokens)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-900">
                  {formatUsd(article.estimatedCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          Hien thi {articles.length} tren tong {totalArticles} bai viet
        </span>
        <div className="flex items-center gap-2">
          {['1', '2', '3'].map((label, index) => (
            <span
              key={label}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
                index === 0
                  ? 'border-cyan-700 bg-cyan-700 font-semibold text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
