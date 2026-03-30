export type ComposerField = 'title' | 'keywords' | 'abstract' | 'references' | 'chapters';

export type SuggestionMode = 'structure' | 'chapter' | 'guide' | 'source';

export interface ReferenceItem {
  id: string;
  title: string;
  journal: string;
  year: string;
  openAccess: boolean;
  note?: string;
}

export interface ChapterGuide {
  id: string;
  label: string;
  content: string;
}

export interface ChapterDraft {
  id: string;
  genre: string;
  title: string;
  summary: string;
  rules: string;
  customGuidance: string;
  references: ReferenceItem[];
  guides: ChapterGuide[];
}
