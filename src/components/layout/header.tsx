"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;
  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6 md:px-6 pl-14 md:pl-6">
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-teal-600">☀️</span> SolarZero
        </span>
        <span className="hidden rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700 sm:inline-block">
          Dubai, UAE
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium">{userName ?? "User"}</span>
          <span className="text-xs text-muted-foreground">{userEmail ?? "user@example.com"}</span>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
