import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { researchApi } from '../services/api';

export default function History() {
  const [articles, setArticles] = useState<any[]>([]);

useEffect(() => {
  const fetchHistory = async () => {
    try {
      const res = await researchApi.getHistory();
      setArticles(res.data);
    } catch (err) {
      console.error("Lỗi lấy lịch sử:", err);
      setArticles([]);
    }
  };

  fetchHistory();
}, []);
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-slate-800 border-b pb-4">Lịch sử nghiên cứu</h1>
      <div className="grid gap-4">
        {articles.map((art) => (
          <Link 
            key={art.id} 
            to={`/article/${art.id}`}
            className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex justify-between items-center group"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-700 group-hover:text-blue-700">{art.title}</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">ID: {art.id}</p>
            </div>
            <span className="text-blue-500 font-bold">Xem lại →</span>
          </Link>
        ))}
        {articles.length === 0 && <p className="italic text-slate-500">Bạn chưa có bài nghiên cứu nào.</p>}
      </div>
    </div>
  );
}