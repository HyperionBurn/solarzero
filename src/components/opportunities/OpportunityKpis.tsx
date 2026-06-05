"use client";

import { motion } from "framer-motion";
import { Target, Sparkles, AlertTriangle, UserCheck, EyeOff, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  total: number;
  aGrade: number;
  unassessed: number;
  verifySolar: number;
  contacted: number;
  rejected: number;
}

interface OpportunityKpisProps {
  stats: Stats | undefined;
  isLoading: boolean;
}

export function OpportunityKpis({ stats, isLoading }: OpportunityKpisProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border border-border/40 p-4 shadow-sm">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-8 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Opportunities",
      value: stats.total,
      icon: Target,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400",
      border: "border-teal-500/10",
    },
    {
      label: "A-Grade Leads",
      value: stats.aGrade,
      icon: Sparkles,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
      border: "border-amber-500/10",
    },
    {
      label: "Unassessed",
      value: stats.unassessed,
      icon: Clock,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400",
      border: "border-indigo-500/10",
    },
    {
      label: "Needs Verification",
      value: stats.verifySolar,
      icon: AlertTriangle,
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400",
      border: "border-rose-500/10",
    },
    {
      label: "Contacted",
      value: stats.contacted,
      icon: UserCheck,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
      border: "border-emerald-500/10",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: EyeOff,
      color: "text-slate-500 bg-slate-50 dark:bg-slate-950/30 dark:text-slate-400",
      border: "border-slate-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className={`border border-border/40 p-4 shadow-sm transition-all hover:shadow-md ${kpi.border}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{kpi.label}</span>
              <div className={`rounded-lg p-1.5 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-bold tracking-tight">{kpi.value.toLocaleString()}</span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
