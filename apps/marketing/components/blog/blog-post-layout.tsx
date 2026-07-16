import { MDXContent } from '@/components/mdx-content';
import { BlogAuthor } from './blog-author';
import { BlogShareLinks } from './blog-share-links';
import { BlogRelatedPosts } from './blog-related-posts';
import type { Post } from '@/.velite';

interface BlogPostLayoutProps {
  post: Post;
  relatedPosts: Post[];
}

export function BlogPostLayout({ post, relatedPosts }: BlogPostLayoutProps) {
  const readTime = Math.max(1, Math.ceil((post.content?.length ?? 0) / 200));

  return (
    <article>
      {/* Article Header */}
      <header className="mb-12">
        {/* Category Badge + Date + Read time */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {post.category}
          </span>
          <time dateTime={post.date} className="text-muted">
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {readTime > 0 && (
            <>
              <span aria-hidden="true" className="text-muted-light">&middot;</span>
              <span className="text-muted">{readTime} min read</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-6 text-[40px] font-semibold leading-[1.1] text-foreground max-sm:text-[24px] sm:max-lg:text-[32px]">
          {post.title}
        </h1>

        {/* Author */}
        <BlogAuthor
          name="Oversight AI Team"
          role="Product Team"
        />
      </header>

      {/* Featured Image Placeholder */}
      <div className="mb-12 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="flex h-full items-center justify-center text-primary/20">
          <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
      </div>

      {/* Article Body (Prose) */}
      <div className="prose prose-lg prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-pre:bg-dark prose-pre:text-dark-foreground prose-pre:border prose-pre:border-border">
        <MDXContent code={post.content} />
      </div>

      {/* Share Links */}
      <div className="mb-16 mt-12 border-t border-border pt-6">
        <BlogShareLinks />
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="mb-16 border-t border-border pt-12">
          <BlogRelatedPosts posts={relatedPosts} currentSlug={post.slug} />
        </div>
      )}
    </article>
  );
}
