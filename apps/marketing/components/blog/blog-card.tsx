import type { Post } from '@/.velite';
import { GlassPanel } from '@/components/shared/glass-panel';

interface BlogCardProps {
  post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
  const readTime = Math.max(1, Math.ceil((post.content?.length ?? 0) / 200));

  return (
    <GlassPanel as="article" hover className="group relative flex flex-col overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="absolute inset-0 flex items-center justify-center text-primary/30">
          <svg
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-102" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Category Badge */}
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {post.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-display text-white">
          <a
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 hover:text-primary transition-colors"
          >
            {post.title}
          </a>
        </h3>

        {/* Excerpt */}
        <p className="mb-4 flex-1 text-sm text-[#94a3b8]">
          {post.excerpt}
        </p>

        {/* Date + Read time */}
        <div className="flex items-center gap-3 text-xs text-[#64748b]">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </time>
          {readTime > 0 && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{readTime} min read</span>
            </>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
