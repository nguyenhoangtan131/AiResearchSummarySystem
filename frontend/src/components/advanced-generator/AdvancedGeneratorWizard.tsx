import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, FileText, Lightbulb, Plus, Search, Sparkles } from 'lucide-react';

type PanelMode = 'hidden' | 'count' | 'title' | 'brief' | 'guide' | 'source';
type SourceItem = { id: string; title: string; snippet: string; provider: string; link: string; year: string };
type TitleOption = { title: string; description: string };
type BriefOption = { title: string; description: string };
type GuideOption = { id: string; title: string; body: string };
type Chapter = {
  id: string;
  aiTitle: TitleOption | null;
  customTitle: string;
  aiBrief: BriefOption | null;
  customBrief: string;
  selectedGuides: GuideOption[];
  customGuide: string;
  sources: SourceItem[];
  done: boolean;
};

const reportTypes = [
  'Literature Review',
  'Systematic Review',
  'Scoping Review',
  'Narrative Review',
  'Meta-analysis',
  'Research Report',
  'Policy Report',
  'Case Study Report',
  'Technical Report',
  'Academic Essay',
  'Conference Paper',
  'Journal Article',
  'Thesis Chapter',
  'Dissertation Proposal',
  'Grant Proposal',
];
const countOptions = [
  { id: '3', count: 3, label: '3 chapters', note: 'Focused structure with a compact flow.' },
  { id: '4', count: 4, label: '4 chapters', note: 'Balanced structure for review, analysis, and implications.' },
  { id: '5', count: 5, label: '5 chapters', note: 'More formal structure for longer reports.' },
];
const titleOptions: Record<string, TitleOption[]> = {
  'Literature Review': [
    { title: 'Research context and problem framing', description: 'Define the topic background, explain why the review matters, and position the problem clearly.' },
    { title: 'Evidence map and thematic synthesis', description: 'Organize prior studies into major themes and show how the evidence clusters connect.' },
    { title: 'Key findings and future directions', description: 'Summarize the strongest patterns in the literature and surface the next research opportunities.' },
  ],
  'Systematic Review': [
    { title: 'Review scope and selection protocol', description: 'Explain the review boundaries, inclusion logic, and how evidence was filtered.' },
    { title: 'Comparative evidence synthesis', description: 'Compare included studies and highlight major similarities, tensions, and evidence quality.' },
    { title: 'Gaps, limitations, and next steps', description: 'Show what the evidence still misses and what future studies should address next.' },
  ],
  'Policy Report': [
    { title: 'Current landscape and policy urgency', description: 'Set up the problem context, policy pressure, and the practical reason this issue needs action.' },
    { title: 'Cross-source analysis and stakeholder impact', description: 'Compare findings across sources and explain how they affect relevant stakeholder groups.' },
    { title: 'Practical recommendations and roadmap', description: 'Translate the evidence into concrete recommendations and an implementation path.' },
  ],
  default: [
    { title: 'Background and scope', description: 'Introduce the topic, define the scope, and set expectations for the chapter.' },
    { title: 'Core analysis', description: 'Present the main analytical argument and explain how evidence will be used.' },
    { title: 'Implications and recommendations', description: 'Close the chapter with meaning, implications, and practical next steps.' },
  ],
};
const guideOptions: GuideOption[] = [
  { id: 'g1', title: 'Comparative academic tone', body: 'Compare at least two sources in each subsection and close with a synthesis sentence.' },
  { id: 'g2', title: 'Methods-aware writing', body: 'State how evidence was collected and connect methods to result quality.' },
  { id: 'g3', title: 'Action-oriented synthesis', body: 'Keep paragraphs concise and end sections with practical meaning.' },
];
const briefOptions: Record<string, BriefOption[]> = {
  'Literature Review': [
    { title: 'Landscape and relevance', description: 'Introduce the research landscape, explain why the topic matters, and define the review scope.' },
    { title: 'Evidence map framing', description: 'Map the major evidence clusters and explain how this chapter frames the synthesis logic.' },
    { title: 'Analytical lens setup', description: 'Clarify the analytical lens that will be used to compare prior studies in later sections.' },
  ],
  'Systematic Review': [
    { title: 'Review objective and boundaries', description: 'Define the review objective, inclusion logic, and boundaries of the evidence base.' },
    { title: 'Evidence comparison scope', description: 'Summarize the review scope and explain how evidence categories will be compared.' },
    { title: 'Protocol-to-synthesis bridge', description: 'Frame the chapter as the bridge between protocol choices and later synthesis results.' },
  ],
  default: [
    { title: 'Objective and scope', description: 'Introduce the chapter objective, scope, and expected contribution to the full article.' },
    { title: 'Analysis angle', description: 'Summarize the main angle of analysis and the evidence this chapter will rely on.' },
    { title: 'Reader expectations', description: 'Set reader expectations for the structure, claims, and transitions in this chapter.' },
  ],
};
const sourceOptions = [
  { id: 's1', title: 'Open-access evidence synthesis in higher education research', snippet: 'Review workflow, source selection, and reporting practices for higher education evidence synthesis.', provider: 'Google Scholar • Studies in Educational Evaluation', link: 'https://example.org/source-1', year: '2024' },
  { id: 's2', title: 'Systematic review transparency and reproducibility practices', snippet: 'Open-access paper focused on reproducibility, search logs, and evidence reporting standards.', provider: 'Google Scholar • PLOS ONE', link: 'https://example.org/source-2', year: '2023' },
  { id: 's3', title: 'Open scholarly metadata for review-driven writing workflows', snippet: 'Metadata-driven workflow paper relevant for source discovery and chapter-level evidence mapping.', provider: 'Google Scholar • Scientometrics', link: 'https://example.org/source-3', year: '2025' },
];
const aiCountSummary: Record<string, string> = {
  'Literature Review': 'AI suggests a medium-length structure with a clear review -> synthesis -> implication flow.',
  'Systematic Review': 'AI suggests a slightly more formal structure so protocol and synthesis are separated.',
  'Policy Report': 'AI suggests a structure that moves from context to analysis to recommendations.',
  'Academic Essay': 'AI suggests a compact argumentative structure with fewer transitions.',
};

