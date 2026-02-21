// src/pages/ResearchResult.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { researchApi } from '../services/api';

// Thêm tham số 'sources' vào hàm để nó biết đường mà tra cứu số
const renderContentWithCitations = (content: string, sources: any[]) => {
  if (!content) return null;

  // 1. Tạo "từ điển" để biết ID nào tương ứng với số mấy
  const sourceMap: Record<string, number> = {};
  sources.forEach((s, index) => {
    sourceMap[s.id] = index + 1;
  });

  // 2. Cắt bài báo thành từng đoạn dựa trên tag [Source ID: ...]
  const parts = content.split(/(\[Source ID: [a-f0-9-]{36}\])/g);

  return parts.map((part, index) => {
    if (part.startsWith("[Source ID:")) {
      // Tìm cái mã UUID nằm bên trong dấu ngoặc
      const uuid = part.match(/[a-f0-9-]{36}/)?.[0];
      const num = uuid ? sourceMap[uuid] : null;

      // Nếu tìm thấy số thì hiện [1], nhấn vào sẽ nhảy xuống cuối bài
      return num ? (
        <a 
          key={index} 
          href={`#source-${uuid}`} 
          className="text-blue-600 font-bold hover:underline mx-1 cursor-pointer"
        >
          [{num}]
        </a>
      ) : null;
    }
    return part;
  });
};

export default function ResearchResult() {
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  useEffect(() => {
  if (id) {
    researchApi.getArticle(id).then(res => setArticle(res.data));
    researchApi.getSources(id).then(res => setSources(res.data.sources));
  }
}, [id]);

  if (!article) return <div className="p-20 text-center italic">Đang tải tri thức...</div>;

  return (
    <div className="bg-slate-100 min-h-screen py-10">
      <div className="max-w-4xl mx-auto bg-white p-12 shadow-sm border border-slate-200">

        <h1 className="text-4xl font-sans font-bold text-slate-900 border-b pb-8 mb-12 uppercase text-center leading-tight">
          {article.title}
        </h1>
        
        <div className="space-y-16">
          {article.sections.map((section: any) => (
            <section key={section.order}>
              <h2 className="text-2xl font-sans font-bold text-blue-900 mb-6 border-l-4 border-blue-600 pl-4">
                {section.title}
              </h2>
              <div className="prose prose-slate lg:prose-xl max-w-none font-serif text-justify whitespace-pre-wrap text-slate-800">
                {renderContentWithCitations(section.content, sources)}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-20 pt-10 border-t-2 border-slate-100">
          <h3 className="text-xl font-bold mb-8 text-slate-800 uppercase tracking-widest">
            References
          </h3>
          <ul className="space-y-6">
            {sources.map((source, index) => (
              <li key={source.id} id={`source-${source.id}`} className="flex gap-4 items-start reference-item">
                <span className="font-bold text-blue-600 min-w-7 text-lg">
                  [{index + 1}]
                </span>

                <div className="text-sm text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800">{source.publication}. </span>
                  <span className="italic">"{source.title}". </span>
                  
                  <a href={source.link} target="_blank" className="text-blue-500 font-medium hover:underline">
                    Bài gốc
                  </a>. 

                  <span className="mx-1">{source.year}. </span>
                  <span className="text-slate-400">
                    ({source.citation_count} lượt trích dẫn)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}