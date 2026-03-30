import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Sparkles, Wand2 } from 'lucide-react';
import ChapterCard from './ChapterCard';
import SuggestionPanel from './SuggestionPanel';
import type { ChapterDraft, ChapterGuide, ComposerField, ReferenceItem, SuggestionMode } from './types';

function createChapter(overrides?: Partial<ChapterDraft>): ChapterDraft {
  return {
    id: crypto.randomUUID(),
    genre: '',
    title: '',
    summary: '',
    rules: '',
    customGuidance: '',
    references: [],
    guides: [],
    ...overrides,
  };
}

const emptyReference: ReferenceItem = {
  id: 'manual-reference',
  title: 'Nguoi dung se bo sung nguon hoc thuat o day',
  journal: 'Tap chi tuy chon',
  year: '2026',
  openAccess: true,
};

export default function AdvancedGeneratorWorkspace() {
  const [visibleFields, setVisibleFields] = useState<ComposerField[]>(['title', 'keywords', 'abstract']);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>('structure');
  const [title, setTitle] = useState('Tac dong cua AI den chat luong tong quan tai lieu trong nghien cuu giao duc');
  const [keywords, setKeywords] = useState('AI writing assistant, literature review, higher education, open access');
  const [abstract, setAbstract] = useState(
    'Prototype nay cho phep nguoi dung xay de cuong bai viet nang cao, tach ro luong nhap tay, luong goi y va luong chon source.'
  );
  const [referencePolicy, setReferencePolicy] = useState('Chi lay bai open access, cho phep loc theo tap chi, khong dung tai lieu mang pho thong.');
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [chapters, setChapters] = useState<ChapterDraft[]>([
    createChapter({
      genre: 'Tong quan tai lieu',
      title: 'Chuong 1. Boi canh va khoang trong nghien cuu',
      summary: 'Tong hop boi canh, cac huong nghien cuu chinh va ly do can khai trien de tai.',
      rules: 'Phai doi chieu it nhat 2 nguon trong moi nhom y, uu tien bai 5 nam gan day.',
    }),
  ]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const stats = useMemo(
    () => [
      { label: 'Thanh phan dang bat', value: visibleFields.length.toString().padStart(2, '0') },
      { label: 'Chuong da tao', value: chapters.length.toString().padStart(2, '0') },
      {
        label: 'Sources da gan',
        value: `${references.length + chapters.reduce((sum, chapter) => sum + chapter.references.length, 0)}`.padStart(2, '0'),
      },
    ],
    [chapters, references.length, visibleFields.length]
  );

  const addField = (field: ComposerField) => {
    setVisibleFields((current) => (current.includes(field) ? current : [...current, field]));
    if (field === 'chapters' && chapters.length === 0) {
      const nextChapter = createChapter();
      setChapters([nextChapter]);
      setActiveChapterId(nextChapter.id);
    }
  };

  const updateChapter = (
    chapterId: string,
    field: keyof Omit<ChapterDraft, 'id' | 'references' | 'guides'>,
    value: string
  ) => {
    setChapters((current) =>
      current.map((chapter) => (chapter.id === chapterId ? { ...chapter, [field]: value } : chapter))
    );
  };

  const addManualChapter = () => {
    const nextChapter = createChapter();
    setChapters((current) => [...current, nextChapter]);
    setVisibleFields((current) => (current.includes('chapters') ? current : [...current, 'chapters']));
    setActiveChapterId(nextChapter.id);
  };

  const removeChapter = (chapterId: string) => {
    setChapters((current) => current.filter((chapter) => chapter.id !== chapterId));
    setActiveChapterId((current) => (current === chapterId ? null : current));
  };

  const handlePickChapterPreset = (preset: { genre: string; title: string; summary: string; rules: string }) => {
    const targetId = activeChapterId ?? chapters[chapters.length - 1]?.id;
    if (targetId) {
      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === targetId
            ? {
                ...chapter,
                genre: preset.genre,
                title: preset.title,
                summary: preset.summary,
                rules: preset.rules,
              }
            : chapter
        )
      );
      return;
    }

    const nextChapter = createChapter(preset);
    setChapters([nextChapter]);
    setActiveChapterId(nextChapter.id);
    setVisibleFields((current) => (current.includes('chapters') ? current : [...current, 'chapters']));
  };

  const handlePickGuide = (guide: ChapterGuide) => {
    const targetId = activeChapterId ?? chapters[chapters.length - 1]?.id;
    if (!targetId) return;

    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === targetId
          ? {
              ...chapter,
              guides: chapter.guides.some((item) => item.label === guide.label)
                ? chapter.guides
                : [...chapter.guides, { ...guide, id: crypto.randomUUID() }],
            }
          : chapter
      )
    );
  };

  const handlePickSource = (source: ReferenceItem) => {
    if (activeChapterId) {
      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === activeChapterId
            ? {
                ...chapter,
                references: chapter.references.some((item) => item.title === source.title)
                  ? chapter.references
                  : [...chapter.references, { ...source, id: crypto.randomUUID() }],
              }
            : chapter
        )
      );
      return;
    }

    setReferences((current) =>
      current.some((item) => item.title === source.title) ? current : [...current, { ...source, id: crypto.randomUUID() }]
    );
    setVisibleFields((current) => (current.includes('references') ? current : [...current, 'references']));
  };

  const attachManualReferenceToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setSuggestionMode('source');
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, references: [...chapter.references, { ...emptyReference, id: crypto.randomUUID() }] }
          : chapter
      )
    );
  };

  const attachGuideToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    setSuggestionMode('guide');
  };

  const sections = [
    { key: 'title', label: 'Tieu de', active: visibleFields.includes('title') },
    { key: 'keywords', label: 'Tu khoa', active: visibleFields.includes('keywords') },
    { key: 'abstract', label: 'Tom tat', active: visibleFields.includes('abstract') },
    { key: 'references', label: 'References', active: visibleFields.includes('references') },
    { key: 'chapters', label: 'Chuong', active: visibleFields.includes('chapters') },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_25%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-8 lg:px-6">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-900 text-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Advanced Article Generator</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight lg:text-4xl">
                Prototype cho luong nhap bai nang cao, uu tien de bai, chuong, source va huong dan viet tach biet
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 lg:text-base">
                Tieu de la diem vao dau tien. Sau do nguoi dung mo tung thanh phan bang dau cong, hoac mo hop goi y ben phai de nhan
                de xuat ten chuong, huong dan viet, source open access ma khong lam form bi roi.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => addField('references')}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Plus size={16} />
                  Them references
                </button>
                <button
                  type="button"
                  onClick={addManualChapter}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <Wand2 size={16} />
                  Them chuong moi
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">{item.label}</p>
                  <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <main className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Tien trinh cau hinh</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Lap cau truc bai viet theo tung buoc</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sections.map((section) => (
                    <div
                      key={section.key}
                      className={`rounded-full px-3 py-2 text-sm font-medium ${
                        section.active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {section.label}
                    </div>
                  ))}
                </div>
              </div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Tieu de bai viet</span>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  rows={2}
                  className="w-full rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-medium text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white"
                  placeholder="Nhap tieu de truoc de khoa chu de cho AI"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSuggestionMode('structure')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <Plus size={16} />
                  Mo danh sach thanh phan
                </button>
                <button
                  type="button"
                  onClick={() => addField('chapters')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  <ChevronRight size={16} />
                  Bat dau khai bao chuong
                </button>
              </div>
            </section>

            {visibleFields.includes('keywords') && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Tu khoa</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Tu khoa dinh huong tim tai lieu</h2>
                </div>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  placeholder="Them cum tu khoa hoc thuat, bien the tieng Anh, boi canh, doi tuong nghien cuu..."
                />
              </section>
            )}

            {visibleFields.includes('abstract') && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Abstract</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">Phac thao y dinh bai viet</h2>
                </div>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                  placeholder="Tom tat muc tieu, dong gop, pham vi va cach tiep can cua bai"
                />
              </section>
            )}

            {visibleFields.includes('references') && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-700">References</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">Bo loc nguon tham khao cap bai</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChapterId(null);
                      setSuggestionMode('source');
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-200"
                  >
                    <Sparkles size={16} />
                    Chon source goi y
                  </button>
                </div>

                <textarea
                  value={referencePolicy}
                  onChange={(e) => setReferencePolicy(e.target.value)}
                  rows={3}
                  className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-violet-400 focus:bg-white"
                  placeholder="Dat luat cho bo source tong: open access, loc tap chi, khong dung tai lieu web pho thong..."
                />

                <div className="mt-4 grid gap-3">
                  {references.length > 0 ? (
                    references.map((reference) => (
                      <div key={reference.id} className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{reference.title}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700">
                            {reference.openAccess ? 'Open access' : 'Can kiem tra'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {reference.journal} • {reference.year}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm leading-6 text-slate-500">
                      Chua co tai lieu cap bai. Bam "Chon source goi y" ben phai de dua source vao bo nho chung.
                    </p>
                  )}
                </div>
              </section>
            )}

            {visibleFields.includes('chapters') && (
              <section className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Cac chuong</p>
                      <h2 className="mt-2 text-lg font-semibold text-slate-900">Nhap chuong theo the loai truoc, roi moi chon ten chuong</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={addManualChapter}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-200"
                      >
                        <Plus size={16} />
                        Them chuong bang tay
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionMode('chapter')}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <Sparkles size={16} />
                        Mo hop ten chuong goi y
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    De khong bi tho, nguoi dung nhap the loai va noi dung tai card ben trai. Hop ben phai chi lam nhiem vu goi y ten
                    chuong, huong dan viet va source de chon vao.
                  </p>
                </div>

                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    onFocusCapture={() => setActiveChapterId(chapter.id)}
                    className={chapter.id === activeChapterId ? 'rounded-[32px] ring-2 ring-cyan-200 ring-offset-4 ring-offset-transparent' : ''}
                  >
                    <ChapterCard
                      chapter={chapter}
                      index={index}
                      onChange={updateChapter}
                      onAddGuide={attachGuideToChapter}
                      onAddReference={attachManualReferenceToChapter}
                      onRemove={removeChapter}
                    />
                  </div>
                ))}
              </section>
            )}
          </main>

          <SuggestionPanel
            mode={suggestionMode}
            onModeChange={setSuggestionMode}
            onAddField={addField}
            onPickChapterPreset={handlePickChapterPreset}
            onPickGuide={handlePickGuide}
            onPickSource={handlePickSource}
          />
        </div>
      </div>
    </div>
  );
}
