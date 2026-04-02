import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserCircle2, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import type { Staff } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoWide } from "@/components/logo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const roleColors: Record<string, string> = {
  dentist: "bg-primary/15 text-primary border-primary/20",
  assistant: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  hygienist: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  admin: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

const avatarBg: Record<string, string> = {
  dentist: "bg-primary text-primary-foreground",
  assistant: "bg-violet-500 text-white",
  hygienist: "bg-emerald-500 text-white",
  admin: "bg-blue-500 text-white",
};

type StaffWithPin = Staff & { hasPin?: boolean };

export default function StaffLogin({ onLogin }: { onLogin: (name: string, role: string) => void }) {
  const { toast } = useToast();
  const { data: staff = [], isLoading } = useQuery<StaffWithPin[]>({ queryKey: ["/api/staff"] });
  const [selectedStaff, setSelectedStaff] = useState<StaffWithPin | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      const res = await apiRequest("POST", `/api/staff/${id}/verify-pin`, { pin });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.valid && selectedStaff) {
        onLogin(selectedStaff.name, selectedStaff.role);
      } else {
        setError("Wrong password");
        setPin("");
      }
    },
    onError: () => {
      setError("Wrong password");
      setPin("");
    },
  });

  const setPinMutation = useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      const res = await apiRequest("POST", `/api/staff/${id}/set-pin`, { pin });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password set" });
      if (selectedStaff) {
        onLogin(selectedStaff.name, selectedStaff.role);
      }
    },
    onError: () => {
      setError("Could not set password");
    },
  });

  const handleStaffTap = (s: StaffWithPin) => {
    setSelectedStaff(s);
    setPin("");
    setError("");
    setShowPin(false);
    setIsSettingPin(false);
    setNewPin("");
    setConfirmPin("");

    // If no pin set, prompt them to create one
    if (!s.hasPin) {
      setIsSettingPin(true);
    }
  };

  const handleBack = () => {
    setSelectedStaff(null);
    setPin("");
    setError("");
    setIsSettingPin(false);
    setNewPin("");
    setConfirmPin("");
  };

  const handleVerify = () => {
    if (!selectedStaff || !pin.trim()) return;
    setError("");
    verifyMutation.mutate({ id: selectedStaff.id, pin: pin.trim() });
  };

  const handleSetPin = () => {
    if (!selectedStaff) return;
    if (newPin.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (newPin !== confirmPin) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setPinMutation.mutate({ id: selectedStaff.id, pin: newPin });
  };

  // ── PIN entry / creation screen ──
  if (selectedStaff) {
    const avatarColor = avatarBg[selectedStaff.role] || avatarBg.assistant;

    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-50">
        <button
          onClick={handleBack}
          className="absolute top-5 left-4 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-to-staff"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px]">Back</span>
        </button>

        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-4 ${avatarColor}`}>
          {selectedStaff.name.charAt(0)}
        </div>
        <h2 className="text-lg font-bold tracking-tight mb-0.5">{selectedStaff.name}</h2>
        <p className="text-[11px] text-muted-foreground capitalize mb-6">{selectedStaff.role}</p>

        {isSettingPin ? (
          // ─── First-time: create password ───
          <div className="w-full max-w-xs space-y-3">
            <p className="text-[13px] text-center text-muted-foreground mb-2">Create your password to get started</p>
            <div className="relative">
              <Input
                data-testid="input-new-pin"
                type={showPin ? "text" : "password"}
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value); setError(""); }}
                placeholder="New password"
                className="h-11 rounded-xl text-[14px] bg-muted/40 border-0 focus-visible:ring-1 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              data-testid="input-confirm-pin"
              type={showPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value); setError(""); }}
              placeholder="Confirm password"
              className="h-11 rounded-xl text-[14px] bg-muted/40 border-0 focus-visible:ring-1"
              onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
            />
            {error && <p className="text-[12px] text-red-400 text-center" data-testid="text-pin-error">{error}</p>}
            <Button
              onClick={handleSetPin}
              disabled={!newPin || !confirmPin || setPinMutation.isPending}
              className="w-full h-11 rounded-xl text-[14px] font-semibold"
              data-testid="button-create-pin"
            >
              {setPinMutation.isPending ? "Saving..." : "Create Password & Sign In"}
            </Button>
          </div>
        ) : (
          // ─── Returning: enter password ───
          <div className="w-full max-w-xs space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-staff-pin"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(""); }}
                placeholder="Enter your password"
                className="h-11 rounded-xl text-[14px] bg-muted/40 border-0 focus-visible:ring-1 pl-9 pr-10"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-[12px] text-red-400 text-center" data-testid="text-pin-error">{error}</p>}
            <Button
              onClick={handleVerify}
              disabled={!pin.trim() || verifyMutation.isPending}
              className="w-full h-11 rounded-xl text-[14px] font-semibold"
              data-testid="button-verify-pin"
            >
              {verifyMutation.isPending ? "Checking..." : "Sign In"}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground mt-6">
          <Lock className="w-3 h-3" />
          <span className="text-[10px]">Your actions will be tracked during this session</span>
        </div>
      </div>
    );
  }

  // ── Staff picker grid ──
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-50">
      {/* Logo */}
      <div className="mb-4">
        <LogoWide height={48} />
      </div>

      <h1 className="text-xl font-bold tracking-tight mb-1">Who's working?</h1>
      <p className="text-sm text-muted-foreground mb-8">Tap your name to sign in</p>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {staff.map(s => {
            const colors = roleColors[s.role] || roleColors.assistant;
            const avatar = avatarBg[s.role] || avatarBg.assistant;
            return (
              <button
                key={s.id}
                onClick={() => handleStaffTap(s)}
                data-testid={`staff-login-${s.id}`}
                className={`rounded-2xl border p-4 flex flex-col items-center gap-2 transition-all active:scale-[0.97] hover:shadow-md ${colors}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold ${avatar}`}>
                  {s.name.charAt(0)}
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-semibold">{s.name}</div>
                  <div className="text-[10px] opacity-70 capitalize font-medium">{s.role}</div>
                </div>
                {s.hasPin && <Lock className="w-3 h-3 opacity-40" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-muted-foreground mt-8">
        <UserCircle2 className="w-3.5 h-3.5" />
        <span className="text-[11px]">Your actions will be tracked during this session</span>
      </div>
    </div>
  );
}
