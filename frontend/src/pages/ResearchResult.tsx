import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { advancedApi, researchApi } from "../services/api";
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

          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-white border border-slate-200 shadow-xl rounded-xl z-50 pointer-events-none 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-left"
          >
            <div className="text-[10px] text-slate-400 font-sans uppercase tracking-tight mb-1">
              [{s.num}] {s.publication || "Unknown Publication"}
            </div>

            <div className="text-sm font-bold text-slate-800 leading-snug mb-2 font-sans">
              "{s.title}"
            </div>

            <div className="flex justify-between items-center text-[10px] border-t pt-2 border-slate-100">
              <span className="text-blue-600 font-bold uppercase">
                Bài gốc • {s.year}
              </span>
              <span className="text-slate-400 italic">
                ({s.citation_count} lượt trích dẫn)
              </span>
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
  const navigate = useNavigate();
  const [article, setArticle] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    if (id) {
      advancedApi.getGeneratedArticle(id).then((res) => setArticle(res.data));
      advancedApi
        .getGeneratedSources(id)
        .then((res) => setSources(res.data.sources));
    }
  }, [id]);

  const handleExportPdf = async () => {
    if (!id || isExporting) return;
    setIsExporting(true);
    setExportError("");
    try {
      const res = await researchApi.exportPdf(id);
      const blobUrl = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `Research_${id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("PDF export failed", error);
      setExportError(
        "Chưa xuất được PDF. Hãy thử lại sau khi backend đã nạp bản cập nhật mới.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!article)
    return <div className="p-20 text-center italic">Đang tải tri thức...</div>;

  return (
    <div className="bg-slate-100 min-h-screen py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-12 shadow-sm">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="pointer-events-none absolute right-10 top-10 h-24 w-24 rounded-full bg-cyan-100/40 blur-3xl" />
            <h1 className="text-4xl font-sans font-bold text-slate-900 border-b pb-8 mb-12 text-center leading-tight">
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
                Tài liệu tham khảo
              </h3>
              <ul className="space-y-6">
                {sources.map((source, index) => (
                  <li
                    key={source.id}
                    id={`source-${source.id}`}
                    className="flex gap-4 items-start reference-item"
                  >
                    <span className="font-bold text-blue-600 min-w-7 text-lg">
                      [{index + 1}]
                    </span>

                    <div className="text-sm text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-800">
                        {source.publication}.{" "}
                      </span>
                      <span className="italic">"{source.title}". </span>
                      <a
                        href={source.link}
                        target="_blank"
                        className="text-blue-500 font-medium hover:underline"
                      >
                        Bài gốc
                      </a>
                      .<span className="mx-1">{source.year}. </span>
                      <span className="text-slate-400">
                        ({source.citation_count} lượt trích dẫn)
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="h-fit xl:sticky xl:top-28">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Tác vụ bài viết
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900">
                Xuất và điều hướng
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Xuất file PDF hoặc quay lại lịch sử nghiên cứu từ khung cố định
                này.
              </p>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  disabled={isExporting}
                  className={`w-full rounded-full border px-4 py-3 text-sm font-semibold transition duration-300 ${
                    isExporting
                      ? "cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400"
                      : "cursor-pointer border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
                  }`}
                >
                  {isExporting ? "Đang xuất PDF..." : "Xuất PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/history")}
                  className="w-full cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition duration-300 hover:-translate-y-0.5 hover:border-slate-900 hover:bg-slate-950 hover:text-cyan-300 hover:[text-shadow:0_0_6px_rgba(34,211,238,0.72),0_0_16px_rgba(34,211,238,0.42),0_0_28px_rgba(34,211,238,0.24)] hover:shadow-[rgba(0,0,0,0.3)_0px_19px_38px,rgba(0,0,0,0.22)_0px_15px_12px]"
                >
                  Lịch sử nghiên cứu
                </button>
              </div>
              {exportError && (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {exportError}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
