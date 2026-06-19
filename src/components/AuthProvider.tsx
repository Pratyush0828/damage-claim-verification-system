import { createContext, useContext, useState, type ReactNode } from "react";
import { authApi } from "../services/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("claimlens_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (accessToken: string, nextUser: User) => {
    localStorage.setItem("claimlens_token", accessToken);
    localStorage.setItem("claimlens_user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    persist(result.access_token, result.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await authApi.register(name, email, password);
    persist(result.access_token, result.user);
  };

  const logout = () => {
    localStorage.removeItem("claimlens_token");
    localStorage.removeItem("claimlens_user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

