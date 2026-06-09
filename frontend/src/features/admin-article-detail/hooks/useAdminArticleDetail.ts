import { useEffect, useState } from 'react';

import { adminArticleDetailService } from '../services/adminArticleDetailService';
import type { AdminArticleDetail } from '../types';

export function useAdminArticleDetail(articleId?: string) {
  const [articleDetail, setArticleDetail] = useState<AdminArticleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadArticleDetail = async () => {
      if (!articleId) {
        setError('Không tìm thấy article ID để hiển thị chi tiết.');
        setArticleDetail(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const response = await adminArticleDetailService.getArticleDetail(articleId);
        if (active) {
          setArticleDetail(response);
        }
      } catch (loadError) {
        console.error('Không tải được chi tiết article admin:', loadError);
        if (active) {
          setError('Chưa tải được chi tiết bài viết từ admin API.');
          setArticleDetail(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadArticleDetail();

    return () => {
      active = false;
    };
  }, [articleId]);

  return {
    articleDetail,
    isLoading,
    error,
  };
}
