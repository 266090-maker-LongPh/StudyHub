import { useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import type { SubjectDataset, SubjectProgress } from '../types';

interface ProgressPageProps {
  dataset: SubjectDataset;
  progress: SubjectProgress;
  streakDays: number;
  weakChapters: { chapterId: string; title: string; wrongCount: number }[];
  workspaceSynced: boolean;
  onExportSubjectJson: () => string;
  onExportAllJson: () => string;
  onImportJson: (raw: string) => { ok: boolean; message: string };
  onResetSubject: () => void;
}

export function ProgressPage({
  dataset,
  progress,
  streakDays,
  weakChapters,
  workspaceSynced,
  onExportSubjectJson,
  onExportAllJson,
  onImportJson,
  onResetSubject,
}: ProgressPageProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const recentAttempts = progress.quizHistory.slice(-10);
  const reviewedCardCount = Object.keys(progress.cards).length;
  const totalCardCount = dataset.chapters.reduce(
    (sum, ch) => sum + ch.cards.length,
    0,
  );

  const triggerDownload = (json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = onImportJson(text);
    setImportStatus(result);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Tiến độ học tập — {dataset.name}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu từng môn tách biệt hoàn toàn, lưu trong `localStorage` và{' '}
            {workspaceSynced ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                đồng bộ tại storage/progress.json trong workspace
              </span>
            ) : (
              <span>chỉ trên trình duyệt hiện tại</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                onExportSubjectJson(),
                `study-progress-${dataset.subject}-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
            className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Export môn này
          </button>
          <button
            type="button"
            onClick={() =>
              triggerDownload(
                onExportAllJson(),
                `study-progress-all-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Export cả 2 môn
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40"
            >
              Xóa tiến độ môn
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetSubject();
                  setConfirmReset(false);
                }}
                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </section>

      {importStatus && (
        <div
          className={`rounded-xl border p-3 text-xs font-medium ${
            importStatus.ok
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          {importStatus.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Chuỗi ngày học (Streak)
          </div>
          <div className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {streakDays} ngày
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tổng số ngày hoạt động: {progress.studyDates.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Flashcard đã chạm tới
          </div>
          <div className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
            {reviewedCardCount} / {totalCardCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Đã hoàn thành {progress.completedChapterIds.length}/{dataset.chapters.length} chương
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Điểm Quiz gần nhất
          </div>
          <div className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
            {recentAttempts.length > 0
              ? `${Math.round(
                  (recentAttempts[recentAttempts.length - 1].score /
                    Math.max(1, recentAttempts[recentAttempts.length - 1].total)) *
                    100,
                )}%`
              : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tổng {progress.quizHistory.length} bài Quiz đã nộp
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Biểu đồ điểm Quiz (tối đa 10 lượt gần nhất)
        </h2>

        {recentAttempts.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Chưa có dữ liệu điểm Quiz cho môn này. Hãy làm thử một bài ở trang Quiz.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox="0 0 600 180"
              className="h-44 w-full min-w-[360px]"
              role="img"
              aria-label="Biểu đồ cột điểm số các lượt quiz gần nhất"
            >
              <line
                x1="40"
                y1="20"
                x2="40"
                y2="145"
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
              />
              <line
                x1="40"
                y1="145"
                x2="585"
                y2="145"
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
              />
              <text x="8" y="26" fontSize="10" fill="currentColor" className="text-slate-400">
                100%
              </text>
              <text x="14" y="86" fontSize="10" fill="currentColor" className="text-slate-400">
                50%
              </text>
              <text x="18" y="148" fontSize="10" fill="currentColor" className="text-slate-400">
                0%
              </text>
              {recentAttempts.map((attempt, index) => {
                const pct = Math.round(
                  (attempt.score / Math.max(1, attempt.total)) * 100,
                );
                const barHeight = Math.max(4, Math.round((pct / 100) * 120));
                const slotWidth = 530 / recentAttempts.length;
                const barWidth = Math.min(36, slotWidth * 0.6);
                const x = 48 + index * slotWidth + (slotWidth - barWidth) / 2;
                const y = 145 - barHeight;
                return (
                  <g key={attempt.id}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      className="fill-blue-600 dark:fill-blue-500"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      className="font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {pct}%
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="162"
                      textAnchor="middle"
                      fontSize="10"
                      fill="currentColor"
                      className="text-slate-500 dark:text-slate-400"
                    >
                      #{index + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Chủ đề cần ôn lại (Chủ đề yếu)
        </h2>
        {weakChapters.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Chưa ghi nhận chương nào có câu trả lời sai trong các lượt Quiz đã nộp.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {weakChapters.map((item) => (
              <li
                key={item.chapterId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-xs dark:border-rose-900/60 dark:bg-rose-950/20"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </span>
                  <span className="ml-2 text-rose-700 dark:text-rose-300">
                    ({item.wrongCount} lượt sai)
                  </span>
                </div>
                <Link
                  to={`/lesson/${item.chapterId}`}
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Ôn lại bài học →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
