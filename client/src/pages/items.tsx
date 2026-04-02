import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Search, ScanLine, Plus, MoreHorizontal, Package, ArrowUpRight, ArrowDownLeft, Trash2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Implant } from "@shared/schema";
import { useSession } from "@/lib/session-context";
import { useToast } from "@/hooks/use-toast";

export default function ItemsPage() {
  const { staffName } = useSession();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: implants = [], isLoading } = useQuery<Implant[]>({
    queryKey: ["/api/implants"],
  });

  const filtered = search.trim()
    ? implants.filter(i =>
        [i.brand, i.productName, i.lotNumber, i.refNumber, i.size, i.qrData]
          .some(f => f.toLowerCase().includes(search.toLowerCase()))
      )
    : implants;

  const checkoutMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/implants/${id}/checkout`, { staffName, notes: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Checked out" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/implants/${id}/checkin`, { staffName, notes: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Checked in" });
    },
  });

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Header — Shortly style */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[28px] font-bold tracking-tight leading-tight" data-testid="text-items-title">Items</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-full bg-white dark:bg-card border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors"
            data-testid="button-toggle-search"
          >
            <Search className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
          <Link href="/scan">
            <button
              className="w-10 h-10 rounded-full bg-white dark:bg-card border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors"
              data-testid="button-scan-items"
            >
              <ScanLine className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </Link>
          <button
            className="w-10 h-10 rounded-full bg-white dark:bg-card border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors"
            data-testid="button-more-items"
          >
            <MoreHorizontal className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search bar — slides in */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-items-search"
              type="search"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-white dark:bg-card border-border/40 text-[14px]"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center">
          {/* Empty state illustration — box icon */}
          <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-5">
            <Package className="w-12 h-12 text-muted-foreground/30" strokeWidth={1.2} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            {search ? "No matches" : "It's empty here"}
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[260px]">
            {search
              ? "Try a different search term."
              : <>Add your first item by scanning or tapping the <span className="font-semibold text-primary">"+"</span> button</>
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onCheckout={() => checkoutMutation.mutate(item.id)} onCheckin={() => checkinMutation.mutate(item.id)} />
          ))}
        </div>
      )}

      {/* FAB — Shortly style floating + button */}
      <Link href="/scan">
        <button
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-40"
          data-testid="fab-add-item"
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </Link>
    </div>
  );
}

function ItemCard({ item, onCheckout, onCheckin }: { item: Implant; onCheckout: () => void; onCheckin: () => void }) {
  const isOut = item.status === "out";
  const isExpired = item.expirationDate && new Date(item.expirationDate) < new Date();

  return (
    <Link href={`/implant/${item.id}`}>
      <div className="rounded-2xl bg-white dark:bg-card border border-border/40 p-4 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]" data-testid={`item-card-${item.id}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isOut
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : isExpired
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {isOut ? "Out" : isExpired ? "Expired" : "In Stock"}
              </span>
              {item.quantity > 1 && (
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                  Qty: {item.quantity}
                </span>
              )}
            </div>
            <h4 className="text-[14px] font-semibold truncate">{item.brand || "Unknown"} {item.productName}</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {item.diameter && item.length ? `${item.diameter}mm x ${item.length}mm` : ""}
              {item.lotNumber ? ` · Lot ${item.lotNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isOut ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCheckin(); }}
                className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                data-testid={`button-checkin-${item.id}`}
                title="Check in"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            ) : (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCheckout(); }}
                className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center hover:bg-amber-200 transition-colors"
                data-testid={`button-checkout-${item.id}`}
                title="Check out"
              >
                <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
        </div>
      </div>
    </Link>
  );
}
