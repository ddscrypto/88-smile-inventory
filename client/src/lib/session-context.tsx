import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SessionContextType {
  staffName: string;
  staffRole: string;
  isLoggedIn: boolean;
  isDoctor: boolean; // Only Dr. Destine can modify/delete
  login: (name: string, role: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType>({
  staffName: "",
  staffRole: "",
  isLoggedIn: false,
  isDoctor: false,
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
  const isDoctor = staffRole === "dentist";

  return (
    <SessionContext.Provider value={{ staffName, staffRole, isLoggedIn, isDoctor, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
