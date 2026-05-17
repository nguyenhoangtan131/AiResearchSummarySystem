import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, ChevronDown, ChevronRight, Lightbulb, Plus, Search, Sparkles } from 'lucide-react';
import { advancedApi } from '../../services/api';

type PanelMode = 'hidden' | 'count' | 'title' | 'brief' | 'guide' | 'source';
type SourceItem = {
  id: string;
  title: string;
  snippet: string;
  provider: string;
  link: string;
  year: string;
  citationCount?: number;
  publication?: string;
  display_title_vi?: string;
  display_snippet_vi?: string;
  display_publication_vi?: string;
};
type TitleOption = { title: string; description: string; display_title_vi?: string; display_description_vi?: string };
type BriefOption = { title: string; description: string; display_title_vi?: string; display_description_vi?: string };
type GuideOption = { id: string; title: string; body: string; display_title_vi?: string; display_body_vi?: string };
type StructureBlueprintItem = {
  chapter_number: number;
  working_title: string;
  purpose: string;
  start_focus: string;
  end_focus: string;
  display_working_title_vi?: string;
  display_purpose_vi?: string;
};
type StructureOption = {
  option_id: string;
  chapter_count: number;
  rationale: string;
  blueprint: StructureBlueprintItem[];
  display_rationale_vi?: string;
};
type SourceRecommendationOption = SourceItem & {
  citationCount?: number;
  publication?: string;
  display_title_vi?: string;
  display_snippet_vi?: string;
  display_publication_vi?: string;
};
type CachedChapterStepResponse = {
  found: boolean;
  step: 'titles' | 'briefs' | 'guides' | 'sources';
  data?: {
    context_signature?: string;
    query?: string;
    query_candidates?: string[];
    options?: Array<Record<string, unknown>>;
  };
};
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
  { value: 'Tổng quan tài liệu', label: 'Tổng quan tài liệu' },
  { value: 'Tổng quan hệ thống', label: 'Tổng quan hệ thống' },
  { value: 'Tổng quan phạm vi', label: 'Tổng quan phạm vi' },
  { value: 'Tổng quan tường thuật', label: 'Tổng quan tường thuật' },
  { value: 'Phân tích gộp', label: 'Phân tích gộp' },
  { value: 'Báo cáo nghiên cứu', label: 'Báo cáo nghiên cứu' },
  { value: 'Báo cáo chính sách', label: 'Báo cáo chính sách' },
  { value: 'Báo cáo nghiên cứu tình huống', label: 'Báo cáo nghiên cứu tình huống' },
  { value: 'Báo cáo kỹ thuật', label: 'Báo cáo kỹ thuật' },
  { value: 'Tiểu luận học thuật', label: 'Tiểu luận học thuật' },
  { value: 'Bài báo hội thảo', label: 'Bài báo hội thảo' },
  { value: 'Bài báo tạp chí', label: 'Bài báo tạp chí' },
  { value: 'Chương luận văn', label: 'Chương luận văn' },
  { value: 'Đề cương luận án', label: 'Đề cương luận án' },
  { value: 'Đề xuất xin tài trợ', label: 'Đề xuất xin tài trợ' },
] as const;
const titleOptions: Record<string, TitleOption[]> = {
  'Tổng quan tài liệu': [
    { title: 'Research context and problem framing', description: 'Define the topic background, explain why the review matters, and position the problem clearly.', display_title_vi: 'Bối cảnh nghiên cứu và định khung vấn đề', display_description_vi: 'Làm rõ bối cảnh chủ đề, giải thích vì sao bài tổng quan quan trọng và đặt lại vấn đề một cách mạch lạc.' },
    { title: 'Evidence map and thematic synthesis', description: 'Organize prior studies into major themes and show how the evidence clusters connect.', display_title_vi: 'Bản đồ bằng chứng và tổng hợp theo chủ đề', display_description_vi: 'Sắp xếp các nghiên cứu trước theo các chủ đề lớn và chỉ ra mối liên hệ giữa các cụm bằng chứng.' },
    { title: 'Key findings and future directions', description: 'Summarize the strongest patterns in the literature and surface the next research opportunities.', display_title_vi: 'Phát hiện chính và định hướng tiếp theo', display_description_vi: 'Tóm tắt các xu hướng nổi bật nhất trong tài liệu và gợi mở các hướng nghiên cứu tiếp theo.' },
  ],
  'Tổng quan hệ thống': [
    { title: 'Review scope and selection protocol', description: 'Explain the review boundaries, inclusion logic, and how evidence was filtered.', display_title_vi: 'Phạm vi tổng quan và quy trình chọn lọc', display_description_vi: 'Giải thích ranh giới của tổng quan, logic chọn tài liệu và cách bằng chứng đã được sàng lọc.' },
    { title: 'Comparative evidence synthesis', description: 'Compare included studies and highlight major similarities, tensions, and evidence quality.', display_title_vi: 'Tổng hợp so sánh bằng chứng', display_description_vi: 'So sánh các nghiên cứu được đưa vào và nhấn mạnh điểm giống, điểm khác cùng chất lượng bằng chứng.' },
    { title: 'Gaps, limitations, and next steps', description: 'Show what the evidence still misses and what future studies should address next.', display_title_vi: 'Khoảng trống, giới hạn và bước tiếp theo', display_description_vi: 'Chỉ ra nền bằng chứng còn thiếu gì, giới hạn nằm ở đâu và nghiên cứu sau cần đi tiếp thế nào.' },
  ],
  'Báo cáo chính sách': [
    { title: 'Current landscape and policy urgency', description: 'Set up the problem context, policy pressure, and the practical reason this issue needs action.', display_title_vi: 'Bối cảnh hiện tại và tính cấp thiết chính sách', display_description_vi: 'Dựng bối cảnh vấn đề, áp lực chính sách và lý do thực tiễn khiến chủ đề này cần được hành động.' },
    { title: 'Cross-source analysis and stakeholder impact', description: 'Compare findings across sources and explain how they affect relevant stakeholder groups.', display_title_vi: 'Phân tích liên nguồn và tác động tới các bên liên quan', display_description_vi: 'Đối chiếu phát hiện giữa các nguồn và giải thích ảnh hưởng của chúng lên các nhóm liên quan.' },
    { title: 'Practical recommendations and roadmap', description: 'Translate the evidence into concrete recommendations and an implementation path.', display_title_vi: 'Khuyến nghị thực tiễn và lộ trình triển khai', display_description_vi: 'Chuyển hóa bằng chứng thành các khuyến nghị cụ thể cùng một lộ trình triển khai rõ ràng.' },
  ],
  default: [
    { title: 'Background and scope', description: 'Introduce the topic, define the scope, and set expectations for the chapter.', display_title_vi: 'Bối cảnh và phạm vi', display_description_vi: 'Giới thiệu chủ đề, xác định phạm vi và đặt kỳ vọng cho chương.' },
    { title: 'Core analysis', description: 'Present the main analytical argument and explain how evidence will be used.', display_title_vi: 'Phân tích trọng tâm', display_description_vi: 'Trình bày lập luận phân tích chính và cách bằng chứng sẽ được sử dụng.' },
    { title: 'Implications and recommendations', description: 'Close the chapter with meaning, implications, and practical next steps.', display_title_vi: 'Hàm ý và khuyến nghị', display_description_vi: 'Khép lại chương bằng ý nghĩa chính, các hàm ý và bước đi thực tiễn tiếp theo.' },
  ],
};
const guideOptions: GuideOption[] = [
  { id: 'g1', title: 'Comparative academic tone', body: 'Compare at least two sources in each subsection and close with a synthesis sentence.', display_title_vi: 'Giọng văn học thuật so sánh', display_body_vi: 'Trong mỗi tiểu mục, đối chiếu ít nhất hai nguồn và kết lại bằng một câu tổng hợp.' },
  { id: 'g2', title: 'Methods-aware writing', body: 'State how evidence was collected and connect methods to result quality.', display_title_vi: 'Lối viết gắn với phương pháp', display_body_vi: 'Nêu cách bằng chứng được thu thập và liên hệ phương pháp với chất lượng kết quả.' },
  { id: 'g3', title: 'Action-oriented synthesis', body: 'Keep paragraphs concise and end sections with practical meaning.', display_title_vi: 'Tổng hợp theo hướng hành động', display_body_vi: 'Giữ đoạn văn ngắn gọn và kết mỗi phần bằng ý nghĩa thực tiễn rõ ràng.' },
];
const briefOptions: Record<string, BriefOption[]> = {
  'Tổng quan tài liệu': [
    { title: 'Landscape and relevance', description: 'Introduce the research landscape, explain why the topic matters, and define the review scope.', display_title_vi: 'Bức tranh nghiên cứu và mức độ liên quan', display_description_vi: 'Giới thiệu bức tranh nghiên cứu, giải thích vì sao chủ đề quan trọng và xác định phạm vi tổng quan.' },
    { title: 'Evidence map framing', description: 'Map the major evidence clusters and explain how this chapter frames the synthesis logic.', display_title_vi: 'Định khung bản đồ bằng chứng', display_description_vi: 'Vẽ ra các cụm bằng chứng chính và giải thích chương này định khung logic tổng hợp như thế nào.' },
    { title: 'Analytical lens setup', description: 'Clarify the analytical lens that will be used to compare prior studies in later sections.', display_title_vi: 'Thiết lập lăng kính phân tích', display_description_vi: 'Làm rõ lăng kính phân tích sẽ được dùng để so sánh các nghiên cứu ở các phần sau.' },
  ],
  'Tổng quan hệ thống': [
    { title: 'Review objective and boundaries', description: 'Define the review objective, inclusion logic, and boundaries of the evidence base.', display_title_vi: 'Mục tiêu tổng quan và ranh giới bằng chứng', display_description_vi: 'Xác định mục tiêu tổng quan, logic chọn lọc và giới hạn của nền bằng chứng.' },
    { title: 'Evidence comparison scope', description: 'Summarize the review scope and explain how evidence categories will be compared.', display_title_vi: 'Phạm vi so sánh bằng chứng', display_description_vi: 'Tóm tắt phạm vi tổng quan và giải thích cách các nhóm bằng chứng sẽ được đối chiếu.' },
    { title: 'Protocol-to-synthesis bridge', description: 'Frame the chapter as the bridge between protocol choices and later synthesis results.', display_title_vi: 'Cầu nối giữa quy trình và tổng hợp', display_description_vi: 'Định vị chương như cầu nối giữa lựa chọn phương pháp và kết quả tổng hợp ở các phần sau.' },
  ],
  default: [
    { title: 'Objective and scope', description: 'Introduce the chapter objective, scope, and expected contribution to the full article.', display_title_vi: 'Mục tiêu và phạm vi', display_description_vi: 'Giới thiệu mục tiêu chương, phạm vi và đóng góp dự kiến cho toàn bài.' },
    { title: 'Analysis angle', description: 'Summarize the main angle of analysis and the evidence this chapter will rely on.', display_title_vi: 'Góc độ phân tích', display_description_vi: 'Tóm tắt góc độ phân tích chính và nền bằng chứng mà chương sẽ dựa vào.' },
    { title: 'Reader expectations', description: 'Set reader expectations for the structure, claims, and transitions in this chapter.', display_title_vi: 'Kỳ vọng của người đọc', display_description_vi: 'Đặt kỳ vọng về cấu trúc, luận điểm và chuyển đoạn trong chương này.' },
  ],
};
const sourceOptions = [
  { id: 's1', title: 'Open-access evidence synthesis in higher education research', snippet: 'Review workflow, source selection, and reporting practices for higher education evidence synthesis.', provider: 'Google Scholar • Studies in Educational Evaluation', link: 'https://example.org/source-1', year: '2024', display_title_vi: 'Tổng hợp bằng chứng truy cập mở trong nghiên cứu giáo dục đại học', display_snippet_vi: 'Bài viết về quy trình tổng quan, cách chọn nguồn và thực hành báo cáo trong tổng hợp bằng chứng giáo dục đại học.', display_publication_vi: 'Google Scholar • Studies in Educational Evaluation' },
  { id: 's2', title: 'Systematic review transparency and reproducibility practices', snippet: 'Open-access paper focused on reproducibility, search logs, and evidence reporting standards.', provider: 'Google Scholar • PLOS ONE', link: 'https://example.org/source-2', year: '2023', display_title_vi: 'Thực hành minh bạch và tái lập trong tổng quan hệ thống', display_snippet_vi: 'Bài truy cập mở tập trung vào khả năng tái lập, nhật ký tìm kiếm và chuẩn mực báo cáo bằng chứng.', display_publication_vi: 'Google Scholar • PLOS ONE' },
  { id: 's3', title: 'Open scholarly metadata for review-driven writing workflows', snippet: 'Metadata-driven workflow paper relevant for source discovery and chapter-level evidence mapping.', provider: 'Google Scholar • Scientometrics', link: 'https://example.org/source-3', year: '2025', display_title_vi: 'Siêu dữ liệu học thuật mở cho quy trình viết dựa trên tổng quan', display_snippet_vi: 'Bài viết về quy trình dựa trên siêu dữ liệu, phù hợp cho tìm nguồn và lập bản đồ bằng chứng theo từng chương.', display_publication_vi: 'Google Scholar • Scientometrics' },
];
const aiCountSummary: Record<string, string> = {
  'Tổng quan tài liệu': 'AI đề xuất một bố cục trung bình với mạch rõ giữa tổng quan, tổng hợp và hàm ý.',
  'Tổng quan hệ thống': 'AI đề xuất một bố cục trang trọng hơn để tách riêng quy trình và phần tổng hợp.',
  'Báo cáo chính sách': 'AI đề xuất một bố cục đi từ bối cảnh, phân tích đến khuyến nghị.',
  'Tiểu luận học thuật': 'AI đề xuất một bố cục lập luận gọn với ít nhịp chuyển hơn.',
};

