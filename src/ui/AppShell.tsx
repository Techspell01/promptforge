"use client";

import { Bookmark, History, Moon, Sun, WandSparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "promptforge.theme";

function currentTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const THEME_EVENT = "promptforge-theme";

function subscribeToTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

function ThemeToggle() {
  // null during server render; the CSS media query covers first paint.
  const theme = useSyncExternalStore<Theme | null>(subscribeToTheme, currentTheme, () => null);

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    localStorage.setItem(THEME_KEY, theme === "dark" ? "light" : "dark");
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors duration-150 hover:text-ink"
    >
      {theme === "dark" ? (
        <Sun size={16} strokeWidth={1.75} aria-hidden />
      ) : (
        <Moon size={16} strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}

const NAVIGATION: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Generate", icon: WandSparkles },
  { href: "/library/", label: "Library", icon: Bookmark },
  { href: "/history/", label: "History", icon: History },
];

function useActive(): (href: string) => boolean {
  const pathname = usePathname();
  const normalised = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (href) => (href === "/" ? normalised === "/" : normalised.startsWith(href));
}

/** Monochrome mark: an anvil-like block with a spark, drawn in the current text colour. */
function LogoMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-inverse text-inverse-ink shadow-pill">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 15h16l-2.5 4h-11L4 15Z M7 15V9h10v6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M12 2v3M8.5 3.5l1.2 1.8M15.5 3.5l-1.2 1.8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function Header() {
  const isActive = useActive();

  return (
    <header className="glass z-30 shrink-0 border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label="PromptForge home">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">PromptForge</span>
        </Link>
        <nav
          aria-label="Main"
          className="hidden items-center gap-1 rounded-full border border-line bg-surface p-1 md:flex"
        >
          {NAVIGATION.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2 rounded-full px-4 text-[13px] font-medium no-underline transition-[background-color,color] duration-150 ${
                  active ? "bg-raised text-ink shadow-pill" : "text-muted hover:text-ink"
                }`}
              >
                <item.icon size={14} strokeWidth={1.75} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Thumb-reachable tabs on phones and in the Android app. */
function TabBar() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="glass z-30 shrink-0 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-3">
        {NAVIGATION.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline transition-colors duration-150 ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 ${
                  active ? "bg-raised shadow-pill" : ""
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2 : 1.75} aria-hidden />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <div aria-hidden className="backdrop-dots pointer-events-none fixed inset-0 -z-10" />
      <Header />
      <main className="scrollbar-quiet min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex h-full max-w-6xl flex-col px-3 py-3 md:px-8 md:py-8">{children}</div>
      </main>
      <TabBar />
    </div>
  );
}
