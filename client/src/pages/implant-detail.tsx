import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Save, X, Clock, Package } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Implant, Activity, Staff } from "@shared/schema";

export default function ImplantDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");

  const { data: implant, isLoading } = useQuery<Implant>({
    queryKey: ["/api/implants", id],
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities/implant", id],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const [form, setForm] = useState<Partial<Implant>>({});

  const startEditing = () => {
    if (!implant) return;
    setForm({ ...implant });
    setEditing(true);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/implants/${id}`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Updated", description: "Implant details saved" });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/implants/${id}`, { staffName: selectedStaff || "Unknown" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Deleted", description: "Item removed from inventory" });
      navigate("/inventory");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${id}/checkout`, {
        staffName: selectedStaff || "Unknown",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/implant", id] });
      toast({ title: "Checked out" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/implants/${id}/checkin`, {
        staffName: selectedStaff || "Unknown",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/implants", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/implants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/implant", id] });
      toast({ title: "Checked in" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!implant) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate("/inventory")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <p className="text-muted-foreground text-center py-12">Implant not found</p>
      </div>
    );
  }

  const isExpired = implant.expirationDate && new Date(implant.expirationDate) < new Date();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/inventory")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate" data-testid="text-implant-brand">{implant.brand || "Unknown Brand"}</h2>
          <p className="text-xs text-muted-foreground truncate">{implant.productName}</p>
        </div>
        <Badge
          className={`shrink-0 ${
            implant.status === "in"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}
        >
          {implant.status === "in" ? "In Stock" : "Checked Out"}
        </Badge>
        {isExpired && <Badge variant="destructive">Expired</Badge>}
      </div>

      {/* Staff + Actions */}
      <div className="space-y-2">
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger className="h-9 text-sm" data-testid="select-staff-detail">
            <SelectValue placeholder="Select staff" />
          </SelectTrigger>
          <SelectContent>
            {staff.map(s => (
              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {implant.status === "in" ? (
            <Button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              data-testid="button-checkout-detail"
            >
              <ArrowUpRight className="w-4 h-4 mr-1" /> Check Out
            </Button>
          ) : (
            <Button
              onClick={() => checkinMutation.mutate()}
              disabled={checkinMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-checkin-detail"
            >
              <ArrowDownLeft className="w-4 h-4 mr-1" /> Check In
            </Button>
          )}
          {!editing ? (
            <Button variant="outline" size="icon" onClick={startEditing} data-testid="button-edit">
              <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="outline" size="icon" onClick={() => setEditing(false)} data-testid="button-cancel-edit">
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm("Remove this item from inventory?")) {
                deleteMutation.mutate();
              }
            }}
            data-testid="button-delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Details */}
      {editing ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Brand</Label><Input value={form.brand || ""} onChange={e => setForm(f => ({...f, brand: e.target.value}))} /></div>
              <div><Label className="text-xs">Product</Label><Input value={form.productName || ""} onChange={e => setForm(f => ({...f, productName: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Lot #</Label><Input value={form.lotNumber || ""} onChange={e => setForm(f => ({...f, lotNumber: e.target.value}))} /></div>
              <div><Label className="text-xs">REF #</Label><Input value={form.refNumber || ""} onChange={e => setForm(f => ({...f, refNumber: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Size</Label><Input value={form.size || ""} onChange={e => setForm(f => ({...f, size: e.target.value}))} /></div>
              <div><Label className="text-xs">Diameter</Label><Input value={form.diameter || ""} onChange={e => setForm(f => ({...f, diameter: e.target.value}))} /></div>
              <div><Label className="text-xs">Length</Label><Input value={form.length || ""} onChange={e => setForm(f => ({...f, length: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Expiration</Label><Input type="date" value={form.expirationDate || ""} onChange={e => setForm(f => ({...f, expirationDate: e.target.value}))} /></div>
              <div><Label className="text-xs">Cost</Label><Input value={form.cost || ""} onChange={e => setForm(f => ({...f, cost: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Supplier</Label><Input value={form.supplier || ""} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} /></div>
              <div><Label className="text-xs">Location</Label><Input value={form.location || ""} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes || ""} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="w-full" data-testid="button-save-edit">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <DetailRow label="Brand" value={implant.brand} />
              <DetailRow label="Product" value={implant.productName} />
              <DetailRow label="Lot #" value={implant.lotNumber} />
              <DetailRow label="REF #" value={implant.refNumber} />
              <DetailRow label="Size" value={implant.size} />
              <DetailRow label="Diameter" value={implant.diameter} />
              <DetailRow label="Length" value={implant.length} />
              <DetailRow label="Expiration" value={implant.expirationDate} />
              <DetailRow label="Supplier" value={implant.supplier} />
              <DetailRow label="Cost" value={implant.cost} />
              <DetailRow label="Location" value={implant.location} />
              <DetailRow label="Added By" value={implant.addedBy} />
            </div>
            {implant.notes && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="text-sm mt-0.5">{implant.notes}</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">QR Data</span>
              <p className="text-xs font-mono mt-0.5 break-all text-muted-foreground">{implant.qrData}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity history */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Activity History
        </h3>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No activity recorded</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map(act => (
              <div key={act.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50 text-sm" data-testid={`detail-activity-${act.id}`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  act.action === "checked_in" ? "bg-emerald-500" :
                  act.action === "checked_out" ? "bg-amber-500" :
                  act.action === "added" ? "bg-primary" :
                  "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium capitalize">{act.action.replace("_", " ")}</span>
                  <span className="text-muted-foreground"> by {act.staffName}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(act.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium truncate">{value || "—"}</p>
    </div>
  );
}
