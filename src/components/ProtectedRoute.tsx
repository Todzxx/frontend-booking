import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import api from "@/config/api";

interface ProtectedRouteProps {
  adminOnly?: boolean;
  userOnly?: boolean;
}

export default function ProtectedRoute({
  adminOnly = false,
  userOnly = false,
}: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.data);
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary" />
      </div>
    );
  }

  if (!token) {
    return <Navigate replace to="/login" />;
  }

  if (adminOnly && user?.role !== "ADMIN") {
    return <Navigate replace to="/" />;
  }

  if (userOnly && user?.role === "ADMIN") {
    return <Navigate replace to="/admin" />;
  }

  return <Outlet />;
}
