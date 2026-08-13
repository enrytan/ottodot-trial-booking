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
  title: "Ottodot · Trial Booking",
  description: "Trial class booking with database-enforced seat allocation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-accent-strong"
            >
              Ottodot
            </Link>
            <span className="text-line">/</span>
            <span className="text-sm text-muted">Trial booking</span>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t border-line">
          <p className="mx-auto max-w-2xl px-6 py-4 text-xs text-muted">
            Demo build. Payments are simulated and no authentication is
            implemented — seat allocation is enforced in PostgreSQL.
          </p>
        </footer>
      </body>
    </html>
  );
}
