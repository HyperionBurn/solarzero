"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Zap, ChevronRight, MapPin, Clock } from "lucide-react";

export default function AssessmentsPage() {
  const [limit] = useState(50);
  const { data: assessments, isLoading } = api.assessment.getHistory.useQuery({ limit });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Assessment History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all solar assessments you have run.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !assessments || assessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="rounded-full bg-teal-100 p-4 dark:bg-teal-900">
              <Clock className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <CardTitle className="mb-1 text-lg">No assessments yet</CardTitle>
              <CardDescription>
                Start by exploring the map and assessing a building&apos;s solar potential.
              </CardDescription>
            </div>
            <Link href="/map">
              <Button className="mt-2">
                <MapPin className="mr-1.5 h-4 w-4" />
                Go to Map
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Building Address</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">System Size</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr key={a.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{a.building?.address ?? a.buildingId.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(a.createdAt).toLocaleDateString("en-AE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold">{a.systemSizeKwp.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">kWp</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/buildings/${a.buildingId}`}>
                          <Button variant="ghost" size="sm">
                            View
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
