'use client';

import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { Section } from '@/components/layout/section';
import { AnimatedSection } from '@/components/ui/animated-section';
import { TestimonialCard } from './testimonial-card';

const TESTIMONIALS = [
  {
    quote:
      'Oversight Hub a transformé notre gestion de la sécurité sur nos 12 sites. La corrélation IA entre les événements d\'accès et la vidéo change la donne pour notre équipe d\'exploitation.',
    author: 'Sarah Chen',
    role: 'Directrice de la Sécurité',
    company: 'MetroTech Industries',
  },
  {
    quote:
      'Nous avons évalué six plateformes avant de choisir Oversight Hub. Le déploiement auto-hébergé et l\'IA sur site ont été des facteurs décisifs pour nos exigences de conformité.',
    author: 'James Rodriguez',
    role: 'RSSI',
    company: 'DataGuard Financial',
  },
  {
    quote:
      'L\'application mobile pour agents nous a fait gagner des heures par quart de travail. Pointage, signalement d\'incidents et contrôle des portes depuis un seul appareil.',
    author: 'Émilie Nakamura',
    role: 'Responsable des Opérations',
    company: 'Pacific Security Solutions',
  },
];

export function TestimonialCarousel() {
  const t = useTranslations('testimonials');

  return (
    <Section variant="default">
      <Container>
        <AnimatedSection>
          <h2 className="mb-16 text-center font-display text-[32px] text-[#f1f5f9]">
            {t('heading')}
          </h2>
        </AnimatedSection>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <AnimatedSection key={testimonial.author} delay={index * 0.1}>
              <TestimonialCard
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                company={testimonial.company}
              />
            </AnimatedSection>
          ))}
        </div>
      </Container>
    </Section>
  );
}
