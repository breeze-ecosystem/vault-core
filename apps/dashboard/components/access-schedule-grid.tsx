'use client';

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ScheduleGridEntry {
  dayOfWeek: number; // 0=Monday, 6=Sunday
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

interface AccessScheduleGridProps {
  value: ScheduleGridEntry[];
  onChange: (entries: ScheduleGridEntry[]) => void;
  readOnly?: boolean;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const SLOTS = [
  { label: '00-06', startHour: 0, endHour: 6 },
  { label: '06-08', startHour: 6, endHour: 8 },
  { label: '08-12', startHour: 8, endHour: 12 },
  { label: '12-14', startHour: 12, endHour: 14 },
  { label: '14-18', startHour: 14, endHour: 18 },
  { label: '18-20', startHour: 18, endHour: 20 },
  { label: '20-00', startHour: 20, endHour: 24 },
];

function isSlotActive(entries: ScheduleGridEntry[], dayIdx: number, slotIdx: number): boolean {
  const slot = SLOTS[slotIdx];
  if (!slot) return false;
  return entries.some(
    (e) =>
      e.dayOfWeek === dayIdx &&
      e.startHour <= slot.startHour &&
      e.endHour >= slot.endHour,
  );
}

function toggleSlot(
  entries: ScheduleGridEntry[],
  dayIdx: number,
  slotIdx: number,
): ScheduleGridEntry[] {
  const slot = SLOTS[slotIdx];
  if (!slot) return entries;
  const active = isSlotActive(entries, dayIdx, slotIdx);

  if (active) {
    // Remove entries that overlap with this slot
    return entries.filter(
      (e) =>
        !(
          e.dayOfWeek === dayIdx &&
          e.startHour <= slot.startHour &&
          e.endHour >= slot.endHour
        ),
    );
  } else {
    // Add entry for this slot
    return [
      ...entries,
      {
        dayOfWeek: dayIdx,
        startHour: slot.startHour,
        startMinute: 0,
        endHour: slot.endHour,
        endMinute: 0,
      },
    ];
  }
}

export function AccessScheduleGrid({
  value,
  onChange,
  readOnly = false,
}: AccessScheduleGridProps) {
  const [defaultStart, setDefaultStart] = useState('08:00');
  const [defaultEnd, setDefaultEnd] = useState('18:00');
  const [isDragging, setIsDragging] = useState(false);

  const handleDefaultApply = () => {
    const [startH = 8, startM = 0] = defaultStart.split(':').map(Number);
    const [endH = 18, endM = 0] = defaultEnd.split(':').map(Number);

    const newEntries: ScheduleGridEntry[] = [];
    DAYS.forEach((_, dayIdx) => {
      newEntries.push({
        dayOfWeek: dayIdx,
        startHour: startH,
        startMinute: startM || 0,
        endHour: endH,
        endMinute: endM || 0,
      });
    });
    onChange(newEntries);
  };

  const handleCellClick = useCallback(
    (dayIdx: number, slotIdx: number) => {
      if (readOnly) return;
      onChange(toggleSlot(value, dayIdx, slotIdx));
    },
    [value, onChange, readOnly],
  );

  const handleCellMouseEnter = useCallback(
    (dayIdx: number, slotIdx: number) => {
      if (readOnly || !isDragging) return;
      onChange(toggleSlot(value, dayIdx, slotIdx));
    },
    [value, onChange, readOnly, isDragging],
  );

  return (
    <div className="space-y-4">
      {/* Default time range */}
      {!readOnly && (
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Plage horaire par défaut
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={defaultStart}
                onChange={(e) => setDefaultStart(e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="time"
                value={defaultEnd}
                onChange={(e) => setDefaultEnd(e.target.value)}
                className="w-32"
              />
              <button
                type="button"
                onClick={handleDefaultApply}
                className="rounded-md bg-primary/10 text-primary text-xs px-3 py-1.5 font-medium hover:bg-primary/20 transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="grid grid-cols-[70px_repeat(7,1fr)] gap-px bg-border/30">
            <div className="p-2 text-[10px] font-semibold uppercase text-muted-foreground" />
            {DAYS.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-[10px] font-semibold uppercase text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Body rows */}
          {SLOTS.map((slot, slotIdx) => (
            <div
              key={slot.label}
              className="grid grid-cols-[70px_repeat(7,1fr)] gap-px bg-border/30"
            >
              <div className="p-2 text-[10px] font-mono text-muted-foreground flex items-center">
                {slot.label}
              </div>
              {DAYS.map((_, dayIdx) => {
                const active = isSlotActive(value, dayIdx, slotIdx);
                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'aspect-[3/2] rounded-sm transition-all duration-150',
                      readOnly ? 'cursor-default' : 'cursor-pointer',
                      active
                        ? 'bg-primary/30 hover:bg-primary/40'
                        : 'bg-muted/20 hover:bg-muted/40',
                    )}
                    onClick={() => handleCellClick(dayIdx, slotIdx)}
                    onMouseDown={() => !readOnly && setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onMouseEnter={() => handleCellMouseEnter(dayIdx, slotIdx)}
                    title={`${DAYS[dayIdx]} ${slot.label}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-primary/30" />
          <span>Actif</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted/20" />
          <span>Inactif</span>
        </div>
      </div>
    </div>
  );
}
