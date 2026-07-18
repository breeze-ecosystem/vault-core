'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { PageTransition } from '@/components/page-transition';
import { OnvifScanPanel } from '@/components/onvif-scan-panel';
import { Radio } from 'lucide-react';

export default function CameraDiscoveryPage() {
  const [scanOpen, setScanOpen] = useState(true);

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Découverte de caméras"
          description="Scannez votre réseau pour détecter les caméras ONVIF"
        />

        <OnvifScanPanel
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onCameraAdded={() => {
            // Refresh will happen in cameras page via navigation
          }}
        />

        {!scanOpen && (
          <div className="flex justify-center py-12">
            <button
              onClick={() => setScanOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/30"
            >
              <Radio className="h-4 w-4 text-primary" />
              Lancer un nouveau scan
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
