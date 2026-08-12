'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Avatar } from './Avatar';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  dotClassName?: string;
  initials?: string;
  avatarUrl?: string | null;
  icon?: React.ElementType;
  iconClassName?: string;
  iconBgClassName?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type DropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
  placeholder?: string;
};

function OptionIndicator({ option }: { option: DropdownOption }) {
  if (option.icon) {
    const Icon = option.icon;
    if (option.iconBgClassName) {
      return (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${option.iconBgClassName}`}
        >
          <Icon size={13} className={option.iconClassName ?? 'text-gray-500'} strokeWidth={2.5} />
        </span>
      );
    }
    return <Icon size={15} className={`shrink-0 ${option.iconClassName ?? 'text-gray-400'}`} strokeWidth={2.5} />;
  }
  if (option.initials) {
    return <Avatar initials={option.initials} avatarUrl={option.avatarUrl} />;
  }
  if (option.dotClassName) {
    return <span className={`h-2 w-2 shrink-0 rounded-full transition-colors ${option.dotClassName}`} />;
  }
  return null;
}

export function Dropdown({
  value,
  options,
  onChange,
  className = '',
  disabled = false,
  title,
  placeholder = '—',
}: DropdownProps) {
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
    <div className={`relative ${className}`} ref={ref} title={disabled ? title : undefined}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex w-full items-center gap-2 rounded-lg border bg-white pl-3 pr-2 py-2 text-left transition-all duration-150 ${
          disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-70'
            : open
              ? 'border-blue-500 ring-2 ring-blue-100'
              : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selected ? <OptionIndicator option={selected} /> : null}
        <span className="w-full min-w-0 truncate text-sm font-medium text-gray-700">
          {selected?.label ?? placeholder}
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
                disabled={option.disabled}
                title={option.disabled ? option.disabledReason : undefined}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  option.disabled
                    ? 'cursor-not-allowed opacity-50'
                    : isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mt-0.5">
                  <OptionIndicator option={option} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                    {isActive ? <Check size={14} className="shrink-0 text-blue-600" /> : null}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-xs font-normal text-gray-400">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}