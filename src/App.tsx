import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import {
  loadAllDatasets,
  loadFileReport,
  loadIssuesReport,
} from './data/loader';
import {
  getLocalDateStr,
  isCardDueToday,
  scheduleCardSm2,
} from './lib/sm2';
import {
  calculateStreak,
  emptyProgress,
  exportAllBackupJson,
  exportSubjectBackupJson,
  fetchWorkspaceSnapshot,
  getLocalUpdatedAt,
  hasAnyProgress,
  loadAllProgressLocal,
  parseImportBackupJson,
  pushWorkspaceSnapshot,
  recordStudyActivity,
  saveAllProgressLocal,
} from './lib/storage';
import { FlashcardPage } from './pages/FlashcardPage';
import { HomePage } from './pages/HomePage';
import { IssuesPage } from './pages/IssuesPage';
import { LessonPage } from './pages/LessonPage';
import { ProgressPage } from './pages/ProgressPage';
import { QuizPage } from './pages/QuizPage';
import { SearchPage } from './pages/SearchPage';
import type {
  FileReport,
  FlashcardRating,
  IssuesReport,
  QuizAttempt,
  SubjectDataset,
  SubjectId,
  SubjectProgress,
} from './types';

export function App() {
  const [subject, setSubject] = useState<SubjectId>(() => {
    try {
      const saved = localStorage.getItem('studyhub_active_subject');
      return saved === 'se1' ? 'se1' : 'dbs';
    } catch {
      return 'dbs';
    }
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studyhub_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [datasets, setDatasets] = useState<Record<
    SubjectId,
    SubjectDataset
  > | null>(null);
  const [issues, setIssues] = useState<IssuesReport | null>(null);
  const [fileReport, setFileReport] = useState<FileReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [progressBySubject, setProgressBySubject] = useState<
    Record<SubjectId, SubjectProgress>
  >(() => loadAllProgressLocal());
  const [workspaceSynced, setWorkspaceSynced] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('studyhub_active_subject', subject);
    } catch {
      // Ignore storage errors
    }
  }, [subject]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('studyhub_theme', darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    let active = true;
    Promise.all([loadAllDatasets(), loadIssuesReport(), loadFileReport()])
      .then(([ds, iss, rep]) => {
        if (!active) return;
        setDatasets(ds);
        setIssues(iss);
        setFileReport(rep);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu học tập.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  // Synchronize browser localStorage with workspace storage/progress.json (when Vite dev/preview server is running)
  useEffect(() => {
    let active = true;
    fetchWorkspaceSnapshot().then(async (res) => {
      if (!active || !res.available) return;

      const localSnapshot = loadAllProgressLocal();
      const localUpdatedAt = getLocalUpdatedAt();
      const localHasData =
        hasAnyProgress(localSnapshot.dbs) || hasAnyProgress(localSnapshot.se1);

      if (res.exists && res.snapshot) {
        const remote = res.snapshot;
        const remoteHasData =
          hasAnyProgress(remote.dbs) || hasAnyProgress(remote.se1);

        const shouldHydrateFromWorkspace =
          (!localHasData && remoteHasData) ||
          (remote.updatedAt &&
            (!localUpdatedAt || remote.updatedAt > localUpdatedAt));

        if (shouldHydrateFromWorkspace) {
          const next = { dbs: remote.dbs, se1: remote.se1 };
          saveAllProgressLocal(next, remote.updatedAt);
          if (active) setProgressBySubject(next);
        } else if (
          localHasData &&
          localUpdatedAt &&
          (!remote.updatedAt || localUpdatedAt > remote.updatedAt)
        ) {
          await pushWorkspaceSnapshot(localSnapshot, localUpdatedAt);
        }
        if (active) setWorkspaceSynced(true);
      } else {
        const initTs = localUpdatedAt || new Date(0).toISOString();
        const ok = await pushWorkspaceSnapshot(localSnapshot, initTs);
        if (active && ok) setWorkspaceSynced(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const updateAndPersistProgress = useCallback(
    (
      updater: (
        prev: Record<SubjectId, SubjectProgress>,
      ) => Record<SubjectId, SubjectProgress>,
    ) => {
      setProgressBySubject((prev) => {
        const next = updater(prev);
        const nowIso = new Date().toISOString();
        saveAllProgressLocal(next, nowIso);
        void pushWorkspaceSnapshot(next, nowIso).then((ok) => {
          if (ok) setWorkspaceSynced(true);
        });
        return next;
      });
    },
    [],
  );

  const activeDataset = datasets ? datasets[subject] : null;
  const activeProgress = progressBySubject[subject];
  const todayStr = getLocalDateStr();

  const isCardDue = useCallback(
    (cardId: string) => isCardDueToday(activeProgress.cards[cardId], todayStr),
    [activeProgress.cards, todayStr],
  );

  const getChapterDueCount = useCallback(
    (chapterId: string) => {
      if (!activeDataset) return 0;
      const ch = activeDataset.chapters.find((c) => c.id === chapterId);
      if (!ch) return 0;
      return ch.cards.filter((card) =>
        isCardDueToday(activeProgress.cards[card.id], todayStr),
      ).length;
    },
    [activeDataset, activeProgress.cards, todayStr],
  );

  const dueTodayCount = useMemo(() => {
    if (!activeDataset) return 0;
    return activeDataset.chapters.reduce(
      (sum, ch) =>
        sum +
        ch.cards.filter((card) =>
          isCardDueToday(activeProgress.cards[card.id], todayStr),
        ).length,
      0,
    );
  }, [activeDataset, activeProgress.cards, todayStr]);

  const streakDays = useMemo(
    () => calculateStreak(activeProgress.studyDates, todayStr),
    [activeProgress.studyDates, todayStr],
  );

  const handleToggleChapterComplete = (chapterId: string) => {
    updateAndPersistProgress((prev) => {
      const cur = prev[subject];
      const exists = cur.completedChapterIds.includes(chapterId);
      const nextCompleted = exists
        ? cur.completedChapterIds.filter((id) => id !== chapterId)
        : [...cur.completedChapterIds, chapterId];
      const nextStudyDates = exists
        ? cur.studyDates
        : recordStudyActivity(cur.studyDates, getLocalDateStr());
      return {
        ...prev,
        [subject]: {
          ...cur,
          completedChapterIds: nextCompleted,
          studyDates: nextStudyDates,
        },
      };
    });
  };

  const handleRateCard = (cardId: string, rating: FlashcardRating) => {
    const now = new Date();
    const nowLocalDate = getLocalDateStr(now);
    updateAndPersistProgress((prev) => {
      const cur = prev[subject];
      const nextCardState = scheduleCardSm2(cur.cards[cardId], rating, now);
      return {
        ...prev,
        [subject]: {
          ...cur,
          cards: {
            ...cur.cards,
            [cardId]: nextCardState,
          },
          studyDates: recordStudyActivity(cur.studyDates, nowLocalDate),
        },
      };
    });
  };

  const handleRecordAttempt = (attempt: QuizAttempt) => {
    const nowLocalDate = getLocalDateStr();
    updateAndPersistProgress((prev) => {
      const cur = prev[subject];
      return {
        ...prev,
        [subject]: {
          ...cur,
          quizHistory: [...cur.quizHistory, attempt],
          studyDates: recordStudyActivity(cur.studyDates, nowLocalDate),
        },
      };
    });
  };

  const handleImportJson = (raw: string) => {
    const result = parseImportBackupJson(raw, subject);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }
    updateAndPersistProgress((prev) => ({
      ...prev,
      ...result.updates,
    }));
    return { ok: true, message: result.message };
  };

  const handleResetSubject = () => {
    updateAndPersistProgress((prev) => ({
      ...prev,
      [subject]: emptyProgress(),
    }));
  };

  const weakChapters = useMemo(() => {
    if (!activeDataset) return [];
    const counts = new Map<string, number>();
    for (const attempt of activeProgress.quizHistory) {
      for (const chId of attempt.wrongChapterIds) {
        counts.set(chId, (counts.get(chId) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([chapterId, wrongCount]) => ({
        chapterId,
        title:
          activeDataset.chapters.find((c) => c.id === chapterId)?.title ||
          chapterId,
        wrongCount,
      }))
      .sort((a, b) => b.wrongCount - a.wrongCount);
  }, [activeDataset, activeProgress.quizHistory]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-rose-700 dark:text-rose-400">
            Lỗi tải dữ liệu
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!datasets || !activeDataset || !issues || !fileReport) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Đang tải dữ liệu DBS &amp; SE1-2026...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <Layout
              subject={subject}
              onSubjectChange={setSubject}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode((d) => !d)}
            />
          }
        >
          <Route
            path="/"
            element={
              <HomePage
                dataset={activeDataset}
                progress={activeProgress}
                dueTodayCount={dueTodayCount}
                getChapterDueCount={getChapterDueCount}
              />
            }
          />
          <Route
            path="/lesson/:chapterId"
            element={
              <LessonPage
                dataset={activeDataset}
                completedChapterIds={activeProgress.completedChapterIds}
                onToggleChapterComplete={handleToggleChapterComplete}
              />
            }
          />
          <Route
            path="/flashcards"
            element={
              <FlashcardPage
                dataset={activeDataset}
                cardStates={activeProgress.cards}
                isCardDue={isCardDue}
                onRateCard={handleRateCard}
              />
            }
          />
          <Route
            path="/quiz"
            element={
              <QuizPage
                dataset={activeDataset}
                onRecordAttempt={handleRecordAttempt}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchPage
                datasets={datasets}
                activeSubject={subject}
                onSelectSubject={setSubject}
              />
            }
          />
          <Route
            path="/progress"
            element={
              <ProgressPage
                dataset={activeDataset}
                progress={activeProgress}
                streakDays={streakDays}
                weakChapters={weakChapters}
                workspaceSynced={workspaceSynced}
                onExportSubjectJson={() =>
                  exportSubjectBackupJson(subject, activeProgress)
                }
                onExportAllJson={() => exportAllBackupJson(progressBySubject)}
                onImportJson={handleImportJson}
                onResetSubject={handleResetSubject}
              />
            }
          />
          <Route
            path="/issues"
            element={
              <IssuesPage
                issues={issues}
                fileReport={fileReport}
                activeSubject={subject}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
