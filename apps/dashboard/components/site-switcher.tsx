"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SiteSwitcherProps {
  sites: Array<{ id: string; name: string }>;
  currentSiteId: string;
  onChange: (id: string) => void;
}

export function SiteSwitcher({ sites, currentSiteId, onChange }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false);

  const currentSite = sites.find((s) => s.id === currentSiteId);
  const displayName = currentSite?.name ?? "Tous les sites";

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-56 justify-between"
      >
        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
        <span className="truncate">{displayName}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg">
            <div className="p-1">
              <button
                onClick={() => { onChange("all"); setOpen(false); }}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50",
                  currentSiteId === "all" && "bg-accent/20 text-accent-foreground",
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentSiteId === "all" ? "opacity-100" : "opacity-0",
                  )}
                />
                Tous les sites
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                  {sites.length}
                </span>
              </button>

              <div className="my-1 border-t border-border" />

              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => { onChange(site.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50",
                    currentSiteId === site.id && "bg-accent/20 text-accent-foreground",
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentSiteId === site.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {site.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
