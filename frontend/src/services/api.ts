import axios from 'axios';

const apiInstance = axios.create({ 
  baseURL: 'http://localhost:8001/api',
  withCredentials: true
});

export const researchApi = {
  getArticle: (articleId: string) => apiInstance.get(`/research/article/${articleId}`),
  getSources: (articleId: string) => apiInstance.get(`/research/source/${articleId}`),
  exportPdf: (articleId: string) => 
    apiInstance.get(`/research/export/pdf/${articleId}`, { 
      responseType: 'blob'
    }),
  getHistory: () => apiInstance.get('/research/articles')

};

export const authApi = {
  loginWithGoogle: (token: string) => apiInstance.post('/auth/google', { token: token }),
  getMe: () => apiInstance.get('/auth/me'),
  logout: () => apiInstance.post('/auth/logout')
};

export const advancedApi = {
  recommendStructure: (articleTitle: string, reportType: string, sessionId?: string) =>
    apiInstance.post('/advanced/structure/recommend', {
      article_title: articleTitle,
      report_type: reportType,
      session_id: sessionId,
    }),
  getCachedStructure: (sessionId: string) =>
    apiInstance.get(`/advanced/structure/cache/${sessionId}`),
  getManualOverrideCache: (sessionId: string) =>
    apiInstance.get(`/advanced/chapter/override/cache/${sessionId}`),
  getCachedChapterStep: (
    sessionId: string,
    chapterNumber: number,
    step: 'titles' | 'briefs' | 'guides' | 'sources'
  ) => apiInstance.get(`/advanced/chapter/cache/${sessionId}/${chapterNumber}/${step}`),
  getArticle: (articleId: string) =>
    apiInstance.get(`/advanced/article/${articleId}`),
  getGeneratedArticle: (articleId: string) =>
    apiInstance.get(`/advanced/article/${articleId}/result`),
  getGeneratedSources: (articleId: string) =>
    apiInstance.get(`/advanced/article/${articleId}/sources`),
  generateChapter: (articleId: string, chapterNumber: number) =>
    apiInstance.post(`/advanced/article/${articleId}/chapter/${chapterNumber}/generate`),
  generateArticle: (articleId: string) =>
    apiInstance.post(`/advanced/article/${articleId}/generate`),
  selectStructure: (payload: {
    session_id: string;
    selected_option_id: string;
    article_id?: string;
  }) => apiInstance.post('/advanced/structure/select', payload),
  recommendChapterTitles: (payload: {
    session_id: string;
    selected_option_id: string;
    chapter_number: number;
  }) => apiInstance.post('/advanced/chapter/titles/recommend', payload),
  recommendChapterBriefs: (payload: {
    session_id: string;
    selected_option_id: string;
    chapter_number: number;
    chapter_title: string;
    chapter_title_description?: string;
  }) => apiInstance.post('/advanced/chapter/briefs/recommend', payload),
  recommendChapterGuides: (payload: {
    session_id: string;
    selected_option_id: string;
    chapter_number: number;
    chapter_title: string;
    chapter_brief: string;
  }) => apiInstance.post('/advanced/chapter/guides/recommend', payload),
  recommendChapterSources: (payload: {
    session_id: string;
    selected_option_id: string;
    chapter_number: number;
    chapter_title: string;
    chapter_brief: string;
    guide_notes?: string[];
  }) => apiInstance.post('/advanced/chapter/sources/recommend', payload),
  confirmFirstChapter: (payload: {
    session_id: string;
    selected_option_id: string;
    article_id?: string;
    manual_title?: string;
    ai_title?: string;
    ai_title_description?: string;
    manual_brief?: string;
    ai_brief?: string;
    ai_brief_description?: string;
    manual_guide?: string;
    selected_guides: Array<{
      source_type?: string;
      title?: string;
      content: string;
      is_selected?: boolean;
      sort_order?: number;
    }>;
    selected_sources: Array<{
      source_type?: string;
      title: string;
      snippet?: string;
      provider?: string;
      url?: string;
      year?: number;
      citation_count?: number;
      publication?: string;
      is_selected?: boolean;
      sort_order?: number;
    }>;
  }) => apiInstance.post('/advanced/chapter-1/confirm', payload),
  confirmChapter: (payload: {
    article_id: string;
    session_id: string;
    chapter_number: number;
    selected_option_id: string;
    chapter_title?: string;
    chapter_title_description?: string;
    chapter_brief?: string;
    chapter_brief_description?: string;
    manual_guide?: string;
    selected_guides: Array<{
      source_type?: string;
      title?: string;
      content: string;
      is_selected?: boolean;
      sort_order?: number;
    }>;
    selected_sources: Array<{
      source_type?: string;
      title: string;
      snippet?: string;
      provider?: string;
      url?: string;
      year?: number;
      citation_count?: number;
      publication?: string;
      is_selected?: boolean;
      sort_order?: number;
    }>;
  }) => apiInstance.post('/advanced/chapter/confirm', payload),
  syncChapterOverride: (payload: {
    session_id: string;
    chapter_number: number;
    block: 'title' | 'brief' | 'guide' | 'blueprint';
    mode?: 'ai' | 'manual';
    article_id?: string;
    data: Record<string, unknown>;
  }) => apiInstance.post('/advanced/chapter/override/sync', payload),
};

export const adminApi = {
  getDashboard: (selectedDate: string) =>
    apiInstance.get('/admin/dashboard', {
      params: { date: selectedDate },
    }),
  getUserDetail: (userId: string) =>
    apiInstance.get(`/admin/users/${userId}`),
  getArticleDetail: (articleId: string) =>
    apiInstance.get(`/admin/articles/${articleId}`),
};
