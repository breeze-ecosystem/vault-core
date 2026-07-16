"use client";

import { type OrganizationBranding } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface BrandingPreviewCardProps {
  branding: OrganizationBranding;
}

export function BrandingPreviewCard({ branding }: BrandingPreviewCardProps) {
  const primaryColor = branding.primaryColor || "#06b6d4";
  const displayName = branding.displayName || "OVERSIGHT AI";

  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ backgroundColor: primaryColor }} />
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={displayName}
              className="h-12 w-12 rounded-lg object-contain"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {displayName.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-semibold">{displayName}</p>
            <p className="text-sm text-muted-foreground" style={{ color: primaryColor }}>
              {primaryColor}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
