"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Filters {
  scoreBand: string[];
  buildingType: string[];
  status: string[];
  assessed: boolean | undefined;
  minRoofArea: number | undefined;
  search: string;
}

interface OpportunityFiltersProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onClear: () => void;
}

export function OpportunityFilters({ filters, setFilters, onClear }: OpportunityFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const bands = ["A", "B", "C", "D", "REJECT"];
  const types = ["warehouse", "industrial", "office", "retail", "school", "hospital", "villa", "house"];
  const statuses = ["new", "reviewed", "contacted", "rejected"];

  const activeFilterCount =
    filters.scoreBand.length +
    filters.buildingType.length +
    filters.status.length +
    (filters.assessed !== undefined ? 1 : 0) +
    (filters.minRoofArea !== undefined ? 1 : 0) +
    (filters.search ? 1 : 0);

  const activeChips = [
    ...filters.scoreBand.map((band) => ({
      key: `band-${band}`,
      label: `Band ${band}`,
      onRemove: () => setFilters({ ...filters, scoreBand: filters.scoreBand.filter((item) => item !== band) }),
    })),
    ...filters.buildingType.map((type) => ({
      key: `type-${type}`,
      label: type,
      onRemove: () => setFilters({ ...filters, buildingType: filters.buildingType.filter((item) => item !== type) }),
    })),
    ...filters.status.map((status) => ({
      key: `status-${status}`,
      label: status,
      onRemove: () => setFilters({ ...filters, status: filters.status.filter((item) => item !== status) }),
    })),
    ...(filters.assessed !== undefined
      ? [
          {
            key: "assessed",
            label: filters.assessed ? "Assessed only" : "Unassessed only",
            onRemove: () => setFilters({ ...filters, assessed: undefined }),
          },
        ]
      : []),
    ...(filters.minRoofArea !== undefined
      ? [
          {
            key: "roof-area",
            label: `Roof area ${filters.minRoofArea}+ m2`,
            onRemove: () => setFilters({ ...filters, minRoofArea: undefined }),
          },
        ]
      : []),
    ...(filters.search
      ? [
          {
            key: "search",
            label: `Search "${filters.search}"`,
            onRemove: () => setFilters({ ...filters, search: "" }),
          },
        ]
      : []),
  ];

  const toggleBand = (band: string) => {
    const current = [...filters.scoreBand];
    const index = current.indexOf(band);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(band);
    }
    setFilters({ ...filters, scoreBand: current });
  };

  const toggleType = (type: string) => {
    const current = [...filters.buildingType];
    const index = current.indexOf(type);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(type);
    }
    setFilters({ ...filters, buildingType: current });
  };

  const toggleStatus = (status: string) => {
    const current = [...filters.status];
    const index = current.indexOf(status);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(status);
    }
    setFilters({ ...filters, status: current });
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by address, district, or landmark..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full rounded-lg border border-border/60 bg-background/50 py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-teal-500"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters({ ...filters, search: "" })}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Try Dubai Marina, DIFC, Sharjah Industrial Area, or any UAE office tower.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-9 gap-1.5 text-xs font-semibold"
            type="button"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-9 text-xs font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              type="button"
            >
              Reset {activeFilterCount}
            </Button>
          )}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active filters
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 px-2.5 py-1 text-xs text-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {showAdvanced && (
        <div className="mt-4 grid gap-4 border-t border-border/20 pt-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score Band</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bands.map((band) => {
                const active = filters.scoreBand.includes(band);
                return (
                  <button
                    key={band}
                    type="button"
                    onClick={() => toggleBand(band)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    Band {band}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Building Type</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {types.map((type) => {
                const active = filters.buildingType.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workflow Status</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {statuses.map((status) => {
                const active = filters.status.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={active}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      active
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assessment Status</span>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      assessed: filters.assessed === true ? undefined : true,
                    })
                  }
                  aria-pressed={filters.assessed === true}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    filters.assessed === true
                      ? "bg-teal-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Assessed Only
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      assessed: filters.assessed === false ? undefined : false,
                    })
                  }
                  aria-pressed={filters.assessed === false}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    filters.assessed === false
                      ? "bg-teal-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Unassessed Only
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min Roof Area (m2)</span>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={filters.minRoofArea ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minRoofArea: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="mt-1.5 w-full rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
