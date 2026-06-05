import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-white px-4 dark:from-teal-950 dark:to-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
