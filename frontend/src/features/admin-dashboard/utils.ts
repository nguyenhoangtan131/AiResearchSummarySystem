import type { AdminUsageLog } from './types';

export const ADMIN_DASHBOARD_PAGE_SIZE = 6;

export const getTodayInputValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameDate = (value: string, selectedDate: string) =>
  value.slice(0, 10) === selectedDate;

export const formatDashboardDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
  }).format(parsed);
};

export const formatTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
};

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const formatCompactMetric = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);

export const buildCsvContent = (logs: AdminUsageLog[]) => {
  const header = [
    'created_at',
    'user_id',
    'model_name',
    'input_tokens',
    'output_tokens',
    'total_tokens',
    'estimated_cost',
  ];

  const rows = logs.map((log) => [
    log.createdAt,
    log.userId,
    log.modelName,
    log.inputTokens,
    log.outputTokens,
    log.totalTokens,
    log.estimatedCost,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
};
