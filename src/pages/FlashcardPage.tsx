import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SourceBadge } from '../components/SourceBadge';
import { previewNextIntervals } from '../lib/sm2';
import type {
  CardScheduleState,
  Flashcard,
  FlashcardRating,
  SubjectDataset,
} from '../types';

interface FlashcardPageProps {
  dataset: SubjectDataset;
  cardStates: Record<string, CardScheduleState>;
  isCardDue: (cardId: string) => boolean;
  onRateCard: (cardId: string, rating: FlashcardRating) => void;
}

interface CardWithChapter extends Flashcard {
  chapterId: string;
  chapterTitle: string;
}

const RATING_BUTTONS: {
  rating: FlashcardRating;
  label: string;
  hint: string;
  classes: string;
}[] = [
  {
    rating: 'again',
    label: 'Quên',
    hint: 'Ôn lại sớm',
    classes:
      'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-900/60',
  },
  {
    rating: 'hard',
    label: 'Khó',
    hint: 'Giãn ngắn',
    classes:
      'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/60',
  },
  {
    rating: 'good',
    label: 'Nhớ',
    hint: 'Chuẩn SM-2',
    classes:
      'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200 dark:hover:bg-blue-900/60',
  },
  {
    rating: 'easy',
    label: 'Dễ',
    hint: 'Giãn dài',
    classes:
      'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60',
  },
];

export function FlashcardPage({
  dataset,
  cardStates,
  isCardDue,
  onRateCard,
}: FlashcardPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChapter = searchParams.get('chapter') || 'all';
  const [onlyDue, setOnlyDue] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const allCards = useMemo<CardWithChapter[]>(() => {
    const list: CardWithChapter[] = [];
    for (const ch of dataset.chapters) {
      if (selectedChapter !== 'all' && ch.id !== selectedChapter) continue;
      for (const card of ch.cards) {
        list.push({
          ...card,
          chapterId: ch.id,
          chapterTitle: ch.title,
        });
      }
    }
    if (onlyDue) {
      return list.filter((c) => isCardDue(c.id));
    }
    return list;
  }, [dataset, selectedChapter, onlyDue, isCardDue]);

  useEffect(() => {
    setCurrentIndex(0);
    setFlipped(false);
  }, [dataset.subject, selectedChapter, onlyDue]);

  const safeIndex =
    allCards.length > 0 ? Math.min(currentIndex, allCards.length - 1) : 0;
  const currentCard = allCards[safeIndex];

  const handleChapterChange = (value: string) => {
    if (value === 'all') {
      searchParams.delete('chapter');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ chapter: value });
    }
  };

  const handleRate = (rating: FlashcardRating) => {
    if (!currentCard) return;
    onRateCard(currentCard.id, rating);
    setFlipped(false);
    if (onlyDue && rating !== 'again') {
      if (safeIndex >= allCards.length - 1) {
        setCurrentIndex(0);
      }
      return;
    }
    if (allCards.length > 1) {
      setCurrentIndex((prev) => (prev + 1 < allCards.length ? prev + 1 : 0));
    }
  };

  const currentSchedule = currentCard ? cardStates[currentCard.id] : undefined;
  const nextIntervals = useMemo(
    () => previewNextIntervals(currentSchedule),
    [currentSchedule],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Flashcard — {dataset.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chạm thẻ để lật • Đánh giá 4 mức độ theo thuật toán SM-2
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Lọc theo chương"
            value={selectedChapter}
            onChange={(e) => handleChapterChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Tất cả các chương</option>
            {dataset.chapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                Bài {ch.order}: {ch.title}
              </option>
            ))}
          </select>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700">
            <input
              type="checkbox"
              checked={onlyDue}
              onChange={(e) => setOnlyDue(e.target.checked)}
              className="rounded text-blue-600"
            />
            Chỉ thẻ đến hạn
          </label>
        </div>
      </div>

      {!currentCard ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Không có thẻ nào phù hợp bộ lọc hiện tại.
          </p>
          {onlyDue && (
            <button
              type="button"
              onClick={() => setOnlyDue(false)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Xem toàn bộ thẻ
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Thẻ {safeIndex + 1} / {allCards.length} • {currentCard.chapterTitle}
            </span>
            {currentSchedule && (
              <span>
                Lặp: {currentSchedule.repetitions} • Chu kỳ: {currentSchedule.interval} ngày • Hẹn: {currentSchedule.dueDate}
              </span>
            )}
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Lật flashcard"
            onClick={() => setFlipped((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setFlipped((prev) => !prev);
              }
            }}
            className="perspective-1000 cursor-pointer select-none"
          >
            <div
              className={`relative min-h-[260px] w-full transition-transform duration-500 transform-style-3d ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    Mặt trước (Câu hỏi)
                  </span>
                  <span className="text-xs text-slate-400">Nhấn để xem đáp án</span>
                </div>

                <div className="my-4 text-center text-base font-semibold leading-relaxed text-slate-900 dark:text-white sm:text-lg">
                  {currentCard.front}
                </div>

                <div className="flex justify-center">
                  <SourceBadge source={currentCard.source} compact />
                </div>
              </div>

              {/* Back */}
              <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-2xl border border-blue-200 bg-blue-50/40 p-6 shadow-md dark:border-blue-900 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Mặt sau (Trả lời)
                  </span>
                  <span className="text-xs text-slate-400">Nhấn để lật lại</span>
                </div>

                <div className="my-4 whitespace-pre-line text-center text-sm leading-relaxed text-slate-800 dark:text-slate-200 sm:text-base">
                  {currentCard.back}
                </div>

                <div className="flex justify-center">
                  <SourceBadge source={currentCard.source} compact />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {RATING_BUTTONS.map((btn) => (
              <button
                key={btn.rating}
                type="button"
                onClick={() => handleRate(btn.rating)}
                className={`rounded-xl border px-3 py-2.5 text-center transition ${btn.classes}`}
              >
                <div className="text-sm font-bold">{btn.label}</div>
                <div className="text-[11px] opacity-85">
                  {nextIntervals[btn.rating]}
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setCurrentIndex((prev) =>
                  prev - 1 >= 0 ? prev - 1 : allCards.length - 1,
                );
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              ← Thẻ trước
            </button>
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setCurrentIndex((prev) =>
                  prev + 1 < allCards.length ? prev + 1 : 0,
                );
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              Thẻ tiếp →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
