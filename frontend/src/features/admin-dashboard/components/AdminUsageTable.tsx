import { Download, FileSearch2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { buildCsvContent, formatNumber, formatTime, formatUsd } from '../utils';
import type { AdminUsageLog } from '../types';

type Props = {
  logs: AdminUsageLog[];
  totalRecords: number;
  selectedDate: string;
};

const getModelBadgeClassName = (modelName: string) => {
  if (modelName.toLowerCase().includes('pro')) {
    return 'border-blue-100 bg-blue-50 text-blue-700';
  }
  return 'border-indigo-100 bg-indigo-50 text-indigo-700';
};

export default function AdminUsageTable({
  logs,
  totalRecords,
  selectedDate,
}: Props) {
  const handleExportCsv = () => {
    const csvContent = buildCsvContent(logs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `gemini-usage-${selectedDate}.csv`;
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
            Usage Logs
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Bảng chi tiết lịch sử
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
                'Thời gian',
                'User ID',
                'Model',
                'Input / Output / Tổng',
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
            {logs.map((log) => (
              <tr
                key={log.id}
                className="transition hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-500">
                  {formatTime(log.createdAt)}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-cyan-700">
                  <Link
                    to={`/admin/users/${log.userId}`}
                    className="transition hover:text-cyan-500 hover:underline"
                  >
                    {log.userId}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getModelBadgeClassName(log.modelName)}`}
                  >
                    {log.modelName}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-slate-700">
                  {formatNumber(log.inputTokens)} / {formatNumber(log.outputTokens)} / {formatNumber(log.totalTokens)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-mono text-sm font-semibold text-emerald-600">
                  {formatUsd(log.estimatedCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <div className="rounded-full bg-slate-100 p-4 text-slate-500">
            <FileSearch2 size={24} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              Không có log trong ngày này
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Khi backend admin hoàn tất, bảng này sẽ hiển thị toàn bộ lượt gọi Gemini của ngày được chọn.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <p>
          Hiển thị {logs.length} trên {totalRecords} bản ghi trong ngày
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
