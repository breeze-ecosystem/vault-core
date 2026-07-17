import type { ReactNode } from 'react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { GlassPanel } from '@/components/shared/glass-panel';

interface CaseStudyLayoutProps {
  children: ReactNode;
  title: string;
  client: string;
  industry: string;
  results?: Array<{ metric: string; value: string }>;
}

export function CaseStudyLayout({
  children,
  title,
  client,
  industry,
  results,
}: CaseStudyLayoutProps) {
  return (
    <>
      {/* Hero Section */}
      <Section variant="dark" className="relative overflow-hidden pt-32 pb-16">
        {/* Gradient background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
        <Container className="relative">
          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              {industry}
            </span>
            <h1 className="mt-3 text-[40px] font-display font-semibold leading-[1.1] text-white max-sm:text-[28px]">
              {title}
            </h1>
            <p className="mt-4 text-lg text-[#94a3b8]">
              {client}
            </p>
          </div>
        </Container>
      </Section>

      {/* Content Section */}
      <Section variant="alt">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Main content (8 cols) */}
            <div className="lg:col-span-8">
              <div className="prose prose-lg prose-invert max-w-none prose-headings:font-display prose-headings:font-semibold prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-pre:bg-[#0c1020] prose-pre:border prose-pre:border-white/10 prose-strong:text-white">
                {children}
              </div>
            </div>

            {/* Sidebar (4 cols) */}
            <aside className="lg:col-span-4">
              {/* Client info */}
              <GlassPanel className="mb-6 p-6">
                <dl>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
                    Client
                  </dt>
                  <dd className="mt-1 text-sm text-white">
                    {client}
                  </dd>
                </dl>
              </GlassPanel>

              {/* Results panel */}
              {results && results.length > 0 && (
                <GlassPanel className="p-6">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-green-400">
                    Résultats clés
                  </h3>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div key={index}>
                        <div className="text-2xl font-display font-semibold text-cyan-400">
                          {result.value}
                        </div>
                        <div className="mt-1 text-sm text-[#94a3b8]">
                          {result.metric}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              )}
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
