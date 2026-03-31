import { Link, useLocation } from "wouter";
import { LayoutDashboard, ScanLine, Package, Clock, Settings } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/scan", icon: ScanLine, label: "Scan" },
  { href: "/activity", icon: Clock, label: "Activity" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center px-4 gap-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="DentaTrack" className="shrink-0">
            <rect width="32" height="32" rx="8" fill="hsl(183, 72%, 28%)" />
            <path d="M10 8h4c3.3 0 6 2.7 6 6v4c0 3.3-2.7 6-6 6h-4V8z" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="22" cy="12" r="2" fill="white" opacity="0.7" />
            <path d="M20 20l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="text-base font-semibold leading-tight" data-testid="app-title">DentaTrack</h1>
            <p className="text-xs text-muted-foreground leading-tight">Implant Inventory</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation — mobile app style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${item.label === "Scan" ? "w-6 h-6" : ""}`} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
