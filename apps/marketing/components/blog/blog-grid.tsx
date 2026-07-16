import { BlogCard } from './blog-card';
import { AnimatedSection } from '@/components/ui/animated-section';
import type { Post } from '@/.velite';

interface BlogGridProps {
  posts: Post[];
}

export function BlogGrid({ posts }: BlogGridProps) {
  if (posts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, index) => (
        <AnimatedSection key={`${post.locale}-${post.slug}`}>
          <BlogCard post={post} />
        </AnimatedSection>
      ))}
    </div>
  );
}
