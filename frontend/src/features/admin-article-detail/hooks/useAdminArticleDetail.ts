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
        setError('Khong tim thay article ID de hien thi chi tiet.');
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
        console.error('Khong tai duoc chi tiet article admin:', loadError);
        if (active) {
          setError('Chua tai duoc chi tiet article. Khi noi backend, phan nay se doc tu API admin article detail.');
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
