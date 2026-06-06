import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "SolarZero - Dashboard",
  description: "Manage your solar assessments and proposals",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_22%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,250,252,0.96))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.1),_transparent_24%),linear-gradient(180deg,_rgba(2,6,23,0.92),_rgba(2,6,23,0.98))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[linear-gradient(180deg,_rgba(45,212,191,0.08),_transparent_70%)] blur-3xl" />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="min-w-0 flex-1 overflow-auto bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          {children}
        </main>
      </div>
    </div>
  );
}
