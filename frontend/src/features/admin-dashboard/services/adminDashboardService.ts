import { adminUsageLogSeed } from '../mockData';
import {
  ADMIN_DASHBOARD_PAGE_SIZE,
  isSameDate,
} from '../utils';
import type { AdminDashboardResponse, AdminUsageLog } from '../types';

const sortLogsDescending = (logs: AdminUsageLog[]) =>
  [...logs].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

export const adminDashboardService = {
  async getUsageByDate(selectedDate: string): Promise<AdminDashboardResponse> {
    const filteredLogs = sortLogsDescending(
      adminUsageLogSeed.filter((log) => isSameDate(log.createdAt, selectedDate)),
    );

    const overview = filteredLogs.reduce(
      (accumulator, log) => ({
        totalCalls: accumulator.totalCalls + 1,
        totalInputTokens: accumulator.totalInputTokens + log.inputTokens,
        totalOutputTokens: accumulator.totalOutputTokens + log.outputTokens,
        totalEstimatedCost: accumulator.totalEstimatedCost + log.estimatedCost,
      }),
      {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalEstimatedCost: 0,
      },
    );

    return {
      selectedDate,
      overview,
      logs: filteredLogs.slice(0, ADMIN_DASHBOARD_PAGE_SIZE),
      totalRecords: filteredLogs.length,
      page: 1,
      pageSize: ADMIN_DASHBOARD_PAGE_SIZE,
    };
  },
};
