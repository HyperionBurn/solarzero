import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OpportunityDossierLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border/40 pb-5">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-9 w-[min(36rem,100%)] rounded-xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-40 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-3">
          <div className="flex gap-2 overflow-hidden border-b border-border/40 pb-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-36 rounded-full" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-4">
              <Skeleton className="h-5 w-40 rounded-full" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full rounded-full" />
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <Skeleton className="h-5 w-44 rounded-full" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full rounded-full" />
                ))}
              </div>
            </Card>
          </div>
          <Skeleton className="h-[30rem] rounded-3xl" />
        </div>

        <div className="space-y-5">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
