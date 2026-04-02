import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Plus, CheckCircle2, ArrowDownLeft, ArrowUpRight, Keyboard, X, ChevronRight, Package } from "lucide-react";
import { useLocation } from "wouter";
import type { Staff, Implant, CatalogItem } from "@shared/schema";
import { useSession } from "@/lib/session-context";

type ScanMode = "idle" | "scanning" | "found" | "selectCatalog" | "manualForm";

// ── GS1 Parser ──────────────────────────────────────────────────────────────

function formatGS1Date(yymmdd: string): string {
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const century = parseInt(yy) > 50 ? "19" : "20";
  return `${century}${yy}-${mm}-${dd}`;
}

function parseGS1(raw: string): { gtin?: string; lot?: string; expiration?: string; mfgDate?: string; serial?: string } {
  const result: any = {};

  // Remove any leading/trailing whitespace
  let data = raw.trim();

  // Normalize GS separators: handle \x1D (raw), <GS> (escaped from zxing-wasm), and FNC1
  data = data.replace(/<GS>/g, "|").replace(/\x1d/g, "|").replace(/\u001d/g, "|");

  // Check if it's human-readable format with parentheses
  const hasParens = data.includes("(01)");

  if (hasParens) {
    // Human-readable: (01)GTIN(17)EXP(10)LOT etc.
    const gtinMatch = data.match(/\(01\)(\d{14})/);
    const expMatch = data.match(/\(17\)(\d{6})/);
    const mfgMatch = data.match(/\(11\)(\d{6})/);
    const lotMatch = data.match(/\(10\)([^\(|]+)/);
    const snMatch = data.match(/\(21\)([^\(|]+)/);

    if (gtinMatch) result.gtin = gtinMatch[1];
    if (expMatch) result.expiration = formatGS1Date(expMatch[1]);
    if (mfgMatch) result.mfgDate = formatGS1Date(mfgMatch[1]);
    if (lotMatch) result.lot = lotMatch[1].trim();
    if (snMatch) result.serial = snMatch[1].trim();
  } else {
    // Raw DataMatrix: no parens, AIs concatenated, GS separates variable-length fields

    // Fixed-length AIs first
    const ai01 = data.match(/01(\d{14})/);
    if (ai01) result.gtin = ai01[1];

    const ai17 = data.match(/17(\d{6})/);
    if (ai17) result.expiration = formatGS1Date(ai17[1]);

    const ai11 = data.match(/11(\d{6})/);
    if (ai11) result.mfgDate = formatGS1Date(ai11[1]);

    // Variable-length AIs (terminated by GS/pipe or end of string)
    const ai10 = data.match(/10([^|]+)/);
    if (ai10) result.lot = ai10[1].replace(/\d{2}\d{14}/, "").trim(); // clean up if GTIN stuck

    const ai21 = data.match(/21([^|]+)/);
    if (ai21) result.serial = ai21[1].trim();
  }

  return result;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Scanner() {
  const [mode, setMode] = useState<ScanMode>("idle");
  const [scannedData, setScannedData] = useState("");
  const [foundImplant, setFoundImplant] = useState<Implant | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualQr, setManualQr] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { staffName: sessionStaff } = useSession();
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: catalog = [] } = useQuery<CatalogItem[]>({ queryKey: ["/api/catalog"] });
  const [selectedStaff, setSelectedStaff] = useState("");
  // Auto-set staff from session
  const activeStaff = selectedStaff || sessionStaff || "Unknown";

  // Catalog filter state
  const [catLine, setCatLine] = useState<string>("all");
  const [catBody, setCatBody] = useState<string>("all");
  const [catDiameter, setCatDiameter] = useState<string>("all");
  const [catSearch, setCatSearch] = useState("");

  // Selected catalog item
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);

  // Form for additional details (lot, expiration, etc.)
  const [form, setForm] = useState({
    lotNumber: "", expirationDate: "", supplier: "", cost: "", location: "", notes: "",
    // For fully manual entry (no catalog match)
    brand: "", productName: "", refNumber: "", diameter: "", length: "", size: "",
  });

  const startScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setMode("scanning");
    // Wait for DOM to render the container
    await new Promise(resolve => setTimeout(resolve, 200));
    const container = containerRef.current;
    if (!container) {
      toast({ title: "Camera Error", description: "Scanner container not found.", variant: "destructive" });
      setMode("idle");
      return;
    }
    const { BarcodeScanner } = await import("@/lib/barcode-scanner");
    const scanner = new BarcodeScanner({
      onResult: (text: string) => {
        handleScanResult(text);
        scanner.stop();
        scannerRef.current = null;
      },
      onError: (err: string) => {
        toast({ title: "Camera Error", description: err || "Could not access camera. Try entering the barcode text manually.", variant: "destructive" });
        setMode("idle");
      },
    });
    scannerRef.current = scanner;
    try {
      await scanner.start(container);
    } catch (err: any) {
      toast({ title: "Camera Error", description: err?.message || "Could not access camera.", variant: "destructive" });
      setMode("idle");
    }
  }, []);

  const handleScanResult = async (data: string) => {
    setScannedData(data);
    setIsProcessing(true);

    // 1. Parse GS1 data
    const gs1 = parseGS1(data);

    // Pre-fill form with parsed data
    setForm(f => ({
      ...f,
      lotNumber: gs1.lot || f.lotNumber,
      expirationDate: gs1.expiration || f.expirationDate,
    }));

    // 2. Check if already in inventory by QR data
    try {
      const res = await apiRequest("GET", `/api/implants/qr/${encodeURIComponent(data)}`);
      const implant = await res.json();
      setFoundImplant(implant);
      setMode("found");
      setIsProcessing(false);
      return;
    } catch {
      // Not in inventory — continue
    }

    // Also try matching by lot number for re-scan scenarios
    if (gs1.lot) {
      try {
        const lotRes = await apiRequest("GET", `/api/implants?q=${encodeURIComponent(gs1.lot)}`);
        const lotResults = await lotRes.json();
        // Find exact lot match
        const lotMatch = lotResults.find((i: any) => i.lotNumber === gs1.lot);
        if (lotMatch) {
          setFoundImplant(lotMatch);
          setMode("found");
          setIsProcessing(false);
          return;
        }
      } catch {}
    }

    // 3. If we have a GTIN, look up via GUDID to get catalog number
    if (gs1.gtin) {
      try {
        const lookupRes = await apiRequest("GET", `/api/lookup-gtin/${gs1.gtin}`);
        const gudid = await lookupRes.json();

        if (gudid.catalogNumber) {
          // Find matching catalog item by ref number
          const match = catalog.find(c =>
            c.refNumber === gudid.catalogNumber ||
            c.refNumber.replace(".", "") === gudid.catalogNumber.replace(".", "")
          );

          if (match) {
            // AUTO-FILL EVERYTHING!
            setSelectedCatalog(match);
            const prodName = match.body === match.line ? match.body : `${match.body} ${match.line}`;
            setForm(f => ({
              ...f,
              brand: match.brand,
              productName: prodName,
              refNumber: match.refNumber,
              diameter: match.diameter,
              length: match.length,
              lotNumber: gs1.lot || f.lotNumber,
              expirationDate: gs1.expiration || f.expirationDate,
            }));
            setAutoFilled(true);
            setMode("manualForm"); // Go straight to review form
            setIsProcessing(false);
            return;
          }
        }
      } catch {
        // GUDID lookup failed — fall through to catalog selector
      }
    }

    // 4. No auto-match — show catalog selector
    setMode("selectCatalog");
    setIsProcessing(false);
  };

  const handleManualSubmit = () => {
    if (!manualQr.trim()) return;
    handleScanResult(manualQr.trim());
  };

  // Pick a catalog item and go to detail form
  const pickCatalogItem = (item: CatalogItem) => {
    setSelectedCatalog(item);
    const prodName = item.body === item.line ? item.body : `${item.body} ${item.line}`;
    setForm(f => ({
      ...f,
      brand: item.brand,
      productName: prodName,
      refNumber: item.refNumber,
      diameter: item.diameter,
      length: item.length,
    }));
    setMode("manualForm");
  };

  // Skip catalog — manual entry
  const goManualForm = () => {
    setSelectedCatalog(null);
    setMode("manualForm");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/implants", {
        qrData: scannedData || `manual-${Date.now()}`,
        catalogId: selectedCatalog?.id || null,
        brand: form.brand || selectedCatalog?.brand || "",
        productName: form.productName || (selectedCatalog ? (selectedCatalog.body === selectedCatalog.line ? selectedCatalog.body : `${selectedCatalog.body} ${selectedCatalog.line}`) : ""),
        lotNumber: form.lotNumber,
        refNumber: form.refNumber || selectedCatalog?.refNumber || "",
        size: form.size || (selectedCatalog ? `Ø${selectedCatalog.diameter}×${selectedCatalog.length}mm` : ""),
        diameter: form.diameter || selectedCatalog?.diameter || "",
        length: form.length || selectedCatalog?.length || "",
        expirationDate: form.expirationDate,
        supplier: form.supplier,
        cost: form.cost,
        location: form.location,
        quantity: 1,
        status: "in",
        addedBy: activeStaff,
        addedAt: new Date().toISOString(),
        notes: form.notes,
      });
      return res.json();
    },
    onSuccess: (implant: Implant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Added to inventory" });
      navigate(`/implant/${implant.id}`);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${foundImplant!.id}/checkout`, { staffName: activeStaff, notes: "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Checked out" });
      resetScanner();
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${foundImplant!.id}/checkin`, { staffName: activeStaff, notes: "" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Checked in" });
      resetScanner();
    },
  });

  const resetScanner = () => {
    setMode("idle"); setScannedData(""); setFoundImplant(null);
    setManualEntry(false); setManualQr(""); setSelectedCatalog(null);
    setCatLine("all"); setCatBody("all"); setCatDiameter("all"); setCatSearch("");
    setAutoFilled(false); setIsProcessing(false);
    setForm({ lotNumber: "", expirationDate: "", supplier: "", cost: "", location: "", notes: "", brand: "", productName: "", refNumber: "", diameter: "", length: "", size: "" });
  };

  useEffect(() => {
    return () => { if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} } };
  }, []);

  // Catalog filtering
  const lines = [...new Set(catalog.map(c => c.line))];
  const filteredByLine = catLine === "all" ? catalog : catalog.filter(c => c.line === catLine);
  const bodies = [...new Set(filteredByLine.map(c => c.body))];
  const filteredByBody = catBody === "all" ? filteredByLine : filteredByLine.filter(c => c.body === catBody);
  const diameters = [...new Set(filteredByBody.map(c => c.diameter))].sort((a,b) => parseFloat(a) - parseFloat(b));
  const filteredByDiameter = catDiameter === "all" ? filteredByBody : filteredByBody.filter(c => c.diameter === catDiameter);
  const filteredCatalog = catSearch
    ? filteredByDiameter.filter(c => `${c.body} ${c.line} ${c.diameter} ${c.length} ${c.refNumber}`.toLowerCase().includes(catSearch.toLowerCase()))
    : filteredByDiameter;

  // Group by diameter for display
  const groupedByDiameter: Record<string, CatalogItem[]> = {};
  filteredCatalog.forEach(c => {
    if (!groupedByDiameter[c.diameter]) groupedByDiameter[c.diameter] = [];
    groupedByDiameter[c.diameter].push(c);
  });
  const sortedDiameters = Object.keys(groupedByDiameter).sort((a,b) => parseFloat(a) - parseFloat(b));

  return (
    <div className="px-4 pt-5 pb-24 space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-scanner-title">Scan</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {mode === "selectCatalog" ? "Select implant model" : mode === "manualForm" ? "Enter details" : "Scan barcode or enter manually"}
        </p>
      </div>

      {/* Session staff badge */}
      {(mode === "idle" || mode === "scanning") && sessionStaff && (
        <div className="rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/15 px-3.5 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[11px] font-bold text-primary">{sessionStaff.charAt(0)}</span>
          </div>
          <div>
            <span className="text-[13px] font-medium">{sessionStaff}</span>
            <p className="text-[10px] text-muted-foreground">All actions tagged to you</p>
          </div>
        </div>
      )}

      {/* ========== IDLE ========== */}
      {mode === "idle" && (
        <div className="space-y-3">
          <button
            onClick={startScanner}
            data-testid="button-start-scan"
            className="w-full rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 p-8 flex flex-col items-center gap-3 hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors active:scale-[0.98]"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Open Camera</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Point at barcode on implant box</p>
            </div>
          </button>

          <button
            onClick={() => setManualEntry(!manualEntry)}
            data-testid="button-manual-entry"
            className="w-full rounded-xl border border-border/60 bg-card p-3.5 flex items-center gap-3 hover:bg-muted/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Manual Entry</span>
          </button>

          {manualEntry && (
            <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Type or paste the barcode text from the implant box
              </p>
              <div className="flex gap-2">
                <Input
                  data-testid="input-manual-qr"
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                  placeholder="(01)07899878...(17)260901(10)LOT..."
                  className="h-10 rounded-lg text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  autoFocus
                />
                <Button onClick={handleManualSubmit} data-testid="button-manual-submit" className="h-10 rounded-lg px-5">Go</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== SCANNING ========== */}
      {mode === "scanning" && (
        <div className="rounded-2xl overflow-hidden border border-border/60">
          <div ref={containerRef} className="w-full aspect-[3/4] bg-black relative overflow-hidden">
            {/* Scan overlay frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-[65%] aspect-square relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            </div>
            {/* Scanning indicator */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[11px] text-white font-medium">Scanning for barcode...</span>
              </div>
            </div>
          </div>
          <div className="p-3">
            <Button variant="ghost" onClick={resetScanner} className="w-full h-10 rounded-xl text-sm" data-testid="button-cancel-scan">Cancel</Button>
          </div>
        </div>
      )}

      {/* ========== PROCESSING ========== */}
      {isProcessing && (
        <div className="rounded-2xl border border-border/60 bg-card p-8 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Reading barcode data...</p>
        </div>
      )}

      {/* ========== FOUND ========== */}
      {mode === "found" && foundImplant && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/8 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-semibold text-primary">Found in Inventory</span>
            </div>
            <div className="space-y-2">
              <DetailLine label="Brand" value={foundImplant.brand} />
              <DetailLine label="Product" value={foundImplant.productName} />
              <DetailLine label="Size" value={`Ø${foundImplant.diameter}×${foundImplant.length}mm`} />
              <DetailLine label="Lot #" value={foundImplant.lotNumber} />
              <DetailLine label="Status" value={foundImplant.status === "in" ? "In Stock" : "Checked Out"} valueClass={foundImplant.status === "in" ? "text-emerald-500" : "text-amber-500"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {foundImplant.status === "in" ? (
              <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} className="h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold" data-testid="button-checkout">
                <ArrowUpRight className="w-4 h-4 mr-1.5" />Check Out
              </Button>
            ) : (
              <Button onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending} className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold" data-testid="button-checkin">
                <ArrowDownLeft className="w-4 h-4 mr-1.5" />Check In
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/implant/${foundImplant.id}`)} className="h-11 rounded-xl font-semibold" data-testid="button-view-detail">Details</Button>
          </div>

          <button onClick={resetScanner} className="w-full text-center text-[13px] text-muted-foreground py-2 hover:text-foreground transition-colors" data-testid="button-scan-another">Scan another</button>
        </div>
      )}

      {/* ========== SELECT FROM CATALOG ========== */}
      {mode === "selectCatalog" && (
        <div className="space-y-3">
          {/* QR data banner */}
          <div className="rounded-xl bg-blue-500/8 dark:bg-blue-500/10 border border-blue-200/40 dark:border-blue-800/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[13px] font-semibold text-blue-600 dark:text-blue-400">QR Scanned</span>
            </div>
            <p className="text-[11px] text-blue-500/70 mt-0.5 truncate font-mono">{scannedData}</p>
          </div>

          {/* Filter pills */}
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["all", ...lines].map(l => (
                <button
                  key={l}
                  onClick={() => { setCatLine(l); setCatBody("all"); setCatDiameter("all"); }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${catLine === l ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                >
                  {l === "all" ? "All Lines" : l}
                </button>
              ))}
            </div>

            {bodies.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["all", ...bodies].map(b => (
                  <button
                    key={b}
                    onClick={() => { setCatBody(b); setCatDiameter("all"); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${catBody === b ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                  >
                    {b === "all" ? "All Bodies" : b}
                  </button>
                ))}
              </div>
            )}

            {diameters.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {["all", ...diameters].map(d => (
                  <button
                    key={d}
                    onClick={() => setCatDiameter(d)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${catDiameter === d ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                  >
                    {d === "all" ? "All Ø" : `Ø${d}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Catalog list grouped by diameter */}
          <div className="space-y-3">
            {sortedDiameters.map(diam => (
              <div key={diam}>
                <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5">Ø{diam} mm</h4>
                <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/30 overflow-hidden">
                  {groupedByDiameter[diam]
                    .sort((a, b) => parseFloat(a.length) - parseFloat(b.length))
                    .map(item => (
                      <button
                        key={item.id}
                        onClick={() => pickCatalogItem(item)}
                        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-muted/30 transition-colors text-left"
                        data-testid={`catalog-item-${item.id}`}
                      >
                        <div>
                          <div className="text-[13px] font-medium">{item.body} · Ø{item.diameter}×{item.length}mm</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{item.surface} · REF {item.refNumber}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            ))}

            {sortedDiameters.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">No matches found</p>
              </div>
            )}
          </div>

          {/* Not listed button */}
          <button
            onClick={goManualForm}
            className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/5 dark:bg-primary/8 p-3.5 flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
            data-testid="button-not-listed"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-primary">Not Listed — Add Manually</span>
          </button>

          <button onClick={resetScanner} className="w-full text-center text-[13px] text-muted-foreground py-2 hover:text-foreground transition-colors">Cancel</button>
        </div>
      )}

      {/* ========== MANUAL / DETAIL FORM ========== */}
      {mode === "manualForm" && (
        <div className="space-y-3">
          {/* Auto-filled banner (when GTIN matched) */}
          {autoFilled && selectedCatalog ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Auto-detected from barcode
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground">
                {selectedCatalog.brand} · {selectedCatalog.body === selectedCatalog.line ? selectedCatalog.body : `${selectedCatalog.body} ${selectedCatalog.line}`} · Ø{selectedCatalog.diameter}×{selectedCatalog.length}mm
              </p>
              <p className="text-[12px] text-muted-foreground">
                REF {selectedCatalog.refNumber} · Lot: {form.lotNumber || "—"} · Exp: {form.expirationDate || "—"}
              </p>
            </div>
          ) : selectedCatalog ? (
            /* Regular selected catalog banner */
            <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/8 px-3.5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[13px] font-semibold text-primary">
                  {selectedCatalog.body === selectedCatalog.line ? selectedCatalog.body : `${selectedCatalog.body} ${selectedCatalog.line}`}
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Ø{selectedCatalog.diameter}×{selectedCatalog.length}mm · {selectedCatalog.surface} · REF {selectedCatalog.refNumber}
              </p>
              <button onClick={() => { setSelectedCatalog(null); setMode("selectCatalog"); }} className="text-[11px] text-primary mt-1.5 font-medium">Change selection</button>
            </div>
          ) : null}

          {/* Session staff badge in form */}
          {sessionStaff && (
            <div className="rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/15 px-3.5 py-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{sessionStaff.charAt(0)}</span>
              </div>
              <span className="text-[12px] font-medium">Adding as {sessionStaff}</span>
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
            {/* Show brand/product/size fields only if no catalog item selected */}
            {!selectedCatalog && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <FieldInput testId="input-brand" label="Brand" value={form.brand} onChange={v => setForm(f => ({...f, brand: v}))} placeholder="Neodent" />
                  <FieldInput testId="input-product-name" label="Product" value={form.productName} onChange={v => setForm(f => ({...f, productName: v}))} placeholder="Helix GM" />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <FieldInput testId="input-diameter" label="Diameter" value={form.diameter} onChange={v => setForm(f => ({...f, diameter: v}))} placeholder="4.0" />
                  <FieldInput testId="input-length" label="Length" value={form.length} onChange={v => setForm(f => ({...f, length: v}))} placeholder="10.0" />
                  <FieldInput testId="input-ref" label="REF #" value={form.refNumber} onChange={v => setForm(f => ({...f, refNumber: v}))} placeholder="140.978" />
                </div>
              </>
            )}

            {/* Always shown */}
            <div className="grid grid-cols-2 gap-2.5">
              <FieldInput testId="input-lot" label="Lot #" value={form.lotNumber} onChange={v => setForm(f => ({...f, lotNumber: v}))} placeholder="LOT12345" />
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Expiration</Label>
                <Input data-testid="input-expiration" type="date" value={form.expirationDate} onChange={e => setForm(f => ({...f, expirationDate: e.target.value}))} className="h-10 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <FieldInput testId="input-supplier" label="Supplier" value={form.supplier} onChange={v => setForm(f => ({...f, supplier: v}))} placeholder="Henry Schein" />
              <FieldInput testId="input-cost" label="Cost" value={form.cost} onChange={v => setForm(f => ({...f, cost: v}))} placeholder="$0.00" />
            </div>
            <FieldInput testId="input-location" label="Location" value={form.location} onChange={v => setForm(f => ({...f, location: v}))} placeholder="Cabinet A" />
            <FieldInput testId="input-notes" label="Notes" value={form.notes} onChange={v => setForm(f => ({...f, notes: v}))} placeholder="Optional..." />

            <div className="flex gap-2 pt-1">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex-1 h-11 rounded-xl font-semibold" data-testid="button-save-implant">
                {createMutation.isPending ? "Saving..." : "Add to Inventory"}
              </Button>
              <Button variant="ghost" size="icon" onClick={resetScanner} className="h-11 w-11 rounded-xl" data-testid="button-cancel-add">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({ testId, label, value, onChange, placeholder }: { testId: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</Label>
      <Input data-testid={testId} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-10 rounded-lg text-sm" />
    </div>
  );
}

function DetailLine({ label, value, valueClass }: { label: string; value?: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass || ""}`}>{value || "—"}</span>
    </div>
  );
}
