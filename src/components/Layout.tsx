import { NavLink, Outlet } from 'react-router-dom';
import type { SubjectId } from '../types';

interface LayoutProps {
  subject: SubjectId;
  onSubjectChange: (subject: SubjectId) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/flashcards', label: 'Flashcard', end: false },
  { to: '/quiz', label: 'Quiz', end: false },
  { to: '/search', label: 'Tìm kiếm', end: false },
  { to: '/progress', label: 'Tiến độ', end: false },
  { to: '/issues', label: 'Vấn đề & Nguồn', end: false },
];

export function Layout({
  subject,
  onSubjectChange,
  darkMode,
  onToggleDark,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <NavLink
              to="/"
              className="flex items-center gap-2 font-bold tracking-tight text-slate-900 dark:text-white"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
                ÔT
              </span>
              <span className="text-base sm:text-lg">Study Hub</span>
            </NavLink>

            <div
              role="group"
              aria-label="Chọn môn học"
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                type="button"
                onClick={() => onSubjectChange('dbs')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition sm:text-sm ${
                  subject === 'dbs'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                DBS
              </button>
              <button
                type="button"
                onClick={() => onSubjectChange('se1')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition sm:text-sm ${
                  subject === 'se1'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                SE1-2026
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1" aria-label="Điều hướng chính">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              onClick={onToggleDark}
              aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {darkMode ? 'Sáng' : 'Tối'}
            </button>
          </div>
        </div>

        <nav
          aria-label="Điều hướng di động"
          className="flex md:hidden items-center gap-1 overflow-x-auto border-t border-slate-200 px-3 py-2 dark:border-slate-800"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60 py-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        Ôn thi cá nhân (Local-only) • Nội dung bám sát 100% tài liệu môn học DBS &amp; SE1-2026
      </footer>
    </div>
  );
}
