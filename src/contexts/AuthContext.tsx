import React, { createContext, useContext, useEffect, useState } from "react";

import api from "@/config/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (token: string, refreshToken: string, userData: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.data);
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newRefreshToken: string, userData: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setUser(null);
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken });
      } catch {
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
