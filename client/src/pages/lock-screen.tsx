import { useState, useRef, useEffect } from "react";
import { Lock } from "lucide-react";
import { LogoWide } from "@/components/logo";

const CORRECT_PIN = "8888";
const UNLOCK_KEY = "88smile_unlocked";

export function useLockScreen() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return window.sessionStorage?.getItem(UNLOCK_KEY) === "true";
    } catch {
      return false;
    }
  });

  const unlock = () => {
    setUnlocked(true);
    try { window.sessionStorage?.setItem(UNLOCK_KEY, "true"); } catch {}
  };

  return { unlocked, unlock };
}

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check PIN when all 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join("");
      if (fullPin === CORRECT_PIN) {
        onUnlock();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 z-50">
      {/* Logo */}
      <div className="mb-4">
        <LogoWide height={52} />
      </div>

      <h1 className="text-lg font-bold tracking-tight mb-1">Implant Inventory</h1>
      <p className="text-sm text-muted-foreground mb-8">Enter PIN to continue</p>

      {/* PIN Input */}
      <div
        className={`flex gap-3 mb-6 ${shake ? "animate-shake" : ""}`}
        data-testid="pin-container"
      >
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            data-testid={`pin-input-${i}`}
            className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-card outline-none transition-all
              ${error
                ? "border-red-400 text-red-400"
                : digit
                  ? "border-primary text-foreground"
                  : "border-border text-foreground focus:border-primary"
              }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4" data-testid="pin-error">
          Incorrect PIN
        </p>
      )}

      <div className="flex items-center gap-2 text-muted-foreground mt-4">
        <Lock className="w-3.5 h-3.5" />
        <span className="text-[11px]">Inventory access is restricted</span>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
