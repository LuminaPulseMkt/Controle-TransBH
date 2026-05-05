import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { dateBR } from "@/lib/format";
import { Shield, User, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  COLLABORATOR_DEFAULTS,
  type PermKey,
} from "@/lib/permissions";
import { ExportMenu } from "@/components/ExportMenu";

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

interface PermRow {
  user_id: string;
  permission: string;
  granted: boolean;
}

function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [permsByUser, setPermsByUser] = useState<Record<string, Record<PermKey, boolean>>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_permissions").select("user_id, permission, granted"),
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

    const pmap: Record<string, Record<PermKey, boolean>> = {};
    merged.forEach((u) => {
      pmap[u.user_id] = { ...COLLABORATOR_DEFAULTS };
    });
    (perms as PermRow[] | null)?.forEach((p) => {
      if (pmap[p.user_id]) {
        pmap[p.user_id][p.permission as PermKey] = p.granted;
      }
    });
    setPermsByUser(pmap);
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
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", u.user_id);
    if (delErr) return toast.error(delErr.message);
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: u.user_id, role });
    if (insErr) return toast.error(insErr.message);
    toast.success("Papel atualizado.");
    void load();
  };

  const togglePermission = async (userId: string, key: PermKey, value: boolean) => {
    setPermsByUser((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: value },
    }));
    const { error } = await supabase
      .from("user_permissions")
      .upsert({ user_id: userId, permission: key, granted: value }, { onConflict: "user_id,permission" });
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  const resetDefaults = async (userId: string) => {
    const { error } = await supabase.from("user_permissions").delete().eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Permissões restauradas para o padrão.");
    void load();
  };

  return (
    <AppLayout
      title="Usuários"
      actions={
        <ExportMenu
          filename={`usuarios-${new Date().toISOString().slice(0,10)}`}
          title="Usuários"
          columns={["Nome", "E-mail", "Papel", "Ativo", "Último login", "Cadastro"]}
          rows={(users ?? []).map((u) => [
            u.display_name ?? "—",
            u.email ?? "—",
            u.role === "administrator" ? "Administrador" : "Colaborador",
            u.is_active ? "Sim" : "Não",
            u.last_login_at ? dateBR(u.last_login_at) : "—",
            dateBR(u.created_at),
          ])}
        />
      }
    >
      <Card className="overflow-hidden">
        {!users ? (
          <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isCollab = u.role === "collaborator";
                const isOpen = expanded === u.user_id;
                return (
                  <Fragment key={u.user_id}>
                    <tr className="border-t border-border/50">
                      <td className="px-2 py-3 align-middle">
                        {isCollab && (
                          <button
                            onClick={() => setExpanded(isOpen ? null : u.user_id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Expandir permissões"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
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
                    {isCollab && isOpen && (
                      <tr key={`${u.user_id}-perms`} className="bg-muted/20">
                        <td></td>
                        <td colSpan={4} className="px-4 py-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium">Permissões do colaborador</div>
                            <Button size="sm" variant="ghost" onClick={() => resetDefaults(u.user_id)}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Restaurar padrões
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {PERMISSIONS.map((k) => (
                              <label
                                key={k}
                                className="flex items-center justify-between gap-3 p-2 rounded border border-border/50 bg-background"
                              >
                                <span className="text-sm">{PERMISSION_LABELS[k]}</span>
                                <Switch
                                  checked={permsByUser[u.user_id]?.[k] ?? false}
                                  onCheckedChange={(v) => togglePermission(u.user_id, k, v)}
                                />
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-muted-foreground mt-3">
        Novos colaboradores podem se cadastrar pela tela de login. Após o cadastro, eles entram como colaborador por padrão e podem ser promovidos a administrador ou ter permissões específicas ajustadas aqui.
      </p>
    </AppLayout>
  );
}
