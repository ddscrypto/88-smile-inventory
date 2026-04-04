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
import { Component, type ReactNode } from "react";

// Error boundary to catch render crashes and show a recovery screen
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: "24px", gap: "16px" }}>
          <p style={{ fontWeight: 700, fontSize: 18 }}>Something went wrong</p>
          <p style={{ color: "#666", fontSize: 14, textAlign: "center" }}>Tap below to reload the app</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.hash = "/"; }}
            style={{ background: "#1d4ed8", color: "white", border: "none", borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 600 }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SessionProvider>
            <Toaster />
            <AppGate />
          </SessionProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
