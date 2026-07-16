'use client';

import { useState, useMemo } from 'react';
import { BlogGrid } from '@/components/blog/blog-grid';
import { BlogCategoryFilter } from '@/components/blog/blog-category-filter';
import { BlogPagination } from '@/components/blog/blog-pagination';
import type { Post } from '@/.velite';

const POSTS_PER_PAGE = 9;

interface BlogIndexClientProps {
  posts: Post[];
  categories: string[];
  locale: string;
}

export function BlogIndexClient({
  posts,
  categories,
}: BlogIndexClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPosts = useMemo(() => {
    return activeCategory
      ? posts.filter((post) => post.category === activeCategory)
      : posts;
  }, [posts, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE,
  );

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Category Filter */}
      {categories.length > 0 && (
        <BlogCategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {/* Blog Grid */}
      {filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted">
            No posts found in this category.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10">
            <BlogGrid posts={paginatedPosts} />
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12">
              <BlogPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
