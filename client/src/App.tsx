import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Scanner from "@/pages/scanner";
import ItemsPage from "@/pages/items";
import ImplantDetail from "@/pages/implant-detail";
import ActivityPage from "@/pages/activity";
import StaffReportPage from "@/pages/staff-report";
import SettingsPage from "@/pages/settings";
import LibraryPage from "@/pages/library";
import SearchPage from "@/pages/search-page";
import NotificationsPage from "@/pages/notifications";
import MenuPage from "@/pages/menu-page";
import AppLayout from "@/components/app-layout";
import LockScreen, { useLockScreen } from "@/pages/lock-screen";
import StaffLogin from "@/pages/staff-login";
import { SessionProvider, useSession } from "@/lib/session-context";
import { useState, type ReactNode } from "react";

// Simple error boundary using state
function SafeRender({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2 style={{ color: "red", fontSize: 16 }}>Error Report</h2>
        <p style={{ fontSize: 13, color: "#666" }}>Screenshot this and send it</p>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 11, background: "#f5f5f5", padding: 12, borderRadius: 8, marginTop: 8 }}>{error}</pre>
        <button
          onClick={() => { setError(null); window.location.hash = "/"; window.location.reload(); }}
          style={{ marginTop: 16, background: "#1d4ed8", color: "white", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 600 }}
        >
          Reload
        </button>
      </div>
    );
  }

  // Use window.onerror to catch render crashes
  if (typeof window !== "undefined" && !(window as any).__errorHandlerSet) {
    (window as any).__errorHandlerSet = true;
    window.onerror = (_msg, _src, _line, _col, err) => {
      setError(String(err?.message || _msg) + "\n\n" + String(err?.stack || ""));
      return true;
    };
    window.addEventListener("unhandledrejection", (e) => {
      setError("Unhandled promise: " + String(e.reason?.message || e.reason) + "\n\n" + String(e.reason?.stack || ""));
    });
  }

  return <>{children}</>;
}

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/scan" component={Scanner} />
        <Route path="/items" component={ItemsPage} />
        <Route path="/inventory" component={ItemsPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/menu" component={MenuPage} />
        <Route path="/implant/:id" component={ImplantDetail} />
        <Route path="/activity" component={ActivityPage} />
        <Route path="/staff-report" component={StaffReportPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/library" component={LibraryPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AppGate() {
  const { unlocked, unlock } = useLockScreen();
  const { isLoggedIn, login } = useSession();

  if (!unlocked) {
    return <LockScreen onUnlock={unlock} />;
  }

  if (!isLoggedIn) {
    return <StaffLogin onLogin={login} />;
  }

  return (
    <Router hook={useHashLocation}>
      <AppRouter />
    </Router>
  );
}

function App() {
  return (
    <SafeRender>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SessionProvider>
            <Toaster />
            <AppGate />
          </SessionProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SafeRender>
  );
}

export default App;
