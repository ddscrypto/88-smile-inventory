import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { UserCircle2, Lock, Eye, EyeOff, ArrowLeft, ScanFace } from "lucide-react";
import type { Staff } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoWide } from "@/components/logo";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// WebAuthn helpers for Face ID / Touch ID
async function registerFaceId(staffId: number, staffName: string): Promise<boolean> {
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) return false;
    const challengeRes = await apiRequest("GET", "/api/webauthn/challenge");
    const { challenge } = await challengeRes.json();
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0)),
        rp: { name: "88 Smile Designs", id: location.hostname },
        user: { id: new TextEncoder().encode(`staff-${staffId}`), name: staffName, displayName: staffName },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      }
    }) as PublicKeyCredential;
    if (!credential) return false;
    const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
      .replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
    await apiRequest("POST", `/api/staff/${staffId}/webauthn/register`, { credentialId: credId });
    return true;
  } catch { return false; }
}

async function authenticateWithFaceId(staffId: number): Promise<boolean> {
  try {
    const credRes = await apiRequest("GET", `/api/staff/${staffId}/webauthn/credential`);
    const { credentialId } = await credRes.json();
    if (!credentialId) return false;
    const challengeRes = await apiRequest("GET", "/api/webauthn/challenge");
    const { challenge } = await challengeRes.json();
    const credIdBytes = Uint8Array.from(atob(credentialId.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: Uint8Array.from(atob(challenge.replace(/-/g,"+").replace(/_/g,"/")), c => c.charCodeAt(0)),
        allowCredentials: [{ id: credIdBytes, type: "public-key", transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      }
    });
    return !!assertion;
  } catch { return false; }
}

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
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [hasFaceId, setHasFaceId] = useState(false);
  const [faceIdAvailable, setFaceIdAvailable] = useState(false);

  // Check Face ID availability and if staff has it registered
  const checkFaceId = async (s: StaffWithPin) => {
    const supported = typeof PublicKeyCredential !== "undefined" &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    setFaceIdAvailable(!!supported);
    if (supported) {
      const credRes = await apiRequest("GET", `/api/staff/${s.id}/webauthn/credential`).then(r => r.json()).catch(() => ({}));
      setHasFaceId(!!credRes.credentialId);
    }
  };

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
    setHasFaceId(false);
    checkFaceId(s);
    setIsSettingPin(false);
    setNewPin("");

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
    setError("");
    setPinMutation.mutate({ id: selectedStaff.id, pin: newPin });
  };

  // ── PIN entry / creation screen ──
  if (selectedStaff) {
    const avatarColor = avatarBg[selectedStaff.role] || avatarBg.assistant;

    return (
      <div className="fixed inset-0 bg-background flex flex-col px-6 z-50 overflow-y-auto">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors pt-5 pb-3 self-start"
          data-testid="button-back-to-staff"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px]">Back</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-4 ${avatarColor}`}>
            {selectedStaff.name.charAt(0)}
          </div>
          <h2 className="text-lg font-bold tracking-tight mb-0.5">{selectedStaff.name}</h2>
          <p className="text-[11px] text-muted-foreground capitalize mb-8">{selectedStaff.role}</p>

          {isSettingPin ? (
            // ─── First-time: create password (single field, no confirm) ───
            <div className="w-full max-w-xs">
              <p className="text-[14px] text-center font-medium text-foreground mb-1">Create a password</p>
              <p className="text-[12px] text-center text-muted-foreground mb-5">You'll use this to sign in next time</p>

              {/* form wrapper with autoComplete=off suppresses Safari keychain on ALL inputs inside */}
              <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleSetPin(); }}>
              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-new-pin"
                    type="text"
                    name="app-password"
                    inputMode="text"
                    value={newPin}
                    onChange={(e) => { setNewPin(e.target.value); setError(""); }}
                    placeholder="Enter password"
                    className="h-12 rounded-xl text-[15px] bg-white dark:bg-card border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30 pl-10 pr-10"
                    style={{ WebkitTextSecurity: showPin ? "none" : "disc" } as any}
                    autoFocus
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    onKeyDown={(e) => e.key === "Enter" && handleSetPin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newPin.length > 0 && newPin.length < 4 && (
                  <p className="text-[11px] text-muted-foreground text-center">At least 4 characters</p>
                )}
                {error && <p className="text-[12px] text-red-500 text-center font-medium" data-testid="text-pin-error">{error}</p>}

                <Button
                  type="submit"
                  disabled={newPin.length < 4 || setPinMutation.isPending}
                  className="w-full h-12 rounded-xl text-[15px] font-semibold mt-1"
                  data-testid="button-create-pin"
                >
                  {setPinMutation.isPending ? "Saving..." : "Set Password & Sign In"}
                </Button>
              </div>
              </form>
            </div>
          ) : (
            // ─── Returning: enter password (or Face ID) ───
            <div className="w-full max-w-xs">
              <p className="text-[14px] text-center font-medium text-foreground mb-5">Enter your password</p>

              {/* Face ID button — shows if registered */}
              {hasFaceId && (
                <Button
                  onClick={async () => {
                    setFaceIdLoading(true);
                    setError("");
                    const ok = await authenticateWithFaceId(selectedStaff!.id);
                    setFaceIdLoading(false);
                    if (ok) {
                      onLogin(selectedStaff!.name, selectedStaff!.role);
                    } else {
                      setError("Face ID failed. Enter your password.");
                    }
                  }}
                  disabled={faceIdLoading}
                  className="w-full h-12 rounded-xl text-[15px] font-semibold mb-3 bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2"
                >
                  <ScanFace className="w-5 h-5" />
                  {faceIdLoading ? "Verifying..." : "Sign in with Face ID"}
                </Button>
              )}

              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-staff-pin"
                    type="text"
                    inputMode="text"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(""); }}
                    placeholder="Password"
                    className="h-12 rounded-xl text-[15px] bg-white dark:bg-card border-border/50 focus-visible:ring-2 focus-visible:ring-primary/30 pl-10 pr-10"
                    style={{ WebkitTextSecurity: showPin ? "none" : "disc" } as any}
                    autoFocus={!hasFaceId}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {error && <p className="text-[12px] text-red-500 text-center font-medium" data-testid="text-pin-error">{error}</p>}
                <Button
                  onClick={handleVerify}
                  disabled={!pin.trim() || verifyMutation.isPending}
                  className="w-full h-12 rounded-xl text-[15px] font-semibold"
                  data-testid="button-verify-pin"
                >
                  {verifyMutation.isPending ? "Checking..." : "Sign In"}
                </Button>

                {/* Set up Face ID — shows if supported but not yet registered */}
                {faceIdAvailable && !hasFaceId && (
                  <button
                    onClick={async () => {
                      setError("");
                      const ok = await registerFaceId(selectedStaff!.id, selectedStaff!.name);
                      if (ok) {
                        setHasFaceId(true);
                        toast({ title: "Face ID set up ✓", description: "You can now sign in with Face ID" });
                      } else {
                        toast({ title: "Face ID not available", description: "Use your password to sign in", variant: "destructive" });
                      }
                    }}
                    className="w-full text-[12px] text-primary text-center font-medium mt-1"
                  >
                    Set up Face ID for faster login
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground mt-8">
            <Lock className="w-3 h-3" />
            <span className="text-[10px]">Your actions will be tracked during this session</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Staff picker grid ──
  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50 overflow-y-auto">
      <div className="flex flex-col items-center px-6 pt-10 pb-8 min-h-full">
        {/* Logo */}
        <div className="mb-3">
          <LogoWide height={38} />
        </div>

        <h1 className="text-[20px] font-bold tracking-tight mb-0.5">Who's working?</h1>
        <p className="text-[13px] text-muted-foreground mb-5">Tap your name to sign in</p>

        {/* Staff Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm">
            {staff.map(s => {
              const colors = roleColors[s.role] || roleColors.assistant;
              const avatar = avatarBg[s.role] || avatarBg.assistant;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStaffTap(s)}
                  data-testid={`staff-login-${s.id}`}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97] hover:shadow-md ${colors}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold ${avatar}`}>
                    {s.name.charAt(0)}
                  </div>
                  <div className="text-center">
                    <div className="text-[12px] font-semibold leading-tight">{s.name}</div>
                    <div className="text-[10px] opacity-70 capitalize font-medium">{s.role}</div>
                  </div>
                  {s.hasPin && <Lock className="w-3 h-3 opacity-40" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 text-muted-foreground mt-6">
          <UserCircle2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">Your actions will be tracked during this session</span>
        </div>
      </div>
    </div>
  );
}
