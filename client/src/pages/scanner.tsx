import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Plus, CheckCircle2, ArrowDownLeft, ArrowUpRight, Package, Keyboard } from "lucide-react";
import { useLocation } from "wouter";
import type { Staff, Implant } from "@shared/schema";

type ScanMode = "idle" | "scanning" | "found" | "new";

export default function Scanner() {
  const [mode, setMode] = useState<ScanMode>("idle");
  const [scannedData, setScannedData] = useState("");
  const [foundImplant, setFoundImplant] = useState<Implant | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualQr, setManualQr] = useState("");
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const [selectedStaff, setSelectedStaff] = useState("");

  // New implant form state
  const [form, setForm] = useState({
    brand: "",
    productName: "",
    lotNumber: "",
    refNumber: "",
    size: "",
    diameter: "",
    length: "",
    expirationDate: "",
    supplier: "",
    cost: "",
    location: "",
    notes: "",
  });

  const startScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }

    setMode("scanning");

    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 300));

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decoded: string) => {
          handleScanResult(decoded);
          scanner.stop().catch(() => {});
          scannerRef.current = null;
        },
        () => {} // ignore errors during scanning
      );
    } catch (err: any) {
      toast({
        title: "Camera Error",
        description: "Could not access camera. Try using manual entry instead.",
        variant: "destructive",
      });
      setMode("idle");
    }
  }, []);

  const handleScanResult = async (data: string) => {
    setScannedData(data);
    
    // Try to find existing implant with this QR
    try {
      const res = await apiRequest("GET", `/api/implants/qr/${encodeURIComponent(data)}`);
      const implant = await res.json();
      setFoundImplant(implant);
      setMode("found");
    } catch {
      // Not found — new implant
      setFoundImplant(null);
      setMode("new");
      // Try to auto-parse common QR formats
      tryParseQr(data);
    }
  };

  const tryParseQr = (data: string) => {
    // Try parsing common dental implant QR/barcode formats
    const newForm = { ...form };
    
    // GS1 format parsing (common in medical devices)
    // (01)GTIN (10)LOT (17)EXP (21)SERIAL
    const gs1Gtin = data.match(/\(01\)(\d{14})/);
    const gs1Lot = data.match(/\(10\)([^\(]+)/);
    const gs1Exp = data.match(/\(17\)(\d{6})/);
    const gs1Serial = data.match(/\(21\)([^\(]+)/);
    
    if (gs1Gtin) newForm.refNumber = gs1Gtin[1];
    if (gs1Lot) newForm.lotNumber = gs1Lot[1];
    if (gs1Exp) {
      const exp = gs1Exp[1];
      newForm.expirationDate = `20${exp.slice(0,2)}-${exp.slice(2,4)}-${exp.slice(4,6)}`;
    }
    if (gs1Serial) newForm.refNumber = gs1Serial[1];

    // If it's a URL, extract what we can
    if (data.startsWith("http")) {
      newForm.notes = `Scanned URL: ${data}`;
    }

    // If it's plain text with delimiters
    if (data.includes("|") || data.includes(",")) {
      const parts = data.split(/[|,]/);
      if (parts.length >= 2) {
        newForm.brand = parts[0]?.trim() || "";
        newForm.productName = parts[1]?.trim() || "";
        if (parts[2]) newForm.lotNumber = parts[2].trim();
        if (parts[3]) newForm.refNumber = parts[3].trim();
      }
    }

    setForm(newForm);
  };

  const handleManualSubmit = () => {
    if (!manualQr.trim()) return;
    handleScanResult(manualQr.trim());
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/implants", {
        qrData: scannedData,
        ...form,
        quantity: 1,
        status: "in",
        addedBy: selectedStaff || "Unknown",
        addedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: (implant: Implant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Added to inventory", description: `${form.brand} ${form.productName}`.trim() || "New implant added" });
      navigate(`/implant/${implant.id}`);
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${foundImplant!.id}/checkout`, {
        staffName: selectedStaff || "Unknown",
        notes: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Checked out", description: `${foundImplant?.brand} ${foundImplant?.productName}` });
      resetScanner();
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${foundImplant!.id}/checkin`, {
        staffName: selectedStaff || "Unknown",
        notes: "",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Checked in", description: `${foundImplant?.brand} ${foundImplant?.productName}` });
      resetScanner();
    },
  });

  const resetScanner = () => {
    setMode("idle");
    setScannedData("");
    setFoundImplant(null);
    setManualEntry(false);
    setManualQr("");
    setForm({
      brand: "", productName: "", lotNumber: "", refNumber: "",
      size: "", diameter: "", length: "", expirationDate: "",
      supplier: "", cost: "", location: "", notes: "",
    });
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-scanner-title">Scan Implant</h2>
        <p className="text-sm text-muted-foreground">Scan a QR code or enter data manually</p>
      </div>

      {/* Staff selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Staff Member</Label>
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger data-testid="select-staff" className="h-10">
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staff.map(s => (
              <SelectItem key={s.id} value={s.name}>{s.name} ({s.role})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scanner Area */}
      {mode === "idle" && (
        <div className="space-y-3">
          <Card className="bg-card">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Ready to Scan</p>
                <p className="text-xs text-muted-foreground mt-1">Point your camera at a QR code on the implant box</p>
              </div>
              <Button onClick={startScanner} data-testid="button-start-scan" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Open Camera
              </Button>
              <Button variant="outline" onClick={() => setManualEntry(true)} data-testid="button-manual-entry" className="w-full">
                <Keyboard className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
            </CardContent>
          </Card>

          {manualEntry && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label className="text-xs">Enter QR Code Data</Label>
                <div className="flex gap-2">
                  <Input
                    data-testid="input-manual-qr"
                    value={manualQr}
                    onChange={(e) => setManualQr(e.target.value)}
                    placeholder="Paste or type QR code content..."
                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  />
                  <Button onClick={handleManualSubmit} data-testid="button-manual-submit">Go</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {mode === "scanning" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div ref={containerRef} id="qr-reader" className="w-full" />
            <div className="p-4">
              <Button variant="outline" onClick={resetScanner} className="w-full" data-testid="button-cancel-scan">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Found existing implant */}
      {mode === "found" && foundImplant && (
        <div className="space-y-3">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary">Implant Found</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand</span>
                  <span className="font-medium">{foundImplant.brand || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{foundImplant.productName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot #</span>
                  <span className="font-medium">{foundImplant.lotNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${foundImplant.status === "in" ? "text-emerald-600" : "text-amber-600"}`}>
                    {foundImplant.status === "in" ? "In Stock" : "Checked Out"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {foundImplant.status === "in" ? (
              <Button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="button-checkout"
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                Check Out
              </Button>
            ) : (
              <Button
                onClick={() => checkinMutation.mutate()}
                disabled={checkinMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-checkin"
              >
                <ArrowDownLeft className="w-4 h-4 mr-1" />
                Check In
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/implant/${foundImplant.id}`)} data-testid="button-view-detail">
              View Details
            </Button>
          </div>

          <Button variant="ghost" onClick={resetScanner} className="w-full text-muted-foreground" data-testid="button-scan-another">
            Scan Another
          </Button>
        </div>
      )}

      {/* New implant form */}
      {mode === "new" && (
        <div className="space-y-3">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">New Implant — Add to Inventory</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1 truncate">QR: {scannedData}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input data-testid="input-brand" value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} placeholder="e.g. Straumann" />
                </div>
                <div>
                  <Label className="text-xs">Product Name</Label>
                  <Input data-testid="input-product-name" value={form.productName} onChange={e => setForm(f => ({...f, productName: e.target.value}))} placeholder="e.g. BLT" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Lot Number</Label>
                  <Input data-testid="input-lot" value={form.lotNumber} onChange={e => setForm(f => ({...f, lotNumber: e.target.value}))} placeholder="Lot #" />
                </div>
                <div>
                  <Label className="text-xs">REF Number</Label>
                  <Input data-testid="input-ref" value={form.refNumber} onChange={e => setForm(f => ({...f, refNumber: e.target.value}))} placeholder="REF #" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Size</Label>
                  <Input data-testid="input-size" value={form.size} onChange={e => setForm(f => ({...f, size: e.target.value}))} placeholder="e.g. Regular" />
                </div>
                <div>
                  <Label className="text-xs">Diameter</Label>
                  <Input data-testid="input-diameter" value={form.diameter} onChange={e => setForm(f => ({...f, diameter: e.target.value}))} placeholder="e.g. 4.1mm" />
                </div>
                <div>
                  <Label className="text-xs">Length</Label>
                  <Input data-testid="input-length" value={form.length} onChange={e => setForm(f => ({...f, length: e.target.value}))} placeholder="e.g. 10mm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Expiration Date</Label>
                  <Input data-testid="input-expiration" type="date" value={form.expirationDate} onChange={e => setForm(f => ({...f, expirationDate: e.target.value}))} />
                </div>
                <div>
                  <Label className="text-xs">Cost</Label>
                  <Input data-testid="input-cost" value={form.cost} onChange={e => setForm(f => ({...f, cost: e.target.value}))} placeholder="$0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Supplier</Label>
                  <Input data-testid="input-supplier" value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} placeholder="Supplier name" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input data-testid="input-location" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="e.g. Cabinet A" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Input data-testid="input-notes" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Optional notes..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-implant"
                >
                  <Package className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? "Saving..." : "Add to Inventory"}
                </Button>
                <Button variant="outline" onClick={resetScanner} data-testid="button-cancel-add">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
