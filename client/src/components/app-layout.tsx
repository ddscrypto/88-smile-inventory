import { Link, useLocation } from "wouter";
import { LayoutDashboard, ScanLine, Package, Settings, BookOpen } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/scan", icon: ScanLine, label: "Scan" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar — minimal, sleek */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-12 items-center justify-between px-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5">
            <div style={{ filter: "drop-shadow(0 2px 6px hsl(170 72% 38% / 0.35))" }}>
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-label="88 Smile Designs">
                <rect width="32" height="32" rx="8" fill="hsl(170, 72%, 38%)" />
                <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="system-ui">88</text>
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-sm font-semibold tracking-tight" data-testid="app-title">88 Smile Designs</span>
            </div>
          </div>
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
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom navigation — sleek pill style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            const isScan = item.label === "Scan";

            if (isScan) {
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    data-testid="nav-scan"
                    className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 min-w-[52px] -mt-4"
                    style={{
                      filter: isActive
                        ? "drop-shadow(0 0 10px hsl(170 72% 38% / 0.55))"
                        : "drop-shadow(0 0 6px hsl(170 72% 38% / 0.30))",
                    }}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                    </div>
                    <span className={`text-[10px] leading-tight mt-0.5 ${
                      isActive ? "font-semibold text-primary" : "font-medium text-muted-foreground"
                    }`}>{item.label}</span>
                  </button>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <button
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 min-w-[52px] ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
