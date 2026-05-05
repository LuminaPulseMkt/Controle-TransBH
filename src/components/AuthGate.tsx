import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import type { PermKey } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

export function AuthGate({
  children,
  adminOnly = false,
  requirePermission,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  requirePermission?: PermKey;
}) {
  const { user, loading, isAdmin, can } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const denied =
    (adminOnly && !isAdmin) ||
    (requirePermission && !can(requirePermission));

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h2 className="text-display text-3xl text-primary">Acesso restrito</h2>
          <p className="mt-2 text-muted-foreground">
            Você não tem permissão para acessar este módulo.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
