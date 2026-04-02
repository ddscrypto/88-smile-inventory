import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, Package, XCircle, Clock, Pencil } from "lucide-react";
import type { Activity } from "@shared/schema";

export default function ActivityPage() {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

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

  // Group activities by date
  const grouped: Record<string, Activity[]> = {};
  activities.forEach(act => {
    const date = new Date(act.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(act);
  });

  const timeString = (ts: string) =>
    new Date(ts).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="px-4 pt-5 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-activity-title">Activity</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Complete history of changes</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Scan a QR code to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, acts]) => (
            <div key={date}>
              <h3 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2.5">{date}</h3>
              <div className="space-y-1">
                {acts.map(act => {
                  const { icon: Icon, color, bg } = getIconData(act.action);
                  return (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                      data-testid={`activity-item-${act.id}`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{getLabel(act.action)}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {act.staffName}{act.notes ? ` · ${act.notes}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground/60 font-medium tabular-nums shrink-0">
                        {timeString(act.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
