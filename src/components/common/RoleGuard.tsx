import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-store";
import type { AppRole } from "@/lib/database.types";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  allow: AppRole[];
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: Props) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && role && !allow.includes(role)) {
      toast.error("Access denied", { description: "You don't have permission to view that page." });
    }
  }, [loading, user, role, allow]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (role && !allow.includes(role)) {
    return <Navigate to={role === "customer" ? "/client" : "/employee"} replace />;
  }
  return <>{children}</>;
}
