import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { dateBR } from "@/lib/format";
import { Shield, User } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/users")({
  component: () => (
    <AuthGate requirePermission="users.manage">
      <UsersPage />
    </AuthGate>
  ),
});

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role: string;
}

function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap: Record<string, string> = {};
    roles?.forEach((r) => (roleMap[r.user_id] = r.role));
    const merged: UserRow[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      email: p.email,
      is_active: p.is_active,
      last_login_at: p.last_login_at,
      created_at: p.created_at,
      role: roleMap[p.user_id] ?? "collaborator",
    }));
    setUsers(merged);
  };
  useEffect(() => { void load(); }, []);

  const toggleActive = async (u: UserRow) => {
    const { error } = await supabase.from("profiles").update({ is_active: !u.is_active }).eq("user_id", u.user_id);
    if (error) return toast.error(error.message);
    toast.success(u.is_active ? "Usuário desativado." : "Usuário ativado.");
    void load();
  };

  const setRole = async (u: UserRow, role: "administrator" | "collaborator") => {
    if (u.role === role) return;
    // Delete existing roles, insert new
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", u.user_id);
    if (delErr) return toast.error(delErr.message);
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: u.user_id, role });
    if (insErr) return toast.error(insErr.message);
    toast.success("Papel atualizado.");
    void load();
  };

  return (
    <AppLayout title="Usuários">
      <Card className="overflow-hidden">
        {!users ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        {u.role === "administrator" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{u.display_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRole(u, "administrator")}
                        className={`text-xs px-2 py-1 rounded border ${u.role === "administrator" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        Admin
                      </button>
                      <button
                        onClick={() => setRole(u, "collaborator")}
                        className={`text-xs px-2 py-1 rounded border ${u.role === "collaborator" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        Colaborador
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{dateBR(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Switch checked={u.is_active} onCheckedChange={() => toggleActive(u)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-3">
        Novos colaboradores podem se cadastrar pela tela de login. Após o cadastro, eles entram como colaborador por padrão e podem ser promovidos a administrador aqui.
      </p>
    </AppLayout>
  );
}
