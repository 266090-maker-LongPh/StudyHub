export type SubjectId = 'dbs' | 'se1';

export interface SourceRef {
  file: string;
  loc: string;
}

export interface CodeSnippet {
  lang: 'sql' | 'java';
  text: string;
}

export interface SummaryTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface BulletGroup {
  text: string;
  subBullets?: string[];
}

export interface VerbatimSlide {
  slideNumber: string;
  pageNumber?: number;
  title: string;
  paragraphs?: string[];
  bullets?: (string | BulletGroup)[];
  table?: SummaryTable;
  code?: CodeSnippet;
  diagramText?: string[];
  diagramNote?: string;
  ocrNote?: string;
  explanation?: string[];
  source: SourceRef;
}

export interface TermDefinition {
  term: string;
  meaning: string;
}

export interface SectionDigest {
  keyPoints: string[];
  terms?: TermDefinition[];
  pitfalls?: string[];
}

export interface SummarySection {
  h: string;
  text: string;
  code?: CodeSnippet;
  source?: SourceRef;
  slides?: VerbatimSlide[];
  digest?: SectionDigest;
}

export interface ExtractionAudit {
  sourceFile: string;
  totalPages: number;
  extractedPages: number;
  ocrNotes: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  source: SourceRef;
}

export interface QuizQuestion {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  source: SourceRef;
}

export interface Chapter {
  id: string;
  order: number;
  title: string;
  summary: SummarySection[];
  sources: SourceRef[];
  cards: Flashcard[];
  questions: QuizQuestion[];
  audit?: ExtractionAudit;
}

export interface SubjectDataset {
  subject: SubjectId;
  name: string;
  chapters: Chapter[];
}

export interface IssueItem {
  id: string;
  subject: SubjectId;
  title: string;
  detail: string;
  source: string;
}

export interface IssuesReport {
  items: IssueItem[];
}

export interface FileReportEntry {
  file: string;
  ext: string;
  size: number;
  status: string;
  note: string;
}

export interface FileReportSubject {
  name: string;
  total: number;
  files: FileReportEntry[];
}

export interface FileReport {
  generatedAt: string;
  subjects: Record<SubjectId, FileReportSubject>;
}

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface CardScheduleState {
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueDate: string; // YYYY-MM-DD
  lastRating?: FlashcardRating;
  lastReviewedAt?: string;
}

export interface QuizAttempt {
  id: string;
  chapterId: string | 'mixed';
  chapterTitle: string;
  score: number;
  total: number;
  timestamp: string;
  wrongChapterIds: string[];
}

export interface SubjectProgress {
  completedChapterIds: string[];
  cards: Record<string, CardScheduleState>;
  quizHistory: QuizAttempt[];
  studyDates: string[]; // YYYY-MM-DD
}
