'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string;
  dotClassName?: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function Dropdown({ value, options, onChange, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex w-full items-center gap-2 rounded-lg border bg-white pl-3 pr-2 py-2 text-left transition-all duration-150 ${
          open
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selected?.dotClassName ? (
          <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${selected.dotClassName}`} />
        ) : null}
        <span className="w-full min-w-0 truncate text-sm font-medium text-gray-700">
          {selected?.label ?? '—'}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180 text-blue-500' : ''}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-[0_12px_28px_rgba(15,23,42,0.14)]">
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.dotClassName ? (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClassName}`} />
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                {isActive ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}