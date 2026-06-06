"use client";

import { usePathname } from "next/navigation";
import { Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const ROUTE_CONTEXTS: Array<{
  match: RegExp;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    match: /^\/opportunities(?:\/|$)/,
    title: "Opportunity Intelligence",
    description: "Rank, verify, enrich, and advance the best UAE leads.",
    badge: "Pipeline",
  },
  {
    match: /^\/map(?:\/|$)/,
    title: "Map Explorer",
    description: "Scan buildings, inspect roofs, and jump into assessments.",
    badge: "Discovery",
  },
  {
    match: /^\/buildings(?:\/|$)/,
    title: "Building Intelligence",
    description: "Review roof geometry, yield, and site-specific context.",
    badge: "Asset",
  },
  {
    match: /^\/assessments(?:\/|$)/,
    title: "Assessment History",
    description: "Compare runs, outputs, and financial assumptions over time.",
    badge: "Analytics",
  },
  {
    match: /^\/proposals(?:\/|$)/,
    title: "Proposal Workspace",
    description: "Package the narrative, pricing, and PDF handoff in one place.",
    badge: "Delivery",
  },
];

function getRouteContext(pathname: string) {
  return ROUTE_CONTEXTS.find((context) => context.match.test(pathname)) ?? {
    title: "SolarZero Dashboard",
    description: "UAE solar intelligence workspace.",
    badge: "Overview",
  };
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const routeContext = getRouteContext(pathname);
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const initials =
    userName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="min-w-0 flex items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-500/10 ring-1 ring-teal-500/15">
              <Sun className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tracking-tight sm:text-base">SolarZero</span>
                <span className="rounded-full border border-teal-500/15 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">
                  {routeContext.badge}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{routeContext.title}</span>
                <span className="hidden text-border sm:inline">&middot;</span>
                <span className="hidden sm:inline">{routeContext.description}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden max-w-[16rem] flex-col items-end text-right sm:flex">
            <span className="text-sm font-medium leading-tight">{userName ?? "User"}</span>
            <span className={cn("truncate text-xs text-muted-foreground", !userEmail && "italic")}>
              {userEmail ?? "user@example.com"}
            </span>
          </div>
          <Avatar className="h-9 w-9 border border-border/60">
            <AvatarFallback className="bg-teal-100 text-xs text-teal-700 dark:bg-teal-950 dark:text-teal-200">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
