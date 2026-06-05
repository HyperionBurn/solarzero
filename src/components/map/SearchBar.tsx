"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lon: string;
  lat: string;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function search(q: string) {
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=ae&limit=5&accept-language=en`
      );
      const data = await res.json();
      setResults(data?.map((r: NominatimResult) => ({ id: String(r.place_id), place_name: r.display_name, center: [parseFloat(r.lon), parseFloat(r.lat)] })) || []);
      setIsOpen(true);
    } catch (err) { console.error("Search fetch failed:", err); setResults([]); }
    finally { setLoading(false); }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); setSearched(false); setIsOpen(false); return; }
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSearched(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="text"
          placeholder="Search for an address in UAE..."
          aria-label="Search for an address"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10 pr-8"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg" role="listbox">
          {results.map((result) => (
            <button
              key={result.id}
              role="option"
              aria-selected={false}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(result);
                setQuery(result.place_name);
                setIsOpen(false);
              }}
            >
              {result.place_name}
            </button>
          ))}
        </div>
      )}
      {isOpen && searched && !loading && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          No results found. Try a different address.
        </div>
      )}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
