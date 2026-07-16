'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { AIGridBackground } from './ai-grid-background';
import { ScrollIndicator } from './scroll-indicator';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070912]">
      <AIGridBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-4xl font-bold leading-tight text-white sm:text-[40px] lg:text-[56px]"
        >
          AI-Powered Physical Security Intelligence
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/70 sm:text-xl sm:leading-relaxed lg:text-[24px]"
        >
          Correlate every access event, door alert, and camera feed in one
          unified platform — with real-time AI analysis.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/contact">
            <Button variant="primary" size="xl" className="px-10">
              Book a Demo
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary" size="xl" className="border-white/20 text-white/80 hover:border-primary hover:text-primary">
              Talk to Sales
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-sm text-white/50"
        >
          Trusted by 150+ security teams worldwide
        </motion.p>
      </div>

      <ScrollIndicator />
    </section>
  );
}
