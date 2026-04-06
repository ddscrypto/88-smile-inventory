import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, Clock, Trash2 } from "lucide-react";
import type { Implant } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckedOutPage() {
  const { data: implants = [], isLoading } = useQuery<Implant[]>({ queryKey: ["/api/implants"] });

  // All checked-out items, sorted newest first
  const checkedOut = implants
    .filter(i => i.status === "out")
    .sort((a, b) => {
      const aTime = a.lastActionAt || a.createdAt || "";
      const bTime = b.lastActionAt || b.createdAt || "";
      return bTime.localeCompare(aTime);
    });

  // Calculate hours since checkout for each item
  const now = new Date();

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-[20px] font-bold tracking-tight">Checked Out</h1>
          <p className="text-[12px] text-muted-foreground">{checkedOut.length} item{checkedOut.length !== 1 ? "s" : ""} currently out</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 p-3">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-700 dark:text-amber-400">
            Items auto-delete 48 hours after checkout. Mark surgical discards before then to track waste.
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : checkedOut.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-card border border-border/40 py-12 text-center">
          <ArrowUpRight className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-muted-foreground">Nothing checked out</p>
          <p className="text-[12px] text-muted-foreground/60 mt-1">All items are in stock</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkedOut.map(item => {
            // Calculate time since last action
            const actionTime = item.lastActionAt ? new Date(item.lastActionAt) : null;
            const hoursAgo = actionTime ? Math.floor((now.getTime() - actionTime.getTime()) / (1000 * 60 * 60)) : null;
            const hoursLeft = hoursAgo !== null ? Math.max(0, 48 - hoursAgo) : null;
            const urgent = hoursLeft !== null && hoursLeft <= 12;

            return (
              <Link key={item.id} href={`/implant/${item.id}`}>
                <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{item.productName || item.brand}</p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                        {item.size || `Ø${item.diameter}×${item.length}mm`} · REF {item.refNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">Lot: {item.lotNumber}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.productName?.includes("MUA")
                          ? "bg-purple-50 text-purple-600"
                          : "bg-blue-50 text-blue-600"
                      }`}>
                        {item.productName?.includes("MUA") ? "MUA" : "Implant"}
                      </span>
                    </div>
                  </div>
                  {/* Time remaining */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3 h-3 ${urgent ? "text-red-400" : "text-muted-foreground/50"}`} />
                      <span className={`text-[11px] font-medium ${urgent ? "text-red-500" : "text-muted-foreground"}`}>
                        {hoursLeft !== null
                          ? hoursLeft === 0
                            ? "Auto-deleting soon"
                            : `${hoursLeft}h left before auto-delete`
                          : "Checked out"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trash2 className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/50">Tap to mark discard</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
