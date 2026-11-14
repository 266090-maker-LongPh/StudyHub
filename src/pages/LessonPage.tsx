import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { SourceBadge } from '../components/SourceBadge';
import type {
  BulletGroup,
  Chapter,
  SubjectDataset,
  SubjectId,
  SummarySection,
  VerbatimSlide,
} from '../types';

type LessonViewMode = 'both' | 'original' | 'summary';

const VIEW_MODE_KEY = 'studyhub_lesson_view_mode';

const VIEW_MODE_OPTIONS: { id: LessonViewMode; label: string }[] = [
  { id: 'both', label: 'Chia đôi: PDF + Giải thích' },
  { id: 'original', label: 'Chỉ Nội dung gốc' },
  { id: 'summary', label: 'Chỉ Giải thích & Tóm tắt' },
];

interface LessonPageProps {
  dataset: SubjectDataset;
  completedChapterIds: string[];
  onToggleChapterComplete: (chapterId: string) => void;
}

function getSectionSlideRange(section: SummarySection): string | null {
  if (!section.slides || section.slides.length === 0) return null;
  const first = section.slides[0].slideNumber;
  const last = section.slides[section.slides.length - 1].slideNumber;
  return first === last ? first : `${first} – ${last}`;
}

function getSlidePageNumber(slide: VerbatimSlide): number | null {
  if (typeof slide.pageNumber === 'number' && slide.pageNumber >= 1) {
    return slide.pageNumber;
  }
  const fromSlideNum = /\d+/.exec(slide.slideNumber);
  if (fromSlideNum) {
    const parsed = Number.parseInt(fromSlideNum[0], 10);
    if (parsed >= 1) return parsed;
  }
  const fromLoc = /\d+/.exec(slide.source.loc);
  if (fromLoc) {
    const parsed = Number.parseInt(fromLoc[0], 10);
    if (parsed >= 1) return parsed;
  }
  return null;
}

function collectChapterPdfFiles(chapter: Chapter): string[] {
  const seen = new Set<string>();
  const addIfPdf = (file?: string) => {
    if (!file) return;
    const trimmed = file.trim();
    if (trimmed.toLowerCase().endsWith('.pdf') && !seen.has(trimmed)) {
      seen.add(trimmed);
    }
  };

  if (chapter.audit?.sourceFile) {
    addIfPdf(chapter.audit.sourceFile);
  }
  for (const src of chapter.sources) {
    addIfPdf(src.file);
  }
  for (const sec of chapter.summary) {
    addIfPdf(sec.source?.file);
    if (sec.slides) {
      for (const sl of sec.slides) {
        addIfPdf(sl.source.file);
      }
    }
  }
  return Array.from(seen);
}

