import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/ui/AppShell";
import "./globals.css";

// Self-hosted at build time, so the CSP's font-src 'self' still holds and the APK works offline.
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "PromptForge",
  description:
    "Turn a plain-English idea into a compact, security-hardened build prompt for an AI coding agent.",
  applicationName: "PromptForge",
  // iOS: "Add to Home Screen" opens full-screen with the app icon (src/app/apple-icon.png).
  appleWebApp: { capable: true, title: "PromptForge", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The on-screen keyboard shrinks the layout instead of covering the action buttons.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// The APK has no server to send headers, so its CSP ships as a meta tag. Evaluated at build time.
const androidContentSecurityPolicy =
  process.env.BUILD_TARGET === "android"
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        `connect-src 'self' ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}`,
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; ")
    : null;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      {androidContentSecurityPolicy ? (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={androidContentSecurityPolicy} />
        </head>
      ) : null}
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
