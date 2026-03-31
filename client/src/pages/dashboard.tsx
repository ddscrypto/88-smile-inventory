import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ArrowDownLeft, ArrowUpRight, AlertTriangle, XCircle } from "lucide-react";
import { Link } from "wouter";
import type { Activity, Implant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalItems: number;
  inStock: number;
  checkedOut: number;
  expiringSoon: number;
  expired: number;
  brands: Record<string, number>;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: implants } = useQuery<Implant[]>({
    queryKey: ["/api/implants"],
  });

  const recentActivities = activities?.slice(0, 8) || [];

  // Find expiring items
  const expiringItems = (implants || []).filter(i => {
    if (!i.expirationDate) return false;
    const exp = new Date(i.expirationDate);
    const now = new Date();
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 90;
  });

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-dashboard-title">Overview</h2>
        <p className="text-sm text-muted-foreground">Your implant inventory at a glance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statsLoading ? (
          <>
            {[1,2,3,4].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </>
        ) : (
          <>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums" data-testid="text-total-items">{stats?.totalItems || 0}</div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-emerald-600" data-testid="text-in-stock">{stats?.inStock || 0}</div>
                <div className="text-xs text-muted-foreground">In Stock</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-amber-600" data-testid="text-checked-out">{stats?.checkedOut || 0}</div>
                <div className="text-xs text-muted-foreground">Checked Out</div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-red-500" data-testid="text-expiring">{(stats?.expiringSoon || 0) + (stats?.expired || 0)}</div>
                <div className="text-xs text-muted-foreground">Expiring / Expired</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Expiring Soon Alert */}
      {expiringItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Expiring Soon</span>
            </div>
            <div className="space-y-1.5">
              {expiringItems.slice(0, 3).map(item => (
                <Link key={item.id} href={`/implant/${item.id}`}>
                  <div className="text-xs text-amber-700 dark:text-amber-400 hover:underline cursor-pointer">
                    {item.brand} {item.productName} — Exp: {item.expirationDate}
                  </div>
                </Link>
              ))}
              {expiringItems.length > 3 && (
                <Link href="/inventory">
                  <span className="text-xs text-amber-600 hover:underline cursor-pointer">
                    +{expiringItems.length - 3} more...
                  </span>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <Link href="/activity">
            <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-view-all-activity">View all</span>
          </Link>
        </div>

        {activitiesLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : recentActivities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Scan a QR code to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((act) => (
              <ActivityRow key={act.id} activity={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const getIcon = () => {
    switch (activity.action) {
      case "checked_out": return <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />;
      case "checked_in": return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />;
      case "added": return <Package className="w-3.5 h-3.5 text-primary" />;
      case "deleted": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return <Package className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getLabel = () => {
    switch (activity.action) {
      case "checked_out": return "Checked out";
      case "checked_in": return "Checked in";
      case "added": return "Added";
      case "deleted": return "Removed";
      case "updated": return "Updated";
      default: return activity.action;
    }
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-card-border" data-testid={`activity-row-${activity.id}`}>
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{getLabel()}</div>
        <div className="text-xs text-muted-foreground truncate">
          by {activity.staffName} {activity.notes ? `— ${activity.notes}` : ""}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">{timeAgo(activity.timestamp)}</div>
    </div>
  );
}
