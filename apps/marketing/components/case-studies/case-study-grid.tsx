import { useTranslations } from 'next-intl';
import { CaseStudyCard } from '@/components/case-studies/case-study-card';
import { AnimatedSection } from '@/components/ui/animated-section';

interface CaseStudyGridProps {
  caseStudies: Array<{
    title: string;
    excerpt: string;
    slug: string;
    industry: string;
    client: string;
  }>;
}

export function CaseStudyGrid({ caseStudies }: CaseStudyGridProps) {
  const t = useTranslations('caseStudies');

  if (caseStudies.length === 0) {
    return (
      <AnimatedSection>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 text-muted-light">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-foreground">
            {t('empty')}
          </h2>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {caseStudies.map((study, index) => (
        <CaseStudyCard
          key={study.slug}
          title={study.title}
          excerpt={study.excerpt}
          slug={study.slug}
          industry={study.industry}
          client={study.client}
          index={index}
        />
      ))}
    </div>
  );
}
