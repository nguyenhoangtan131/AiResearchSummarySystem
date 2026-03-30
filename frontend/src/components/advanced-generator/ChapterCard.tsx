import { FileText, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { ChapterDraft, ChapterGuide, ReferenceItem } from './types';

interface ChapterCardProps {
  chapter: ChapterDraft;
  index: number;
  onChange: (chapterId: string, field: 'genre' | 'title' | 'summary' | 'rules' | 'customGuidance', value: string) => void;
  onAddGuide: (chapterId: string) => void;
  onAddReference: (chapterId: string) => void;
  onRemove: (chapterId: string) => void;
}

function GuideChip({ guide }: { guide: ChapterGuide }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">{guide.label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{guide.content}</p>
    </div>
  );
}

function SourceChip({ source }: { source: ReferenceItem }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2">
      <p className="text-sm font-semibold text-slate-900">{source.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        {source.journal} • {source.year}
      </p>
    </div>
  );
}

export default function ChapterCard({
  chapter,
  index,
  onChange,
  onAddGuide,
  onAddReference,
  onRemove,
}: ChapterCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Chuong {index + 1}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Khung noi dung va huong dan rieng</h3>
        </div>
        <button
          type="button"
          onClick={() => onRemove(chapter.id)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={16} />
          Xoa chuong
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">The loai chuong</span>
          <input
            value={chapter.genre}
            onChange={(e) => onChange(chapter.id, 'genre', e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
            placeholder="Vi du: Tong quan tai lieu, phan tich ket qua, khuyen nghi..."
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Tieu de chuong</span>
          <input
            value={chapter.title}
            onChange={(e) => onChange(chapter.id, 'title', e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
            placeholder="Bam hop goi y ben phai hoac tu dien tay"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Noi dung can khai trien</span>
          <textarea
            value={chapter.summary}
            onChange={(e) => onChange(chapter.id, 'summary', e.target.value)}
            rows={4}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
            placeholder="Mo ta muc tieu, pham vi va cac diem bat buoc phai co trong chuong"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Luat viet</span>
          <textarea
            value={chapter.rules}
            onChange={(e) => onChange(chapter.id, 'rules', e.target.value)}
            rows={3}
            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
            placeholder="Vi du: khong dung tai lieu mang, phai doi chieu nguon, van phong hoc thuat, trich dan ro rang"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              <p className="font-semibold text-slate-900">Huong dan viet cho AI</p>
            </div>
            <button
              type="button"
              onClick={() => onAddGuide(chapter.id)}
              className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-200"
            >
              <Plus size={14} />
              Them goi y
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {chapter.guides.length > 0 ? (
              chapter.guides.map((guide) => <GuideChip key={guide.id} guide={guide} />)
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Chua co huong dan. Bam "Them goi y" de mo hop goi y ben phai, hoac dien tay o o duoi.
              </p>
            )}
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nhap tay huong dan rieng</span>
            <textarea
              value={chapter.customGuidance}
              onChange={(e) => onChange(chapter.id, 'customGuidance', e.target.value)}
              rows={3}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400"
              placeholder="Noi nay danh cho nhap tay, khong tu dong mo goi y de tranh ton chi phi AI"
            />
          </label>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-violet-600" />
              <p className="font-semibold text-slate-900">Tai lieu bo sung cho chuong</p>
            </div>
            <button
              type="button"
              onClick={() => onAddReference(chapter.id)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-200"
            >
              <Plus size={14} />
              Chon source
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {chapter.references.length > 0 ? (
              chapter.references.map((reference) => <SourceChip key={reference.id} source={reference} />)
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Khong hien goi y source o day. Nguoi dung chi mo khi can, de tach rieng voi nhap noi dung.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
