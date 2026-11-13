import type { CardScheduleState, FlashcardRating } from '../types';

export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  return getLocalDateStr(dt);
}

const QUALITY_MAP: Record<FlashcardRating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * Computes next SM-2 scheduling state for a flashcard.
 * - again (Quên): reset repetitions to 0, due immediately today (interval = 0)
 * - hard  (Khó): first time 1 day, otherwise interval * 1.2
 * - good  (Nhớ): 1 day -> 6 days -> interval * EF
 * - easy  (Dễ): first time 4 days -> 8 days -> interval * EF * 1.3
 */
export function scheduleCardSm2(
  current: CardScheduleState | undefined,
  rating: FlashcardRating,
  now: Date = new Date(),
): CardScheduleState {
  const today = getLocalDateStr(now);
  const prevReps = current?.repetitions ?? 0;
  const prevInterval = current?.interval ?? 0;
  const prevEase = current?.easeFactor ?? 2.5;
  const q = QUALITY_MAP[rating];

  let nextEase =
    prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (nextEase < 1.3) {
    nextEase = 1.3;
  }
  nextEase = Math.round(nextEase * 100) / 100;

  let nextReps: number;
  let nextInterval: number;

  if (rating === 'again') {
    nextReps = 0;
    nextInterval = 0;
  } else if (rating === 'hard') {
    nextReps = prevReps + 1;
    if (prevReps === 0) {
      nextInterval = 1;
    } else if (prevReps === 1) {
      nextInterval = 3;
    } else {
      nextInterval = Math.max(1, Math.round(prevInterval * 1.2));
    }
  } else if (rating === 'good') {
    nextReps = prevReps + 1;
    if (prevReps === 0) {
      nextInterval = 1;
    } else if (prevReps === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.max(1, Math.round(prevInterval * nextEase));
    }
  } else {
    // easy
    nextReps = prevReps + 1;
    if (prevReps === 0) {
      nextInterval = 4;
    } else if (prevReps === 1) {
      nextInterval = 8;
    } else {
      nextInterval = Math.max(2, Math.round(prevInterval * nextEase * 1.3));
    }
  }

  return {
    interval: nextInterval,
    repetitions: nextReps,
    easeFactor: nextEase,
    dueDate: addDaysToDateStr(today, nextInterval),
    lastRating: rating,
    lastReviewedAt: now.toISOString(),
  };
}

export function previewNextIntervals(
  current: CardScheduleState | undefined,
  now: Date = new Date(),
): Record<FlashcardRating, string> {
  const format = (days: number) => (days <= 0 ? 'Hôm nay' : `${days} ngày`);
  return {
    again: format(scheduleCardSm2(current, 'again', now).interval),
    hard: format(scheduleCardSm2(current, 'hard', now).interval),
    good: format(scheduleCardSm2(current, 'good', now).interval),
    easy: format(scheduleCardSm2(current, 'easy', now).interval),
  };
}

export function isCardDueToday(
  state: CardScheduleState | undefined,
  todayStr: string = getLocalDateStr(),
): boolean {
  if (!state) return true;
  return state.dueDate <= todayStr;
}
