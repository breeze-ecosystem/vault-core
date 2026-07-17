'use client';

import { motion, AnimatePresence } from 'motion/react';
import { GlassPanel } from '@/components/shared/glass-panel';
import { cn } from '@/src/lib/utils';

interface DemoStepData {
  id: string;
  title: string;
  description: string;
  tooltipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  highlightArea?: { x: number; y: number; width: number; height: number };
}

interface DemoStepProps {
  step: DemoStepData;
  isActive: boolean;
}

const tooltipPositionClasses: Record<string, string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

/** Renders step-specific mockup content inside the dashboard-like placeholder */
function MockupContent({ stepId }: { stepId: string }) {
  switch (stepId) {
    case 'access-event':
      return (
        <>
          {/* Sidebar */}
          <div className="flex h-full">
            <div className="w-16 shrink-0 bg-[#070912] flex flex-col items-center gap-3 pt-4">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
              <div className="h-8 w-8 rounded-lg bg-white/5" />
              <div className="h-8 w-8 rounded-lg bg-white/5" />
              <div className="h-8 w-8 rounded-lg bg-white/5" />
            </div>
            {/* Main content */}
            <div className="flex-1 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-400/80 animate-pulse" />
                <div className="h-4 w-40 rounded bg-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                  <div className="h-3 w-20 rounded bg-white/10" />
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-8 w-16 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <span className="text-[10px] text-cyan-400 font-semibold">BADGE</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="h-2 w-24 rounded bg-white/10" />
                      <div className="h-2 w-16 rounded bg-white/5" />
                    </div>
                  </div>
                  <div className="h-2 w-32 rounded bg-white/5 mt-auto" />
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                  <div className="h-3 w-24 rounded bg-white/10" />
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
                    <div className="h-2 w-28 rounded bg-white/10" />
                  </div>
                  <div className="h-2 w-20 rounded bg-white/5" />
                  <div className="h-2 w-16 rounded bg-white/5 mt-auto" />
                </div>
              </div>
            </div>
          </div>
        </>
      );

    case 'video-evidence':
      return (
        <div className="flex h-full">
          <div className="w-16 shrink-0 bg-[#070912] flex flex-col items-center gap-3 pt-4">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-cyan-400/80" />
              <div className="h-4 w-48 rounded bg-white/10" />
            </div>
            <div className="flex gap-3 flex-1">
              {/* Video feed mock */}
              <div className="flex-1 rounded-lg bg-[#050810] border border-white/[0.06] overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-12 mx-auto rounded border border-white/20 flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="h-2 w-24 mx-auto rounded bg-white/10" />
                    <div className="h-2 w-16 mx-auto mt-1 rounded bg-white/5" />
                  </div>
                </div>
                {/* Camera overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-white/60 font-mono">CAM-04</span>
                </div>
                <div className="absolute bottom-2 right-2">
                  <span className="text-[10px] text-white/40 font-mono">00:12:34</span>
                </div>
              </div>
              {/* Event side panel */}
              <div className="w-44 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                  <div className="h-2 w-20 rounded bg-white/10" />
                </div>
                <div className="h-2 w-28 rounded bg-white/5" />
                <div className="h-2 w-24 rounded bg-white/5" />
                <div className="mt-auto h-8 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-[10px] text-cyan-400 font-semibold">VIDEO CORRÉLÉE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'ai-analysis':
      return (
        <div className="flex h-full">
          <div className="w-16 shrink-0 bg-[#070912] flex flex-col items-center gap-3 pt-4">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-violet-400/80" />
              <div className="h-4 w-36 rounded bg-white/10" />
            </div>
            <div className="flex gap-3 flex-1">
              {/* Video feed with AI overlay */}
              <div className="flex-1 rounded-lg bg-[#050810] border border-white/[0.06] overflow-hidden relative">
                {/* Simulated bounding box overlay */}
                <div className="absolute inset-0">
                  <div className="absolute top-1/2 left-1/3 w-24 h-36 border-2 border-amber-400/60 rounded-md">
                    <div className="absolute -top-4 left-0 bg-amber-400/80 px-1.5 py-0.5 rounded-t">
                      <span className="text-[8px] text-black font-bold">TAILGATE 94%</span>
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[10px] text-white/60 font-mono">AI ANALYSE</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="rounded bg-black/60 backdrop-blur px-3 py-2 border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/80">Anomalie détectée</span>
                      <span className="text-[10px] text-amber-400 font-mono">94%</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Analysis panel */}
              <div className="w-44 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="h-2 w-24 rounded bg-white/10" />
                </div>
                <div className="h-2 w-28 rounded bg-white/5" />
                <div className="h-2 w-20 rounded bg-white/5" />
                <div className="mt-2 flex gap-1">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-amber-400/60" />
                  </div>
                </div>
                <div className="h-2 w-16 rounded bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'alert-dispatch':
      return (
        <div className="flex h-full">
          <div className="w-16 shrink-0 bg-[#070912] flex flex-col items-center gap-3 pt-4">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-red-400/80 animate-pulse" />
              <div className="h-4 w-32 rounded bg-white/10" />
            </div>
            <div className="flex gap-3 flex-1">
              {/* Alert list */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded bg-white/10 mb-1" />
                    <div className="h-2 w-48 rounded bg-white/5" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 rounded bg-white/10 px-2 flex items-center">
                        <span className="text-[8px] text-white/60">Mobile</span>
                      </div>
                      <div className="h-5 rounded bg-white/10 px-2 flex items-center">
                        <span className="text-[8px] text-white/60">Dashboard</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-6 rounded bg-cyan-500/20 border border-cyan-500/30 px-2 flex items-center">
                    <span className="text-[9px] text-cyan-400 font-semibold">VOIR</span>
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex items-start gap-3 opacity-60">
                  <div className="h-2 w-2 rounded-full bg-white/20 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-28 rounded bg-white/10 mb-1" />
                    <div className="h-2 w-40 rounded bg-white/5" />
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex items-start gap-3 opacity-40">
                  <div className="h-2 w-2 rounded-full bg-white/20 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded bg-white/10 mb-1" />
                    <div className="h-2 w-36 rounded bg-white/5" />
                  </div>
                </div>
              </div>
              {/* Quick actions */}
              <div className="w-36 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="h-8 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-[10px] text-cyan-400 font-semibold">ACCEPTER</span>
                </div>
                <div className="h-8 rounded bg-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-white/40">Escalader</span>
                </div>
                <div className="h-8 rounded bg-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-white/40">Ignorer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'resolution':
      return (
        <div className="flex h-full">
          <div className="w-16 shrink-0 bg-[#070912] flex flex-col items-center gap-3 pt-4">
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-white/5" />
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30" />
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-400/80" />
              <div className="h-4 w-44 rounded bg-white/10" />
            </div>
            <div className="flex gap-3 flex-1">
              {/* Report mock */}
              <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 rounded bg-white/10" />
                  <div className="h-5 rounded bg-emerald-500/20 border border-emerald-500/30 px-2 flex items-center">
                    <span className="text-[9px] text-emerald-400 font-semibold">RÉSOLU</span>
                  </div>
                </div>
                {/* Timeline */}
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex flex-col items-center">
                        <div className={cn('h-2 w-2 rounded-full mt-1', i === 3 ? 'bg-emerald-400' : 'bg-white/20')} />
                        {i < 3 && <div className="w-px flex-1 bg-white/10" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="h-2 w-40 rounded bg-white/10" />
                        <div className="h-2 w-24 rounded bg-white/5 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="h-2 w-20 rounded bg-white/5" />
                  <div className="h-6 rounded bg-white/10 px-3 flex items-center">
                    <span className="text-[9px] text-white/40">Exporter PDF</span>
                  </div>
                </div>
              </div>
              {/* Summary card */}
              <div className="w-40 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-white/10" />
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[9px] text-white/40">Type</span>
                    <span className="text-[9px] text-white/60">Talonnage</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-white/40">Statut</span>
                    <span className="text-[9px] text-emerald-400">Résolu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-white/40">Temps</span>
                    <span className="text-[9px] text-white/60">2m 34s</span>
                  </div>
                </div>
                <div className="mt-auto h-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-[9px] text-emerald-400">Rapport #0427</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-16 mx-auto rounded bg-white/10 mb-3" />
            <div className="h-3 w-32 mx-auto rounded bg-white/10" />
          </div>
        </div>
      );
  }
}

export function DemoStep({ step, isActive }: DemoStepProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0c1020]"
      >
        {/* Mockup placeholder with step-specific content */}
        <div className="h-full w-full">
          <MockupContent stepId={step.id} />
        </div>

        {/* Tooltip overlay */}
        <div
          className={cn(
            'absolute max-w-xs p-4 backdrop-blur-2xl',
            tooltipPositionClasses[step.tooltipPosition] ?? 'top-4 left-4',
          )}
        >
          <GlassPanel className="p-4">
            <h3 className="text-base font-display text-white font-semibold">
              {step.title}
            </h3>
            <p className="text-sm text-[#94a3b8] mt-1">
              {step.description}
            </p>
          </GlassPanel>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
