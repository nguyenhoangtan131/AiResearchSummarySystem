// import axios from 'axios';


// const api = axios.create({ baseURL: 'http://localhost:8000/api/research' });

// export const researchApi = {
  
//   createPrompt: (input: string) => api.post('/prompt', { raw_input: input }),
  
//   executeSearch: (searchId: string) => api.post(`/search/${searchId}`),
  
  
//   generateArticle: (searchId: string) => axios.post(`http://localhost:8000/api/research/generate-article/${searchId}`),
  
//   getArticle: (articleId: string) => api.get(`/article/${articleId}`)
// };


import axios from 'axios';


const api = axios.create({ baseURL: 'http://localhost:8000/api/research' });

export const researchApi = {
  
  createPrompt: (input: string) => api.post('/prompt', { raw_input: input }),
  
  executeSearch: (searchId: string) => api.post(`/search/${searchId}`),
  
  
  generateArticle: (searchId: string) => axios.post(`http://localhost:8000/api/research/generate-article/${searchId}`),
  
  getArticle: (articleId: string) => api.get(`/article/${articleId}`),

  getSources: (articleId: string) => api.get(`/source/${articleId}`)
};