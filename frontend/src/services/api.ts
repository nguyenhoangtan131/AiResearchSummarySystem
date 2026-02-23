import axios from 'axios';

const apiInstance = axios.create({ 
  baseURL: 'http://localhost:8000/api' 
});

export const researchApi = {
  createPrompt: (input: string) => apiInstance.post('/research/prompt', { raw_input: input }),
  executeSearch: (searchId: string) => apiInstance.post(`/research/search/${searchId}`),
  generateArticle: (searchId: string) => apiInstance.post(`/research/generate-article/${searchId}`),
  getArticle: (articleId: string) => apiInstance.get(`/research/article/${articleId}`),
  getSources: (articleId: string) => apiInstance.get(`/research/source/${articleId}`),
  getHistory: () => apiInstance.get('/research/articles')
};

export const authApi = {
  loginWithGoogle: (token: string) => apiInstance.post('/auth/google', { token: token })
};