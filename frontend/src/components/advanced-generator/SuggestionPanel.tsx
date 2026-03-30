import { BookOpenText, FilePenLine, Lightbulb, Plus, SearchCheck } from 'lucide-react';
import type { ChapterGuide, ComposerField, ReferenceItem, SuggestionMode } from './types';

interface SuggestionPanelProps {
  mode: SuggestionMode;
  onModeChange: (mode: SuggestionMode) => void;
  onAddField: (field: ComposerField) => void;
  onPickChapterPreset: (preset: { genre: string; title: string; summary: string; rules: string }) => void;
  onPickGuide: (guide: ChapterGuide) => void;
  onPickSource: (source: ReferenceItem) => void;
}

const fieldSuggestions: Array<{ id: ComposerField; title: string; description: string }> = [
  { id: 'title', title: 'Tieu de', description: 'Khoa form vao chu de chinh truoc khi AI goi y cac phan khac.' },
  { id: 'keywords', title: 'Tu khoa', description: 'Them bo tu khoa nghien cuu de dinh huong truy van hoc thuat.' },
  { id: 'abstract', title: 'Tom tat', description: 'Phac hoa nhanh muc tieu, pham vi va dong gop ky vong cua bai viet.' },
  { id: 'references', title: 'References', description: 'Dua cac tai lieu open access, loc theo tap chi, khong lay tai lieu mang.' },
  { id: 'chapters', title: 'Cac chuong', description: 'Them dan chuong va hoan thien tung chuong theo the loai.' },
];

const chapterPresets = [
  {
    genre: 'Tong quan tai lieu',
    title: 'Chuong 1. Boi canh nghien cuu va khoang trong',
    summary: 'Mo ta boi canh nganh, cac huong nghien cuu da co va chi ra khoang trong hoc thuat.',
    rules: 'Uu tien so sanh theo nhom tac gia, neu ro moc thoi gian, giu giong van hoc thuat trung tinh.',
  },
  {
    genre: 'Khung phuong phap',
    title: 'Chuong 2. Thiet ke nghien cuu va tieu chi chon nguon',
    summary: 'Lam ro cach chon tai lieu open access, tieu chi loai tru va cach ma hoa du lieu.',
    rules: 'Nhan vao tieu chi chon loc, khong dung blog, khong dung bai pho thong, co buoc kiem tra tap chi.',
  },
  {
    genre: 'Phan tich ket qua',
    title: 'Chuong 3. Phan tich phat hien chinh',
    summary: 'Tong hop cac cum phat hien noi bat va doi chieu giua cac nguon da chon.',
    rules: 'Phan tich theo chu de, co doi chieu dong thuan va bat dong, tranh ke le tung paper rieng le.',
  },
  {
    genre: 'Khuyen nghi',
    title: 'Chuong 4. Ham y thuc tien va huong nghien cuu tiep theo',
    summary: 'Chot cac y nghia ung dung, han che va de xuat buoc nghien cuu tiep noi.',
    rules: 'Ket luan ngan gon, khong lap abstract, chi neu khuyen nghi co can cu tu phan phan tich.',
  },
];

const guideSuggestions: ChapterGuide[] = [
  {
    id: 'guide-1',
    label: 'Viet theo mach so sanh',
    content: 'Moi doan nen doi chieu it nhat 2 nguon, chot bang nhan dinh chung thay vi tom tat tuan tu.',
  },
  {
    id: 'guide-2',
    label: 'Nhan tieu chi hoc thuat',
    content: 'Uu tien bai thuoc tap chi Q1/Q2, cong bo trong 5 nam gan day, mo ta ro phuong phap nghien cuu.',
  },
  {
    id: 'guide-3',
    label: 'Giu van phong suc tich',
    content: 'Doan mo dau 2-3 cau, sau do di thang vao luan diem, tranh lan man va tranh trung abstract.',
  },
];

const sourceSuggestions: ReferenceItem[] = [
  {
    id: 'source-1',
    title: 'Open-access evidence synthesis in higher education research',
    journal: 'Studies in Educational Evaluation',
    year: '2024',
    openAccess: true,
    note: 'Phu hop cho chuong tong quan va thiet ke tieu chi chon tai lieu.',
  },
  {
    id: 'source-2',
    title: 'Systematic review transparency and reproducibility practices',
    journal: 'PLOS ONE',
    year: '2023',
    openAccess: true,
    note: 'Dung lam chuan cho muc quy trinh, tieu chi loai tru va bao cao nguon.',
  },
  {
    id: 'source-3',
    title: 'Open scholarly metadata for review-driven writing workflows',
    journal: 'Scientometrics',
    year: '2025',
    openAccess: true,
    note: 'Tot cho phan khung khai thac nguon va viet theo chu de.',
  },
];

const tabs = [
  { id: 'structure' as SuggestionMode, label: 'Khoi noi dung', icon: Plus },
  { id: 'chapter' as SuggestionMode, label: 'Ten chuong', icon: BookOpenText },
  { id: 'guide' as SuggestionMode, label: 'Huong dan viet', icon: FilePenLine },
  { id: 'source' as SuggestionMode, label: 'Nguon hoc thuat', icon: SearchCheck },
];

export default function SuggestionPanel({
  mode,
  onModeChange,
  onAddField,
  onPickChapterPreset,
  onPickGuide,
  onPickSource,
}: SuggestionPanelProps) {
  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Bang goi y</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Chon rieng de tranh roi form</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Goi y, them tay va chon source duoc tach thanh tung luong rieng. Nguoi dung chi mo dung khu vuc can dung.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === mode;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeChange(tab.id)}
              className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                isActive ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex-1 overflow-auto pr-1">
        {mode === 'structure' && (
          <div className="space-y-3">
            {fieldSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAddField(item.id)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <Plus size={16} className="text-cyan-700" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </button>
            ))}
          </div>
        )}

        {mode === 'chapter' && (
          <div className="space-y-3">
            {chapterPresets.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => onPickChapterPreset(preset)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{preset.genre}</p>
                <p className="mt-2 font-semibold text-slate-900">{preset.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{preset.summary}</p>
              </button>
            ))}
          </div>
        )}

        {mode === 'guide' && (
          <div className="space-y-3">
            {guideSuggestions.map((guide) => (
              <button
                key={guide.id}
                type="button"
                onClick={() => onPickGuide(guide)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb size={18} className="mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{guide.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{guide.content}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === 'source' && (
          <div className="space-y-3">
            {sourceSuggestions.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onPickSource(source)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{source.title}</p>
                  {source.openAccess && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Open access
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {source.journal} • {source.year}
                </p>
                {source.note && <p className="mt-2 text-sm leading-6 text-slate-600">{source.note}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
