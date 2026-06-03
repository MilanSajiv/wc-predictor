import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC26 — Predictor",
  description:
    "Match-level probabilities, the FIFA-published bracket, and Monte Carlo tournament forecasts for the 2026 World Cup. Calibrated Elo + Poisson with AI commentary.",
};

const NAV = [
  { href: "/", label: "Matches" },
  { href: "/bracket", label: "Bracket" },
  { href: "/tournament", label: "Forecast" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-shelf/85 backdrop-blur-md border-b border-border-quiet">
          <div className="mx-auto w-full max-w-[1320px] px-6 lg:px-14 h-16 flex items-center gap-12">
            <Link
              href="/"
              className="flex items-baseline gap-2.5 tracking-tight"
            >
              <span className="font-mono text-[11px] text-accent uppercase tracking-[0.18em]">
                WC26
              </span>
              <span className="text-[15px] font-semibold text-text-primary">
                Predictor
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-[14px]">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface transition-colors duration-150"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto hidden md:flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-text-tertiary font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
              Elo · Poisson · Annex C
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-[1320px] px-6 lg:px-14 py-12 lg:py-20">
          {children}
        </main>

        <footer className="border-t border-border-quiet bg-shelf">
          <div className="mx-auto w-full max-w-[1320px] px-6 lg:px-14 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-tertiary">
            <span>
              Model{" "}
              <span className="font-mono text-text-secondary">
                AVG 1.35 · ETG 0.0017
              </span>{" "}
              · seeds from{" "}
              <span className="font-mono text-text-secondary">
                martj42/international_results
              </span>
            </span>
            <span>Illustrative, not betting advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
