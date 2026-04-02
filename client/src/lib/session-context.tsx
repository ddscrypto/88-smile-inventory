import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SessionContextType {
  staffName: string;
  staffRole: string;
  isLoggedIn: boolean;
  login: (name: string, role: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType>({
  staffName: "",
  staffRole: "",
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");

  const login = useCallback((name: string, role: string) => {
    setStaffName(name);
    setStaffRole(role);
  }, []);

  const logout = useCallback(() => {
    setStaffName("");
    setStaffRole("");
  }, []);

  const isLoggedIn = staffName !== "";

  return (
    <SessionContext.Provider value={{ staffName, staffRole, isLoggedIn, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
