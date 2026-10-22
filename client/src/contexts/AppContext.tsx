import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

/** Local display preferences only. Authentication and account data come from protected server procedures. */
interface AppContextType {
  login: (email: string) => void;
  logout: () => void;
  quietMode: boolean;
  setQuietMode: (value: boolean) => void;
  simplifyJobs: boolean;
  setSimplifyJobs: (value: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quietMode, setQuietMode] = useState<boolean>(() => localStorage.getItem("jutjut_quiet") === "true");
  const [simplifyJobs, setSimplifyJobs] = useState<boolean>(() => localStorage.getItem("jutjut_simplify_jobs") === "true");
  useEffect(() => { document.body.classList.toggle("quiet-mode", quietMode); localStorage.setItem("jutjut_quiet", String(quietMode)); }, [quietMode]);
  useEffect(() => { localStorage.setItem("jutjut_simplify_jobs", String(simplifyJobs)); }, [simplifyJobs]);
  const login = (_email: string) => toast.info("Use the secure sign-in button to access your account.");
  const logout = () => toast.info("Use the account menu to sign out securely.");
  return <AppContext.Provider value={{ login, logout, quietMode, setQuietMode, simplifyJobs, setSimplifyJobs }}>{children}</AppContext.Provider>;
};
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error("useApp must be used within an AppProvider"); return context; };
