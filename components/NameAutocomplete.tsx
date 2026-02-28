import React, { useState, useRef, useEffect } from 'react';
import { Search, User, X } from 'lucide-react';

interface NameAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

/**
 * Custom name autocomplete with a styled dropdown.
 * Replaces native <datalist> which has terrible UX on mobile and long lists.
 * - Shows filtered suggestions as you type (min 1 char)
 * - Highlights the matching part of each suggestion
 * - Keyboard nav: ArrowUp/Down, Enter, Escape
 */
export const NameAutocomplete: React.FC<NameAutocompleteProps> = ({
  value,
  onChange,
  onBlur,
  suggestions,
  placeholder = 'Ketik nama...',
  required,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim().length >= 1
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase().trim())).slice(0, 8)
    : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      select(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // Highlight matching portion in suggestion text
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-blue-100 text-blue-700 rounded font-bold not-italic">{text.slice(idx, idx + query.trim().length)}</mark>
        {text.slice(idx + query.trim().length)}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Input */}
      <div className="relative">
        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          value={value}
          className="w-full pl-9 pr-9 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 bg-white text-sm"
          onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => { if (filtered.length > 0) setOpen(true); }}
          onBlur={() => { onBlur?.(); }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); inputRef.current?.focus(); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 text-xs text-slate-400">
            <Search size={11} />
            <span>{filtered.length} nama ditemukan — pilih atau ketik manual</span>
          </div>
          <ul className="max-h-52 overflow-y-auto divide-y divide-slate-50">
            {filtered.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); select(name); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    i === activeIdx ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <User size={13} className="text-slate-300 shrink-0" />
                  <span className="flex-1 truncate">{highlight(name, value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
