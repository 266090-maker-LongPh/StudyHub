import { Link, useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { SourceBadge } from '../components/SourceBadge';
import type { SubjectDataset } from '../types';

interface LessonPageProps {
  dataset: SubjectDataset;
  completedChapterIds: string[];
  onToggleChapterComplete: (chapterId: string) => void;
}

export function LessonPage({
  dataset,
  completedChapterIds,
  onToggleChapterComplete,
}: LessonPageProps) {
  const { chapterId } = useParams<{ chapterId: string }>();
  const chapterIndex = dataset.chapters.findIndex((c) => c.id === chapterId);
  const chapter = chapterIndex >= 0 ? dataset.chapters[chapterIndex] : undefined;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          ← Quay lại danh sách chương
        </Link>

        <button
          type="button"
          onClick={() => onToggleChapterComplete(chapter.id)}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            isCompleted
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          {isCompleted ? '✓ Đã hoàn thành chương' : 'Đánh dấu đã học xong'}
        </button>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {dataset.name} • Bài {chapter.order}
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          {chapter.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {chapter.sources.map((src, idx) => (
            <SourceBadge key={`${src.file}-${idx}`} source={src} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to={`/flashcards?chapter=${encodeURIComponent(chapter.id)}`}
            className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Ôn {chapter.cards.length} Flashcard chương này
          </Link>
          <Link
            to={`/quiz?chapter=${encodeURIComponent(chapter.id)}`}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Làm {chapter.questions.length} câu Quiz chương này
          </Link>
        </div>
      </header>

      <div className="space-y-4">
        {chapter.summary.map((section, index) => (
          <section
            key={`${section.h}-${index}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {section.h}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {section.text}
            </p>
            {section.code && (
              <CodeBlock lang={section.code.lang} code={section.code.text} />
            )}
          </section>
        ))}
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
