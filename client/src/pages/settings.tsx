import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Info } from "lucide-react";
import type { Staff } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("assistant");

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

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-settings-title">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage staff and app preferences</p>
      </div>

      {/* Staff management */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Staff Members</h3>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Add new */}
            <div className="flex gap-2">
              <Input
                data-testid="input-staff-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && addMutation.mutate()}
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-32" data-testid="select-staff-role">
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
                data-testid="button-add-staff"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Staff list */}
            <div className="space-y-1">
              {staff.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md hover:bg-muted/50 group" data-testid={`staff-row-${s.id}`}>
                  <div>
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 capitalize">{s.role}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteMutation.mutate(s.id)}
                    data-testid={`button-delete-staff-${s.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {staff.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No staff members added</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* App info */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">About</h3>
        </div>
        <Card>
          <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>App</span>
              <span className="font-medium text-foreground">DentaTrack</span>
            </div>
            <div className="flex justify-between">
              <span>Version</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Purpose</span>
              <span>Dental Implant Inventory</span>
            </div>
            <p className="text-xs pt-2 border-t">
              Add this app to your iPhone home screen for the best experience: tap the Share button in Safari, then "Add to Home Screen."
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
