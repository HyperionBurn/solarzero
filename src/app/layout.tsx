import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

// System font fallback for mono — no extra network request
const fontMono = localFont({
  src: [{ path: "", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
  declarations: [{ prop: "font-family", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }],
});

export const metadata: Metadata = {
  title: "SolarZero - Solar Potential Assessment",
  description: "Discover the solar potential of any building in Dubai",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://tiles.maplibre.org" />
        <link rel="preconnect" href="https://jlqgkxyjtqxeyzhrdyax.supabase.co" />
        <link rel="dns-prefetch" href="https://tiles.maplibre.org" />
        <link rel="dns-prefetch" href="https://jlqgkxyjtqxeyzhrdyax.supabase.co" />
      </head>
      <body className={`${fontSans.variable} ${fontMono.variable} h-full antialiased font-sans`}>
        <ThemeProvider>
          <SessionProvider>
            <TRPCProvider>{children}</TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
