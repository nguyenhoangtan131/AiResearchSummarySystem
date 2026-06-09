import { Download, FileSearch2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buildCsvContent, formatNumber, formatUsd } from '../utils';
import type { AdminDashboardUser } from '../types';

type Props = {
  users: AdminDashboardUser[];
  totalRecords: number;
  selectedDate: string;
};

export default function AdminUsageTable({
  users,
  totalRecords,
  selectedDate,
}: Props) {
  const handleExportCsv = () => {
    const csvContent = buildCsvContent(users);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `gemini-users-${selectedDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            User Overview
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Danh sach nguoi dung theo ngay
          </h2>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-cyan-300"
        >
          <Download size={16} />
          Xuất CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              {[
                'User ID',
                'Người dùng',
                'Số bài',
                'Số lần gọi LLM',
                'Tổng token',
                'Chi phí ($)',
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
            {users.map((user) => (
              <tr key={user.userId} className="transition hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-semibold text-cyan-700">
                  <Link
                    to={`/admin/users/${user.userId}`}
                    className="transition hover:text-cyan-500 hover:underline"
                  >
                    {user.userId}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(user.articleCount)}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(user.llmCalls)}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(user.totalTokens)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-emerald-600">
                  {formatUsd(user.estimatedCostUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500">
            <FileSearch2 size={24} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              Không có user usage trong ngày này
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Chưa có người dùng nào phát sinh usage cho ngày đang chọn.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>
          Hiển thị {users.length} trên {totalRecords} người dùng trong ngày
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-900">
            Trang 1
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
            Chưa bật phân trang server
          </span>
        </div>
      </div>
    </section>
  );
}
