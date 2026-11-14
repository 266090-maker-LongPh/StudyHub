import { useMemo, useState } from 'react';
import MiniSearch from 'minisearch';
import { useNavigate } from 'react-router-dom';
import type { SubjectDataset, SubjectId } from '../types';

interface SearchPageProps {
  datasets: Record<SubjectId, SubjectDataset>;
  activeSubject: SubjectId;
  onSelectSubject: (subject: SubjectId) => void;
}

interface SearchDoc {
  id: string;
  subject: SubjectId;
  subjectLabel: string;
  kind: 'lesson' | 'card' | 'quiz';
  chapterId: string;
  chapterTitle: string;
  sectionIndex?: number;
  title: string;
  body: string;
  sourceText: string;
}

function flattenSectionText(sec: SubjectDataset['chapters'][number]['summary'][number]): string {
  const parts: string[] = [sec.text];
  if (sec.code?.text) parts.push(sec.code.text);
  if (sec.digest) {
    parts.push(...sec.digest.keyPoints);
    if (sec.digest.terms) {
      parts.push(...sec.digest.terms.map((t) => `${t.term}: ${t.meaning}`));
    }
    if (sec.digest.pitfalls) {
      parts.push(...sec.digest.pitfalls);
    }
  }
  if (sec.slides) {
    for (const sl of sec.slides) {
      parts.push(`${sl.slideNumber} ${sl.title}`);
      if (sl.paragraphs) parts.push(...sl.paragraphs);
      if (sl.bullets) {
        for (const b of sl.bullets) {
          if (typeof b === 'string') {
            parts.push(b);
          } else {
            parts.push(b.text);
            if (b.subBullets) parts.push(...b.subBullets);
          }
        }
      }
      if (sl.table) {
        if (sl.table.caption) parts.push(sl.table.caption);
        parts.push(sl.table.headers.join(' '));
        parts.push(...sl.table.rows.map((r) => r.join(' ')));
      }
      if (sl.diagramText) parts.push(...sl.diagramText);
      if (sl.diagramNote) parts.push(sl.diagramNote);
      if (sl.explanation) parts.push(...sl.explanation);
      if (sl.code?.text) parts.push(sl.code.text);
    }
  }
  return parts.filter(Boolean).join(' ');
}

export function SearchPage({
  datasets,
  activeSubject,
  onSelectSubject,
}: SearchPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'all' | SubjectId>(activeSubject);

  const { miniSearch, docMap } = useMemo(() => {
    const docs: SearchDoc[] = [];
    const map = new Map<string, SearchDoc>();

    (['dbs', 'se1'] as SubjectId[]).forEach((subj) => {
      const ds = datasets[subj];
      const label = subj === 'dbs' ? 'DBS' : 'SE1-2026';
      for (const ch of ds.chapters) {
        ch.summary.forEach((sec, idx) => {
          const id = `${subj}-sec-${ch.id}-${idx}`;
          const doc: SearchDoc = {
            id,
            subject: subj,
            subjectLabel: label,
            kind: 'lesson',
            chapterId: ch.id,
            chapterTitle: ch.title,
            sectionIndex: idx,
            title: `${ch.title} — ${sec.h}`,
            body: flattenSectionText(sec),
            sourceText: (
              sec.source
                ? [sec.source]
                : sec.slides?.map((sl) => sl.source) ?? ch.sources
            )
              .map((s) => `${s.file} (${s.loc})`)
              .slice(0, 3)
              .join(', '),
          };
          docs.push(doc);
          map.set(id, doc);
        });

        ch.cards.forEach((card) => {
          const id = `${subj}-card-${card.id}`;
          const doc: SearchDoc = {
            id,
            subject: subj,
            subjectLabel: label,
            kind: 'card',
            chapterId: ch.id,
            chapterTitle: ch.title,
            title: `Flashcard: ${card.front}`,
            body: card.back,
            sourceText: `${card.source.file} (${card.source.loc})`,
          };
          docs.push(doc);
          map.set(id, doc);
        });

        ch.questions.forEach((q) => {
          const id = `${subj}-quiz-${q.id}`;
          const doc: SearchDoc = {
            id,
            subject: subj,
            subjectLabel: label,
            kind: 'quiz',
            chapterId: ch.id,
            chapterTitle: ch.title,
            title: `Quiz: ${q.stem}`,
            body: `${q.options.join(' | ')} — ${q.explanation}`,
            sourceText: `${q.source.file} (${q.source.loc})`,
          };
          docs.push(doc);
          map.set(id, doc);
        });
      }
    });

    const ms = new MiniSearch<SearchDoc>({
      fields: ['title', 'body', 'chapterTitle', 'sourceText'],
      storeFields: ['id'],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2,
        boost: { title: 2 },
      },
    });
    ms.addAll(docs);
    return { miniSearch: ms, docMap: map };
  }, [datasets]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const hits = miniSearch.search(trimmed);
    const items: SearchDoc[] = [];
    for (const hit of hits) {
      const doc = docMap.get(String(hit.id));
      if (!doc) continue;
      if (subjectFilter !== 'all' && doc.subject !== subjectFilter) continue;
      items.push(doc);
      if (items.length >= 40) break;
    }
    return items;
  }, [query, subjectFilter, miniSearch, docMap]);

  const handleOpenResult = (doc: SearchDoc) => {
    if (doc.subject !== activeSubject) {
      onSelectSubject(doc.subject);
    }
    if (doc.kind === 'lesson') {
      const hash =
        typeof doc.sectionIndex === 'number' ? `#sec-${doc.sectionIndex}` : '';
      navigate(`/lesson/${doc.chapterId}${hash}`);
    } else if (doc.kind === 'card') {
      navigate(`/flashcards?chapter=${encodeURIComponent(doc.chapterId)}`);
    } else {
      navigate(`/quiz?chapter=${encodeURIComponent(doc.chapterId)}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Tìm kiếm toàn văn (Full-text Search)
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tìm theo khái niệm, SQL/Java snippet, Flashcard hoặc câu hỏi Quiz qua MiniSearch
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập từ khóa (vd: BCNF, Strategy, GROUP BY, Liskov, Trigger...)"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />

          <select
            aria-label="Lọc môn tìm kiếm"
            value={subjectFilter}
            onChange={(e) =>
              setSubjectFilter(e.target.value as 'all' | SubjectId)
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="all">Tất cả môn</option>
            <option value="dbs">Chỉ DBS</option>
            <option value="se1">Chỉ SE1-2026</option>
          </select>
        </div>
      </section>

      {query.trim() === '' ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Nhập từ khóa để tra cứu nhanh trong toàn bộ {docMap.size} mục dữ liệu của DBS và SE1-2026.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Không tìm thấy kết quả phù hợp với &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Hiển thị {results.length} kết quả khớp nhất
          </div>
          {results.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleOpenResult(doc)}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    doc.subject === 'dbs'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {doc.subjectLabel}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {doc.kind === 'lesson'
                    ? 'Bài học'
                    : doc.kind === 'card'
                      ? 'Flashcard'
                      : 'Quiz'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {doc.chapterTitle}
                </span>
              </div>

              <h2 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                {doc.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                {doc.body}
              </p>
              <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Nguồn: {doc.sourceText}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
