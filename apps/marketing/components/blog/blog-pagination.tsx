'use client';

import { cn } from '@/src/lib/utils';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function BlogPagination({
  currentPage,
  totalPages,
  onPageChange,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const maxVisible = 5;

  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav aria-label="Blog pagination" className="flex items-center justify-center gap-1">
      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          currentPage <= 1
            ? 'text-muted-light cursor-not-allowed'
            : 'text-muted hover:text-foreground hover:bg-secondary',
        )}
        aria-label="Previous page"
      >
        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Previous
      </button>

      {/* Page numbers */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors',
            page === currentPage
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:text-foreground hover:bg-secondary',
          )}
          aria-current={page === currentPage ? 'page' : undefined}
          aria-label={`Page ${page}`}
        >
          {page}
        </button>
      ))}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={cn(
          'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          currentPage >= totalPages
            ? 'text-muted-light cursor-not-allowed'
            : 'text-muted hover:text-foreground hover:bg-secondary',
        )}
        aria-label="Next page"
      >
        Next
        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
