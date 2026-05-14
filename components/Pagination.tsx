import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({ total, page, perPage, onPageChange, onPerPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.min((page - 1) * perPage + 1, total);
  const end = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Tampilkan</span>
        <select
          value={perPage}
          onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          className="appearance-none bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
        >
          {PER_PAGE_OPTIONS.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">per halaman</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 mr-1">
          {total === 0 ? '0' : `${start}–${end}`} dari {total}
        </span>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {/* Page numbers — show max 5 */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1]) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`dot-${i}`} className="px-1 text-slate-300 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                  page === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800'
                }`}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
