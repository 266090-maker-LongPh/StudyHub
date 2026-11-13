import { addDaysToDateStr, getLocalDateStr } from './sm2';
import type {
  CardScheduleState,
  QuizAttempt,
  SubjectId,
  SubjectProgress,
} from '../types';

const SUBJECT_KEYS: Record<SubjectId, string> = {
  dbs: 'studyhub_progress_dbs_v1',
  se1: 'studyhub_progress_se1_v1',
};

const META_UPDATED_KEY = 'studyhub_progress_updated_at_v1';

export function emptyProgress(): SubjectProgress {
  return {
    completedChapterIds: [],
    cards: {},
    quizHistory: [],
    studyDates: [],
  };
}

function isValidCardState(val: unknown): val is CardScheduleState {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.interval === 'number' &&
    typeof obj.repetitions === 'number' &&
    typeof obj.easeFactor === 'number' &&
    typeof obj.dueDate === 'string'
  );
}

function isValidQuizAttempt(val: unknown): val is QuizAttempt {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.chapterId === 'string' &&
    typeof obj.chapterTitle === 'string' &&
    typeof obj.score === 'number' &&
    typeof obj.total === 'number' &&
    typeof obj.timestamp === 'string' &&
    Array.isArray(obj.wrongChapterIds)
  );
}

export function sanitizeProgress(raw: unknown): SubjectProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const completedChapterIds = Array.isArray(obj.completedChapterIds)
    ? Array.from(
        new Set(obj.completedChapterIds.filter((x): x is string => typeof x === 'string')),
      )
    : [];

  const cards: Record<string, CardScheduleState> = {};
  if (obj.cards && typeof obj.cards === 'object' && !Array.isArray(obj.cards)) {
    for (const [k, v] of Object.entries(obj.cards as Record<string, unknown>)) {
      if (isValidCardState(v)) {
        cards[k] = v;
      }
    }
  }

  const quizHistory = Array.isArray(obj.quizHistory)
    ? obj.quizHistory.filter(isValidQuizAttempt)
    : [];

  const studyDates = Array.isArray(obj.studyDates)
    ? Array.from(
        new Set(
          obj.studyDates.filter(
            (x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x),
          ),
        ),
      ).sort()
    : [];

  return {
    completedChapterIds,
    cards,
    quizHistory,
    studyDates,
  };
}

export function hasAnyProgress(p: SubjectProgress): boolean {
  return (
    p.completedChapterIds.length > 0 ||
    Object.keys(p.cards).length > 0 ||
    p.quizHistory.length > 0 ||
    p.studyDates.length > 0
  );
}

