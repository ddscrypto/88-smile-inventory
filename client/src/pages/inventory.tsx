import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Implant } from "@shared/schema";

type FilterType = "all" | "in" | "out" | "expiring";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: implants = [], isLoading } = useQuery<Implant[]>({
    queryKey: ["/api/implants"],
  });

  const filtered = implants.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const match = [item.brand, item.productName, item.lotNumber, item.refNumber, item.supplier, item.qrData]
        .some(field => field?.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filter === "in") return item.status === "in";
    if (filter === "out") return item.status === "out";
    if (filter === "expiring") {
      if (!item.expirationDate) return false;
      const exp = new Date(item.expirationDate);
      return (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
    }
    return true;
  });

  const counts = {
    all: implants.length,
    in: implants.filter(i => i.status === "in").length,
    out: implants.filter(i => i.status === "out").length,
    expiring: implants.filter(i => {
      if (!i.expirationDate) return false;
      return (new Date(i.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
    }).length,
  };

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-inventory-title">Inventory</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">{implants.length} items</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <Input
          data-testid="input-search"
          placeholder="Search brand, product, lot..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-xl bg-card border-border/60 text-sm"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4">
        {(["all", "in", "out", "expiring"] as FilterType[]).map(f => {
          const isActive = filter === f;
          const labels: Record<FilterType, string> = { all: "All", in: "In Stock", out: "Out", expiring: "Expiring" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              data-testid={`filter-${f}`}
            >
              {labels[f]}{" "}
              <span className={isActive ? "opacity-70" : "opacity-50"}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Package className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No matches" : "No items yet"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {!search && "Go to Scan to add implants"}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(item => (
            <ImplantRow key={item.id} implant={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImplantRow({ implant }: { implant: Implant }) {
  const isExpired = implant.expirationDate && new Date(implant.expirationDate) < new Date();
  const isExpiringSoon = implant.expirationDate && !isExpired && (() => {
    return (new Date(implant.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
  })();

  return (
    <Link href={`/implant/${implant.id}`}>
      <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group" data-testid={`card-implant-${implant.id}`}>
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          implant.status === "in" ? "bg-emerald-500" : "bg-amber-500"
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold truncate">{implant.brand || "Unknown"}</span>
            {isExpired && <Badge variant="destructive" className="text-[9px] h-4 px-1.5 rounded-md font-semibold">EXP</Badge>}
            {isExpiringSoon && <Badge className="text-[9px] h-4 px-1.5 rounded-md font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">SOON</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {[implant.productName, implant.size, implant.diameter, implant.length].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-semibold ${implant.status === "in" ? "text-emerald-500" : "text-amber-500"}`}>
            {implant.status === "in" ? "IN" : "OUT"}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
