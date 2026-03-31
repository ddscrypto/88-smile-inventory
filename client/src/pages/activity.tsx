import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownLeft, ArrowUpRight, Package, XCircle, Clock, Pencil } from "lucide-react";
import type { Activity } from "@shared/schema";

export default function ActivityPage() {
  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const getIcon = (action: string) => {
    switch (action) {
      case "checked_out": return <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />;
      case "checked_in": return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />;
      case "added": return <Package className="w-3.5 h-3.5 text-primary" />;
      case "deleted": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "updated": return <Pencil className="w-3.5 h-3.5 text-blue-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
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

  const getBgClass = (action: string) => {
    switch (action) {
      case "checked_out": return "bg-amber-50 dark:bg-amber-950/20";
      case "checked_in": return "bg-emerald-50 dark:bg-emerald-950/20";
      case "added": return "bg-primary/5";
      case "deleted": return "bg-red-50 dark:bg-red-950/20";
      default: return "bg-muted/50";
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

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-activity-title">Activity Log</h2>
        <p className="text-sm text-muted-foreground">Complete history of inventory changes</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No activity recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">Scan a QR code to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, acts]) => (
            <div key={date}>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{date}</h3>
              <div className="space-y-1.5">
                {acts.map(act => (
                  <div
                    key={act.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${getBgClass(act.action)}`}
                    data-testid={`activity-item-${act.id}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center shrink-0">
                      {getIcon(act.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{getLabel(act.action)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        by {act.staffName}
                        {act.notes ? ` — ${act.notes}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
