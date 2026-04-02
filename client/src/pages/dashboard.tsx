import { useQuery } from "@tanstack/react-query";
import { Package, ArrowDownLeft, ArrowUpRight, AlertTriangle, XCircle, ChevronRight, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { Link } from "wouter";
import type { Activity, Implant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session-context";
import { LogoIcon } from "@/components/logo";

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

interface StaffSummary {
  staffName: string;
  totalActions: number;
  checkouts: number;
  checkins: number;
  added: number;
  lastActive: string;
}

export default function Dashboard() {
  const { staffName } = useSession();

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

  const { data: staffSummary = [], isLoading: staffLoading } = useQuery<StaffSummary[]>({
    queryKey: ["/api/analytics/staff-summary"],
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
    <div className="px-4 pt-5 pb-4 space-y-5">
      {/* Header with logo — Shortly style big title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">88 Smile Designs</p>
        </div>
        <LogoIcon size={40} />
      </div>

      {/* KPI Cards — Shortly style white cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[80px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard value={stats?.totalItems || 0} label="Total Items" color="text-primary" icon={<Package className="w-4 h-4 text-primary" />} />
          <KpiCard value={stats?.inStock || 0} label="In Stock" color="text-emerald-600 dark:text-emerald-400" icon={<ArrowDownLeft className="w-4 h-4 text-emerald-500" />} />
          <KpiCard value={stats?.checkedOut || 0} label="Checked Out" color="text-orange-500" icon={<ArrowUpRight className="w-4 h-4 text-orange-500" />} />
          <KpiCard value={(stats?.expiringSoon || 0) + (stats?.expired || 0)} label="Expiring" color="text-red-400" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
        </div>
      )}

      {/* Low Stock / Reorder Alert */}
      {!lowStockLoading && lowStock.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4" data-testid="low-stock-alert">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-rose-500" />
            <span className="text-[13px] font-bold text-rose-600 dark:text-rose-400">Low Stock — Reorder</span>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[13px] font-medium">{item.body || item.line || "Implant"}</span>
                  <span className="text-[11px] text-muted-foreground ml-1.5">{item.diameter}mm x {item.length}mm</span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`text-[13px] font-bold tabular-nums ${item.inStockCount <= 1 ? "text-red-500" : "text-rose-500"}`}>{item.inStockCount}</span>
                  <span className="text-[10px] text-muted-foreground">left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      {expiringItems.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400">Expiring Soon</span>
          </div>
          <div className="space-y-1.5">
            {expiringItems.slice(0, 3).map(item => (
              <Link key={item.id} href={`/implant/${item.id}`}>
                <div className="flex items-center justify-between py-1 group cursor-pointer">
                  <span className="text-[13px] group-hover:underline">{item.brand} {item.productName}</span>
                  <span className="text-[11px] text-muted-foreground">{item.expirationDate}</span>
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
            <TrendingUp className="w-4 h-4 text-muted-foreground/70" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Most Used Sizes</h3>
          </div>
          <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
            {mostUsed.slice(0, 5).map((item, idx) => {
              const maxCount = mostUsed[0]?.count || 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={idx} className="px-4 py-3 relative" data-testid={`most-used-row-${idx}`}>
                  <div className="absolute inset-y-0 left-0 bg-primary/5 dark:bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="min-w-0">
                        <span className="text-[13px] font-semibold">{item.diameter}mm x {item.length}mm</span>
                        {(item.body || item.line) && (
                          <span className="text-[11px] text-muted-foreground ml-1.5">{item.body || item.line}</span>
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

      {/* Staff Breakdown */}
      {!staffLoading && staffSummary.length > 0 && (
        <div data-testid="staff-breakdown-section">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground/70" />
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Staff Activity</h3>
            </div>
            <Link href="/staff-report">
              <span className="text-[12px] text-primary font-semibold flex items-center gap-0.5 cursor-pointer" data-testid="link-staff-report">
                Report <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
            {staffSummary.slice(0, 4).map((s, idx) => (
              <Link key={s.staffName} href="/staff-report">
                <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer" data-testid={`staff-dash-${idx}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-primary">{s.staffName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium">{s.staffName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[12px] font-bold tabular-nums text-amber-500">{s.checkouts}</span>
                      <span className="text-[9px] text-muted-foreground ml-0.5">out</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-bold tabular-nums text-emerald-500">{s.checkins}</span>
                      <span className="text-[9px] text-muted-foreground ml-0.5">in</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-bold tabular-nums text-primary">{s.added}</span>
                      <span className="text-[9px] text-muted-foreground ml-0.5">add</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
          <Link href="/activity">
            <span className="text-[12px] text-primary font-semibold flex items-center gap-0.5 cursor-pointer" data-testid="link-view-all-activity">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {activitiesLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-card border border-border/40 py-12 px-6 text-center">
            {/* Shortly-style illustrated empty state */}
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Box body */}
                <rect x="18" y="38" width="60" height="44" rx="6" fill="#e2e8f0" />
                {/* Box flaps */}
                <path d="M18 38 L48 52 L78 38" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                <path d="M18 38 L18 26 Q18 22 22 22 L44 22 L48 30 L52 22 L74 22 Q78 22 78 26 L78 38" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                {/* Center fold line */}
                <line x1="48" y1="22" x2="48" y2="38" stroke="#cbd5e1" strokeWidth="2" />
                {/* Magnifying glass */}
                <circle cx="68" cy="28" r="12" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="2" />
                <circle cx="68" cy="28" r="7" fill="white" fillOpacity="0.7" />
                <line x1="77" y1="37" x2="85" y2="46" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                {/* Small items inside box */}
                <rect x="30" y="60" width="14" height="10" rx="2" fill="#cbd5e1" />
                <rect x="52" y="58" width="14" height="12" rx="2" fill="#cbd5e1" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-foreground/70">No activity yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Scan a barcode to get started</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
            {recentActivities.map((act) => (
              <ActivityRow key={act.id} activity={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ value, label, color, icon }: { value: number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4">
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{label}</div>
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
    <div className="flex items-center gap-3 px-4 py-3" data-testid={`activity-row-${activity.id}`}>
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
