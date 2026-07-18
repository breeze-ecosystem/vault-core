"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass-card";
import {
  Search,
  Calendar,
  X,
  Camera,
  ChevronDown,
} from "lucide-react";

export type EventTypeFilter = "all" | "alert" | "motion" | "face" | "system";

export interface TimelineFilters {
  dateRange: "today" | "yesterday" | "custom";
  customFrom?: string;
  customTo?: string;
  eventTypes: EventTypeFilter[];
  cameraId: string;
  search: string;
}

interface CameraOption {
  id: string;
  name: string;
}

interface TimelineFilterBarProps {
  onFilterChange: (filters: TimelineFilters) => void;
  cameras: CameraOption[];
  className?: string;
}

const EVENT_TYPE_LABELS: Record<EventTypeFilter, string> = {
  all: "Tous",
  alert: "Alertes",
  motion: "Mouvement",
  face: "Visage",
  system: "Système",
};

const DATE_PRESETS: { key: TimelineFilters["dateRange"]; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "yesterday", label: "Hier" },
  { key: "custom", label: "Personnalisé" },
];

export function TimelineFilterBar({
  onFilterChange,
  cameras,
  className,
}: TimelineFilterBarProps) {
  const [dateRange, setDateRange] = useState<TimelineFilters["dateRange"]>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [eventTypes, setEventTypes] = useState<EventTypeFilter[]>(["all"]);
  const [cameraId, setCameraId] = useState("");
  const [search, setSearch] = useState("");
  const [showDateCustom, setShowDateCustom] = useState(false);

  const emitChange = useCallback(
    (overrides: Partial<TimelineFilters>) => {
      const filters: TimelineFilters = {
        dateRange,
        customFrom: dateRange === "custom" ? customFrom : undefined,
        customTo: dateRange === "custom" ? customTo : undefined,
        eventTypes,
        cameraId,
        search,
        ...overrides,
      };
      onFilterChange(filters);
    },
    [dateRange, customFrom, customTo, eventTypes, cameraId, search, onFilterChange],
  );

  function handleDatePreset(key: TimelineFilters["dateRange"]) {
    setDateRange(key);
    setShowDateCustom(key === "custom");
    emitChange({ dateRange: key });
  }

  function toggleEventType(type: EventTypeFilter) {
    let next: EventTypeFilter[];
    if (type === "all") {
      next = ["all"];
    } else {
      const withoutAll = eventTypes.filter((t) => t !== "all");
      if (withoutAll.includes(type)) {
        next = withoutAll.filter((t) => t !== type);
        if (next.length === 0) next = ["all"];
      } else {
        next = [...withoutAll, type];
      }
    }
    setEventTypes(next);
    emitChange({ eventTypes: next });
  }

  function handleCameraChange(id: string) {
    setCameraId(id);
    emitChange({ cameraId: id });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    emitChange({ search: value });
  }

  function clearAll() {
    setDateRange("today");
    setCustomFrom("");
    setCustomTo("");
    setEventTypes(["all"]);
    setCameraId("");
    setSearch("");
    setShowDateCustom(false);
    onFilterChange({
      dateRange: "today",
      eventTypes: ["all"],
      cameraId: "",
      search: "",
    });
  }

  const hasActiveFilters =
    dateRange !== "today" ||
    eventTypes.length > 1 ||
    (eventTypes.length === 1 && eventTypes[0] !== "all") ||
    cameraId !== "" ||
    search !== "";

  return (
    <GlassCard className={cn("p-4", className)}>
      <div className="flex flex-col gap-3">
        {/* Date range presets */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant={dateRange === preset.key ? "default" : "outline"}
              size="sm"
              onClick={() => handleDatePreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  emitChange({ dateRange: "custom", customFrom: e.target.value });
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  emitChange({ dateRange: "custom", customTo: e.target.value });
                }}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>

        {/* Event type chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(EVENT_TYPE_LABELS) as EventTypeFilter[]).map((type) => {
            const active = eventTypes.includes(type);
            return (
              <Badge
                key={type}
                variant={active ? "default" : "outline"}
                className={cn(
                  "cursor-pointer select-none transition-all",
                  active && "bg-primary/20 text-primary border-primary/40 hover:bg-primary/30",
                )}
                onClick={() => toggleEventType(type)}
              >
                {EVENT_TYPE_LABELS[type]}
              </Badge>
            );
          })}
        </div>

        {/* Camera selector + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher dans la chronologie..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-background/50 pl-8 pr-3 py-2 text-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="relative min-w-[180px]">
            <select
              value={cameraId}
              onChange={(e) => handleCameraChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background/50 px-3 py-2 pr-8 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Toutes les caméras</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="mr-1 h-4 w-4" />
              Effacer
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
