import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolarZero - Solar Potential Assessment",
  description: "Discover the solar potential of any building in Dubai",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://basemaps.cartocdn.com" />
        <link rel="preconnect" href="https://jlqgkxyjtqxeyzhrdyax.supabase.co" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
        <link rel="dns-prefetch" href="https://jlqgkxyjtqxeyzhrdyax.supabase.co" />
      </head>
      <body className={`${fontSans.variable} h-full antialiased font-sans`}>
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>{children}</TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
