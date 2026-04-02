import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, Package, XCircle, Clock, Pencil, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Activity } from "@shared/schema";

interface StaffSummary {
  staffName: string;
  totalActions: number;
  checkouts: number;
  checkins: number;
  added: number;
  lastActive: string;
}

export default function StaffReportPage() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const { data: summaries = [], isLoading } = useQuery<StaffSummary[]>({
    queryKey: ["/api/analytics/staff-summary"],
  });

  if (selectedStaff) {
    return <StaffDetail name={selectedStaff} onBack={() => setSelectedStaff(null)} />;
  }

  return (
    <div className="px-4 pt-5 pb-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-staff-report-title">Staff Activity</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Who's doing what</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />)}
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Users className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No staff activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Actions will appear here as staff use the app</p>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map((s, idx) => {
            const maxActions = summaries[0]?.totalActions || 1;
            const pct = Math.round((s.totalActions / maxActions) * 100);
            return (
              <button
                key={s.staffName}
                onClick={() => setSelectedStaff(s.staffName)}
                className="w-full rounded-2xl bg-card border border-border/60 p-4 text-left hover:bg-muted/30 transition-colors relative overflow-hidden group"
                data-testid={`staff-summary-${idx}`}
              >
                {/* Background progress bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-primary/[0.04] dark:bg-primary/[0.08] transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-[14px] font-bold text-primary">{s.staffName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold">{s.staffName}</span>
                      <span className="text-[11px] text-muted-foreground/60">{timeAgo(s.lastActive)}</span>
                    </div>
                    <div className="flex gap-3">
                      <StatChip label="Check-outs" value={s.checkouts} color="text-amber-500" />
                      <StatChip label="Check-ins" value={s.checkins} color="text-emerald-500" />
                      <StatChip label="Added" value={s.added} color="text-primary" />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`text-[12px] font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function StaffDetail({ name, onBack }: { name: string; onBack: () => void }) {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/analytics/staff", name],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/staff/${encodeURIComponent(name)}`);
      return res.json();
    },
  });

  const checkouts = activities.filter(a => a.action === "checked_out").length;
  const checkins = activities.filter(a => a.action === "checked_in").length;
  const added = activities.filter(a => a.action === "added").length;

  // Group by date
  const grouped: Record<string, Activity[]> = {};
  activities.forEach(act => {
    const date = new Date(act.timestamp).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(act);
  });

  return (
    <div className="px-4 pt-5 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-[14px] font-bold text-primary">{name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{name}</h2>
            <p className="text-[12px] text-muted-foreground">{activities.length} total actions</p>
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
          <div className="text-lg font-bold tabular-nums text-amber-500">{checkouts}</div>
          <div className="text-[10px] font-medium text-muted-foreground">Check-outs</div>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
          <div className="text-lg font-bold tabular-nums text-emerald-500">{checkins}</div>
          <div className="text-[10px] font-medium text-muted-foreground">Check-ins</div>
        </div>
        <div className="rounded-xl bg-primary/5 dark:bg-primary/10 p-3 text-center">
          <div className="text-lg font-bold tabular-nums text-primary">{added}</div>
          <div className="text-[10px] font-medium text-muted-foreground">Added</div>
        </div>
      </div>

      {/* Activity timeline */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
          <p className="text-sm text-muted-foreground">No activity recorded</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, acts]) => (
            <div key={date}>
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">{date}</h3>
              <div className="space-y-1">
                {acts.map(act => (
                  <ActivityRow key={act.id} activity={act} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const getIconData = (action: string) => {
    switch (action) {
      case "checked_out": return { icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "checked_in": return { icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-500/10" };
      case "added": return { icon: Package, color: "text-primary", bg: "bg-primary/10" };
      case "deleted": return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" };
      case "updated": return { icon: Pencil, color: "text-blue-400", bg: "bg-blue-500/10" };
      default: return { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const getLabel = (action: string) => {
    switch (action) {
      case "checked_out": return "Checked Out";
      case "checked_in": return "Checked In";
      case "added": return "Added";
      case "deleted": return "Removed";
      case "updated": return "Updated";
      default: return action;
    }
  };

  const timeStr = new Date(activity.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });

  const { icon: Icon, color, bg } = getIconData(activity.action);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors" data-testid={`staff-activity-${activity.id}`}>
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium">{getLabel(activity.action)}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {activity.notes || "—"}
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground/60 font-medium tabular-nums shrink-0">{timeStr}</span>
    </div>
  );
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
