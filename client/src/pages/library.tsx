import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogItem } from "@shared/schema";

const LINE_COLORS: Record<string, { pill: string; dot: string }> = {
  "Grand Morse":  { pill: "bg-primary/10 text-primary border-primary/20",       dot: "bg-primary" },
  "GM Narrow":    { pill: "bg-violet-500/10 text-violet-500 border-violet-500/20", dot: "bg-violet-500" },
  "Helix Short":  { pill: "bg-amber-500/10 text-amber-500 border-amber-500/20",  dot: "bg-amber-500" },
};

const ALL_LINES = ["All", "Grand Morse", "GM Narrow", "Helix Short"];

export default function LibraryPage() {
  const { data: catalog = [], isLoading } = useQuery<CatalogItem[]>({ queryKey: ["/api/catalog"] });

  const [search, setSearch] = useState("");
  const [selectedLine, setSelectedLine] = useState("All");
  const [selectedBody, setSelectedBody] = useState("All");
  const [selectedDiameter, setSelectedDiameter] = useState("All");

  // Derive available bodies for the selected line
  const availableBodies = useMemo(() => {
    const src = selectedLine === "All" ? catalog : catalog.filter(c => c.line === selectedLine);
    const bodies = Array.from(new Set(src.map(c => c.body))).sort();
    return bodies.length > 1 ? ["All", ...bodies] : bodies;
  }, [catalog, selectedLine]);

  // Derive available diameters for line+body
  const availableDiameters = useMemo(() => {
    let src = catalog;
    if (selectedLine !== "All") src = src.filter(c => c.line === selectedLine);
    if (selectedBody !== "All") src = src.filter(c => c.body === selectedBody);
    const diams = Array.from(new Set(src.map(c => c.diameter)))
      .sort((a, b) => parseFloat(a) - parseFloat(b));
    return ["All", ...diams];
  }, [catalog, selectedLine, selectedBody]);

  // When line changes, reset body + diameter
  const handleLineSelect = (line: string) => {
    setSelectedLine(line);
    setSelectedBody("All");
    setSelectedDiameter("All");
  };

  // When body changes, reset diameter
  const handleBodySelect = (body: string) => {
    setSelectedBody(body);
    setSelectedDiameter("All");
  };

  // Final filtered results
  const filtered = useMemo(() => {
    let src = catalog;
    if (selectedLine !== "All") src = src.filter(c => c.line === selectedLine);
    if (selectedBody !== "All") src = src.filter(c => c.body === selectedBody);
    if (selectedDiameter !== "All") src = src.filter(c => c.diameter === selectedDiameter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      src = src.filter(c =>
        c.body.toLowerCase().includes(q) ||
        c.line.toLowerCase().includes(q) ||
        c.refNumber.toLowerCase().includes(q) ||
        c.diameter.toLowerCase().includes(q) ||
        c.length.toLowerCase().includes(q) ||
        c.surface.toLowerCase().includes(q)
      );
    }
    return src;
  }, [catalog, selectedLine, selectedBody, selectedDiameter, search]);

  // Group by diameter
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of filtered) {
      const key = item.diameter;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort by diameter numerically
    return Array.from(map.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
  }, [filtered]);

  return (
    <div className="pb-24">
      {/* Header with gradient */}
      <div
        className="px-4 pt-5 pb-5"
        style={{
          background: "linear-gradient(135deg, hsl(170 72% 38% / 0.08) 0%, hsl(170 72% 38% / 0.03) 60%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-4.5 h-4.5 text-primary" style={{ width: "18px", height: "18px" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight" data-testid="text-library-title">Library</h2>
            <p className="text-[13px] text-muted-foreground">Neodent Implant Catalog</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <Input
            data-testid="input-library-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by model, REF, size…"
            className="pl-9 h-10 rounded-xl text-[13px] bg-muted/40 border-border/50 focus-visible:ring-1"
          />
        </div>

        {/* Line filter chips */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Line</p>
          <div className="flex gap-2 flex-wrap">
            {ALL_LINES.map(line => {
              const isActive = selectedLine === line;
              const colors = line !== "All" ? LINE_COLORS[line] : null;
              return (
                <button
                  key={line}
                  data-testid={`filter-line-${line.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleLineSelect(line)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 ${
                    isActive
                      ? colors
                        ? `${colors.pill} border`
                        : "bg-foreground text-background border-foreground"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {line !== "All" && colors && (
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? colors.dot : "bg-muted-foreground/40"}`} />
                  )}
                  {line}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body sub-filter — only show when a line is selected and has multiple bodies */}
        {selectedLine !== "All" && availableBodies.length > 1 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Body</p>
            <div className="flex gap-2 flex-wrap">
              {availableBodies.map(body => (
                <button
                  key={body}
                  data-testid={`filter-body-${body.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => handleBodySelect(body)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 ${
                    selectedBody === body
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {body}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Diameter sub-filter */}
        {availableDiameters.length > 2 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Diameter (mm)</p>
            <div className="flex gap-2 flex-wrap">
              {availableDiameters.map(d => (
                <button
                  key={d}
                  data-testid={`filter-diameter-${d}`}
                  onClick={() => setSelectedDiameter(d)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 ${
                    selectedDiameter === d
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                  }`}
                >
                  {d === "All" ? "All" : `Ø${d}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground/70 font-medium" data-testid="text-library-count">
            {isLoading ? "Loading…" : `${filtered.length} implant${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center mt-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No implants found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {grouped.map(([diameter, items]) => (
              <div key={diameter} data-testid={`diameter-group-${diameter}`}>
                {/* Diameter heading */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Ø {diameter} mm
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] text-muted-foreground/50">{items.length}</span>
                </div>

                {/* Implant cards */}
                <div className="rounded-2xl bg-card border border-border/60 overflow-hidden divide-y divide-border/30">
                  {items
                    .sort((a, b) => parseFloat(a.length) - parseFloat(b.length))
                    .map(item => (
                      <CatalogRow key={item.id} item={item} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogRow({ item }: { item: CatalogItem }) {
  const lineColors = LINE_COLORS[item.line];

  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      data-testid={`catalog-item-${item.id}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Color dot for line */}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${lineColors?.dot ?? "bg-muted-foreground/40"}`} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold">{item.body}</span>
            <span className="text-[12px] text-muted-foreground">
              Ø{item.diameter} × {item.length} mm
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground/70">{item.surface}</span>
            <span className="text-[10px] text-muted-foreground/40">·</span>
            <span
              className="text-[11px] font-mono text-muted-foreground/70"
              data-testid={`catalog-ref-${item.id}`}
            >
              {item.refNumber}
            </span>
          </div>
        </div>
      </div>
      {/* Line badge */}
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${
          lineColors?.pill ?? "bg-muted/50 text-muted-foreground border-border/50"
        }`}
      >
        {item.line}
      </span>
    </div>
  );
}
