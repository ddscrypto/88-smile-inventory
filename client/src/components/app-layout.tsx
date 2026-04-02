import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ScanLine, Bell, Menu, LogOut } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session-context";
import { LogoIcon } from "@/components/logo";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/items", icon: Package, label: "Items" },
  { href: "/scan", icon: ScanLine, label: "Scan" },
  { href: "/notifications", icon: Bell, label: "Alerts" },
  { href: "/menu", icon: Menu, label: "Menu" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { staffName, staffRole, logout } = useSession();
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Pages that show their own header (Shortly-style big title pages)
  const noHeaderPages = ["/", "/items", "/search", "/notifications", "/menu", "/scan", "/library", "/settings", "/staff-report", "/activity"];
  const showHeader = !noHeaderPages.some(p => p === location || (p !== "/" && location.startsWith(p)));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar — only for detail pages that need it */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-12 items-center justify-between px-4 max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <LogoIcon size={28} />
              <div className="leading-none">
                <span className="text-sm font-semibold tracking-tight" data-testid="app-title">88 Smile Designs</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsDark(!isDark)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="Toggle theme"
                data-testid="button-theme-toggle"
              >
                {isDark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom navigation — Shortly style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href}>
                <button
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.6} />
                  <span className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
