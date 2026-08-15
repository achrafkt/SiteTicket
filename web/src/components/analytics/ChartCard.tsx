import type { ReactNode } from 'react';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, subtitle, children, className = '' }: ChartCardProps) {
  return (
    <div
      className={`rounded-[10px] bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function ChartEmptyState({ message = 'Aucune donnée pour cette période.' }: { message?: string }) {
  return <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-400">{message}</div>;
}
