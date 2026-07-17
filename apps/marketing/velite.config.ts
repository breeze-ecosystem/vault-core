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
    caseStudies: {
      name: 'CaseStudy',
      pattern: 'content/case-studies/**/*.mdx',
      schema: s.object({
        title: s.string().max(100),
        slug: s.slug('case-studies'),
        date: s.isodate(),
        locale: s.string(),
        industry: s.string(),
        client: s.string(),
        excerpt: s.excerpt(),
        cover: s.image().optional(),
        results: s.array(s.object({
          metric: s.string(),
          value: s.string(),
        })).optional(),
        content: s.mdx(),
        metadata: s.metadata(),
      }),
    },
  },
}) as unknown as Record<string, unknown>;
