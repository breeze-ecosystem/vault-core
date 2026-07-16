import { defineConfig, s } from 'velite';

export default defineConfig({
  collections: {
    posts: {
      name: 'Post',
      pattern: 'content/blog/**/*.mdx',
      schema: s.object({
        title: s.string().max(100),
        slug: s.slug('posts'),
        date: s.isodate(),
        locale: s.string(),
        category: s.string(),
        excerpt: s.excerpt(),
        cover: s.image().optional(),
        tags: s.array(s.string()).optional(),
        content: s.mdx(),
        metadata: s.metadata(),
      }),
    },
  },
}) as unknown as Record<string, unknown>;
