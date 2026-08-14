function progressColorClass(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 60) return 'bg-blue-500';
  if (percent >= 30) return 'bg-amber-500';
  return 'bg-gray-400';
}

export function ProjectProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${progressColorClass(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-gray-500">{clamped}%</span>
    </div>
  );
}
