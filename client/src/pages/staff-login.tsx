import { useQuery } from "@tanstack/react-query";
import { UserCircle2 } from "lucide-react";
import type { Staff } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function StaffLogin({ onLogin }: { onLogin: (name: string, role: string) => void }) {
  const { data: staff = [], isLoading } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-50">
      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <text x="3" y="24" fontFamily="system-ui" fontWeight="800" fontSize="22" fill="white">88</text>
        </svg>
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
                onClick={() => onLogin(s.name, s.role)}
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
