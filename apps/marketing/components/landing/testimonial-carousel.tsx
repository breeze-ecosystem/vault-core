'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { TestimonialCard } from './testimonial-card';
import { cn } from '@/src/lib/utils';

const TESTIMONIALS = [
  {
    quote:
      'Oversight Hub transformed how we manage security across our 12 facilities. The AI correlation between access events and video is a game-changer for our operations team.',
    name: 'Sarah Chen',
    role: 'Director of Security',
    company: 'MetroTech Industries',
  },
  {
    quote:
      'We evaluated six platforms before choosing Oversight Hub. The self-hosted deployment and on-premise AI were decisive factors for our compliance requirements.',
    name: 'James Rodriguez',
    role: 'CISO',
    company: 'DataGuard Financial',
  },
  {
    quote:
      'The guard mobile app alone saved us hours per shift. Check-in, incident reporting, and door control all from one device — exactly what our field teams needed.',
    name: 'Emily Nakamura',
    role: 'Operations Manager',
    company: 'Pacific Security Solutions',
  },
];

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [[direction, page], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    const nextIndex =
      (activeIndex + newDirection + TESTIMONIALS.length) % TESTIMONIALS.length;
    setActiveIndex(nextIndex);
    setPage([newDirection, page + 1]);
  };

  const goToSlide = (index: number) => {
    const dir = index > activeIndex ? 1 : -1;
    setActiveIndex(index);
    setPage([dir, page + 1]);
  };

  return (
    <Section variant="default">
      <Container>
        <AnimatedSection>
          <h2 className="mb-16 text-center text-3xl font-bold text-foreground sm:text-[36px]">
            Trusted by security teams like yours
          </h2>
        </AnimatedSection>

        <div className="relative">
          <AnimatePresence mode="wait" custom={{ direction }}>
            <motion.div
              key={page}
              custom={{ direction }}
              variants={{
                enter: ({ direction }: { direction: number }) => ({
                  x: direction > 0 ? 200 : -200,
                  opacity: 0,
                }),
                center: {
                  x: 0,
                  opacity: 1,
                },
                exit: ({ direction }: { direction: number }) => ({
                  x: direction > 0 ? -200 : 200,
                  opacity: 0,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <TestimonialCard testimonial={TESTIMONIALS[activeIndex]} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Previous testimonial"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => paginate(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Next testimonial"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Dots navigation (user-controlled, no autoplay) */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {TESTIMONIALS.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-all duration-200',
                index === activeIndex
                  ? 'bg-primary w-8'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
              )}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
