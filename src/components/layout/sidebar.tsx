"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Clock, LogOut, Menu, MapPin, ShieldCheck, Sun, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: Target,
    description: "Rank and enrich the highest-potential leads.",
  },
  {
    label: "Map",
    href: "/map",
    icon: MapPin,
    description: "Survey assets and move from discovery to analysis.",
  },
  {
    label: "Assessments",
    href: "/assessments",
    icon: Clock,
    description: "Review technical and financial outputs.",
  },
];

export function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const isLoadingSession = status === "loading";
  const initials =
    userName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase() ?? "U";

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/10 ring-1 ring-teal-500/15">
            <Sun className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">SolarZero</div>
            <div className="text-[11px] text-muted-foreground">UAE solar intelligence</div>
          </div>
        </div>
        <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300 sm:inline-flex">
          Live
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenPath(null)}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                isActive
                  ? "border border-teal-500/20 bg-gradient-to-r from-teal-500/12 to-cyan-500/8 text-teal-700 shadow-sm dark:text-teal-200"
                  : "border border-transparent text-slate-600 hover:border-border/70 hover:bg-muted/70 hover:text-foreground dark:text-slate-400 dark:hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isActive
                    ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                    : "bg-muted text-muted-foreground group-hover:bg-teal-500/10 group-hover:text-teal-600 dark:group-hover:text-teal-300",
                )}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              </span>
              {isActive && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-teal-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-3">
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/35 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Production workspace
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Prioritize verified solar leads, enrich ownership, and move cleanly into assessment and proposal delivery.
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/60">
            <AvatarFallback className="bg-teal-100 text-xs text-teal-700 dark:bg-teal-950 dark:text-teal-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {isLoadingSession ? "Loading session..." : userName ?? "Signed-in workspace"}
            </div>
            <div className={cn("truncate text-xs text-muted-foreground", !userEmail && "italic")}>
              {isLoadingSession ? "Checking access" : userEmail ?? "Session details unavailable"}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login?signedOut=true" })}
          aria-label="Sign out"
          className="shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-72 flex-col border-r border-border/60 bg-background/82 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:flex">
        {sidebarContent}
      </aside>

      <div className="fixed left-4 top-3 z-50 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpenPath(open ? null : pathname)}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          className="rounded-full border border-border/60 bg-background/90 shadow-sm backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setOpenPath(null)}
          />
          <aside className="absolute left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border/60 bg-background/96 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
