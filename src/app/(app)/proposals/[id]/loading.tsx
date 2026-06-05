import { Skeleton } from "@/components/ui/skeleton";

export default function ProposalLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Skeleton className="h-4 w-32" />
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-1 h-5 w-24" />
              </div>
            ))}
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
