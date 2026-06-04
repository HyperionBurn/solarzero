"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { MapPin, Clock, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    label: "Map",
    href: "/map",
    icon: MapPin,
  },
  {
    label: "Assessments",
    href: "/assessments",
    icon: Clock,
  },
];

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;

  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center border-b px-4">
        <span className="text-lg font-semibold">
          <span className="text-teal-600">☀️</span> SolarZero
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:bg-teal-50 hover:text-teal-700 dark:text-slate-400 dark:hover:bg-teal-950 dark:hover:text-teal-300"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-teal-100 text-xs text-teal-700">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{userName ?? "User"}</span>
            <span className="text-xs text-muted-foreground">
              {userEmail ?? "user@example.com"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r bg-background md:flex h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <div className="fixed left-4 top-3 z-50 md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r bg-background animate-in slide-in-from-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
