import { Link } from 'react-router-dom';
import type { SubjectDataset, SubjectProgress } from '../types';

interface HomePageProps {
  dataset: SubjectDataset;
  progress: SubjectProgress;
  dueTodayCount: number;
  getChapterDueCount: (chapterId: string) => number;
}

export function HomePage({
  dataset,
  progress,
  dueTodayCount,
  getChapterDueCount,
}: HomePageProps) {
  const totalChapters = dataset.chapters.length;
  const completedCount = progress.completedChapterIds.length;
  const completionPct =
    totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  const totalCards = dataset.chapters.reduce((sum, ch) => sum + ch.cards.length, 0);
  const totalQuestions = dataset.chapters.reduce(
    (sum, ch) => sum + ch.questions.length,
    0,
  );

  const isDbs = dataset.subject === 'dbs';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                isDbs
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              Môn đang chọn: {isDbs ? 'DBS' : 'SE1-2026'}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {dataset.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {totalChapters} chương/bài • {totalCards} flashcards • {totalQuestions} câu hỏi trắc nghiệm
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/flashcards"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Ôn Flashcard ({dueTodayCount} đến hạn)
            </Link>
            <Link
              to="/quiz"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Làm Quiz
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Hoàn thành chương
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {completionPct}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {completedCount}/{totalChapters} chương
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-full transition-all ${
                  isDbs ? 'bg-blue-600' : 'bg-emerald-600'
                }`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Thẻ cần ôn hôm nay
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dueTodayCount}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tổng {totalCards} thẻ trong môn
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Lượt Quiz đã làm
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {progress.quizHistory.length}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Lưu riêng theo từng môn
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Danh sách chương &amp; bài học
          </h2>
          <Link
            to="/issues"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Xem tài liệu nguồn &amp; vấn đề →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {dataset.chapters.map((chapter) => {
            const isCompleted = progress.completedChapterIds.includes(chapter.id);
            const dueCount = getChapterDueCount(chapter.id);
            return (
              <article
                key={chapter.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Bài {chapter.order}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {isCompleted ? 'Đã hoàn thành' : 'Chưa xong'}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-base font-bold text-slate-900 dark:text-white">
                    {chapter.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {chapter.summary.length} mục tóm tắt • {chapter.cards.length} thẻ ({dueCount} đến hạn) • {chapter.questions.length} câu quiz
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Link
                    to={`/lesson/${chapter.id}`}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                  >
                    Đọc bài học
                  </Link>
                  <Link
                    to={`/flashcards?chapter=${encodeURIComponent(chapter.id)}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Flashcard
                  </Link>
                  <Link
                    to={`/quiz?chapter=${encodeURIComponent(chapter.id)}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Quiz
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