const makeChapter = (n: number): Chapter => ({ id: `chapter-${n}`, aiTitle: null, customTitle: '', aiBrief: null, customBrief: '', selectedGuides: [], customGuide: '', sources: [], done: false });
const pill = (active: boolean, done: boolean) => done ? 'bg-emerald-500 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500';

function SelectedCard({
  tone,
  label,
  title,
  description,
  onRemove,
}: {
  tone: 'emerald' | 'cyan' | 'amber' | 'violet' | 'slate';
  label: string;
  title: string;
  description: string;
  onRemove: () => void;
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    violet: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
    slate: 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200',
  } as const;

  return (
    <div className={`rounded-[20px] border px-4 py-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="cursor-pointer rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-white"
        >
          X
        </button>
      </div>
    </div>
  );
}

export default function AdvancedGeneratorWizard() {
  const [articleTitle, setArticleTitle] = useState('AI-assisted evidence synthesis for higher education research');
  const [reportType, setReportType] = useState('');
  const [chapterCount, setChapterCount] = useState<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode>('hidden');
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);

  const current = chapters[activeIndex];
  const completed = chapters.filter((chapter) => chapter.done).length;
  const finishedAll = chapterCount !== null && completed === chapterCount;
  const setupReady = Boolean(articleTitle.trim() && reportType.trim());
  const suggestedTitles = useMemo(() => titleOptions[reportType] ?? titleOptions.default, [reportType]);
  const suggestedBriefs = useMemo(() => briefOptions[reportType] ?? briefOptions.default, [reportType]);
  const titleReady = Boolean(current?.aiTitle?.title || current?.customTitle?.trim());
  const briefReady = Boolean(current?.aiBrief?.description || current?.customBrief?.trim());
  const guideReady = Boolean((current?.selectedGuides.length || 0) > 0 || current?.customGuide?.trim());
  const sourcesReady = Boolean((current?.sources.length || 0) > 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildPlan = (count: number) => {
    setChapterCount(count);
    setChapters(Array.from({ length: count }, (_, i) => makeChapter(i + 1)));
    setActiveIndex(0);
    setPanelMode('title');
  };

  const handleReportTypeChange = (value: string) => {
    setReportType(value);
    setChapterCount(null);
    setChapters([]);
    setActiveIndex(0);
    setPanelMode('count');
    setIsTypeMenuOpen(false);
  };

  const updateCurrent = (field: keyof Chapter, value: Chapter[keyof Chapter]) => {
    setChapters((list) => list.map((item, i) => i === activeIndex ? { ...item, [field]: value } : item));
  };

  const addSource = (source: SourceItem) => {
    setChapters((list) => list.map((item, i) => i === activeIndex && !item.sources.some((x) => x.title === source.title) ? { ...item, sources: [...item.sources, source] } : item));
    setPanelMode('hidden');
  };

  const completeChapter = () => {
    setChapters((list) => list.map((item, i) => i === activeIndex ? { ...item, done: true } : item));
    if (activeIndex < chapters.length - 1) {
      setActiveIndex((n) => n + 1);
      setPanelMode('title');
    } else {
      setPanelMode('hidden');
    }
  };

  const chooseTitleOption = (value: TitleOption) => {
    updateCurrent('aiTitle', value as never);
    setPanelMode('hidden');
  };

  const chooseGuideOption = (value: GuideOption) => {
    setChapters((list) =>
      list.map((item, i) =>
        i === activeIndex && !item.selectedGuides.some((guide) => guide.id === value.id)
          ? { ...item, selectedGuides: [...item.selectedGuides, value] }
          : item
      )
    );
  };

  const chooseBriefOption = (value: BriefOption) => {
    updateCurrent('aiBrief', value);
    setPanelMode('hidden');
  };

  const removeGuideOption = (value: string) => {
    setChapters((list) =>
      list.map((item, i) =>
        i === activeIndex
          ? { ...item, selectedGuides: item.selectedGuides.filter((guide) => guide.id !== value) }
          : item
      )
    );
  };

  const clearAiTitle = () => updateCurrent('aiTitle', null);
  const clearManualTitle = () => updateCurrent('customTitle', '');
  const clearAiBrief = () => updateCurrent('aiBrief', null);
  const clearManualBrief = () => updateCurrent('customBrief', '');
  const clearManualGuide = () => updateCurrent('customGuide', '');
  const removeSource = (sourceId: string) => {
    setChapters((list) =>
      list.map((item, i) =>
        i === activeIndex
          ? { ...item, sources: item.sources.filter((source) => source.id !== sourceId) }
          : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.16),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef5ff_100%)]">
      <div className="mx-auto max-w-[1480px] px-4 py-8 lg:px-6">
        <section className="rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Sequential prototype</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">Build the article step by step before generation</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 lg:text-base">First define the article setup, then choose an AI-generated chapter count, then finish Chapter 1, Chapter 2, and so on. The right-side AI container appears for the current step only.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${pill(setupReady && chapterCount === null, Boolean(chapterCount))}`}>1. Setup</div>
              <div className="pt-2 text-slate-500"><ChevronRight size={16} /></div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${pill(Boolean(chapterCount) && !finishedAll, finishedAll)}`}>2. Chapters</div>
              <div className="pt-2 text-slate-500"><ChevronRight size={16} /></div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${pill(finishedAll, false)}`}>3. Review</div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <main className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Step 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Article setup</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                  {reportType ? 'AI chapter options are ready on the right' : 'Choose a report type to open AI chapter options'}
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Article title</span>
                  <textarea rows={3} value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white" placeholder="Enter the article title first" />
                </label>
                <div className="space-y-2" ref={typeMenuRef}>
                  <span className="text-sm font-semibold text-slate-700">Report type</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeMenuOpen((current) => !current)}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-[24px] border px-4 py-3 text-left outline-none transition ${
                        isTypeMenuOpen || reportType
                          ? 'border-cyan-300 bg-white shadow-[0_10px_30px_rgba(14,165,233,0.10)]'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className={reportType ? 'text-slate-900' : 'text-slate-400'}>
                        {reportType || 'Select a report type'}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-slate-500 transition ${isTypeMenuOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isTypeMenuOpen && (
                      <div className="absolute top-full right-0 left-0 z-30 mt-[5px] max-h-72 overflow-auto rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                        {reportTypes.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleReportTypeChange(option)}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition ${
                              reportType === option
                                ? 'bg-cyan-50 text-cyan-900'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{option}</span>
                            {reportType === option ? <Check size={16} className="text-cyan-700" /> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {chapterCount !== null && (
                <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  Structure selected: {chapterCount} chapters
                </div>
              )}
            </section>

            {chapterCount !== null && current && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Step 2</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">Chapter {activeIndex + 1} of {chapterCount}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Complete the current chapter, then move to the next one.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chapters.map((chapter, i) => {
                      const unlocked = i === 0 || chapters[i - 1]?.done;
                      return (
                        <button
                          key={chapter.id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => unlocked && setActiveIndex(i)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            i === activeIndex
                              ? 'bg-slate-900 text-white'
                              : chapter.done
                                ? 'bg-emerald-100 text-emerald-800'
                                : unlocked
                                  ? 'cursor-pointer bg-slate-100 text-slate-600 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-sm'
                                  : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70'
                          }`}
                        >
                          {chapter.done ? <Check size={14} className="mr-2 inline" /> : null}
                          Chapter {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Chapter title</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Choose from AI recommendations or type it yourself.</p>
                      </div>
                      <button type="button" onClick={() => setPanelMode('title')} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-sm"><Sparkles size={16} />Recommend titles</button>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">AI-selected title</span>
                        <div className="min-h-[78px] rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                          {current.aiTitle ? (
                            <div>
                              <p className="text-base font-semibold text-slate-900">{current.aiTitle.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{current.aiTitle.description}</p>
                            </div>
                          ) : (
                            <p className="text-base text-slate-400">Choose from the right-side panel</p>
                          )}
                        </div>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Manual title</span>
                        <input value={current.customTitle} onChange={(e) => updateCurrent('customTitle', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-emerald-200 focus:border-emerald-400" placeholder="Or write your own title" />
                      </label>
                    </div>
                    <div className="mt-4 space-y-3">
                      {current.aiTitle && (
                        <SelectedCard
                          tone="emerald"
                          label="AI selected title"
                          title={current.aiTitle.title}
                          description={current.aiTitle.description}
                          onRemove={clearAiTitle}
                        />
                      )}
                      {current.customTitle.trim() && (
                        <SelectedCard
                          tone="slate"
                          label="Manual title"
                          title={current.customTitle}
                          description="User-written title."
                          onRemove={clearManualTitle}
                        />
                      )}
                    </div>
                  </div>

                  {titleReady && (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Chapter brief</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Choose an AI-generated brief or write it yourself.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPanelMode('brief')}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-200 hover:shadow-sm"
                        >
                          <Sparkles size={16} />
                          Recommend brief
                        </button>
                      </div>
                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-slate-700">AI-selected brief</span>
                        <div className="min-h-[120px] rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                          {current.aiBrief ? (
                            <div>
                              <p className="text-base font-semibold text-slate-900">{current.aiBrief.title}</p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">{current.aiBrief.description}</p>
                            </div>
                          ) : (
                            <p className="text-base text-slate-400">Choose from AI recommendations</p>
                          )}
                        </div>
                      </label>
                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Manual brief</span>
                        <textarea rows={4} value={current.customBrief} onChange={(e) => updateCurrent('customBrief', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-cyan-200 focus:border-cyan-400" placeholder="Or write your own chapter brief" />
                      </label>
                      <div className="mt-4 space-y-3">
                        {current.aiBrief && (
                          <SelectedCard
                            tone="cyan"
                            label="AI selected brief"
                            title={current.aiBrief.title}
                            description={current.aiBrief.description}
                            onRemove={clearAiBrief}
                          />
                        )}
                        {current.customBrief.trim() && (
                          <SelectedCard
                            tone="slate"
                            label="Manual brief"
                            title="Manual brief"
                            description={current.customBrief}
                            onRemove={clearManualBrief}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {briefReady && (
                    <div className="grid gap-5 xl:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Writing guide</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Choose an AI-generated guide or write manual instructions.</p>
                        </div>
                        <button type="button" onClick={() => setPanelMode('guide')} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-sm"><Lightbulb size={16} />Recommend guides</button>
                      </div>
                      <div className="mt-4 space-y-4">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-slate-700">AI-selected guide</span>
                          <div className="min-h-28 rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                            {current.selectedGuides.length > 0 ? (
                              <div className="space-y-2">
                                {current.selectedGuides.map((guide) => (
                                  <div key={guide.id} className="flex items-start justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{guide.title}</p>
                                      <p className="mt-1 text-sm leading-6 text-slate-700">{guide.body}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeGuideOption(guide.id)}
                                      className="cursor-pointer rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="pt-1 text-sm text-slate-400">Choose one or more guide options from AI recommendations.</p>
                            )}
                          </div>
                        </label>
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Manual guide</span>
                          <textarea rows={3} value={current.customGuide} onChange={(e) => updateCurrent('customGuide', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-amber-200 focus:border-amber-400" placeholder="Or write your own guide" />
                        </label>
                        <div className="space-y-3">
                          {current.selectedGuides.map((guide) => (
                            <SelectedCard
                              key={guide.id}
                              tone="amber"
                              label="AI selected guide"
                              title={guide.title}
                              description={guide.body}
                              onRemove={() => removeGuideOption(guide.id)}
                            />
                          ))}
                          {current.customGuide.trim() && (
                            <SelectedCard
                              tone="slate"
                              label="Manual guide"
                              title="Manual guide"
                              description={current.customGuide}
                              onRemove={clearManualGuide}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {guideReady && (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Sources</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Add scholar-style sources manually or choose AI-suggested results.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => addSource({ id: crypto.randomUUID(), title: 'Custom source added by user', snippet: 'Manual note, citation text, or scholar result pasted by the user.', provider: 'Manual input', link: 'https://scholar.google.com', year: '2026' })} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm"><Plus size={16} />Add source manually</button>
                          <button type="button" onClick={() => setPanelMode('source')} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:-translate-y-0.5 hover:bg-violet-200 hover:shadow-sm"><Search size={16} />Find sources</button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {current.sources.length > 0 ? current.sources.map((source) => <div key={source.id} className="rounded-[18px] border border-violet-200 bg-white px-4 py-3"><p className="font-semibold text-slate-900">{source.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{source.snippet}</p><p className="mt-2 text-sm text-slate-500">{source.provider} • {source.year}</p><p className="mt-1 text-xs text-violet-700">{source.link}</p></div>) : <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-sm leading-6 text-slate-500">No chapter sources yet.</div>}
                      </div>
                      <div className="mt-4 space-y-3">
                        {current.sources.map((source) => (
                          <SelectedCard
                            key={source.id}
                            tone={source.provider === 'Manual input' ? 'slate' : 'violet'}
                            label={source.provider === 'Manual input' ? 'Manual source' : 'AI selected source'}
                            title={source.title}
                            description={`${source.snippet} ${source.provider} • ${source.year}`}
                            onRemove={() => removeSource(source.id)}
                          />
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800">
                          {sourcesReady ? `${current.sources.length} sources selected` : 'Choose at least 1 source'}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                  )}
                </div>

                {sourcesReady && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{current.aiTitle?.title || current.customTitle || `Chapter ${activeIndex + 1}`}</p>
                    <p className="mt-1 text-sm text-slate-600">When this chapter is ready, click complete and continue to the next chapter.</p>
                  </div>
                  <button
                    type="button"
                    onClick={completeChapter}
                    disabled={!(titleReady && briefReady && guideReady && sourcesReady)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      (titleReady && briefReady && guideReady && sourcesReady)
                        ? 'cursor-pointer bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    Complete Chapter {activeIndex + 1}
                    <ChevronRight size={16} />
                  </button>
                </div>
                )}
              </section>
            )}

            {finishedAll && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">Step 3</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">Outline review</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">All chapters are complete. Review the full structure before generation.</p>
                  </div>
                  <button type="button" className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"><FileText size={16} />Generate article</button>
                </div>
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-2xl font-semibold text-slate-900">{articleTitle || 'Untitled article'}</h3>
                  <p className="mt-2 text-sm text-slate-600">{reportType} • {chapterCount} chapters</p>
                  <div className="mt-5 space-y-3">
                    {chapters.map((chapter, i) => <div key={chapter.id} className="rounded-[18px] border border-slate-200 bg-white px-4 py-4"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Chapter {i + 1}</p><p className="mt-2 font-semibold text-slate-900">{chapter.aiTitle?.title || chapter.customTitle || `Chapter ${i + 1}`}</p><p className="mt-2 text-sm leading-6 text-slate-600">{chapter.aiBrief?.description || chapter.customBrief || 'No chapter brief yet.'}</p></div>)}
                  </div>
                </div>
              </section>
            )}
          </main>

          <aside className="h-fit self-start rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:sticky xl:top-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">AI recommendation container</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{panelMode === 'hidden' ? 'Hidden until needed' : 'Visible for the current action'}</h2>
              </div>
              <button type="button" onClick={() => setPanelMode('hidden')} className="cursor-pointer rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Hide</button>
            </div>
            <div className="mt-5">
              {panelMode === 'hidden' && <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">Choose a report type or click an AI-assisted action to open this container.</div>}
              {panelMode === 'count' && (
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">AI generated</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{aiCountSummary[reportType] ?? aiCountSummary['Academic Essay']}</p>
                  </div>
                  {countOptions.map((item) => <button key={item.id} type="button" onClick={() => buildPlan(item.count)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"><p className="font-semibold text-slate-900">{item.label}</p><p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p></button>)}
                </div>
              )}
              {panelMode === 'title' && <div className="space-y-3">{suggestedTitles.map((item, index) => <button key={item.title} type="button" onClick={() => chooseTitleOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.title}</p><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Option {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></button>)}</div>}
              {panelMode === 'brief' && <div className="space-y-3">{suggestedBriefs.map((item, index) => <button key={item.title} type="button" onClick={() => chooseBriefOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.title}</p><span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">Option {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p></button>)}</div>}
              {panelMode === 'guide' && <div className="space-y-3">{guideOptions.map((item, index) => <button key={item.id} type="button" onClick={() => chooseGuideOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.title}</p><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Guide {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p></button>)}</div>}
              {panelMode === 'source' && <div className="space-y-3">{sourceOptions.map((item, index) => <button key={item.id} type="button" onClick={() => addSource(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.title}</p><span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">Source {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.snippet}</p><p className="mt-2 text-sm text-slate-500">{item.provider} • {item.year}</p></button>)}</div>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
