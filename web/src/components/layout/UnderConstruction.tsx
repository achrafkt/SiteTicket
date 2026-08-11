import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';

interface UnderConstructionProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function UnderConstruction({
  icon: Icon = Construction,
  title,
  description = 'Cette section est en cours de développement.',
}: UnderConstructionProps) {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-nav-bg-active/10">
          <Icon size={24} strokeWidth={1.75} className="text-nav-accent" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