export function loadSubjectProgressLocal(subject: SubjectId): SubjectProgress {
  try {
    const raw = localStorage.getItem(SUBJECT_KEYS[subject]);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    return sanitizeProgress(parsed) ?? emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function loadAllProgressLocal(): Record<SubjectId, SubjectProgress> {
  return {
    dbs: loadSubjectProgressLocal('dbs'),
    se1: loadSubjectProgressLocal('se1'),
  };
}

export function getLocalUpdatedAt(): string | null {
  try {
    return localStorage.getItem(META_UPDATED_KEY);
  } catch {
    return null;
  }
}

export function saveAllProgressLocal(
  all: Record<SubjectId, SubjectProgress>,
  updatedAt: string,
): void {
  try {
    localStorage.setItem(SUBJECT_KEYS.dbs, JSON.stringify(all.dbs));
    localStorage.setItem(SUBJECT_KEYS.se1, JSON.stringify(all.se1));
    localStorage.setItem(META_UPDATED_KEY, updatedAt);
  } catch {
    // Ignore localStorage quota / private browsing errors
  }
}

export interface WorkspaceSnapshot {
  version: 1;
  updatedAt: string;
  dbs: SubjectProgress;
  se1: SubjectProgress;
}

export async function fetchWorkspaceSnapshot(): Promise<{
  available: boolean;
  exists: boolean;
  snapshot: WorkspaceSnapshot | null;
}> {
  try {
    const res = await fetch('/api/local-storage', { cache: 'no-store' });
    if (!res.ok) {
      return { available: false, exists: false, snapshot: null };
    }
    const payload = (await res.json()) as {
      exists?: boolean;
      data?: Record<string, unknown> | null;
    };
    if (!payload.exists || !payload.data) {
      return { available: true, exists: false, snapshot: null };
    }
    const dbs = sanitizeProgress(payload.data.dbs);
    const se1 = sanitizeProgress(payload.data.se1);
    const updatedAt =
      typeof payload.data.updatedAt === 'string'
        ? payload.data.updatedAt
        : new Date().toISOString();
    if (!dbs || !se1) {
      return { available: true, exists: false, snapshot: null };
    }
    return {
      available: true,
      exists: true,
      snapshot: { version: 1, updatedAt, dbs, se1 },
    };
  } catch {
    return { available: false, exists: false, snapshot: null };
  }
}

export async function pushWorkspaceSnapshot(
  all: Record<SubjectId, SubjectProgress>,
  updatedAt: string,
): Promise<boolean> {
  try {
    const body: WorkspaceSnapshot = {
      version: 1,
      updatedAt,
      dbs: all.dbs,
      se1: all.se1,
    };
    const res = await fetch('/api/local-storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function recordStudyActivity(
  studyDates: string[],
  todayStr: string = getLocalDateStr(),
): string[] {
  if (studyDates.includes(todayStr)) return studyDates;
  return [...studyDates, todayStr].sort();
}

export function calculateStreak(
  studyDates: string[],
  todayStr: string = getLocalDateStr(),
): number {
  if (studyDates.length === 0) return 0;
  const dateSet = new Set(studyDates);
  const yesterdayStr = addDaysToDateStr(todayStr, -1);

  let cursor: string;
  if (dateSet.has(todayStr)) {
    cursor = todayStr;
  } else if (dateSet.has(yesterdayStr)) {
    cursor = yesterdayStr;
  } else {
    return 0;
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateStr(cursor, -1);
  }
  return streak;
}

export function exportSubjectBackupJson(
  subject: SubjectId,
  progress: SubjectProgress,
): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      subject,
      progress,
    },
    null,
    2,
  );
}

export function exportAllBackupJson(
  all: Record<SubjectId, SubjectProgress>,
): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      dbs: all.dbs,
      se1: all.se1,
    },
    null,
    2,
  );
}

export function parseImportBackupJson(
  raw: string,
  activeSubject: SubjectId,
):
  | {
      ok: true;
      updates: Partial<Record<SubjectId, SubjectProgress>>;
      message: string;
    }
  | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: 'File JSON không đúng định dạng đối tượng.' };
    }

    // Format 1: single-subject export { version: 1, subject, progress }
    if (
      (parsed.subject === 'dbs' || parsed.subject === 'se1') &&
      parsed.progress
    ) {
      const target = parsed.subject as SubjectId;
      const clean = sanitizeProgress(parsed.progress);
      if (!clean) {
        return { ok: false, message: 'Dữ liệu progress trong file không hợp lệ.' };
      }
      if (target !== activeSubject) {
        return {
          ok: true,
          updates: { [target]: clean },
          message: `Đã nhập tiến độ cho môn ${target.toUpperCase()} (tách riêng khỏi môn ${activeSubject.toUpperCase()}).`,
        };
      }
      return {
        ok: true,
        updates: { [target]: clean },
        message: `Đã khôi phục tiến độ môn ${target.toUpperCase()} thành công.`,
      };
    }

    // Format 2: combined workspace/all export { dbs, se1 }
    if (parsed.dbs && parsed.se1) {
      const dbsClean = sanitizeProgress(parsed.dbs);
      const se1Clean = sanitizeProgress(parsed.se1);
      if (!dbsClean || !se1Clean) {
        return {
          ok: false,
          message: 'File backup tổng hợp thiếu hoặc sai định dạng dbs/se1.',
        };
      }
      return {
        ok: true,
        updates: { dbs: dbsClean, se1: se1Clean },
        message: 'Đã khôi phục tiến độ cho cả hai môn (DBS & SE1-2026).',
      };
    }

    // Format 3: raw single SubjectProgress object -> apply to activeSubject only
    if (
      'completedChapterIds' in parsed ||
      'cards' in parsed ||
      'quizHistory' in parsed
    ) {
      const clean = sanitizeProgress(parsed);
      if (!clean) {
        return { ok: false, message: 'Không phân tích được dữ liệu tiến độ.' };
      }
      return {
        ok: true,
        updates: { [activeSubject]: clean },
        message: `Đã nhập dữ liệu vào môn ${activeSubject.toUpperCase()}.`,
      };
    }

    return {
      ok: false,
      message: 'Không nhận diện được cấu trúc backup JSON hợp lệ.',
    };
  } catch {
    return { ok: false, message: 'File JSON bị lỗi cú pháp, không thể đọc.' };
  }
}
