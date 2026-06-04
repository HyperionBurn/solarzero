import type { Metadata } from "next";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolarZero - Solar Potential Assessment",
  description: "Discover the solar potential of any building in Dubai",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full antialiased font-sans">
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>{children}</TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
