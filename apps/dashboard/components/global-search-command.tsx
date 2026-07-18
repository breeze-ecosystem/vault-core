"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { globalSearch, type SearchResults, type Site } from "@/lib/api";

interface GlobalSearchCommandProps {
  sites?: Site[];
}

export function GlobalSearchCommand({ sites }: GlobalSearchCommandProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Register keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query);
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <>
      {/* Search trigger button shown in layout */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Rechercher sur tous les sites</span>
        <kbd className="ml-auto hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] md:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher sur tous les sites..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && query && (!results || (
            results.events.length === 0 &&
            results.people.length === 0 &&
            results.credentials.length === 0
          )) && (
            <CommandEmpty>
              Aucun résultat trouvé pour "{query}"
            </CommandEmpty>
          )}

          {results && results.events.length > 0 && (
            <CommandGroup heading="Événements">
              {results.events.map((event) => (
                <CommandItem
                  key={`event-${event.id}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(event.url);
                  }}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                  <span className="flex-1 truncate">{event.title}</span>
                  <Badge variant="outline" className="ml-2 text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    {event.siteName}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.people.length > 0 && (
            <CommandGroup heading="Personnes">
              {results.people.map((person) => (
                <CommandItem
                  key={`person-${person.id}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(person.url);
                  }}
                >
                  <User className="mr-2 h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{person.name}</span>
                  <Badge variant="outline" className="ml-2 text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    {person.siteName}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.credentials.length > 0 && (
            <CommandGroup heading="Justificatifs">
              {results.credentials.map((cred) => (
                <CommandItem
                  key={`cred-${cred.id}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(cred.url);
                  }}
                >
                  <Shield className="mr-2 h-4 w-4 text-warning" />
                  <span className="flex-1 truncate">{cred.label}</span>
                  <Badge variant="outline" className="ml-2 text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                    {cred.siteName}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!query && !loading && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tapez pour rechercher des événements, personnes ou justificatifs
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
