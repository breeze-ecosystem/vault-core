import { SolutionCard } from './solution-card';
import { AnimatedSection } from '@/components/ui/animated-section';

interface SolutionGridProps {
  solutions: Array<{
    title: string;
    description: string;
    href: string;
    industry: string;
  }>;
}

export function SolutionGrid({ solutions }: SolutionGridProps) {
  return (
    <AnimatedSection>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {solutions.map((solution, index) => (
          <SolutionCard
            key={solution.href}
            title={solution.title}
            description={solution.description}
            href={solution.href}
            industry={solution.industry}
            index={index}
          />
        ))}
      </div>
    </AnimatedSection>
  );
}
