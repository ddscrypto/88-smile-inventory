import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Scanner from "@/pages/scanner";
import Inventory from "@/pages/inventory";
import ImplantDetail from "@/pages/implant-detail";
import ActivityPage from "@/pages/activity";
import SettingsPage from "@/pages/settings";
import LibraryPage from "@/pages/library";
import AppLayout from "@/components/app-layout";
import LockScreen, { useLockScreen } from "@/pages/lock-screen";

function AppRouter() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/scan" component={Scanner} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/implant/:id" component={ImplantDetail} />
        <Route path="/activity" component={ActivityPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/library" component={LibraryPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  const { unlocked, unlock } = useLockScreen();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {!unlocked ? (
          <LockScreen onUnlock={unlock} />
        ) : (
          <Router hook={useHashLocation}>
            <AppRouter />
          </Router>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
