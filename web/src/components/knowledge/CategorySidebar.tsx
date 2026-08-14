import type { ElementType } from 'react';
import { BookOpen } from 'lucide-react';
import { CATEGORY_ICONS } from './knowledge-visuals';
import type { KnowledgeArticle, KnowledgeCategory } from '@/types/knowledge';

type CategorySidebarProps = {
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
  activeCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
};

export function CategorySidebar({ categories, articles, activeCategoryId, onSelect }: CategorySidebarProps) {
  function countFor(categoryId: string | null) {
    if (categoryId === null) return articles.length;
    return articles.filter((article) => article.category.id === categoryId).length;
  }

  function renderItem(key: string, label: string, Icon: ElementType, count: number, isActive: boolean, onClick: () => void) {
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
          isActive
            ? 'bg-blue-600 font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.28)]'
            : 'font-medium text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
        }`}
      >
        <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums transition-colors duration-150 ${
            isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-100'
          }`}
        >
          {count}
        </span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col rounded-[20px] bg-slate-100 p-4">
      <div className="flex flex-col gap-1.5 rounded-[20px] bg-[#f4f6f9] px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
          Base de connaissances
        </p>
        {renderItem('all', 'Tous les articles', BookOpen, countFor(null), activeCategoryId === null, () =>
          onSelect(null),
        )}
        {categories.map((category) =>
          renderItem(
            category.id,
            category.name,
            CATEGORY_ICONS[category.code],
            countFor(category.id),
            activeCategoryId === category.id,
            () => onSelect(category.id),
          ),
        )}
      </div>
    </aside>
  );
}
