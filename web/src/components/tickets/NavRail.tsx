'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  Lightbulb,
  Building2,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import { SettingsMenu } from './SettingsMenu';

const NAV_ITEMS = [
  { key: 'inbox', label: 'Tickets', icon: Inbox, href: '/helpdesk' },
  { key: 'knowledge', label: 'Base de connaissances', icon: Lightbulb, href: '/knowledge' },
  { key: 'projects', label: 'Projets / Chantiers', icon: Building2, href: '/projects' },
  { key: 'boards', label: 'Tableaux', icon: LayoutGrid, href: '/boards' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
] as const;

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center justify-between bg-nav-bg py-4">
      <div className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-nav-bg-active' : 'hover:bg-nav-bg-active/60'
              }`}
            >
              {isActive ? (
                <span className="absolute left-0 h-6 w-1 rounded-r-full bg-nav-accent" />
              ) : null}
              <Icon
                size={20}
                strokeWidth={1.75}
                className={isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}
              />
              <span className="pointer-events-none absolute left-14 z-20 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <SettingsMenu />
    </nav>
  );
}
