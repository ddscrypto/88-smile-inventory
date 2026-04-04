import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Save, X, Package } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Implant, Activity, Staff } from "@shared/schema";

export default function ImplantDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const { isDoctor } = useSession();

  const { data: implant, isLoading } = useQuery<Implant>({ queryKey: ["/api/implants", id] });
  const { data: activities = [] } = useQuery<Activity[]>({ queryKey: ["/api/activities/implant", id] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [form, setForm] = useState<Partial<Implant>>({});

  const startEditing = () => { if (implant) { setForm({ ...implant }); setEditing(true); } };

  const updateMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("PATCH", `/api/implants/${id}`, form); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Saved" }); setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/implants/${id}`, { staffName: selectedStaff || "Unknown" }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Removed" }); navigate("/inventory");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/implants/${id}/checkout`, { staffName: selectedStaff || "Unknown" }); return res.json(); },
    onSuccess: () => {
      ["/api/implants", "/api/stats", "/api/activities"].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/implant", id] });
      toast({ title: "Checked out" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/implants/${id}/checkin`, { staffName: selectedStaff || "Unknown" }); return res.json(); },
    onSuccess: () => {
      ["/api/implants", "/api/stats", "/api/activities"].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/implant", id] });
      toast({ title: "Checked in" });
    },
  });

  const trashMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/implants/${id}/trash`, { staffName: selectedStaff || "Unknown", notes: "Discarded during surgery" }); return res.json(); },
    onSuccess: () => {
      ["/api/implants", "/api/stats", "/api/activities"].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/implant", id] });
      toast({ title: "Marked as trashed", description: "Item logged as surgical discard" });
    },
  });

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-40 w-full rounded-xl" /></div>;

  if (!implant) return (
    <div className="p-4">
      <Button variant="ghost" onClick={() => navigate("/inventory")} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      <p className="text-muted-foreground text-center py-12">Not found</p>
    </div>
  );

  const isExpired = implant.expirationDate && new Date(implant.expirationDate) < new Date();

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/inventory")} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold tracking-tight truncate" data-testid="text-implant-brand">{implant.brand || "Unknown"}</h2>
          <p className="text-[12px] text-muted-foreground truncate">{implant.productName}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            implant.status === "in" ? "bg-emerald-500" :
            implant.status === "trashed" ? "bg-red-400" : "bg-amber-500"
          }`} />
          <span className={`text-[12px] font-semibold ${
            implant.status === "in" ? "text-emerald-500" :
            implant.status === "trashed" ? "text-red-400" : "text-amber-500"
          }`}>
            {implant.status === "in" ? "In Stock" : implant.status === "trashed" ? "Trashed" : "Out"}
          </span>
          {isExpired && <Badge variant="destructive" className="text-[9px] h-4 ml-1">EXP</Badge>}
        </div>
      </div>

      {/* Action bar */}
      <div className="space-y-2">
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger className="h-10 rounded-xl bg-card border-border/60 text-sm" data-testid="select-staff-detail">
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            {staff.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {implant.status === "trashed" ? (
            // Trashed — can only restore
            <Button onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending} className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
              <ArrowDownLeft className="w-4 h-4 mr-1.5" />Restore to Stock
            </Button>
          ) : implant.status === "in" ? (
            // In stock — can only check out
            <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending} className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold" data-testid="button-checkout-detail">
              <ArrowUpRight className="w-4 h-4 mr-1.5" />Check Out
            </Button>
          ) : (
            // Checked out — can check in OR mark as surgical trash
            <div className="flex-1 flex gap-2">
              <Button onClick={() => checkinMutation.mutate()} disabled={checkinMutation.isPending} className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold" data-testid="button-checkin-detail">
                <ArrowDownLeft className="w-4 h-4 mr-1.5" />Check In
              </Button>
              <Button
                onClick={() => { if (confirm("Mark as surgical discard? This implant was used but too small.")) trashMutation.mutate(); }}
                disabled={trashMutation.isPending}
                variant="outline"
                className="h-11 px-3 rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                data-testid="button-trash"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          <button onClick={editing ? () => setEditing(false) : startEditing} className="w-11 h-11 rounded-xl border border-border/60 flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-edit">
            {editing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
          {isDoctor && (
            <button onClick={() => { if (confirm("Delete this item permanently?")) deleteMutation.mutate(); }} className="w-11 h-11 rounded-xl border border-border/60 flex items-center justify-center hover:bg-destructive/10 text-destructive transition-colors" data-testid="button-delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      {editing ? (
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <EditField label="Brand" value={form.brand || ""} onChange={v => setForm(f => ({...f, brand: v}))} />
            <EditField label="Product" value={form.productName || ""} onChange={v => setForm(f => ({...f, productName: v}))} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <EditField label="Lot #" value={form.lotNumber || ""} onChange={v => setForm(f => ({...f, lotNumber: v}))} />
            <EditField label="REF #" value={form.refNumber || ""} onChange={v => setForm(f => ({...f, refNumber: v}))} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <EditField label="Size" value={form.size || ""} onChange={v => setForm(f => ({...f, size: v}))} />
            <EditField label="Diameter" value={form.diameter || ""} onChange={v => setForm(f => ({...f, diameter: v}))} />
            <EditField label="Length" value={form.length || ""} onChange={v => setForm(f => ({...f, length: v}))} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div><Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Expiration</Label><Input type="date" value={form.expirationDate || ""} onChange={e => setForm(f => ({...f, expirationDate: e.target.value}))} className="h-10 rounded-lg text-sm" /></div>
            {isDoctor && <EditField label="Cost" value={form.cost || ""} onChange={v => setForm(f => ({...f, cost: v}))} />}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <EditField label="Supplier" value={form.supplier || ""} onChange={v => setForm(f => ({...f, supplier: v}))} />
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Location</label>
              <select
                value={form.location || ""}
                onChange={e => setForm(f => ({...f, location: e.target.value}))}
                className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-[14px] font-medium"
              >
                <option value="">— Select —</option>
                <option value="Storage">Storage</option>
                <option value="Lab Wall">Lab Wall</option>
              </select>
            </div>
          </div>
          <EditField label="Notes" value={form.notes || ""} onChange={v => setForm(f => ({...f, notes: v}))} />
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full h-11 rounded-xl font-semibold" data-testid="button-save-edit">
            <Save className="w-4 h-4 mr-2" />Save Changes
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <InfoCell label="Brand" value={implant.brand} />
            <InfoCell label="Product" value={implant.productName} />
            <InfoCell label="Lot #" value={implant.lotNumber} />
            <InfoCell label="REF #" value={implant.refNumber} />
            <InfoCell label="Size" value={implant.size} />
            <InfoCell label={implant.productName?.includes("MUA") ? "GH" : "Diameter"} value={implant.productName?.includes("MUA") ? `${implant.diameter}mm` : implant.diameter} />
            <InfoCell label={implant.productName?.includes("MUA") ? "Angle" : "Length"} value={implant.productName?.includes("MUA") ? implant.length : implant.length} />
            <InfoCell label="Expiration" value={implant.expirationDate} />
            <InfoCell label="Supplier" value={implant.supplier} />
            {isDoctor && <InfoCell label="Cost" value={implant.cost} />}
            <InfoCell label="Location" value={implant.location} />
            <InfoCell label="Added By" value={implant.addedBy} />
          </div>
          {implant.notes && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <span className="text-[11px] font-medium text-muted-foreground">Notes</span>
              <p className="text-[13px] mt-0.5">{implant.notes}</p>
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border/40">
            <span className="text-[11px] font-medium text-muted-foreground">QR Data</span>
            <p className="text-[11px] font-mono mt-0.5 break-all text-muted-foreground/60">{implant.qrData}</p>
          </div>
        </div>
      )}

      {/* Activity */}
      <div>
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">History</h3>
        {activities.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/60 text-center py-6">No activity</p>
        ) : (
          <div className="space-y-0.5">
            {activities.map(act => (
              <div key={act.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" data-testid={`detail-activity-${act.id}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  act.action === "checked_in" ? "bg-emerald-500" :
                  act.action === "checked_out" ? "bg-amber-500" :
                  act.action === "added" ? "bg-primary" : "bg-muted-foreground"
                }`} />
                <span className="text-[13px] font-medium capitalize flex-1">{act.action.replace("_", " ")}</span>
                <span className="text-[11px] text-muted-foreground">{act.staffName}</span>
                <span className="text-[11px] text-muted-foreground/50 tabular-nums">{new Date(act.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <p className="text-[13px] font-semibold truncate mt-0.5">{value || "—"}</p>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-10 rounded-lg text-sm" />
    </div>
  );
}
