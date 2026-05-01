import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RequireEdit({ children }: { children: React.ReactNode }) {
  const { canEdit } = useAuth();
  return canEdit ? <>{children}</> : <Navigate to="/" replace />;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}
