import { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';

hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);

interface CodeBlockProps {
  lang: 'sql' | 'java';
  code: string;
}

export function CodeBlock({ lang, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language: lang }).value;
    } catch {
      return code;
    }
  }, [code, lang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <span className="uppercase tracking-wider">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded px-2 py-0.5 text-xs transition hover:bg-slate-200 dark:hover:bg-slate-800"
        >
          {copied ? 'Đã chép' : 'Sao chép'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-xs leading-relaxed sm:text-sm">
        <code
          className={`hljs language-${lang}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
