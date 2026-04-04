import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCircle2, Lock } from "lucide-react";
import type { Staff } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoWide } from "@/components/logo";

type StaffWithPin = Staff & { hasPin: boolean };

const roleColors: Record<string, string> = {
  dentist: "bg-primary/15 text-primary border-primary/20",
  assistant: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

const avatarBg: Record<string, string> = {
  dentist: "bg-primary text-white",
  assistant: "bg-violet-500 text-white",
};

export default function StaffLogin({ onLogin }: { onLogin: (name: string, role: string) => void }) {
  const { data: staff = [], isLoading } = useQuery<StaffWithPin[]>({ queryKey: ["/api/staff"] });

  // Tap name → sign in immediately (PIN 8888 is the security gate)
  const handleStaffTap = (s: StaffWithPin) => {
    onLogin(s.name, s.role);
  };

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
