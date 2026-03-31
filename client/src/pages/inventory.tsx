import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Filter } from "lucide-react";
import { Link } from "wouter";
import type { Implant } from "@shared/schema";
import { Button } from "@/components/ui/button";

type FilterType = "all" | "in" | "out" | "expiring";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: implants = [], isLoading } = useQuery<Implant[]>({
    queryKey: ["/api/implants"],
  });

  const filtered = implants.filter(item => {
    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const match = [item.brand, item.productName, item.lotNumber, item.refNumber, item.supplier, item.qrData]
        .some(field => field?.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status filter
    if (filter === "in") return item.status === "in";
    if (filter === "out") return item.status === "out";
    if (filter === "expiring") {
      if (!item.expirationDate) return false;
      const exp = new Date(item.expirationDate);
      const now = new Date();
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 90;
    }
    return true;
  });

  const counts = {
    all: implants.length,
    in: implants.filter(i => i.status === "in").length,
    out: implants.filter(i => i.status === "out").length,
    expiring: implants.filter(i => {
      if (!i.expirationDate) return false;
      const exp = new Date(i.expirationDate);
      const diffDays = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diffDays <= 90;
    }).length,
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-inventory-title">Inventory</h2>
        <p className="text-sm text-muted-foreground">{implants.length} items total</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          placeholder="Search by brand, product, lot #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {(["all", "in", "out", "expiring"] as FilterType[]).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(f)}
            className="shrink-0 h-8 text-xs"
            data-testid={`filter-${f}`}
          >
            {f === "all" ? "All" : f === "in" ? "In Stock" : f === "out" ? "Checked Out" : "Expiring"}
            <span className="ml-1.5 opacity-70">{counts[f]}</span>
          </Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "No items match your search" : "No items in inventory"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {!search && "Go to Scan to add implants"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <ImplantCard key={item.id} implant={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImplantCard({ implant }: { implant: Implant }) {
  const isExpired = implant.expirationDate && new Date(implant.expirationDate) < new Date();
  const isExpiringSoon = implant.expirationDate && !isExpired && (() => {
    const exp = new Date(implant.expirationDate);
    const diffDays = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays <= 90;
  })();

  return (
    <Link href={`/implant/${implant.id}`}>
      <Card className="hover-elevate cursor-pointer transition-shadow" data-testid={`card-implant-${implant.id}`}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold truncate">
                  {implant.brand || "Unknown Brand"}
                </span>
                {isExpired && <Badge variant="destructive" className="text-[10px] h-5 shrink-0">Expired</Badge>}
                {isExpiringSoon && <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">Expiring</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {implant.productName || "No product name"}
                {implant.size && ` · ${implant.size}`}
                {implant.diameter && ` · ${implant.diameter}`}
                {implant.length && ` · ${implant.length}`}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {implant.lotNumber && <span>Lot: {implant.lotNumber}</span>}
                {implant.location && <span>{implant.location}</span>}
              </div>
            </div>
            <Badge
              variant={implant.status === "in" ? "default" : "secondary"}
              className={`shrink-0 text-xs ${
                implant.status === "in"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}
            >
              {implant.status === "in" ? "In" : "Out"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
