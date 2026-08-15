'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { TicketType } from '@/types/ticket';

type CreateColumnTicketMenuProps = {
  types: TicketType[];
  statusName: string;
  onSelectType: (typeId: string) => void;
};

// Per-column "+" trigger, mirrors AppHeader's "Créer" type-picker popover but
// pre-fills the column's status once a type is chosen (see onSelectType).
export function CreateColumnTicketMenu({ types, statusName, onSelectType }: CreateColumnTicketMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={`Créer un ticket dans "${statusName}"`}
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
      >
        <Plus size={15} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-[0_18px_36px_rgba(15,23,42,0.16)]">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Type de ticket
          </p>
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setOpen(false);
                onSelectType(type.id);
              }}
              className="flex w-full items-center px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              {type.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
