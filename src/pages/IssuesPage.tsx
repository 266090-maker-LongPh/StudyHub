import { useState } from 'react';
import type { FileReport, IssuesReport, SubjectId } from '../types';

interface IssuesPageProps {
  issues: IssuesReport;
  fileReport: FileReport;
  activeSubject: SubjectId;
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  'readable-pdf': {
    label: 'PDF đọc được',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  readable: {
    label: 'Văn bản đọc được',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
  'image-only': {
    label: 'Chỉ có ảnh / Cần xác nhận',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  image: {
    label: 'Ảnh chụp màn hình',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  'reference-skipped': {
    label: 'Sách tham khảo (Bỏ qua)',
    cls: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  'manual-skip': {
    label: 'Bỏ qua theo yêu cầu',
    cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function IssuesPage({
  issues,
  fileReport,
  activeSubject,
}: IssuesPageProps) {
  const [filterSubject, setFilterSubject] = useState<'all' | SubjectId>(
    activeSubject,
  );

  const filteredIssues = issues.items.filter((item) =>
    filterSubject === 'all' ? true : item.subject === filterSubject,
  );

  const subjectKeys: SubjectId[] =
    filterSubject === 'all' ? ['dbs', 'se1'] : [filterSubject];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Vấn đề cần xác nhận &amp; Kiểm toán tài liệu nguồn
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Liệt kê mọi file scan/ảnh mờ, nội dung mâu thuẫn, hoặc file bỏ qua để đảm bảo 100% bám sát tài liệu gốc
          </p>
        </div>

        <select
          aria-label="Lọc theo môn"
          value={filterSubject}
          onChange={(e) =>
            setFilterSubject(e.target.value as 'all' | SubjectId)
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="all">Tất cả môn</option>
          <option value="dbs">Chỉ DBS</option>
          <option value="se1">Chỉ SE1-2026</option>
        </select>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          1. Danh sách vấn đề / nội dung chưa xác nhận ({filteredIssues.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredIssues.map((issue) => (
            <article
              key={issue.id}
              className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold uppercase text-amber-800 dark:text-amber-300">
                  {issue.subject === 'dbs' ? 'DBS' : 'SE1-2026'}
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {issue.id}
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                {issue.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {issue.detail}
              </p>
              <div className="mt-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                Tài liệu liên quan: {issue.source}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            2. Bảng kiểm toán toàn bộ file nguồn
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Cập nhật ingest: {new Date(fileReport.generatedAt).toLocaleString('vi-VN')}
          </span>
        </div>

        {subjectKeys.map((subj) => {
          const info = fileReport.subjects[subj];
          return (
            <div
              key={subj}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                {info.name} ({info.total} files)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Tên file</th>
                      <th className="px-4 py-2.5 font-semibold">Dung lượng</th>
                      <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                      <th className="px-4 py-2.5 font-semibold">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {info.files.map((f) => {
                      const badge = STATUS_BADGES[f.status] || {
                        label: f.status,
                        cls: 'bg-slate-100 text-slate-700',
                      };
                      return (
                        <tr key={f.file}>
                          <td className="px-4 py-2.5 font-mono text-slate-800 dark:text-slate-200">
                            {f.file}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {formatBytes(f.size)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {f.note}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
