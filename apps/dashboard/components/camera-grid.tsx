"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { containerVariants, itemVariants } from "@/components/page-transition";
import { CameraCardPremium } from "@/components/camera-card-premium";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Video, Plus } from "lucide-react";
import Link from "next/link";

interface CameraGridProps {
  cameras: Array<{
    id: string;
    name: string;
    status: string;
    lastSnapshotUrl?: string | null;
    site?: { name: string } | null;
  }>;
  loading?: boolean;
  emptyMessage?: string;
  filter?: (camera: any) => boolean;
  className?: string;
}

export function CameraGrid({
  cameras,
  loading = false,
  emptyMessage = "Aucune caméra enregistrée",
  filter,
  className,
}: CameraGridProps) {
  const filtered = filter ? cameras.filter(filter) : cameras;

  if (loading) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden border bg-card">
            <Skeleton className="aspect-video rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Video className="h-12 w-12 text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        <Link href="/cameras?action=add">
          <Button variant="outline" size="sm" className="mt-3 gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une caméra
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}
    >
      {filtered.map((camera) => (
        <CameraCardPremium key={camera.id} camera={camera} />
      ))}
    </motion.div>
  );
}
