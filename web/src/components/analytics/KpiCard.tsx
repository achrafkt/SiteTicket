import type { ElementType } from 'react';

type KpiCardProps = {
  label: string;
  value: string;
  icon: ElementType;
  tone?: 'default' | 'danger';
};

export function KpiCard({ label, value, icon: Icon, tone = 'default' }: KpiCardProps) {
  return (
    <div className="flex-1 min-w-[168px] rounded-[10px] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <Icon size={16} className={tone === 'danger' ? 'text-red-500' : 'text-gray-300'} />
      </div>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
