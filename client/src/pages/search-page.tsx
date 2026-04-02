import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ScanLine, Package, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import type { Implant, CatalogItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const { data: implants = [] } = useQuery<Implant[]>({ queryKey: ["/api/implants"] });
  const { data: catalog = [] } = useQuery<CatalogItem[]>({ queryKey: ["/api/catalog"] });

  const hasQuery = query.trim().length > 0;
  const q = query.toLowerCase();

  const matchedImplants = hasQuery
    ? implants.filter(i =>
        [i.brand, i.productName, i.lotNumber, i.refNumber, i.size, i.diameter, i.length, i.qrData]
          .some(f => f.toLowerCase().includes(q))
      )
    : [];

  const matchedCatalog = hasQuery
    ? catalog.filter(c =>
        [c.brand, c.line, c.body, c.surface, c.diameter, c.length, c.refNumber]
          .some(f => f.toLowerCase().includes(q))
      ).slice(0, 10)
    : [];

  return (
    <div className="px-4 pt-5 pb-4">
      {/* Header — Shortly style */}
      <h1 className="text-[28px] font-bold tracking-tight leading-tight mb-4" data-testid="text-search-title">Search</h1>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          type="search"
          placeholder="Search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white dark:bg-card border-border/40 text-[14px]"
          autoFocus
        />
      </div>

      {!hasQuery ? (
        /* Empty state — Shortly style */
        <div className="flex flex-col items-center justify-center pt-16 pb-12 text-center">
          <div className="w-28 h-28 rounded-3xl bg-muted/40 flex items-center justify-center mb-5">
            <div className="relative">
              <Package className="w-14 h-14 text-primary/20" strokeWidth={1} />
              <Search className="w-6 h-6 text-primary/40 absolute -top-1 -right-1" strokeWidth={2} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">Nothing to see here</h3>
          <p className="text-[13px] text-muted-foreground">Enter text or scan to start your search.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Inventory results */}
          {matchedImplants.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Inventory ({matchedImplants.length})
              </h3>
              <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
                {matchedImplants.slice(0, 8).map(item => (
                  <Link key={item.id} href={`/implant/${item.id}`}>
                    <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === "out" ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{item.brand} {item.productName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.diameter && item.length ? `${item.diameter}mm x ${item.length}mm` : ""}
                          {item.lotNumber ? ` · Lot ${item.lotNumber}` : ""}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Catalog results */}
          {matchedCatalog.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Library ({matchedCatalog.length})
              </h3>
              <div className="rounded-2xl bg-white dark:bg-card border border-border/40 overflow-hidden divide-y divide-border/30">
                {matchedCatalog.map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{item.body} — {item.line}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.diameter}mm x {item.length}mm · Ref {item.refNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedImplants.length === 0 && matchedCatalog.length === 0 && (
            <div className="text-center pt-12">
              <p className="text-[14px] font-medium text-muted-foreground">No results for "{query}"</p>
              <p className="text-[12px] text-muted-foreground/60 mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* FAB barcode scan — Shortly style */}
      <Link href="/scan">
        <button
          className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all z-40"
          data-testid="fab-scan-search"
        >
          <ScanLine className="w-6 h-6" strokeWidth={2} />
        </button>
      </Link>
    </div>
  );
}
