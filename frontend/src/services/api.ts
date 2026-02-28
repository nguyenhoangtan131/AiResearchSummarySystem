import axios from 'axios';

const apiInstance = axios.create({ 
  baseURL: 'http://localhost:8000/api',
  withCredentials: true
});

export const researchApi = {
  createPrompt: (input: string) => apiInstance.post('/research/prompt', { raw_input: input }),
  executeSearch: (searchId: string) => apiInstance.post(`/research/search/${searchId}`),
  generateArticle: (searchId: string) => apiInstance.post(`/research/generate-article/${searchId}`),
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
