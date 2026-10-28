import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "tutor" | "parent" | "student" | "admin";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const clearStoredAuth = () => {
      localStorage.removeItem("scholix_token");
      localStorage.removeItem("scholix_user");
      if (active) {
        setToken(null);
        setUser(null);
      }
    };

    const handleInvalidToken = () => clearStoredAuth();
    window.addEventListener("scholix:auth-invalid", handleInvalidToken);

    const restoreSession = async () => {
      const storedToken = localStorage.getItem("scholix_token");
      if (!storedToken) {
        clearStoredAuth();
        if (active) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (!response.ok) throw new Error("Stored session is no longer valid");
        const currentUser = (await response.json()) as AuthUser;
        if (!active) return;
        setToken(storedToken);
        setUser(currentUser);
        localStorage.setItem("scholix_user", JSON.stringify(currentUser));
      } catch {
        clearStoredAuth();
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => {
      active = false;
      window.removeEventListener("scholix:auth-invalid", handleInvalidToken);
    };
  }, []);

  const login = (user: AuthUser, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem("scholix_token", token);
    localStorage.setItem("scholix_user", JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("scholix_token");
    localStorage.removeItem("scholix_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
