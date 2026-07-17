import type { ReactNode } from 'react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { GlassPanel } from '@/components/shared/glass-panel';
import { AnimatedSection } from '@/components/ui/animated-section';

interface SolutionDetailLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  challenges: string[];
  outcomes: string[];
}

export function SolutionDetailLayout({
  children,
  title,
  description,
  challenges,
  outcomes,
}: SolutionDetailLayoutProps) {
  return (
    <>
      {/* Hero section */}
      <Section variant="dark" className="pt-32 pb-16 md:pt-40 md:pb-20">
        <Container>
          <AnimatedSection>
            <h1 className="font-display text-[42px] leading-tight text-[#f1f5f9] md:text-[56px]">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8]">
              {description}
            </p>
          </AnimatedSection>
        </Container>
      </Section>

      {/* Content + Sidebar section */}
      <Section variant="alt">
        <Container>
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left: Children content */}
            <div className="lg:col-span-2">{children}</div>

            {/* Right: Sidebar */}
            <aside className="lg:col-span-1">
              {/* Challenges */}
              <GlassPanel className="mb-6 p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  Défis
                </h3>
                <ul className="space-y-3">
                  {challenges.map((challenge, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs text-red-400">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </span>
                      <span className="text-sm text-[#94a3b8]">
                        {challenge}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassPanel>

              {/* Outcomes */}
              <GlassPanel className="p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-green-400">
                  Résultats
                </h3>
                <ul className="space-y-3">
                  {outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-xs text-green-400">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span className="text-sm text-[#94a3b8]">
                        {outcome}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassPanel>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
