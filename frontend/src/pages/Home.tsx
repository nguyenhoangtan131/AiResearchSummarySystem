import React, { useState } from 'react';
import { researchApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState(""); 
  const navigate = useNavigate();

  const handleStartResearch = async () => {
    try {
      setStatus("Đang kiến trúc bản thảo...");
      const step1 = await researchApi.createPrompt(input);
      const searchId = step1.data.search_id;

      setStatus("Đang thu thập dữ liệu từ Google Scholar...");
      await researchApi.executeSearch(searchId);

      setStatus("AI đang phân tích và viết bài (vui lòng đợi)...");
      const step3 = await researchApi.generateArticle(searchId);
      const articleId = step3.data.article_id;

      navigate(`/article/${articleId}`);
    } catch (error) {
      setStatus("Lỗi hệ thống: " + (error as any).message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Hệ thống Nghiên cứu ARSS</h1>
        
        <textarea
          className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Nhập chủ đề nghiên cứu (ví dụ: Sức khỏe tâm thần sinh viên)..."
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        
        <button
          onClick={handleStartResearch}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Bắt đầu Tổng hợp
        </button>
        
        {status && <p className="mt-4 text-sm text-blue-600 italic font-medium">⏳ {status}</p>}
      </div>
    </div>
  );
}