import type { AdminDashboardUser } from './types';

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

export const buildCsvContent = (users: AdminDashboardUser[]) => {
  const header = [
    'user_id',
    'full_name',
    'email',
    'article_count',
    'llm_calls',
    'total_tokens',
    'estimated_cost_usd',
  ];

  const rows = users.map((user) => [
    user.userId,
    user.fullName,
    user.email,
    user.articleCount,
    user.llmCalls,
    user.totalTokens,
    user.estimatedCostUsd,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
};
