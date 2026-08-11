'use client';

import { useEffect, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { ChevronDown, Headset, LayoutGrid, User, Clock, ArrowUp, UserX, Inbox } from 'lucide-react';
import {
  filterTicketsByView,
  useTicketStore,
  getEffectiveViewsSidebarWidth,
  VIEWS_SIDEBAR_COLLAPSE_THRESHOLD,
  VIEWS_SIDEBAR_COLLAPSED_WIDTH,
  type ViewKey,
} from '@/store/ticket-store';

type ViewItem = {
  key: ViewKey;
  label: string;
  icon: ElementType;
};

const PRIMARY_VIEWS: ViewItem[] = [
  { key: 'my_tickets', label: 'Mes tickets', icon: User },
  { key: 'past_due', label: 'En retard', icon: Clock },
  { key: 'high_priority', label: 'Priorité haute', icon: ArrowUp },
  { key: 'unassigned', label: 'Non assignés', icon: UserX },
  { key: 'all_tickets', label: 'Tous les tickets', icon: Inbox },
];

function ResizeHandle({
  currentWidth,
  isCollapsed,
  onResize,
}: {
  currentWidth: number;
  isCollapsed: boolean;
  onResize: (width: number) => void;
}) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      if (!dragState.current) return;
      const delta = event.clientX - dragState.current.startX;
      onResize(dragState.current.startWidth + delta);
    }
    function handleMouseUp() {
      if (!dragState.current) return;
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize]);

  function startDrag(event: React.MouseEvent) {
    event.preventDefault();
    dragState.current = {
      startX: event.clientX,
      startWidth: isCollapsed ? VIEWS_SIDEBAR_COLLAPSED_WIDTH : currentWidth,
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div
      onMouseDown={startDrag}
      title="Glisser pour redimensionner"
      className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize hover:bg-blue-400/40 active:bg-blue-400/60"
    />
  );
}

export function ViewsSidebar() {
  const [isPrimaryOpen, setIsPrimaryOpen] = useState(true);
  const tickets = useTicketStore((state) => state.tickets);
  const activeView = useTicketStore((state) => state.activeView);
  const setActiveView = useTicketStore((state) => state.setActiveView);
  const currentUserId = useTicketStore((state) => state.currentUser?.id ?? null);
  const viewsSidebarWidth = useTicketStore((state) => state.viewsSidebarWidth);
  const setViewsSidebarWidth = useTicketStore((state) => state.setViewsSidebarWidth);

  const isCollapsed = viewsSidebarWidth <= VIEWS_SIDEBAR_COLLAPSE_THRESHOLD;
  const effectiveWidth = getEffectiveViewsSidebarWidth(viewsSidebarWidth);

  function countFor(view: ViewKey) {
    return filterTicketsByView(tickets, view, currentUserId).length;
  }

  function renderItem(item: ViewItem) {
    const isActive = activeView === item.key;
    const count = countFor(item.key);

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setActiveView(item.key)}
        className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]'
            : 'font-medium text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
        }`}
      >
        <span className="truncate">{item.label}</span>
        <span
          className={`min-w-9 rounded-full px-2.5 py-1 text-center text-xs font-semibold tabular-nums transition-colors duration-150 ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-100'
          }`}
        >
          {count.toLocaleString('en-US')}
        </span>
      </button>
    );
  }

  if (isCollapsed) {
    return (
      <aside
        style={{ width: effectiveWidth }}
        className="relative flex h-full shrink-0 flex-col items-center border-r border-slate-200 bg-slate-100 py-4"
      >
        <nav className="flex flex-col items-center gap-1.5">
          {PRIMARY_VIEWS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => setActiveView(item.key)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]'
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                }`}
              >
                <Icon size={17} />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-slate-200 pt-3">
          <button
            type="button"
            title="Chats en direct"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-white hover:text-slate-700"
          >
            <Headset size={17} />
          </button>
          <button
            type="button"
            title="Tableaux"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-white hover:text-slate-700"
          >
            <LayoutGrid size={17} />
          </button>
        </div>

        <ResizeHandle currentWidth={viewsSidebarWidth} isCollapsed={isCollapsed} onResize={setViewsSidebarWidth} />
      </aside>
    );
  }

  return (
    <aside
      style={{ width: effectiveWidth }}
      className="relative flex h-full shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4"
    >
      <div className="flex flex-col rounded-[20px] bg-[#f4f6f9] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        <button
          type="button"
          onClick={() => setIsPrimaryOpen((prev) => !prev)}
          aria-expanded={isPrimaryOpen}
          className="flex w-full items-center gap-2.5 rounded-xl bg-[#e8edf3] px-3 py-2.5 text-left"
        >
          <ChevronDown
            size={13}
            className={`text-slate-500 transition-transform duration-200 ${
              isPrimaryOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600">
            Vues des tickets
          </span>
        </button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            isPrimaryOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <nav className="flex flex-col gap-2.5 px-2 pb-2 pt-3">
              {PRIMARY_VIEWS.map(renderItem)}
            </nav>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 px-2 pt-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          >
            <Headset size={16} className="shrink-0 text-slate-500" />
            <span>Chats en direct</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-700 hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
          >
            <LayoutGrid size={16} className="shrink-0 text-slate-500" />
            <span>Tableaux</span>
          </button>
        </div>
      </div>

      <ResizeHandle currentWidth={viewsSidebarWidth} isCollapsed={isCollapsed} onResize={setViewsSidebarWidth} />
    </aside>
  );
}
