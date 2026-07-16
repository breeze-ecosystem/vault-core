import { BlogCard } from './blog-card';
import type { Post } from '@/.velite';

interface BlogRelatedPostsProps {
  posts: Post[];
  currentSlug: string;
}

export function BlogRelatedPosts({ posts, currentSlug }: BlogRelatedPostsProps) {
  const related = posts
    .filter((post) => post.slug !== currentSlug)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section>
      <h2 className="mb-8 text-2xl font-semibold text-foreground">
        Related Posts
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((post) => (
          <BlogCard key={`${post.locale}-${post.slug}`} post={post} />
        ))}
      </div>
    </section>
  );
}
