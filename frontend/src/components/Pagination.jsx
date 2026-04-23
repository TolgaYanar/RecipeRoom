import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push('...');
  }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  const btnBase = 'w-9 h-9 rounded-lg text-[14px] flex items-center justify-center transition-all';
  const activeBtn = `${btnBase} bg-[#1B3A2D] text-white font-semibold`;
  const inactiveBtn = `${btnBase} border border-[#EBEBEB] text-[#1A1A1A] hover:bg-[#FAF8F5]`;
  const arrowBtn = `${btnBase} border border-[#EBEBEB] text-[#6B6B6B] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div className="flex items-center gap-1.5">
      <button
        className={arrowBtn}
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {pages.map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-[14px] text-[#9E9E9E]">
            …
          </span>
        ) : (
          <button
            key={p}
            className={p === page ? activeBtn : inactiveBtn}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className={arrowBtn}
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
