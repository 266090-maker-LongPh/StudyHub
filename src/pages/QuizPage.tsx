import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SourceBadge } from '../components/SourceBadge';
import type { QuizAttempt, QuizQuestion, SubjectDataset } from '../types';

interface QuizPageProps {
  dataset: SubjectDataset;
  onRecordAttempt: (attempt: QuizAttempt) => void;
}

interface QuestionWithChapter extends QuizQuestion {
  chapterId: string;
  chapterTitle: string;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function QuizPage({ dataset, onRecordAttempt }: QuizPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('chapter') || 'mixed';
  const [sessionSeed, setSessionSeed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const questions = useMemo<QuestionWithChapter[]>(() => {
    const pool: QuestionWithChapter[] = [];
    for (const ch of dataset.chapters) {
      if (modeParam !== 'mixed' && ch.id !== modeParam) continue;
      for (const q of ch.questions) {
        pool.push({
          ...q,
          chapterId: ch.id,
          chapterTitle: ch.title,
        });
      }
    }
    if (modeParam === 'mixed') {
      return shuffleArray(pool).slice(0, Math.min(15, pool.length));
    }
    return pool;
    // sessionSeed deliberately forces re-shuffle when starting a new random attempt
  }, [dataset, modeParam, sessionSeed]);

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
  }, [dataset.subject, modeParam, sessionSeed]);

  const handleModeChange = (value: string) => {
    if (value === 'mixed') {
      searchParams.delete('chapter');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ chapter: value });
    }
  };

  const handleSubmit = () => {
    if (questions.length === 0 || submitted) return;
    let score = 0;
    const wrongChapters = new Set<string>();
    for (const q of questions) {
      if (answers[q.id] === q.answer) {
        score += 1;
      } else {
        wrongChapters.add(q.chapterId);
      }
    }
    setSubmitted(true);

    const chapterObj = dataset.chapters.find((c) => c.id === modeParam);
    onRecordAttempt({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      chapterId: modeParam,
      chapterTitle:
        modeParam === 'mixed'
          ? 'Trộn ngẫu nhiên'
          : chapterObj?.title || modeParam,
      score,
      total: questions.length,
      timestamp: new Date().toISOString(),
      wrongChapterIds: Array.from(wrongChapters),
    });
  };

  const answeredCount = Object.keys(answers).length;
  const correctCount = submitted
    ? questions.filter((q) => answers[q.id] === q.answer).length
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Quiz trắc nghiệm — {dataset.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {questions.length} câu hỏi • Kèm giải thích và trích nguồn slide/lab
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Chọn phạm vi quiz"
            value={modeParam}
            onChange={(e) => handleModeChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="mixed">Trộn ngẫu nhiên (15 câu)</option>
            {dataset.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Bài {ch.order}: {ch.title} ({ch.questions.length} câu)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSessionSeed((s) => s + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Làm đề mới
          </button>
        </div>
      </div>

      {submitted && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40">
          <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Kết quả bài làm
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {correctCount} / {questions.length} câu đúng (
            {questions.length > 0
              ? Math.round((correctCount / questions.length) * 100)
              : 0}
            %)
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Xem chi tiết đáp án và giải thích ở từng câu bên dưới.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const selectedOption = answers[q.id];
          return (
            <article
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">
                  Câu {idx + 1} • {q.chapterTitle}
                </span>
                <SourceBadge source={q.source} compact />
              </div>

              <h2 className="mt-2.5 text-sm font-bold leading-relaxed text-slate-900 dark:text-white sm:text-base">
                {q.stem}
              </h2>

              <div className="mt-3 space-y-2">
                {q.options.map((opt, optIdx) => {
                  const isPicked = selectedOption === optIdx;
                  const isRight = q.answer === optIdx;
                  let styleClass =
                    'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70';

                  if (submitted) {
                    if (isRight) {
                      styleClass =
                        'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200';
                    } else if (isPicked && !isRight) {
                      styleClass =
                        'border-rose-500 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-200';
                    }
                  } else if (isPicked) {
                    styleClass =
                      'border-blue-600 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-100';
                  }

                  return (
                    <label
                      key={`${q.id}-${optIdx}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs sm:text-sm transition ${styleClass}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={isPicked}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                        }
                        className="mt-0.5"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {submitted && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Giải thích:{' '}
                  </span>
                  {q.explanation}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {questions.length > 0 && !submitted && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Đã chọn {answeredCount} / {questions.length} câu
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Nộp bài &amp; Chấm điểm
          </button>
        </div>
      )}
    </div>
  );
}
