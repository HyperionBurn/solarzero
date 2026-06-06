"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Zap, ChevronRight, MapPin, Clock, History, RefreshCw } from "lucide-react";

export default function AssessmentsPage() {
  const [limit] = useState(50);
  const { data: assessments, isLoading, refetch, isFetching } = api.assessment.getHistory.useQuery({ limit });
  const assessmentCount = assessments?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-6xl space-y-6 p-4 md:p-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Assessment History</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            View all solar assessments you have run.
          </p>
          {!isLoading && (
            <p className="mt-1 text-xs text-muted-foreground">
              {assessmentCount.toLocaleString()} assessment{assessmentCount === 1 ? "" : "s"} tracked in your pipeline.
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1.5 text-xs font-semibold">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
          <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Building Address</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Date</th>
                    <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">System Size</th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="ml-auto h-4 w-16" /></td>
                      <td className="px-4 py-3.5"><Skeleton className="mx-auto h-8 w-16 rounded-md" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
          <div className="rounded-[calc(0.75rem-1px)] bg-card px-6 py-16 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">No assessments yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start by exploring the map and assessing a building&rsquo;s solar potential.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/map">
                  <Button className="h-9 rounded-full px-5 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]">
                    <MapPin className="mr-1.5 h-3.5 w-3.5" />
                    Go to Map
                  </Button>
                </Link>
                <Link href="/opportunities">
                  <Button variant="outline" className="h-9 rounded-full px-5 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]">
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                    View Opportunities
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="group rounded-xl bg-gradient-to-br from-primary/5 to-primary/[0.02] p-[1px] shadow-xs ring-1 ring-black/[0.02] dark:from-primary/10 dark:to-transparent dark:ring-white/[0.04]">
          <div className="rounded-[calc(0.75rem-1px)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Building Address</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Date</th>
                    <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">System Size</th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a, i) => (
                    <motion.tr
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/5">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{a.building?.address ?? a.buildingId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(a.createdAt).toLocaleDateString("en-AE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold tabular-nums">{a.systemSizeKwp.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">kWp</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link href={`/buildings/${a.buildingId}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-[11px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
                          >
                            View
                            <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
