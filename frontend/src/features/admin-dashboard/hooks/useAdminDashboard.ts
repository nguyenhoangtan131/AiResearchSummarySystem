import { useEffect, useState } from 'react';

import { adminDashboardService } from '../services/adminDashboardService';
import { getTodayInputValue } from '../utils';
import type { AdminDashboardResponse } from '../types';

export function useAdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await adminDashboardService.getUsageByDate(selectedDate);
        if (active) {
          setDashboard(response);
        }
      } catch (loadError) {
        console.error('Không tải được dashboard admin:', loadError);
        if (active) {
          setError('Chưa tải được dữ liệu dashboard theo ngày. Vui lòng thử lại.');
          setDashboard(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    dashboard,
    isLoading,
    error,
  };
}
