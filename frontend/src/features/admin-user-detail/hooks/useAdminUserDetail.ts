import { useEffect, useState } from 'react';

import { adminUserDetailService } from '../services/adminUserDetailService';
import type { AdminUserDetail } from '../types';

export function useAdminUserDetail(userId?: string) {
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    let active = true;

    const loadUserDetail = async () => {
      if (!userId) {
        setError('Không tìm thấy user ID để hiển thị chi tiết.');
        setUserDetail(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const response = await adminUserDetailService.getUserDetail(userId);
        if (active) {
          setUserDetail(response);
        }
      } catch (loadError) {
        console.error('Không tải được chi tiết user admin:', loadError);
        if (active) {
          setError('Chưa tải được hồ sơ người dùng. Khi nối backend, phần này sẽ đọc từ API admin detail.');
          setUserDetail(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadUserDetail();

    return () => {
      active = false;
    };
  }, [userId]);

  const filteredArticles = userDetail
    ? userDetail.articles.filter((article) => {
        const normalizedQuery = searchValue.trim().toLowerCase();
        if (!normalizedQuery) {
          return true;
        }

        return (
          article.articleId.toLowerCase().includes(normalizedQuery) ||
          article.title.toLowerCase().includes(normalizedQuery)
        );
      })
    : [];

  return {
    userDetail,
    filteredArticles,
    isLoading,
    error,
    searchValue,
    setSearchValue,
  };
}
