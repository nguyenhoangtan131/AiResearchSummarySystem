import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { researchApi } from '../services/api';
const renderContentWithCitations = (content: string, sources: any[]) => {
  if (!content) return null;

  const sourceDataMap: Record<string, any> = {};
  sources.forEach((s, index) => {
    sourceDataMap[s.id] = { ...s, num: index + 1 };
  });

  const parts = content.split(/(\[Source ID: [a-f0-9-]{36}\])/g);

  return parts.map((part, index) => {
    if (part.startsWith("[Source ID:")) {
      const uuid = part.match(/[a-f0-9-]{36}/)?.[0];
      const s = uuid ? sourceDataMap[uuid] : null;

      if (!s) return null;

      return (
        <span key={index} className="relative group inline-block">
          <a 
            href={`#source-${uuid}`} 
            className="text-blue-600 font-bold hover:bg-blue-50 px-0.5 rounded transition-colors mx-0.5"
          >
            [{s.num}]
          </a>

          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50 pointer-events-none 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-left">
            
            <div className="text-[10px] text-slate-400 font-sans uppercase tracking-tight mb-1">
              [{s.num}] {s.publication || "Unknown Publication"}
            </div>
            
            <div className="text-sm font-bold text-slate-800 leading-snug mb-2 font-sans">
              "{s.title}"
            </div>
            
            <div className="flex justify-between items-center text-[10px] border-t pt-2 border-slate-100">
              <span className="text-blue-600 font-bold uppercase">Bài gốc • {s.year}</span>
              <span className="text-slate-400 italic">({s.citation_count} lượt trích dẫn)</span>
            </div>

            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
          </div>
        </span>
      );
    }
    return part;
  });
};


export default function ResearchResult() {
  const { id } = useParams();
  const [article, setArticle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    if (isExporting || !id) return; // Kiểm tra id tồn tại trước khi chạy
    
    setIsExporting(true); // Sửa True -> true
    try {
        // Sử dụng biến 'id' lấy từ useParams
        const response = await researchApi.exportPdf(id); 
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        
        // Sửa articleId -> id
        link.setAttribute('download', `AI_Research_Paper_${id}.pdf`); 
        
        document.body.appendChild(link);
        link.click();
        
        link.remove();
        window.URL.revokeObjectURL(url);
        
    } catch (err) {
        console.error("Lỗi xuất PDF:", err);
        alert("Không thể xuất file PDF. Vui lòng kiểm tra lại kết nối!");
    } finally {
        setIsExporting(false); // Sửa False -> false
    }
};


  useEffect(() => {
  if (id) {
    researchApi.getArticle(id).then(res => setArticle(res.data));
    researchApi.getSources(id).then(res => setSources(res.data.sources));
  }
}, [id]);

  if (!article) return <div className="p-20 text-center italic">Đang tải tri thức...</div>;

  return (
    <div className="bg-slate-100 min-h-screen py-10">
      <div className="max-w-5xl mx-auto relative px-4">
      <div className="absolute -right-16 top-0 h-full hidden lg:block">
        <div className="sticky top-28">
            <button 
                onClick={handleExport}
                className="bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all group"
                title="Xuất PDF"
            >
                <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                <div className="absolute top-12 text-[10px] font-bold text-red-600 opacity-0 group-hover:opacity-100 uppercase transition-opacity">PDF</div>
            </button>
        </div>
    </div>

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
        </div>
  );
}