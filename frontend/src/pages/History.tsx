import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { researchApi } from '../services/api';

export default function History() {
  const [articles, setArticles] = useState<any[]>([]);

  const formatDateTime = (value?: string) => {
    if (!value) return 'Không rõ thời gian';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  };

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
            className="group flex justify-between items-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-950 hover:bg-slate-950 hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-700 transition-colors group-hover:text-cyan-300 group-hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)]">{art.title}</h3>
              <p className="mt-2 text-sm text-slate-500 transition-colors group-hover:text-slate-300">Tạo lúc: {formatDateTime(art.created_at)}</p>
              <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 transition-colors group-hover:text-slate-500">ID: {art.id}</p>
            </div>
            <span className="font-bold text-cyan-600 transition-colors group-hover:text-cyan-300 group-hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)]">Xem lại →</span>
          </Link>
        ))}
        {articles.length === 0 && <p className="italic text-slate-500">Bạn chưa có bài nghiên cứu nào.</p>}
      </div>
    </div>
  );
}
