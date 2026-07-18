"use client";

import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventTypeCategory {
  category: string;
  events: { key: string; label: string; description: string }[];
}

interface WebhookEventSelectorProps {
  eventTypes: EventTypeCategory[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function WebhookEventSelector({
  eventTypes,
  selected,
  onChange,
}: WebhookEventSelectorProps) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Expand all categories by default
    return new Set(eventTypes.map((c) => c.category));
  });

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return eventTypes;
    const q = search.toLowerCase();
    return eventTypes
      .map((cat) => ({
        ...cat,
        events: cat.events.filter(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.key.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.events.length > 0);
  }, [eventTypes, search]);

  const isAllSelected = (category: string) => {
    const cat = eventTypes.find((c) => c.category === category);
    return cat?.events.every((e) => selected.includes(e.key)) ?? false;
  };

  const toggleCategory = (category: string) => {
    const cat = eventTypes.find((c) => c.category === category);
    if (!cat) return;

    const allSelected = cat.events.every((e) => selected.includes(e.key));
    const catKeys = cat.events.map((e) => e.key);

    if (allSelected) {
      onChange(selected.filter((s) => !catKeys.includes(s)));
    } else {
      const newSelected = [...selected];
      for (const key of catKeys) {
        if (!newSelected.includes(key)) {
          newSelected.push(key);
        }
      }
      onChange(newSelected);
    }
  };

  const toggleEvent = (eventKey: string) => {
    if (selected.includes(eventKey)) {
      onChange(selected.filter((s) => s !== eventKey));
    } else {
      onChange([...selected, eventKey]);
    }
  };

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (eventTypes.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-muted-foreground">Aucun type d'événement disponible</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un événement..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredCategories.map((cat) => (
        <GlassCard key={cat.category} className="overflow-hidden">
          <div className="border-b p-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleCategoryExpanded(cat.category)}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                {expandedCategories.has(cat.category) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {cat.category}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleCategory(cat.category)}
              >
                {isAllSelected(cat.category) ? "Tout désélectionner" : "Tout sélectionner"}
              </Button>
            </div>
          </div>

          {expandedCategories.has(cat.category) && (
            <div className="divide-y">
              {cat.events.map((event) => (
                <div
                  key={event.key}
                  className="flex items-center justify-between gap-4 px-3 py-2.5 transition-all hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`event-${event.key}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {event.label}
                    </Label>
                    <p className="text-xs text-muted-foreground truncate">
                      {event.description}
                    </p>
                    <code className="text-[10px] text-muted-foreground/60 font-mono">
                      {event.key}
                    </code>
                  </div>
                  <Switch
                    id={`event-${event.key}`}
                    checked={selected.includes(event.key)}
                    onCheckedChange={() => toggleEvent(event.key)}
                  />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      ))}

      {filteredCategories.length === 0 && search && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-muted-foreground">Aucun événement trouvé pour "{search}"</p>
        </div>
      )}
    </div>
  );
}
