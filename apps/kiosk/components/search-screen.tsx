"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, UserX, ArrowLeft } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { searchVisits } from "@/lib/kiosk-api";

interface SearchScreenProps {
  onSelectVisit: (visitId: string) => void;
  onCancel: () => void;
  locale: Locale;
}

type SearchState = "empty" | "loading" | "results" | "no-results" | "error";

interface VisitResult {
  id: string;
  visitorId: string;
  hostUserId: string;
  hostName?: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  status: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  visitor?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
    photoUrl?: string;
  };
}

export default function SearchScreen({
  onSelectVisit,
  onCancel,
  locale,
}: SearchScreenProps) {
  const [searchState, setSearchState] = useState<SearchState>("empty");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VisitResult[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!text.trim()) {
        setSearchState("empty");
        setResults([]);
        return;
      }

      // Debounce 300ms
      debounceRef.current = setTimeout(async () => {
        setSearchState("loading");

        try {
          const data = await searchVisits(text.trim());

          if (Array.isArray(data) && data.length > 0) {
            setResults(data);
            setSearchState("results");
          } else {
            setResults([]);
            setSearchState("no-results");
          }
        } catch (err: any) {
          setErrorMessage(err.message || t("search.error", locale));
          setSearchState("error");
        }
      }, 300);
    },
    [locale],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white animate-fade-in transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-100">
        <button
          onClick={onCancel}
          className="h-12 flex items-center gap-2 text-gray-700 text-base font-medium hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t("common.cancel", locale)}
        </button>
      </div>

      {/* Search Input */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("search.placeholder", locale)}
            className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Empty State */}
        {searchState === "empty" && (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <p className="text-base text-gray-400">
              {t("search.placeholder", locale)}
            </p>
          </div>
        )}

        {/* Loading State — Skeleton Rows */}
        {searchState === "loading" && (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Results List */}
        {searchState === "results" && (
          <div className="space-y-3 mt-4">
            {results.map((visit) => (
              <button
                key={visit.id}
                onClick={() => onSelectVisit(visit.id)}
                className="w-full text-left border-l-4 border-gray-200 hover:border-blue-500 active:bg-blue-50 rounded-lg p-4 bg-white border border-gray-100 transition-all duration-200"
              >
                <p className="text-lg font-bold text-gray-900">
                  {visit.visitor
                    ? `${visit.visitor.firstName} ${visit.visitor.lastName}`
                    : "—"}
                </p>
                <p className="text-base text-gray-500 mt-1">
                  {visit.visitor?.company || "—"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Hôte: {visit.hostName || "—"}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchState === "no-results" && (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <UserX className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-700">
              {t("search.noResults", locale)}
            </p>
            <p className="text-sm text-gray-500 mt-2 max-w-xs">
              {t("search.noResultsHint", locale)}
            </p>
          </div>
        )}

        {/* Error State */}
        {searchState === "error" && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={() => handleSearch(query)}
              className="mt-3 h-10 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              {t("printing.retry", locale)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
