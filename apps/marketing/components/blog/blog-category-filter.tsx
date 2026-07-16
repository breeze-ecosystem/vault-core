'use client';

import { cn } from '@/src/lib/utils';

interface BlogCategoryFilterProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const categoryLabels: Record<string, string> = {
  'changelog': 'Changelog',
  'security': 'Security Insights',
  'product-updates': 'Product Updates',
};

export function BlogCategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: BlogCategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Blog category filter">
      {/* All Posts */}
      <button
        onClick={() => onCategoryChange(null)}
        className={cn(
          'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
          activeCategory === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-muted hover:text-foreground hover:bg-border',
        )}
        aria-pressed={activeCategory === null}
      >
        All Posts
      </button>

      {/* Category Pills */}
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
            activeCategory === category
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted hover:text-foreground hover:bg-border',
          )}
          aria-pressed={activeCategory === category}
        >
          {categoryLabels[category] ?? category}
        </button>
      ))}
    </div>
  );
}