function buildMaterialUrl(subject: SubjectId, file: string): string {
  const folder = subject === 'dbs' ? 'DBS' : 'SE1-2026';
  const encodedPath = file
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/materials/${folder}/${encodedPath}`;
}

function renderBulletItem(item: string | BulletGroup, idx: number) {
  if (typeof item === 'string') {
    return (
      <li key={idx} className="leading-relaxed">
        {item}
      </li>
    );
  }
  return (
    <li key={idx} className="leading-relaxed">
      <span>{item.text}</span>
      {item.subBullets && item.subBullets.length > 0 && (
        <ul className="mt-1 list-[circle] space-y-1 pl-5 text-slate-700 dark:text-slate-300">
          {item.subBullets.map((sub, sIdx) => (
            <li key={sIdx}>{sub}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function SlideCard({
  slide,
  slideKey,
  showExplanation,
  showOriginal,
  hasPdfPane,
  isSelected,
  onSyncPdf,
}: {
  slide: VerbatimSlide;
  slideKey: string;
  showExplanation: boolean;
  showOriginal: boolean;
  hasPdfPane: boolean;
  isSelected: boolean;
  onSyncPdf: (file: string, page: number, key: string) => void;
}) {
  const pageNum = getSlidePageNumber(slide);
  const canSyncPdf =
    hasPdfPane &&
    pageNum !== null &&
    slide.source.file.toLowerCase().endsWith('.pdf');
  const hasExplanation =
    Boolean(slide.explanation && slide.explanation.length > 0);

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/20'
          : 'border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/60'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            {slide.slideNumber}
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {slide.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSyncPdf && (
            <button
              type="button"
              onClick={() => onSyncPdf(slide.source.file, pageNum, slideKey)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60'
              }`}
              title={`Nhảy khung PDF sang trang ${pageNum}`}
            >
              ← Xem PDF trang {pageNum}
            </button>
          )}
          <SourceBadge source={slide.source} compact />
        </div>
      </div>

      <div className="mt-3 space-y-3 text-sm text-slate-800 dark:text-slate-200">
        {/* Giải thích chi tiết từng slide (Tiếng Việt) */}
        {showExplanation && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/75 p-3.5 dark:border-blue-900/70 dark:bg-blue-950/35">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="inline-block rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Giải thích chi tiết
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-300">
                Hiểu sâu &amp; lưu ý ôn thi
              </span>
            </div>
            {hasExplanation ? (
              <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
                {slide.explanation!.map((exp, eIdx) => (
                  <li key={eIdx}>{exp}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs italic text-slate-600 dark:text-slate-400">
                Slide này chưa bổ sung phần giải thích chi tiết từng slide — tham khảo phần Tóm tắt mục phía trên.
              </p>
            )}
          </div>
        )}

        {/* Nội dung gốc nguyên văn trên slide */}
        {showOriginal && (
          <div className="space-y-2.5">
            {showExplanation && (
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Nội dung gốc trên slide
              </div>
            )}

            {slide.paragraphs &&
              slide.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="whitespace-pre-line leading-relaxed">
                  {p}
                </p>
              ))}

            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="list-disc space-y-1.5 pl-5">
                {slide.bullets.map((b, bIdx) => renderBulletItem(b, bIdx))}
              </ul>
            )}

            {slide.table && (
              <div className="space-y-1.5">
                {slide.table.caption && (
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {slide.table.caption}
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        {slide.table.headers.map((header, hIdx) => (
                          <th
                            key={hIdx}
                            className="whitespace-nowrap px-3 py-2 font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {slide.table.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3 py-2 text-slate-700 dark:text-slate-300"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {slide.code && <CodeBlock lang={slide.code.lang} code={slide.code.text} />}

            {slide.diagramText && slide.diagramText.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Nội dung chữ trong sơ đồ / biểu đồ trên slide
                </div>
                <ul className="space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300">
                  {slide.diagramText.map((line, dIdx) => (
                    <li key={dIdx} className="whitespace-pre-wrap">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {slide.diagramNote && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white/80 px-3 py-2 text-xs italic text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                <span className="font-semibold not-italic text-slate-700 dark:text-slate-300">
                  Mô tả sơ đồ:{' '}
                </span>
                {slide.diagramNote}
              </p>
            )}

            {slide.ocrNote && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Lưu ý trích xuất: {slide.ocrNote}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function LessonPage({
  dataset,
  completedChapterIds,
  onToggleChapterComplete,
}: LessonPageProps) {
  const { chapterId } = useParams<{ chapterId: string }>();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<LessonViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === 'original' || saved === 'summary' || saved === 'both') {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return 'both';
  });
  const [readProgress, setReadProgress] = useState(0);
  const [slideFilter, setSlideFilter] = useState('');
  const [hidePdfPane, setHidePdfPane] = useState(false);

  const chapterIndex = dataset.chapters.findIndex((c) => c.id === chapterId);
  const chapter = chapterIndex >= 0 ? dataset.chapters[chapterIndex] : undefined;

  const pdfFiles = useMemo(
    () => (chapter ? collectChapterPdfFiles(chapter) : []),
    [chapter],
  );

  const [selectedPdf, setSelectedPdf] = useState<string>('');
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfJumpNonce, setPdfJumpNonce] = useState<number>(0);
  const [selectedSlideKey, setSelectedSlideKey] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>('1');

  useEffect(() => {
    setSelectedPdf(pdfFiles[0] ?? '');
    setPdfPage(1);
    setPageInput('1');
    setPdfJumpNonce((n) => n + 1);
    setSelectedSlideKey(null);
    setSlideFilter('');
  }, [chapterId, pdfFiles]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Ignore storage errors
    }
  }, [viewMode]);

  useEffect(() => {
    const updateScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setReadProgress(100);
        return;
      }
      const pct = Math.min(
        100,
        Math.max(0, Math.round((window.scrollY / scrollable) * 100)),
      );
      setReadProgress(pct);
    };
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    return () => {
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', updateScroll);
    };
  }, [chapterId, viewMode, hidePdfPane]);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, chapterId]);

  if (!chapter) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold">Không tìm thấy bài học</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chương &ldquo;{chapterId}&rdquo; không thuộc môn {dataset.name}. Có thể bạn vừa đổi môn học.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  const prevChapter = chapterIndex > 0 ? dataset.chapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < dataset.chapters.length - 1
      ? dataset.chapters[chapterIndex + 1]
      : null;
  const isCompleted = completedChapterIds.includes(chapter.id);

  const showSummary = viewMode === 'both' || viewMode === 'summary';
  const showOriginal = viewMode === 'both' || viewMode === 'original';

  const hasPdfAvailable = pdfFiles.length > 0 && Boolean(selectedPdf);
  const showPdfSplit =
    hasPdfAvailable && !hidePdfPane && viewMode !== 'summary';

  const maxKnownPages =
    chapter.audit?.totalPages ??
    chapter.summary.reduce((acc, sec) => acc + (sec.slides?.length ?? 0), 0);

  const handleJumpToPdf = (file: string, page: number, slideKey?: string) => {
    const safePage = Math.max(1, page);
    if (pdfFiles.includes(file)) {
      setSelectedPdf(file);
    }
    setPdfPage(safePage);
    setPageInput(String(safePage));
    setPdfJumpNonce((n) => n + 1);
    if (slideKey) {
      setSelectedSlideKey(slideKey);
    }
    if (hidePdfPane) {
      setHidePdfPane(false);
    }
  };

  const handleStepPage = (delta: number) => {
    const next = Math.max(1, pdfPage + delta);
    setPdfPage(next);
    setPageInput(String(next));
    setPdfJumpNonce((n) => n + 1);
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      setPdfPage(parsed);
      setPdfJumpNonce((n) => n + 1);
    }
  };

  const normalizedFilter = slideFilter.trim().toLowerCase();
  const basePdfUrl = selectedPdf
    ? buildMaterialUrl(dataset.subject, selectedPdf)
    : '';
  const iframeSrc = basePdfUrl
    ? `${basePdfUrl}#page=${pdfPage}&view=FitH`
    : '';

  return (
    <div className="space-y-5">
      {/* Top reading progress bar */}
      <div
        aria-label="Thanh tiến độ đọc"
        className="fixed top-0 left-0 right-0 z-40 h-1 bg-slate-200/70 dark:bg-slate-800/80"
      >
        <div
          className="h-full bg-blue-600 transition-[width] duration-150 dark:bg-blue-500"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Top controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          ← Quay lại danh sách chương
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Chế độ hiển thị bài học"
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
          >
            {VIEW_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setViewMode(opt.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === opt.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasPdfAvailable && viewMode !== 'summary' && (
            <button
              type="button"
              onClick={() => setHidePdfPane((v) => !v)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {hidePdfPane ? 'Hiện khung PDF 50/50' : 'Ẩn khung PDF'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onToggleChapterComplete(chapter.id)}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition sm:text-sm ${
              isCompleted
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {isCompleted ? '✓ Đã hoàn thành chương' : 'Đánh dấu đã học xong'}
          </button>
        </div>
      </div>

      {/* Compact Chapter Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {dataset.name} • Bài {chapter.order}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tiến độ đọc: {readProgress}%
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {chapter.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/flashcards?chapter=${encodeURIComponent(chapter.id)}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Ôn {chapter.cards.length} Flashcard
            </Link>
            <Link
              to={`/quiz?chapter=${encodeURIComponent(chapter.id)}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Làm {chapter.questions.length} câu Quiz
            </Link>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {chapter.sources.map((src, idx) => (
            <SourceBadge key={`${src.file}-${idx}`} source={src} compact />
          ))}
        </div>

        {chapter.audit && (
          <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <span className="font-semibold">Đối chiếu trích xuất: </span>
            {chapter.audit.sourceFile} • Đã trích xuất{' '}
            <span className="font-bold">
              {chapter.audit.extractedPages}/{chapter.audit.totalPages}
            </span>{' '}
            slide/trang
            {chapter.audit.ocrNotes.length > 0
              ? ` • ${chapter.audit.ocrNotes.join('; ')}`
              : ' • Đầy đủ từng slide + giải thích chi tiết'}
          </div>
        )}
      </header>

      {/* Main Split-Screen (50/50 when PDF active) or Classic Layout */}
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
        {showPdfSplit ? (
          /* LEFT 50%: Sticky Full Scrollable PDF Viewer */
          <section
            aria-label="Khung xem toàn bộ file PDF slide"
            className="mb-5 flex h-[68vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-[4.25rem] lg:col-span-6 lg:mb-0 lg:h-[calc(100vh-5.25rem)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  PDF
                </span>
                {pdfFiles.length > 1 ? (
                  <select
                    aria-label="Chọn file PDF hiển thị"
                    value={selectedPdf}
                    onChange={(e) => {
                      setSelectedPdf(e.target.value);
                      setPdfPage(1);
                      setPageInput('1');
                      setPdfJumpNonce((n) => n + 1);
                    }}
                    className="max-w-full truncate rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {pdfFiles.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className="truncate font-mono text-xs font-medium text-slate-700 dark:text-slate-200"
                    title={selectedPdf}
                  >
                    {selectedPdf}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStepPage(-1)}
                  disabled={pdfPage <= 1}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Trang trước"
                >
                  ◀
                </button>
                <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Trang
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(999, maxKnownPages)}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    aria-label="Nhập số trang PDF"
                    className="w-12 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-center font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {maxKnownPages > 0 && (
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      /{maxKnownPages}
                    </span>
                  )}
                </form>
                <button
                  type="button"
                  onClick={() => handleStepPage(1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Trang sau"
                >
                  ▶
                </button>
                <a
                  href={iframeSrc}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="Mở PDF trong tab mới"
                >
                  Tab mới ↗
                </a>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-slate-100/70 px-3 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              Cuộn trực tiếp file PDF bên dưới hoặc bấm{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                ← Xem PDF trang N
              </span>{' '}
              ở bên phải để nhảy đúng slide.
            </div>

            <iframe
              key={`${selectedPdf}-${pdfJumpNonce}`}
              src={iframeSrc}
              title={`PDF Viewer - ${selectedPdf}`}
              className="h-full w-full flex-1 border-0 bg-slate-800"
            />
          </section>
        ) : (
          /* Classic Sticky Sidebar TOC when PDF pane is hidden / unavailable */
          <aside className="hidden lg:sticky lg:top-20 lg:col-span-3 lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mục lục ({chapter.summary.length})
                </h2>
                <span className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {readProgress}%
                </span>
              </div>
              <nav
                aria-label="Mục lục bên cạnh"
                className="mt-2.5 max-h-[70vh] space-y-1 overflow-y-auto pr-1"
              >
                {chapter.summary.map((sec, idx) => {
                  const range = getSectionSlideRange(sec);
                  return (
                    <a
                      key={idx}
                      href={`#sec-${idx}`}
                      className="block rounded-lg px-2.5 py-1.5 text-xs leading-snug text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      <div className="font-medium">
                        {idx + 1}. {sec.h}
                      </div>
                      {range && (
                        <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                          {range}
                        </div>
                      )}
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        {/* RIGHT 50% (or 9 cols when classic): Scrollable Detailed Explanation & Original Content */}
        <div
          className={`space-y-5 ${
            showPdfSplit ? 'lg:col-span-6' : 'lg:col-span-9'
          }`}
        >
          {/* Compact Section Jump Bar & Slide Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label
                  htmlFor="toc-jump"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Nhảy nhanh tới mục ({chapter.summary.length} mục)
                </label>
                <select
                  id="toc-jump"
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const target = document.getElementById(e.target.value);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- Chọn mục để nhảy nhanh --</option>
                  {chapter.summary.map((sec, idx) => {
                    const range = getSectionSlideRange(sec);
                    return (
                      <option key={idx} value={`sec-${idx}`}>
                        {idx + 1}. {sec.h} {range ? `(${range})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:w-56">
                <label
                  htmlFor="chapter-slide-filter"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Lọc slide trong bài
                </label>
                <input
                  id="chapter-slide-filter"
                  type="search"
                  value={slideFilter}
                  onChange={(e) => setSlideFilter(e.target.value)}
                  placeholder="Tìm Slide 15, từ khóa..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          {chapter.summary.map((section, index) => {
            const range = getSectionSlideRange(section);
            const allSlides = section.slides ?? [];
            const filteredSlides = normalizedFilter
              ? allSlides.filter((sl) => {
                  const blob = [
                    sl.slideNumber,
                    sl.title,
                    ...(sl.paragraphs ?? []),
                    ...(sl.explanation ?? []),
                    ...(sl.diagramText ?? []),
                    sl.diagramNote ?? '',
                    sl.code?.text ?? '',
                    ...(sl.bullets ?? []).map((b) =>
                      typeof b === 'string'
                        ? b
                        : `${b.text} ${(b.subBullets ?? []).join(' ')}`,
                    ),
                  ]
                    .join(' ')
                    .toLowerCase();
                  return blob.includes(normalizedFilter);
                })
              : allSlides;

            if (normalizedFilter && filteredSlides.length === 0) {
              const secBlob = `${section.h} ${section.text}`.toLowerCase();
              if (!secBlob.includes(normalizedFilter)) {
                return null;
              }
            }

            const hasVerbatim = allSlides.length > 0;

            return (
              <section
                id={`sec-${index}`}
                key={`${section.h}-${index}`}
                className="scroll-mt-20 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Mục {index + 1}
                      {range ? ` • ${range}` : ''}
                    </div>
                    <h2 className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">
                      {section.h}
                    </h2>
                  </div>
                  {section.source && <SourceBadge source={section.source} compact />}
                </div>

                {/* Highlighted Section Digest (Tóm tắt mục) */}
                {showSummary && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-block rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                        Tóm tắt mục {index + 1}
                      </span>
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Ý chính, thuật ngữ &amp; lưu ý ôn thi
                      </span>
                    </div>

                    {section.digest ? (
                      <div className="space-y-3 text-sm text-slate-800 dark:text-slate-200">
                        <ul className="list-disc space-y-1.5 pl-5">
                          {section.digest.keyPoints.map((pt, kIdx) => (
                            <li key={kIdx} className="leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>

                        {section.digest.terms && section.digest.terms.length > 0 && (
                          <div className="rounded-lg border border-indigo-200/80 bg-white/80 p-3 dark:border-indigo-900/50 dark:bg-slate-900/70">
                            <div className="mb-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                              Thuật ngữ quan trọng
                            </div>
                            <dl className="space-y-1.5 text-xs">
                              {section.digest.terms.map((t, tIdx) => (
                                <div key={tIdx}>
                                  <dt className="inline font-bold text-slate-900 dark:text-white">
                                    {t.term}:{' '}
                                  </dt>
                                  <dd className="inline text-slate-700 dark:text-slate-300">
                                    {t.meaning}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        {section.digest.pitfalls && section.digest.pitfalls.length > 0 && (
                          <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <div className="mb-1 font-bold">Lưu ý dễ nhầm:</div>
                            <ul className="list-disc space-y-1 pl-4">
                              {section.digest.pitfalls.map((pf, pfIdx) => (
                                <li key={pfIdx}>{pf}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
                        <p className="whitespace-pre-line leading-relaxed">
                          {section.text}
                        </p>
                        {section.code && (
                          <CodeBlock
                            lang={section.code.lang}
                            code={section.code.text}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Per-Slide Cards (Detailed Explanation + Verbatim Original) */}
                {hasVerbatim ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white dark:bg-slate-200 dark:text-slate-900">
                        Chi tiết từng slide ({filteredSlides.length}
                        {normalizedFilter ? `/${allSlides.length}` : ''})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {filteredSlides.map((sl, slIdx) => {
                        const slideKey = `${index}-${sl.slideNumber}-${slIdx}`;
                        return (
                          <SlideCard
                            key={slideKey}
                            slide={sl}
                            slideKey={slideKey}
                            showExplanation={showSummary}
                            showOriginal={showOriginal}
                            hasPdfPane={showPdfSplit || hasPdfAvailable}
                            isSelected={selectedSlideKey === slideKey}
                            onSyncPdf={handleJumpToPdf}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  showOriginal && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                      <div className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Chương này chưa tách từng slide chi tiết — bạn vẫn có thể cuộn xem toàn bộ PDF gốc ở khung bên trái.
                      </div>
                      {!showSummary && (
                        <>
                          <p className="mt-2 whitespace-pre-line leading-relaxed">
                            {section.text}
                          </p>
                          {section.code && (
                            <CodeBlock
                              lang={section.code.lang}
                              code={section.code.text}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        {prevChapter ? (
          <Link
            to={`/lesson/${prevChapter.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
          >
            ← {prevChapter.title}
          </Link>
        ) : (
          <span />
        )}
        {nextChapter && (
          <Link
            to={`/lesson/${nextChapter.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
          >
            {nextChapter.title} →
          </Link>
        )}
      </div>
    </div>
  );
}
