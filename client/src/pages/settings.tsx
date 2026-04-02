import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Info, Smartphone, Pencil, Check, X } from "lucide-react";
import type { Staff } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("assistant");

  // Inline edit state: null = no edit, otherwise the id being edited
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("assistant");

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRole(s.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditRole("assistant");
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/staff", { name: newName, role: newRole });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setNewName("");
      setNewRole("assistant");
      toast({ title: "Staff added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff removed" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, role }: { id: number; name: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/staff/${id}`, { name, role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      cancelEdit();
      toast({ title: "Staff updated" });
    },
  });

  const saveEdit = () => {
    if (!editName.trim() || editingId === null) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), role: editRole });
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "dentist": return "text-primary";
      case "hygienist": return "text-emerald-500";
      case "admin": return "text-blue-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight" data-testid="text-settings-title">Settings</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage staff & preferences</p>
      </div>

      {/* Staff management */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-muted-foreground/70" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Staff Members</h3>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
          {/* Add new */}
          <div className="p-3 border-b border-border/40">
            <div className="flex gap-2">
              <Input
                data-testid="input-staff-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="flex-1 h-9 rounded-xl text-[13px] bg-muted/40 border-0 focus-visible:ring-1"
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && addMutation.mutate()}
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[110px] h-9 rounded-xl text-[13px] bg-muted/40 border-0" data-testid="select-staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dentist">Dentist</SelectItem>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="hygienist">Hygienist</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newName.trim() || addMutation.isPending}
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0"
                data-testid="button-add-staff"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Staff list */}
          <div className="divide-y divide-border/30">
            {staff.map(s => (
              <div key={s.id} className="px-3 py-2.5 hover:bg-muted/30 transition-colors" data-testid={`staff-row-${s.id}`}>
                {editingId === s.id ? (
                  /* Inline edit mode */
                  <div className="flex items-center gap-2">
                    <Input
                      data-testid={`input-edit-name-${s.id}`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-8 rounded-lg text-[13px] bg-muted/40 border-0 focus-visible:ring-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <Select value={editRole} onValueChange={setEditRole}>
                      <SelectTrigger
                        className="w-[100px] h-8 rounded-lg text-[12px] bg-muted/40 border-0 shrink-0"
                        data-testid={`select-edit-role-${s.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dentist">Dentist</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                        <SelectItem value="hygienist">Hygienist</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 shrink-0"
                      onClick={saveEdit}
                      disabled={!editName.trim() || updateMutation.isPending}
                      data-testid={`button-save-staff-${s.id}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0"
                      onClick={cancelEdit}
                      data-testid={`button-cancel-edit-${s.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  /* Normal display mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-[13px] font-semibold text-muted-foreground">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-[13px] font-medium">{s.name}</span>
                        <span className={`text-[11px] ml-2 capitalize font-medium ${roleColor(s.role)}`}>{s.role}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                        onClick={() => startEdit(s)}
                        data-testid={`button-edit-staff-${s.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive rounded-lg hover:bg-destructive/10"
                        onClick={() => deleteMutation.mutate(s.id)}
                        data-testid={`button-delete-staff-${s.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {staff.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-muted-foreground/60">No staff members added</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">About</h3>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/30">
          <InfoRow label="Practice" value="88 Smile Designs" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Purpose" value="Implant Inventory" />
        </div>

        {/* PWA hint */}
        <div className="mt-3 rounded-xl bg-primary/5 dark:bg-primary/8 border border-primary/10 p-3.5 flex gap-3 items-start">
          <Smartphone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Add this app to your iPhone home screen for the best experience — tap the{" "}
            <span className="font-medium text-foreground">Share</span> button in Safari, then{" "}
            <span className="font-medium text-foreground">"Add to Home Screen."</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium">{value}</span>
    </div>
  );
}