const makeChapter = (n: number): Chapter => ({ id: `chapter-${n}`, aiTitle: null, customTitle: '', aiBrief: null, customBrief: '', selectedGuides: [], customGuide: '', sources: [], done: false });
const pill = (active: boolean, done: boolean) => done ? 'bg-emerald-500 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500';
const ADVANCED_ARTICLE_STORAGE_KEY = 'advanced-article-id';
const ADVANCED_SESSION_STORAGE_KEY = 'advanced-session-id';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
  }
  return fallback;
};

const buildContextSignature = async (...parts: Array<string | number | undefined>) => {
  const raw = parts.map((part) => String(part || '').trim()).join('||');
  const encoded = new TextEncoder().encode(raw);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
};

const normalizeStructureText = (value?: string) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const dedupeByVietnameseTitle = <T extends { title: string; display_title_vi?: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeStructureText(item.display_title_vi || item.title);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const detectBlueprintRole = (blueprint?: StructureBlueprintItem) => {
  const text = normalizeStructureText(
    `${blueprint?.display_working_title_vi || blueprint?.working_title || ''} ${blueprint?.display_purpose_vi || blueprint?.purpose || ''}`,
  );
  if (text.includes('boi canh') || text.includes('pham vi') || text.includes('dinh khung') || text.includes('mo bai')) {
    return 'context';
  }
  if (text.includes('bang chung') || text.includes('phuong phap') || text.includes('tong hop')) {
    return 'evidence';
  }
  if (text.includes('phan tich') || text.includes('so sanh') || text.includes('dien giai')) {
    return 'analysis';
  }
  if (text.includes('ham y') || text.includes('ket luan') || text.includes('khuyen nghi')) {
    return 'closing';
  }
  return 'general';
};

const buildTitleFallbacks = (
  reportTypeValue: string,
  blueprint?: StructureBlueprintItem,
  chapterIndex = 0,
): TitleOption[] => {
  const role = detectBlueprintRole(blueprint);
  const blueprintOption: TitleOption = {
    title: blueprint?.working_title || 'Background and scope',
    description: blueprint?.purpose || 'Introduce the chapter scope and explain why it matters.',
    display_title_vi: blueprint?.display_working_title_vi || 'Bối cảnh và phạm vi',
    display_description_vi:
      blueprint?.display_purpose_vi || 'Giới thiệu phạm vi chương và giải thích vì sao phần này quan trọng.',
  };

  const roleBanks: Record<string, TitleOption[]> = {
    context: [
      blueprintOption,
      {
        title: 'Context and framing',
        description: 'Frame the topic, clarify the scope, and prepare the reader for the analytical flow.',
        display_title_vi: 'Bối cảnh và định khung',
        display_description_vi: 'Định khung chủ đề, làm rõ phạm vi và chuẩn bị người đọc cho mạch phân tích tiếp theo.',
      },
      {
        title: 'Problem context and scope',
        description: 'Present the problem setting, chapter boundary, and why this opening chapter matters.',
        display_title_vi: 'Bối cảnh vấn đề và phạm vi',
        display_description_vi: 'Trình bày bối cảnh vấn đề, ranh giới của chương và lý do chương mở đầu này quan trọng.',
      },
    ],
    evidence: [
      blueprintOption,
      {
        title: 'Evidence base and analytical criteria',
        description: 'Introduce the evidence pool and the criteria used to handle or compare it.',
        display_title_vi: 'Nền bằng chứng và tiêu chí phân tích',
        display_description_vi: 'Giới thiệu nền bằng chứng và các tiêu chí dùng để xử lý hoặc đối chiếu chúng.',
      },
      {
        title: 'Evidence framing and comparison basis',
        description: 'Clarify the evidence landscape and set the basis for later analysis.',
        display_title_vi: 'Định khung bằng chứng và cơ sở đối chiếu',
        display_description_vi: 'Làm rõ bức tranh bằng chứng và đặt nền cho phần phân tích tiếp theo.',
      },
    ],
    analysis: [
      blueprintOption,
      {
        title: 'Comparative analysis and interpretation',
        description: 'Compare the main patterns in the evidence and interpret their meaning.',
        display_title_vi: 'Phân tích so sánh và diễn giải',
        display_description_vi: 'Đối chiếu các mẫu hình chính trong bằng chứng và diễn giải ý nghĩa của chúng.',
      },
      {
        title: 'Analytical synthesis of key findings',
        description: 'Synthesize the strongest findings into a coherent analytical thread.',
        display_title_vi: 'Tổng hợp phân tích các phát hiện chính',
        display_description_vi: 'Tổng hợp các phát hiện nổi bật thành một mạch phân tích rõ ràng.',
      },
    ],
    closing: [
      blueprintOption,
      {
        title: 'Implications, recommendations, and conclusion',
        description: 'Translate the chapter findings into implications, recommendations, and a clear ending.',
        display_title_vi: 'Hàm ý, khuyến nghị và kết luận',
        display_description_vi: 'Chuyển các phát hiện của chương thành hàm ý, khuyến nghị và phần kết thúc rõ ràng.',
      },
      {
        title: 'Closing synthesis and next directions',
        description: 'Synthesize the key meaning of the chapter and point to practical or research next steps.',
        display_title_vi: 'Tổng hợp kết thúc và định hướng tiếp theo',
        display_description_vi: 'Tổng hợp ý nghĩa chính của chương và chỉ ra hướng đi thực tiễn hoặc nghiên cứu tiếp theo.',
      },
    ],
    general: [blueprintOption, ...(titleOptions[reportTypeValue] || titleOptions.default).slice(chapterIndex, chapterIndex + 2)],
  };

  const bank = roleBanks[role] || roleBanks.general;
  const ordered = [blueprintOption, ...bank];
  return dedupeByVietnameseTitle(ordered).slice(0, 3);
};

const buildBriefFallbacks = (
  reportTypeValue: string,
  blueprint?: StructureBlueprintItem,
  chapterIndex = 0,
): BriefOption[] => {
  const blueprintOption: BriefOption = {
    title: blueprint?.working_title || 'Objective and scope',
    description: blueprint?.purpose || 'Summarize the objective and scope of this chapter.',
    display_title_vi: blueprint?.display_working_title_vi || 'Mục tiêu và phạm vi',
    display_description_vi: blueprint?.display_purpose_vi || 'Tóm tắt mục tiêu và phạm vi của chương này.',
  };

  const bank = briefOptions[reportTypeValue] || briefOptions.default;
  const ordered = [blueprintOption, ...bank.slice(chapterIndex, chapterIndex + 1), ...bank];
  return dedupeByVietnameseTitle(ordered).slice(0, 3);
};

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
    <div className={`break-words overflow-hidden rounded-[20px] border px-4 py-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
  const navigate = useNavigate();
  const [articleTitle, setArticleTitle] = useState('');
  const [reportType, setReportType] = useState('');
  const [chapterCount, setChapterCount] = useState<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [structureOptions, setStructureOptions] = useState<StructureOption[]>([]);
  const [structureSessionId, setStructureSessionId] = useState('');
  const [normalizedArticleTitle, setNormalizedArticleTitle] = useState('');
  const [selectedStructure, setSelectedStructure] = useState<StructureOption | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [structureError, setStructureError] = useState('');
  const [articleId, setArticleId] = useState('');
  const [titleRecommendations, setTitleRecommendations] = useState<TitleOption[]>([]);
  const [briefRecommendations, setBriefRecommendations] = useState<BriefOption[]>([]);
  const [guideRecommendations, setGuideRecommendations] = useState<GuideOption[]>([]);
  const [sourceRecommendations, setSourceRecommendations] = useState<SourceRecommendationOption[]>([]);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceQueryCandidates, setSourceQueryCandidates] = useState<string[]>([]);
  const [isLoadingTitleOptions, setIsLoadingTitleOptions] = useState(false);
  const [isLoadingBriefOptions, setIsLoadingBriefOptions] = useState(false);
  const [isLoadingGuideOptions, setIsLoadingGuideOptions] = useState(false);
  const [isLoadingSourceOptions, setIsLoadingSourceOptions] = useState(false);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
  const [isPublishingArticle, setIsPublishingArticle] = useState(false);
  const [chapterActionError, setChapterActionError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelMode, setPanelMode] = useState<PanelMode>('hidden');
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [showBlueprintDetails, setShowBlueprintDetails] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);

  const resetWizardState = () => {
    setArticleTitle('');
    setReportType('');
    setChapterCount(null);
    setChapters([]);
    setStructureOptions([]);
    setStructureSessionId('');
    setNormalizedArticleTitle('');
    setSelectedStructure(null);
    setStructureError('');
    setArticleId('');
    setTitleRecommendations([]);
    setBriefRecommendations([]);
    setGuideRecommendations([]);
    setSourceRecommendations([]);
    setSourceQuery('');
    setSourceQueryCandidates([]);
    setActiveIndex(0);
    setPanelMode('hidden');
    setChapterActionError('');
    setShowBlueprintDetails(false);
    window.localStorage.removeItem(ADVANCED_ARTICLE_STORAGE_KEY);
    window.localStorage.removeItem(ADVANCED_SESSION_STORAGE_KEY);
  };

  const current = chapters[activeIndex];
  const completed = chapters.filter((chapter) => chapter.done).length;
  const finishedAll = chapterCount !== null && completed === chapterCount;
  const isLastChapter = chapterCount !== null && activeIndex === chapterCount - 1;
  const setupReady = Boolean(articleTitle.trim() && reportType.trim());
  const suggestedTitles = useMemo(() => titleRecommendations, [titleRecommendations]);
  const suggestedBriefs = useMemo(() => briefRecommendations, [briefRecommendations]);
  const suggestedGuides = useMemo(() => guideRecommendations, [guideRecommendations]);
  const suggestedSources = useMemo(() => sourceRecommendations, [sourceRecommendations]);
  const reportTypeLabel = useMemo(
    () => reportTypes.find((item) => item.value === reportType)?.label || reportType,
    [reportType],
  );
  const titleReady = Boolean(current?.aiTitle?.title || current?.customTitle?.trim());
  const briefReady = Boolean(current?.aiBrief?.description || current?.customBrief?.trim());
  const sourcesReady = Boolean((current?.sources.length || 0) > 0);
  const chapterNumber = activeIndex + 1;
  const shouldRenderPanel =
    (panelMode === 'count' && !selectedStructure && (isLoadingStructure || structureOptions.length > 0)) ||
    (panelMode === 'title' && (isLoadingTitleOptions || suggestedTitles.length > 0)) ||
    (panelMode === 'brief' && (isLoadingBriefOptions || suggestedBriefs.length > 0)) ||
    (panelMode === 'guide' && (isLoadingGuideOptions || suggestedGuides.length > 0)) ||
    (panelMode === 'source' && (isLoadingSourceOptions || suggestedSources.length > 0));
  const isCompactAiPanel = !shouldRenderPanel;

  const mapCachedTitleOptions = (options: Array<Record<string, unknown>>): TitleOption[] =>
    options.map((item) => ({
      title: String(item.title || ''),
      description: String(item.description || ''),
      display_title_vi: typeof item.display_title_vi === 'string' ? item.display_title_vi : String(item.title || ''),
      display_description_vi:
        typeof item.display_description_vi === 'string' ? item.display_description_vi : String(item.description || ''),
    })).filter((item) => item.title.trim() && item.description.trim());

  const mapCachedBriefOptions = (options: Array<Record<string, unknown>>): BriefOption[] =>
    options.map((item) => ({
      title: String(item.title || ''),
      description: String(item.description || ''),
      display_title_vi: typeof item.display_title_vi === 'string' ? item.display_title_vi : String(item.title || ''),
      display_description_vi:
        typeof item.display_description_vi === 'string' ? item.display_description_vi : String(item.description || ''),
    })).filter((item) => item.title.trim() && item.description.trim());

  const mapCachedGuideOptions = (options: Array<Record<string, unknown>>): GuideOption[] =>
    options.map((item, index) => ({
      id: String(item.id || `guide-${index + 1}`),
      title: String(item.title || ''),
      body: String(item.body || ''),
      display_title_vi: typeof item.display_title_vi === 'string' ? item.display_title_vi : String(item.title || ''),
      display_body_vi: typeof item.display_body_vi === 'string' ? item.display_body_vi : String(item.body || ''),
    })).filter((item) => item.title.trim() && item.body.trim());

  const mapCachedSourceOptions = (options: Array<Record<string, unknown>>): SourceRecommendationOption[] =>
    options.map((item, index) => ({
      id: String(item.id || `source-${index + 1}`),
      title: String(item.title || ''),
      snippet: String(item.snippet || ''),
      provider: String(item.provider || 'Google Scholar'),
      link: String(item.link || ''),
      year: String(item.year || ''),
      citationCount: Number(item.citation_count || 0),
      publication: typeof item.publication === 'string' ? item.publication : '',
      display_title_vi: typeof item.display_title_vi === 'string' ? item.display_title_vi : String(item.title || ''),
      display_snippet_vi: typeof item.display_snippet_vi === 'string' ? item.display_snippet_vi : String(item.snippet || ''),
      display_publication_vi:
        typeof item.display_publication_vi === 'string'
          ? item.display_publication_vi
          : (typeof item.publication === 'string' ? item.publication : ''),
    })).filter((item) => item.title.trim());

  const loadCachedRecommendations = async (
    step: 'titles' | 'briefs' | 'guides' | 'sources',
    sessionId: string,
    nextChapterNumber: number,
    expectedContextSignature?: string,
  ) => {
    const { data } = await advancedApi.getCachedChapterStep(sessionId, nextChapterNumber, step);
    const cached = data as CachedChapterStepResponse;
    const options = cached.data?.options || [];

    if (!cached.found || options.length === 0) {
      return null;
    }

    if (
      expectedContextSignature &&
      cached.data?.context_signature &&
      cached.data.context_signature !== expectedContextSignature
    ) {
      return null;
    }

    if (step === 'titles') {
      return mapCachedTitleOptions(options);
    }
    if (step === 'briefs') {
      return mapCachedBriefOptions(options);
    }
    if (step === 'guides') {
      return mapCachedGuideOptions(options);
    }
    return mapCachedSourceOptions(options);
  };

  const isSourceSelected = (source: SourceItem) =>
    Boolean(
      current?.sources.some(
        (item) =>
          (item.link && source.link && item.link === source.link) ||
          normalizeStructureText(item.title) === normalizeStructureText(source.title),
      ),
    );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!typeMenuRef.current?.contains(event.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const savedArticleId = window.localStorage.getItem(ADVANCED_ARTICLE_STORAGE_KEY);
    const savedSessionId = window.localStorage.getItem(ADVANCED_SESSION_STORAGE_KEY);

    if (savedSessionId) {
      setStructureSessionId(savedSessionId);
    }

    if (!savedArticleId) {
      return;
    }

    let isMounted = true;
    void advancedApi
      .getArticle(savedArticleId)
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setArticleId(data.article_id);
        setArticleTitle(data.title);
        setReportType(data.report_type);
        setChapterCount(data.chapter_count);

        const restoredBlueprint = data.blueprints.map((blueprint: {
          chapter_number: number;
          title?: string;
          purpose?: string;
          start_focus?: string;
          end_focus?: string;
        }) => ({
          chapter_number: blueprint.chapter_number,
          working_title: blueprint.title || `Chapter ${blueprint.chapter_number}`,
          purpose: blueprint.purpose || 'No blueprint purpose saved yet.',
          start_focus: blueprint.start_focus || 'No start focus saved yet.',
          end_focus: blueprint.end_focus || 'No end focus saved yet.',
          display_working_title_vi: blueprint.title || `Chapter ${blueprint.chapter_number}`,
          display_purpose_vi: blueprint.purpose || 'No blueprint purpose saved yet.',
        }));

        setSelectedStructure({
          option_id: 'persisted-structure',
          chapter_count: data.chapter_count,
          rationale: 'Restored from saved blueprint.',
          display_rationale_vi: 'Đã khôi phục từ bố cục đã lưu.',
          blueprint: restoredBlueprint,
        });

        setChapters(
          data.chapters.map((chapter: {
            id: string;
            chapter_number: number;
            chapter_title?: string;
            chapter_title_description?: string;
            chapter_brief?: string;
            guides?: Array<{ id: string; content: string }>;
            sources?: Array<{ id: string; title: string; snippet?: string; provider?: string; url?: string; year?: number; publication?: string; citation_count?: number }>;
          }) => ({
            id: chapter.id,
            aiTitle: chapter.chapter_title
              ? {
                  title: chapter.chapter_title,
                  description: chapter.chapter_title_description || '',
                  display_title_vi: chapter.chapter_title,
                  display_description_vi: chapter.chapter_title_description || '',
                }
              : null,
            customTitle: '',
            aiBrief: chapter.chapter_brief
              ? {
                  title: 'Saved summary',
                  description: chapter.chapter_brief,
                  display_title_vi: 'Tóm tắt đã lưu',
                  display_description_vi: chapter.chapter_brief,
                }
              : null,
            customBrief: '',
            selectedGuides:
              chapter.guides?.map((guide, index) => ({
                id: guide.id || `guide-${chapter.chapter_number}-${index + 1}`,
                title: 'Saved guide',
                body: guide.content,
                display_title_vi: 'Hướng dẫn đã lưu',
                display_body_vi: guide.content,
              })) || [],
            customGuide: '',
            sources:
              chapter.sources?.map((source) => ({
                id: source.id,
                title: source.title,
                snippet: source.snippet || '',
                provider: source.provider || 'Google Scholar',
                link: source.url || '',
                year: source.year ? String(source.year) : '',
                publication: source.publication || '',
                citationCount: source.citation_count || 0,
                display_title_vi: source.title,
                display_snippet_vi: source.snippet || '',
                display_publication_vi: source.publication || '',
              })) || [],
            done: Boolean(chapter.generated_content?.trim()),
          })),
        );

        const firstPendingIndex = data.chapters.findIndex((chapter: { generated_content?: string }) => {
          return !Boolean(chapter.generated_content?.trim());
        });
        setActiveIndex(firstPendingIndex === -1 ? Math.max(data.chapter_count - 1, 0) : firstPendingIndex);
      })
      .catch(() => {
        window.localStorage.removeItem(ADVANCED_ARTICLE_STORAGE_KEY);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const buildPlan = async (structure: StructureOption) => {
    setSelectedStructure(structure);
    setChapterCount(structure.chapter_count);
    setChapters(Array.from({ length: structure.chapter_count }, (_, i) => makeChapter(i + 1)));
    setActiveIndex(0);
    setStructureOptions([]);
    setTitleRecommendations([]);
    setBriefRecommendations([]);
    setGuideRecommendations([]);
    setSourceRecommendations([]);
    setChapterActionError('');
    setPanelMode('title');

    if (!structureSessionId) {
      return;
    }

    try {
      const { data } = await advancedApi.selectStructure({
        session_id: structureSessionId,
        selected_option_id: structure.option_id,
        article_id: articleId || undefined,
      });
      setArticleId(data.article_id);
      window.localStorage.setItem(ADVANCED_ARTICLE_STORAGE_KEY, data.article_id);
    } catch (error) {
      setChapterActionError('The selected blueprint could not be saved to the backend yet. You can still review the UI, but chapter persistence will fail until structure saving works.');
    }
  };

  const loadStructureOptions = async (nextTitle: string, nextType: string) => {
    if (!nextTitle.trim() || !nextType.trim()) {
      setStructureOptions([]);
      setStructureSessionId('');
      setNormalizedArticleTitle('');
      setStructureError('');
      return;
    }

    setIsLoadingStructure(true);
    setStructureError('');
    try {
      const { data } = await advancedApi.recommendStructure(
        nextTitle.trim(),
        nextType.trim(),
        structureSessionId || undefined,
      );
      setStructureOptions(data.options);
      setStructureSessionId(data.session_id);
      window.localStorage.setItem(ADVANCED_SESSION_STORAGE_KEY, data.session_id);
      setNormalizedArticleTitle(data.normalized_article_title || data.normalized_article_title_en || '');
      setArticleId('');
      window.localStorage.removeItem(ADVANCED_ARTICLE_STORAGE_KEY);
    } catch (error) {
      setStructureOptions([]);
      setNormalizedArticleTitle('');
      setStructureError(getErrorMessage(error, 'Không tải được gợi ý bố cục từ AI. Hãy sửa prompt hoặc backend rồi thử lại.'));
    } finally {
      setIsLoadingStructure(false);
      setPanelMode('count');
    }
  };

  const ensureLiveStructureContext = async () => {
    if (!selectedStructure || !articleTitle.trim() || !reportType.trim()) {
      return null;
    }

    if (structureSessionId && !selectedStructure.option_id.startsWith('persisted-')) {
      return {
        sessionId: structureSessionId,
        structure: selectedStructure,
      };
    }

    const { data } = await advancedApi.recommendStructure(articleTitle.trim(), reportType.trim());
    const targetTitles = selectedStructure.blueprint.map((item) =>
      normalizeStructureText(item.display_working_title_vi || item.working_title),
    );

    const bestMatch =
      data.options
        .map((option) => {
          let score = option.chapter_count === selectedStructure.chapter_count ? 10 : 0;
          option.blueprint.forEach((item, index) => {
            const candidate = normalizeStructureText(item.display_working_title_vi || item.working_title);
            const target = targetTitles[index] || '';
            if (candidate && target && (candidate.includes(target) || target.includes(candidate))) {
              score += 3;
            }
          });
          return { option, score };
        })
        .sort((a, b) => b.score - a.score)[0]?.option || data.options[0];

    setStructureSessionId(data.session_id);
    window.localStorage.setItem(ADVANCED_SESSION_STORAGE_KEY, data.session_id);
    setNormalizedArticleTitle(data.normalized_article_title || data.normalized_article_title_en || '');
    setSelectedStructure(bestMatch);

    return {
      sessionId: data.session_id,
      structure: bestMatch,
    };
  };

  const handleReportTypeChange = async (value: string) => {
    setReportType(value);
    setChapterCount(null);
    setChapters([]);
    setSelectedStructure(null);
    setActiveIndex(0);
    setStructureOptions([]);
    setPanelMode(articleTitle.trim() ? 'count' : 'hidden');
    setIsTypeMenuOpen(false);
    window.localStorage.removeItem(ADVANCED_ARTICLE_STORAGE_KEY);
    await loadStructureOptions(articleTitle, value);
  };

  const updateCurrent = (field: keyof Chapter, value: Chapter[keyof Chapter]) => {
    setChapters((list) => list.map((item, i) => i === activeIndex ? { ...item, [field]: value } : item));
  };

  const openRecommendationPanel = (mode: Exclude<PanelMode, 'hidden' | 'count'>) => {
    setPanelMode(mode);
    setChapterActionError('');
    if (mode !== 'title') {
      setTitleRecommendations([]);
      setIsLoadingTitleOptions(false);
    }
    if (mode !== 'brief') {
      setBriefRecommendations([]);
      setIsLoadingBriefOptions(false);
    }
    if (mode !== 'guide') {
      setGuideRecommendations([]);
      setIsLoadingGuideOptions(false);
    }
    if (mode !== 'source') {
      setSourceRecommendations([]);
      setIsLoadingSourceOptions(false);
    }
  };

  const ensurePersistedArticle = async () => {
    if (articleId) {
      return articleId;
    }

    if (!selectedStructure || !structureSessionId) {
      return '';
    }

    const { data } = await advancedApi.selectStructure({
      session_id: structureSessionId,
      selected_option_id: selectedStructure.option_id,
    });
    setArticleId(data.article_id);
    window.localStorage.setItem(ADVANCED_ARTICLE_STORAGE_KEY, data.article_id);
    return data.article_id;
  };

  const addSource = (source: SourceItem) => {
    setChapters((list) =>
      list.map((item, i) =>
        i === activeIndex &&
        !item.sources.some(
          (x) =>
            (x.link && source.link && x.link === source.link) ||
            normalizeStructureText(x.title) === normalizeStructureText(source.title),
        )
          ? { ...item, sources: [...item.sources, source] }
          : item,
      ),
    );
  };

  const toggleSourceSelection = (source: SourceRecommendationOption) => {
    if (isSourceSelected(source)) {
      removeSource(source.id);
      return;
    }
    addSource(source);
  };

  const completeChapter = async () => {
    if (!selectedStructure) {
      setChapterActionError('Hãy chọn và lưu blueprint trước khi hoàn tất các chương.');
      return;
    }

    setIsSavingChapter(true);
    setChapterActionError('');
    try {
      const persistedArticleId = await ensurePersistedArticle();
      if (!persistedArticleId) {
        throw new Error('Cấu trúc bài viết chưa được lưu. Hãy chọn lại blueprint.');
      }

      const effectiveSessionId = structureSessionId || `persisted-${persistedArticleId}`;
      const effectiveOptionId = selectedStructure.option_id || 'persisted-structure';

      const chapterTitle =
        current?.customTitle.trim() ||
        current?.aiTitle?.display_title_vi ||
        current?.aiTitle?.title ||
        '';
      const chapterTitleDescription =
        current?.aiTitle?.display_description_vi ||
        current?.aiTitle?.description ||
        selectedStructure.blueprint[activeIndex]?.display_purpose_vi ||
        selectedStructure.blueprint[activeIndex]?.purpose ||
        '';
      const chapterBrief =
        current?.customBrief.trim() ||
        current?.aiBrief?.display_description_vi ||
        current?.aiBrief?.description ||
        '';
      const guidePayload = (current?.selectedGuides || []).map((guide, index) => ({
          content: guide.display_body_vi || guide.body,
          sort_order: index + 1,
        }));
      const sourcePayload = (current?.sources || []).map((source, index) => ({
          title: (source as SourceRecommendationOption).display_title_vi || source.title,
          snippet: (source as SourceRecommendationOption).display_snippet_vi || source.snippet,
          provider: source.provider,
          url: source.link,
          year: Number(source.year) || undefined,
          citation_count: (source as SourceRecommendationOption).citationCount || 0,
          publication:
            (source as SourceRecommendationOption).display_publication_vi ||
            (source as SourceRecommendationOption).publication,
          sort_order: index + 1,
        }));

      let savedArticleId = persistedArticleId;
      if (chapterNumber === 1) {
        const { data } = await advancedApi.confirmFirstChapter({
          article_id: persistedArticleId,
          session_id: effectiveSessionId,
          selected_option_id: effectiveOptionId,
          manual_title: current?.customTitle.trim() || undefined,
          ai_title: current?.aiTitle?.display_title_vi || current?.aiTitle?.title || undefined,
          ai_title_description: chapterTitleDescription || undefined,
          manual_brief: current?.customBrief.trim() || undefined,
          ai_brief: current?.aiBrief?.display_description_vi || current?.aiBrief?.description || undefined,
          ai_brief_description: current?.aiBrief?.display_title_vi || current?.aiBrief?.title || undefined,
          manual_guide: current?.customGuide || undefined,
          selected_guides: guidePayload,
          selected_sources: sourcePayload,
        });
        savedArticleId = data.article_id;
        setArticleId(data.article_id);
        window.localStorage.setItem(ADVANCED_ARTICLE_STORAGE_KEY, data.article_id);
      } else {
        const { data } = await advancedApi.confirmChapter({
          article_id: persistedArticleId,
          session_id: effectiveSessionId,
          chapter_number: chapterNumber,
          selected_option_id: effectiveOptionId,
          chapter_title: chapterTitle || undefined,
          chapter_title_description: chapterTitleDescription || undefined,
          chapter_brief: chapterBrief || undefined,
          manual_guide: current?.customGuide || undefined,
          selected_guides: guidePayload,
          selected_sources: sourcePayload,
        });
        savedArticleId = data.article_id;
        setArticleId(data.article_id);
        window.localStorage.setItem(ADVANCED_ARTICLE_STORAGE_KEY, data.article_id);
      }

      setIsGeneratingArticle(true);
      await advancedApi.generateChapter(savedArticleId, chapterNumber);
    } catch (error) {
      setChapterActionError(getErrorMessage(error, `Chương ${chapterNumber} chưa được lưu vào backend. Hãy thử lại.`));
      setIsSavingChapter(false);
      setIsGeneratingArticle(false);
      return;
    }
    setIsSavingChapter(false);
    setIsGeneratingArticle(false);

    setChapters((list) => list.map((item, i) => i === activeIndex ? { ...item, done: true } : item));
    if (activeIndex < chapters.length - 1) {
      setActiveIndex(activeIndex + 1);
      setTitleRecommendations([]);
      setBriefRecommendations([]);
      setGuideRecommendations([]);
      setSourceRecommendations([]);
      setSourceQuery('');
      setSourceQueryCandidates([]);
      setPanelMode('title');
    } else {
      setPanelMode('source');
    }
  };

  const generateFullArticle = async () => {
    try {
      const persistedArticleId = await ensurePersistedArticle();
      if (!persistedArticleId) {
        throw new Error('Cấu trúc bài viết chưa được lưu. Hãy chọn lại blueprint.');
      }

      setIsPublishingArticle(true);
      setChapterActionError('');
      await advancedApi.generateArticle(persistedArticleId);
      resetWizardState();
      navigate(`/article/${persistedArticleId}`);
    } catch (error) {
      setChapterActionError(getErrorMessage(error, 'Không thể sinh bài hoàn chỉnh từ các chương đã lưu. Hãy thử lại.'));
      setIsPublishingArticle(false);
      return;
    }
    setIsPublishingArticle(false);
  };

  const chooseTitleOption = (value: TitleOption) => {
    updateCurrent('aiTitle', value as never);
    setChapterActionError('');
    setBriefRecommendations([]);
    updateCurrent('aiBrief', null);
    setGuideRecommendations([]);
    setSourceRecommendations([]);
    setSourceQuery('');
    setSourceQueryCandidates([]);
    setPanelMode('brief');
  };

  const chooseGuideOption = (value: GuideOption) => {
    setChapterActionError('');
    setChapters((list) =>
      list.map((item, i) =>
        i === activeIndex && !item.selectedGuides.some((guide) => guide.id === value.id)
          ? { ...item, selectedGuides: [...item.selectedGuides, value] }
          : item
      )
    );
    setSourceRecommendations([]);
    setSourceQuery('');
    setSourceQueryCandidates([]);
  };

  const chooseBriefOption = (value: BriefOption) => {
    updateCurrent('aiBrief', value);
    setChapterActionError('');
    setGuideRecommendations([]);
    setSourceRecommendations([]);
    setSourceQuery('');
    setSourceQueryCandidates([]);
    setPanelMode('guide');
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

  const handleRecommendTitles = async () => {
    if (!selectedStructure) {
      setChapterActionError('Hãy chọn blueprint trước khi yêu cầu AI gợi ý tiêu đề.');
      return;
    }

    openRecommendationPanel('title');
    setIsLoadingTitleOptions(true);
    try {
      const liveContext = await ensureLiveStructureContext();
      if (!liveContext) {
        updateCurrent('aiTitle', null);
        setTitleRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('Không thể tải gợi ý tiêu đề chương lúc này. Hãy chọn lại bố cục hoặc thử lại sau.');
        return;
      }
      const titleContextSignature = await buildContextSignature(
        'titles',
        liveContext.sessionId,
        liveContext.structure.option_id,
        chapterNumber,
      );
      const cached = await loadCachedRecommendations(
        'titles',
        liveContext.sessionId,
        chapterNumber,
        titleContextSignature,
      );
      if (cached && cached.length > 0) {
        const cachedOptions = cached as TitleOption[];
        setTitleRecommendations(cachedOptions);
        return;
      }
      const { data } = await advancedApi.recommendChapterTitles({
        session_id: liveContext.sessionId,
        selected_option_id: liveContext.structure.option_id,
        chapter_number: chapterNumber,
      });
      if (data.options.length > 0) {
        setTitleRecommendations(data.options);
      } else {
        updateCurrent('aiTitle', null);
        setTitleRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('AI chưa tạo được tiêu đề chương phù hợp. Cần chỉnh prompt hoặc bố cục chương.');
      }
    } catch (error) {
      updateCurrent('aiTitle', null);
      setTitleRecommendations([]);
      setPanelMode('hidden');
      setChapterActionError(getErrorMessage(error, 'Không tải được gợi ý tiêu đề chương. Hãy thử lại sau.'));
    } finally {
      setIsLoadingTitleOptions(false);
    }
  };

  const handleRecommendBriefs = async () => {
    if (!current || !selectedStructure) {
      setChapterActionError('Hãy chọn blueprint trước khi yêu cầu AI gợi ý tóm tắt chương.');
      return;
    }

    const chapterTitle = current.aiTitle?.title || current.customTitle.trim();
    const chapterTitleDescription =
      current.aiTitle?.description || selectedStructure.blueprint[activeIndex]?.purpose || '';

    if (!chapterTitle) {
      setChapterActionError('Hãy chọn hoặc tự nhập tiêu đề chương trước khi yêu cầu AI gợi ý tóm tắt.');
      return;
    }

    openRecommendationPanel('brief');
    setIsLoadingBriefOptions(true);
    try {
      const liveContext = await ensureLiveStructureContext();
      if (!liveContext) {
        updateCurrent('aiBrief', null);
        setBriefRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('Không thể tải gợi ý tóm tắt chương lúc này. Hãy chọn lại bố cục hoặc thử lại sau.');
        return;
      }
      const briefContextSignature = await buildContextSignature(
        'briefs',
        liveContext.sessionId,
        liveContext.structure.option_id,
        chapterNumber,
        chapterTitle,
        chapterTitleDescription,
      );
      const cached = await loadCachedRecommendations(
        'briefs',
        liveContext.sessionId,
        chapterNumber,
        briefContextSignature,
      );
      if (cached && cached.length > 0) {
        const cachedOptions = cached as BriefOption[];
        setBriefRecommendations(cachedOptions);
        return;
      }
      const { data } = await advancedApi.recommendChapterBriefs({
        session_id: liveContext.sessionId,
        selected_option_id: liveContext.structure.option_id,
        chapter_number: chapterNumber,
        chapter_title: chapterTitle,
        chapter_title_description: chapterTitleDescription,
      });
      if (data.options.length > 0) {
        setBriefRecommendations(data.options);
      } else {
        updateCurrent('aiBrief', null);
        setBriefRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('AI chưa tạo được tóm tắt chương phù hợp. Cần chỉnh lại tiêu đề hoặc prompt.');
      }
    } catch (error) {
      updateCurrent('aiBrief', null);
      setBriefRecommendations([]);
      setPanelMode('hidden');
      setChapterActionError(getErrorMessage(error, 'Không tải được gợi ý tóm tắt chương. Hãy thử lại sau.'));
    } finally {
      setIsLoadingBriefOptions(false);
    }
  };

  const handleRecommendGuides = async () => {
    if (!current || !selectedStructure) {
      setChapterActionError('Hãy chọn blueprint trước khi yêu cầu AI gợi ý hướng dẫn viết.');
      return;
    }

    const chapterTitle = current.aiTitle?.title || current.customTitle.trim();
    const chapterBrief = current.aiBrief?.description || current.customBrief.trim();

    if (!chapterTitle || !chapterBrief) {
      setChapterActionError('Hãy chọn tiêu đề chương và tóm tắt trước khi yêu cầu AI gợi ý hướng dẫn.');
      return;
    }

    openRecommendationPanel('guide');
    setIsLoadingGuideOptions(true);
    try {
      const liveContext = await ensureLiveStructureContext();
      if (!liveContext) {
        setGuideRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('Không thể tải gợi ý hướng dẫn viết lúc này. Hãy thử lại sau.');
        return;
      }
      const guideContextSignature = await buildContextSignature(
        'guides',
        liveContext.sessionId,
        liveContext.structure.option_id,
        chapterNumber,
        chapterTitle,
        chapterBrief,
      );
      const cached = await loadCachedRecommendations(
        'guides',
        liveContext.sessionId,
        chapterNumber,
        guideContextSignature,
      );
      if (cached && cached.length > 0) {
        setGuideRecommendations(cached as GuideOption[]);
        return;
      }
      const { data } = await advancedApi.recommendChapterGuides({
        session_id: liveContext.sessionId,
        selected_option_id: liveContext.structure.option_id,
        chapter_number: chapterNumber,
        chapter_title: chapterTitle,
        chapter_brief: chapterBrief,
      });
      if (data.options.length > 0) {
        setGuideRecommendations(data.options);
      } else {
        setGuideRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('AI chưa tạo được hướng dẫn viết phù hợp cho chương này.');
      }
    } catch (error) {
      setGuideRecommendations([]);
      setPanelMode('hidden');
      setChapterActionError(getErrorMessage(error, 'Không tải được gợi ý hướng dẫn viết. Hãy thử lại sau.'));
    } finally {
      setIsLoadingGuideOptions(false);
    }
  };

  const handleRecommendSources = async () => {
    if (!current || !selectedStructure) {
      setChapterActionError('Hãy chọn blueprint trước khi yêu cầu AI tìm nguồn.');
      return;
    }

    const chapterTitle = current.aiTitle?.title || current.customTitle.trim();
    const chapterBrief = current.aiBrief?.description || current.customBrief.trim();

    if (!chapterTitle || !chapterBrief) {
      setChapterActionError('Hãy chọn tiêu đề chương và tóm tắt trước khi yêu cầu AI tìm nguồn.');
      return;
    }

      openRecommendationPanel('source');
      setIsLoadingSourceOptions(true);
      setSourceQuery('');
      setSourceQueryCandidates([]);
      try {
      const liveContext = await ensureLiveStructureContext();
      if (!liveContext) {
        setSourceRecommendations([]);
        setPanelMode('hidden');
        setChapterActionError('Không thể tải gợi ý nguồn lúc này. Hãy thử lại sau.');
        return;
      }
      const guideNotes = current.selectedGuides.map((guide) => guide.body).concat(
        current.customGuide.trim() ? [current.customGuide.trim()] : [],
      );
      const sourceContextSignature = await buildContextSignature(
        'sources',
        liveContext.sessionId,
        liveContext.structure.option_id,
        chapterNumber,
        chapterTitle,
        chapterBrief,
        ...guideNotes,
      );
      const cached = await loadCachedRecommendations(
        'sources',
        liveContext.sessionId,
        chapterNumber,
        sourceContextSignature,
      );
      if (cached && cached.length > 0) {
        setSourceRecommendations(cached as SourceRecommendationOption[]);
        return;
      }
      const { data } = await advancedApi.recommendChapterSources({
        session_id: liveContext.sessionId,
        selected_option_id: liveContext.structure.option_id,
        chapter_number: chapterNumber,
        chapter_title: chapterTitle,
        chapter_brief: chapterBrief,
        guide_notes: guideNotes,
      });
      if (data.options.length > 0) {
        setSourceQuery(typeof data.query === 'string' ? data.query : '');
        setSourceQueryCandidates(Array.isArray(data.query_candidates) ? data.query_candidates : []);
        setSourceRecommendations(
          data.options.map((item: {
            id: string;
            title: string;
            snippet?: string;
            provider?: string;
            link?: string;
            year?: string;
            citation_count?: number;
            publication?: string;
            display_title_vi?: string;
            display_snippet_vi?: string;
            display_publication_vi?: string;
          }) => ({
            id: item.id,
            title: item.title,
            snippet: item.snippet || '',
            provider: item.provider || 'Google Scholar',
            link: item.link || '',
            year: item.year || '',
            citationCount: item.citation_count || 0,
            publication: item.publication,
            display_title_vi: item.display_title_vi,
            display_snippet_vi: item.display_snippet_vi,
            display_publication_vi: item.display_publication_vi,
          })),
        );
      } else {
        setSourceRecommendations([]);
        setSourceQuery(typeof data.query === 'string' ? data.query : '');
        setSourceQueryCandidates(Array.isArray(data.query_candidates) ? data.query_candidates : []);
        setPanelMode('hidden');
        setChapterActionError('Chưa tìm được nguồn phù hợp cho chương này. Hãy điều chỉnh title, tóm tắt hoặc guide rồi thử lại.');
      }
    } catch (error) {
      setSourceRecommendations([]);
      setSourceQuery('');
      setSourceQueryCandidates([]);
      setPanelMode('hidden');
      setChapterActionError(getErrorMessage(error, 'Không tải được gợi ý nguồn. Hãy thử lại sau.'));
    } finally {
      setIsLoadingSourceOptions(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.16),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef5ff_100%)]">
      <div className="mx-auto max-w-[1480px] px-4 py-8 lg:px-6">
        <section className="rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Quy trình từng bước</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">Xây bài theo từng bước trước khi sinh bản hoàn chỉnh</h1>
                <p className="mt-4 text-sm leading-7 text-slate-300 lg:text-base">Trước hết hãy xác định thiết lập bài viết, sau đó chọn bố cục chương do AI gợi ý, rồi hoàn thiện lần lượt từng chương. Khung AI bên phải luôn sẵn sàng để bạn tham chiếu trong suốt quá trình này.</p>
            </div>
              <div className="flex flex-wrap gap-3">
                <div className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${pill(setupReady && chapterCount === null, Boolean(chapterCount))}`}>1. Setup</div>
                <div className="pt-2 text-slate-500 transition duration-200 hover:translate-x-0.5"><ChevronRight size={16} /></div>
                <div className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${pill(Boolean(chapterCount) && !finishedAll, finishedAll)}`}>2. Chapters</div>
                <div className="pt-2 text-slate-500 transition duration-200 hover:translate-x-0.5"><ChevronRight size={16} /></div>
                <div className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${pill(finishedAll, false)}`}>3. Result</div>
              </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] xl:items-start">
          <main className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Bước 1</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Thiết lập bài viết</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                  {reportType ? 'Các phương án chương do AI gợi ý đã sẵn ở bên phải' : 'Hãy chọn loại nghiên cứu để mở các phương án chương do AI gợi ý'}
                </div>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Tiêu đề bài viết</span>
                  <textarea rows={3} value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white" placeholder="Nhập tiêu đề bài viết trước" />
                </label>
                <div className="space-y-2" ref={typeMenuRef}>
                  <span className="text-sm font-semibold text-slate-700">Loại bài viết</span>
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
                        {reportTypeLabel || 'Chọn loại bài viết'}
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
                            key={option.value}
                            type="button"
                            onClick={() => handleReportTypeChange(option.value)}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition ${
                              reportType === option.value
                                ? 'bg-cyan-50 text-cyan-900'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{option.label}</span>
                            {reportType === option.value ? <Check size={16} className="text-cyan-700" /> : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {chapterCount !== null && (
                <div className="mt-6 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                Đã chọn bố cục: {chapterCount} chương
                </div>
              )}
              {normalizedArticleTitle && normalizedArticleTitle !== articleTitle && (
                <div className="mt-3 rounded-[20px] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
                  <span className="font-semibold">Tiêu đề chuẩn hóa AI:</span> {normalizedArticleTitle}
                </div>
              )}
              {selectedStructure && (
                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Blueprint đã chọn</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Đây là mạch chương mà AI sẽ dùng để gợi ý tiêu đề, tóm tắt, hướng dẫn viết, nguồn tài liệu và sinh bài cuối cùng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBlueprintDetails((currentValue) => !currentValue)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm"
                    >
                          {showBlueprintDetails ? 'Ẩn logic chương' : 'Hiện logic chương'}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {selectedStructure.blueprint.map((item) => (
                      <div key={item.chapter_number} className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Chương {item.chapter_number}
                        </p>
                        <p className="mt-1.5 text-[15px] font-semibold leading-7 text-slate-900">
                          {item.display_working_title_vi || item.working_title}
                        </p>
                        {showBlueprintDetails && (
                          <div className="mt-3 space-y-3 rounded-[16px] border border-cyan-100 bg-cyan-50 px-4 py-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                                Vai trò chương
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">
                                {item.display_purpose_vi || item.purpose}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                                Mở chương bằng
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">
                                {item.display_start_focus_vi || item.start_focus}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                                Kết chương bằng
                              </p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">
                                {item.display_end_focus_vi || item.end_focus}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {chapterCount !== null && current && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                {chapterActionError && (
                  <div className="mb-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    {chapterActionError}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">Bước 2</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Chương {activeIndex + 1} / {chapterCount}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Hoàn thiện chương hiện tại rồi chuyển sang chương tiếp theo.</p>
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
                              ? 'bg-slate-900 text-white shadow-[0_12px_26px_rgba(15,23,42,0.22)]'
                              : chapter.done
                                ? 'bg-emerald-100 text-emerald-800 hover:-translate-y-0.5 hover:bg-emerald-200'
                                : unlocked
                                  ? 'cursor-pointer bg-slate-100 text-slate-600 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-200 hover:shadow-sm'
                                  : 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-70'
                          }`}
                        >
                          {chapter.done ? <Check size={14} className="mr-2 inline" /> : null}
                          Chương {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                          <p className="text-sm font-semibold text-slate-900">Tiêu đề chương</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Chọn từ gợi ý AI hoặc tự nhập theo ý bạn.</p>
                      </div>
                      <button type="button" onClick={() => void handleRecommendTitles()} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-sm"><Sparkles size={16} />{isLoadingTitleOptions ? 'Đang tải tiêu đề...' : 'Gợi ý tiêu đề'}</button>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Tiêu đề AI đã chọn</span>
                        <div className={`rounded-[20px] border px-4 py-3 transition ${current.aiTitle ? 'border-emerald-200 bg-emerald-50/70' : 'min-h-[78px] border-slate-200 bg-white'}`}>
                          {current.aiTitle ? (
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                <div className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Đã chọn</div>
                                <p className="mt-2 text-base font-semibold leading-7 text-slate-900">{current.aiTitle.display_title_vi || current.aiTitle.title}</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{current.aiTitle.display_description_vi || current.aiTitle.description}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={clearAiTitle}
                                  className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                                >
                                  X
                                </button>
                              </div>
                          ) : (
                            <p className="text-base text-slate-400">Hãy chọn từ khung gợi ý bên phải</p>
                          )}
                        </div>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Tự nhập tiêu đề</span>
                        <input value={current.customTitle} onChange={(e) => updateCurrent('customTitle', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-emerald-200 focus:border-emerald-400" placeholder="Hoặc tự viết tiêu đề của bạn" />
                      </label>
                    </div>
                  </div>

                  {titleReady && (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Tóm tắt chương</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Chọn tóm tắt do AI gợi ý hoặc tự viết.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRecommendBriefs()}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-200 hover:shadow-sm"
                        >
                          <Sparkles size={16} />
                          {isLoadingBriefOptions ? 'Đang tải tóm tắt...' : 'Gợi ý tóm tắt'}
                        </button>
                      </div>
                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Tóm tắt AI đã chọn</span>
                        <div className={`rounded-[20px] border px-4 py-3 transition ${current.aiBrief ? 'border-cyan-200 bg-cyan-50/70' : 'min-h-[120px] border-slate-200 bg-white'}`}>
                          {current.aiBrief ? (
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                <div className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Đã chọn</div>
                                <p className="mt-2 text-base font-semibold leading-7 text-slate-900">{current.aiBrief.display_title_vi || current.aiBrief.title}</p>
                                <p className="mt-1 text-sm leading-7 text-slate-600">{current.aiBrief.display_description_vi || current.aiBrief.description}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={clearAiBrief}
                                  className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                                >
                                  X
                                </button>
                              </div>
                          ) : (
                            <p className="text-base text-slate-400">Hãy chọn từ các gợi ý AI</p>
                          )}
                        </div>
                      </label>
                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Tự nhập tóm tắt</span>
                        <textarea rows={4} value={current.customBrief} onChange={(e) => updateCurrent('customBrief', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-cyan-200 focus:border-cyan-400" placeholder="Hoặc tự viết tóm tắt chương" />
                      </label>
                    </div>
                  )}

                  {briefReady && (
                    <div className="grid items-start gap-5 xl:grid-cols-2">
                    <div className="h-fit self-start rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Hướng dẫn viết (tùy chọn)</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Chọn hướng dẫn do AI gợi ý hoặc tự viết thêm nếu bạn muốn kiểm soát chặt hơn.</p>
                        </div>
                        <button type="button" onClick={() => void handleRecommendGuides()} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-sm"><Lightbulb size={16} />{isLoadingGuideOptions ? 'Đang tải hướng dẫn...' : 'Gợi ý hướng dẫn'}</button>
                      </div>
                      <div className="mt-4 space-y-4">
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Hướng dẫn AI đã chọn</span>
                          <div className="min-h-28 rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                            {current.selectedGuides.length > 0 ? (
                              <div className="space-y-2">
                                {current.selectedGuides.map((guide) => (
                                  <div key={guide.id} className="flex items-start justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{guide.display_title_vi || guide.title}</p>
                                      <p className="mt-1 text-sm leading-6 text-slate-700">{guide.display_body_vi || guide.body}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeGuideOption(guide.id)}
                                      className="cursor-pointer rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="pt-1 text-sm text-slate-400">Hãy chọn một hoặc nhiều hướng dẫn AI.</p>
                            )}
                          </div>
                        </label>
                        <label className="block space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Tự nhập hướng dẫn</span>
                          <textarea rows={3} value={current.customGuide} onChange={(e) => updateCurrent('customGuide', e.target.value)} className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 outline-none transition hover:border-amber-200 focus:border-amber-400" placeholder="Hoặc tự viết hướng dẫn của bạn" />
                        </label>
                      </div>
                    </div>

                    <div className="h-fit self-start rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Nguồn tài liệu</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Thêm nguồn thủ công hoặc để Gemini lập truy vấn học thuật rồi tìm qua Serper Scholar.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => addSource({ id: crypto.randomUUID(), title: 'Nguồn do người dùng thêm', snippet: 'Ghi chú, trích đoạn trích dẫn hoặc kết quả tìm học thuật do người dùng tự nhập.', provider: 'Nhập thủ công', link: 'https://scholar.google.com', year: '2026' })} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm"><Plus size={16} />Thêm nguồn thủ công</button>
                          <button type="button" onClick={() => void handleRecommendSources()} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:-translate-y-0.5 hover:bg-violet-200 hover:shadow-sm"><Search size={16} />{isLoadingSourceOptions ? 'Đang tải nguồn...' : 'Tìm nguồn'}</button>
                        </div>
                      </div>
                      {(sourceQuery || sourceQueryCandidates.length > 0) && (
                        <div className="mt-4 rounded-[18px] border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                          <p className="font-semibold">Truy vấn học thuật do Gemini lập</p>
                          {sourceQuery && <p className="mt-2 break-words leading-6">{sourceQuery}</p>}
                          {sourceQueryCandidates.length > 1 && (
                            <p className="mt-2 text-xs leading-5 text-violet-700">
                              Đã chuẩn bị {sourceQueryCandidates.length} biến thể truy vấn để tự fallback khi cần.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-4 space-y-3">
                        {current.sources.length > 0 ? current.sources.map((source) => (
                          <div key={source.id} className="overflow-hidden rounded-[18px] border border-violet-200 bg-white px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words font-semibold text-slate-900">{source.display_title_vi || source.title}</p>
                                <p className="mt-2 break-words text-sm leading-6 text-slate-600">{source.display_snippet_vi || source.snippet}</p>
                                <p className="mt-2 break-words text-sm text-slate-500">{source.display_publication_vi || source.provider} • {source.year}</p>
                                <p className="mt-1 break-all text-xs text-violet-700">{source.link}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSource(source.id)}
                                className="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        )) : <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-4 text-sm leading-6 text-slate-500">Chưa có nguồn nào cho chương này.</div>}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <div className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-800">
                          {sourcesReady ? `Đã chọn ${current.sources.length} nguồn` : 'Hãy chọn ít nhất 1 nguồn'}
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {current.done && !finishedAll && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Chương {activeIndex + 1} đã được viết và lưu vào database.</p>
                    <p className="mt-1 text-sm text-emerald-800">Bạn có thể chuyển sang chương tiếp theo hoặc chỉnh lại rồi lưu lại chương này nếu cần.</p>
                  </div>
                </div>
                )}

                {sourcesReady && !current.done && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void completeChapter()}
                    disabled={!(titleReady && briefReady && sourcesReady) || isSavingChapter || isGeneratingArticle}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      (titleReady && briefReady && sourcesReady) && !isSavingChapter && !isGeneratingArticle
                        ? 'cursor-pointer bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isSavingChapter
                      ? 'Đang lưu chương...'
                      : isGeneratingArticle
                        ? 'Đang viết chương...'
                        : `Hoàn tất Chương ${activeIndex + 1}`}
                    <ChevronRight size={16} />
                  </button>
                </div>
                )}

                {finishedAll && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-cyan-200 bg-cyan-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-cyan-900">Tất cả chương đã sẵn sàng.</p>
                    <p className="mt-1 text-sm text-cyan-800">Bước cuối cùng sẽ ghép các chương thành bài hoàn chỉnh để bạn xem và xuất file.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void generateFullArticle()}
                    disabled={isPublishingArticle}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      !isPublishingArticle
                        ? 'cursor-pointer bg-cyan-700 text-white hover:-translate-y-0.5 hover:bg-cyan-800 hover:shadow-lg'
                        : 'cursor-not-allowed bg-cyan-200 text-cyan-500'
                    }`}
                  >
                    {isPublishingArticle ? 'Đang sinh bài hoàn chỉnh...' : 'Sinh bài'}
                    <ChevronRight size={16} />
                  </button>
                </div>
                )}
              </section>
            )}
          </main>

          <aside className={`self-start rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition-all duration-300 xl:sticky xl:top-5 ${isCompactAiPanel ? 'xl:max-h-[220px]' : 'xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">Khu gợi ý AI</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bảng gợi ý cố định</h2>
              </div>
            </div>
            <div className={isCompactAiPanel ? 'mt-4' : 'mt-5'}>
              {panelMode === 'count' && !selectedStructure && (
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-cyan-200 bg-cyan-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">AI tạo ra</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {isLoadingStructure
                        ? 'Gemini đang chuẩn bị các phương án bố cục cho loại bài này.'
                        : structureError || aiCountSummary[reportType] || aiCountSummary['Tiểu luận học thuật']}
                    </p>
                    {normalizedArticleTitle && (
                      <p className="mt-2 text-sm font-medium text-slate-700">Tiêu đề chuẩn hóa: {normalizedArticleTitle}</p>
                    )}
                  </div>
                  {isLoadingStructure && (
                    <div className="rounded-[22px] border border-dashed border-cyan-200 bg-white px-4 py-5 text-sm leading-6 text-slate-500">
                      Đang tải các phương án bố cục từ AI...
                    </div>
                  )}
                  {!isLoadingStructure && structureOptions.map((item, index) => (
                    <button key={item.option_id} type="button" onClick={() => buildPlan(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{item.chapter_count} chương</p>
                        <span className="whitespace-nowrap rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">Phương án {index + 1}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.display_rationale_vi || item.rationale}</p>
                      <div className="mt-3 space-y-2">
                        {item.blueprint.map((chapter) => (
                          <div key={`${item.option_id}-${chapter.chapter_number}`} className="rounded-[18px] border border-cyan-100 bg-white px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Chương {chapter.chapter_number}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{chapter.display_working_title_vi || chapter.working_title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{chapter.display_purpose_vi || chapter.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {panelMode === 'hidden' && (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                  {selectedStructure
                    ? 'Bố cục đã được chọn. Dùng các nút Gợi ý tiêu đề, Gợi ý tóm tắt, Gợi ý hướng dẫn hoặc Tìm nguồn ở cột trái để nạp lại dữ liệu cho khung này.'
                    : 'Chọn tiêu đề bài và loại nghiên cứu để AI hiển thị các phương án bố cục tại đây.'}
                </div>
              )}
              {panelMode === 'title' && <div className="space-y-3">{suggestedTitles.map((item, index) => <button key={item.title} type="button" onClick={() => chooseTitleOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.display_title_vi || item.title}</p><span className="whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Phương án {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.display_description_vi || item.description}</p></button>)}</div>}
              {panelMode === 'brief' && <div className="space-y-3">{suggestedBriefs.map((item, index) => <button key={item.title} type="button" onClick={() => chooseBriefOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.display_title_vi || item.title}</p><span className="whitespace-nowrap rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">Phương án {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.display_description_vi || item.description}</p></button>)}</div>}
              {panelMode === 'guide' && <div className="space-y-3">{suggestedGuides.map((item, index) => <button key={item.id} type="button" onClick={() => chooseGuideOption(item)} className="w-full cursor-pointer rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{item.display_title_vi || item.title}</p><span className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Guide {index + 1}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.display_body_vi || item.body}</p></button>)}</div>}
              {panelMode === 'source' && <div className="space-y-3">{suggestedSources.map((item, index) => { const selected = isSourceSelected(item); return <button key={item.id} type="button" onClick={() => toggleSourceSelection(item)} className={`w-full cursor-pointer rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-violet-400 bg-violet-100 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50'}`}><div className="flex items-center justify-between gap-3"><p className="break-words font-semibold text-slate-900">{item.display_title_vi || item.title}</p><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${selected ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>{selected ? 'Đã chọn' : `Nguồn ${index + 1}`}</span></div><p className="mt-2 break-words text-sm leading-6 text-slate-600">{item.display_snippet_vi || item.snippet}</p><p className="mt-2 text-sm text-slate-500">{item.display_publication_vi || item.provider} • {item.year}</p><p className="mt-1 break-all text-xs text-violet-700">{item.link}</p></button>; })}</div>}
              {!shouldRenderPanel && panelMode !== 'hidden' && (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                  {selectedStructure
                    ? 'Khung gợi ý đang trống. Hãy dùng các nút gợi ý ở cột trái để nạp nội dung phù hợp cho chương hiện tại.'
                    : 'Khung gợi ý sẽ hiện nội dung khi bạn bắt đầu chọn bố cục hoặc yêu cầu AI gợi ý.'}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
