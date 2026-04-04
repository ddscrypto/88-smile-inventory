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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SessionProvider>
          <Toaster />
          <AppGate />
        </SessionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
