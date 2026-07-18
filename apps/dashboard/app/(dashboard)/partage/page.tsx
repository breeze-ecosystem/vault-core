"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { PageTransition } from "@/components/page-transition";
import { StreamShareSheet } from "@/components/stream-share-sheet";
import {
  getShares,
  createShare,
  revokeShare,
  fetchCameras,
  type Camera,
  type ShareLink,
} from "@/lib/api";

export default function PartagePage() {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [sharesData, camerasData] = await Promise.all([
        getShares(),
        fetchCameras({ limit: 100 }),
      ]);
      setShares(sharesData || []);
      setCameras(
        (camerasData?.data || []).map((c: Camera) => ({ id: c.id, name: c.name })),
      );
    } catch {
      // Silent fail — fallback to empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async (data: { cameraIds: string[]; durationMinutes: number }) => {
    const share = await createShare(data);
    setShares((prev) => [...prev, share]);
  };

  const handleRevoke = async (id: string) => {
    await revokeShare(id);
    setShares((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "revoked" as const } : s)),
    );
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Partage de flux"
          description="Générez et gérez les liens de partage de vos caméras"
        />
        <StreamShareSheet
          cameras={cameras}
          shares={shares}
          loading={loading}
          onGenerate={handleGenerate}
          onRevoke={handleRevoke}
        />
      </div>
    </PageTransition>
  );
}
