"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

  async function search(query: string) {
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ae&limit=5&accept-language=en`
      );
      const data = await res.json();
      setResults(data?.map((r: NominatimResult) => ({ id: String(r.place_id), place_name: r.display_name, center: [parseFloat(r.lon), parseFloat(r.lat)] })) || []);
      setIsOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for an address in UAE..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {results.map((result) => (
            <button
              key={result.id}
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
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
