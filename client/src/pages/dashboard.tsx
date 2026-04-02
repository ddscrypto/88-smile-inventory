import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ArrowDownLeft, ArrowUpRight, AlertTriangle, XCircle, ChevronRight, TrendingUp, ShoppingCart } from "lucide-react";
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

interface MostUsedSize {
  diameter: string;
  length: string;
  body: string;
  line: string;
  count: number;
}

interface LowStockItem {
  diameter: string;
  length: string;
  body: string;
  line: string;
  inStockCount: number;
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

  const { data: mostUsed = [], isLoading: mostUsedLoading } = useQuery<MostUsedSize[]>({
    queryKey: ["/api/analytics/most-used"],
  });

  const { data: lowStock = [], isLoading: lowStockLoading } = useQuery<LowStockItem[]>({
    queryKey: ["/api/analytics/low-stock"],
  });

  const recentActivities = activities?.slice(0, 6) || [];

  const expiringItems = (implants || []).filter(i => {
    if (!i.expirationDate) return false;
    const exp = new Date(i.expirationDate);
    const now = new Date();
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 90;
  });

  return (
    <div className="px-4 pt-5 pb-4 space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-dashboard-title">Inventory</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">88 Smile Designs</p>
      </div>

      {/* KPI Strip */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <KpiTile
            value={stats?.totalItems || 0}
            label="Total"
            color="text-foreground"
            bg="bg-muted/60 dark:bg-muted/40"
          />
          <KpiTile
            value={stats?.inStock || 0}
            label="In Stock"
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-950/40"
          />
          <KpiTile
            value={stats?.checkedOut || 0}
            label="Out"
            color="text-orange-500"
            bg="bg-orange-50 dark:bg-orange-950/30"
          />
          <KpiTile
            value={(stats?.expiringSoon || 0) + (stats?.expired || 0)}
            label="Expiring"
            color="text-red-400"
            bg="bg-red-50 dark:bg-red-950/30"
          />
        </div>
      )}

      {/* Low Stock / Reorder Alert */}
      {!lowStockLoading && lowStock.length > 0 && (
        <div className="rounded-xl border border-rose-200/60 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-950/20 p-3.5" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-2.5">
            <ShoppingCart className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Low Stock — Reorder</span>
          </div>
          <div className="space-y-1.5">
            {lowStock.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-rose-700 dark:text-rose-300">
                    {item.body || item.line || "Implant"}
                  </span>
                  <span className="text-[11px] text-rose-500/70 ml-1.5">
                    {item.diameter}mm x {item.length}mm
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`text-[12px] font-bold tabular-nums ${
                    item.inStockCount <= 1 ? "text-red-500" : "text-rose-500"
                  }`}>
                    {item.inStockCount}
                  </span>
                  <span className="text-[10px] text-rose-400">left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {expiringItems.length > 0 && (
        <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Expiring Soon</span>
          </div>
          <div className="space-y-1">
            {expiringItems.slice(0, 3).map(item => (
              <Link key={item.id} href={`/implant/${item.id}`}>
                <div className="flex items-center justify-between py-1 group cursor-pointer">
                  <span className="text-[13px] text-amber-700 dark:text-amber-300 group-hover:underline">
                    {item.brand} {item.productName}
                  </span>
                  <span className="text-[11px] text-amber-500/70">{item.expirationDate}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Most Used Sizes */}
      {!mostUsedLoading && mostUsed.length > 0 && (
        <div data-testid="most-used-section">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/70" />
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Most Used Sizes</h3>
          </div>
          <div className="rounded-2xl bg-card border border-border/60 overflow-hidden divide-y divide-border/30">
            {mostUsed.slice(0, 5).map((item, idx) => {
              const maxCount = mostUsed[0]?.count || 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="px-3.5 py-2.5 relative" data-testid={`most-used-row-${idx}`}>
                  {/* Background bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/5 dark:bg-primary/10 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums w-5 text-right shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold">
                          {item.diameter}mm x {item.length}mm
                        </span>
                        {(item.body || item.line) && (
                          <span className="text-[11px] text-muted-foreground ml-1.5">
                            {item.body || item.line}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <span className="text-[13px] font-bold tabular-nums text-primary">{item.count}</span>
                      <span className="text-[10px] text-muted-foreground">uses</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <Link href="/activity">
            <span className="text-[12px] text-primary font-medium flex items-center gap-0.5 cursor-pointer" data-testid="link-view-all-activity">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {activitiesLoading ? (
          <div className="space-y-1.5">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Scan a QR code to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentActivities.map((act) => (
              <ActivityRow key={act.id} activity={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl ${bg} p-3 text-center`}>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const getIconData = () => {
    switch (activity.action) {
      case "checked_out": return { icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "checked_in": return { icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-500/10" };
      case "added": return { icon: Package, color: "text-primary", bg: "bg-primary/10" };
      case "deleted": return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" };
      default: return { icon: Package, color: "text-muted-foreground", bg: "bg-muted" };
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
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const { icon: Icon, color, bg } = getIconData();

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors" data-testid={`activity-row-${activity.id}`}>
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{getLabel()}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {activity.staffName}{activity.notes ? ` · ${activity.notes}` : ""}
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground/60 font-medium tabular-nums shrink-0">{timeAgo(activity.timestamp)}</span>
    </div>
  );
}
