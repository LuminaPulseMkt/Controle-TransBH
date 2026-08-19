import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  Wallet,
  AlertTriangle,
  FileText,
  Share2,
  Users,
  Settings,
  LogOut,
  Handshake,
  ClipboardCheck,
  FileSpreadsheet,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import type { PermKey } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

const allItems: { title: string; url: string; icon: typeof LayoutDashboard; permission?: PermKey }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Transportes", url: "/transports", icon: Truck, permission: "transports.view" },
  { title: "Checklists", url: "/checklists", icon: ClipboardCheck, permission: "transports.view" },
  { title: "Planilhas", url: "/planilhas", icon: FileSpreadsheet, permission: "transports.view" },
  { title: "Parceiros", url: "/partners", icon: Handshake, permission: "partners.view" },
  { title: "Financeiro", url: "/financial", icon: Wallet, permission: "financial.view" },
  { title: "Cobranças", url: "/collections", icon: AlertTriangle, permission: "collections.view" },
  { title: "Contratos & Orçamentos", url: "/documents", icon: FileText, permission: "documents.view" },
  { title: "Social & Marketing", url: "/social", icon: Share2, permission: "social.view" },
  { title: "Usuários", url: "/users", icon: Users, permission: "users.manage" },
  { title: "Configurações", url: "/settings", icon: Settings, permission: "settings.manage" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, signOut, user, can } = useAuth();

  const items = allItems.filter((i) => !i.permission || can(i.permission));

  const isActive = (url: string) =>
    url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <BrandLogo size={collapsed ? "sm" : "md"} alt="TransBH - Transportes de Veículos" />
          {!collapsed && (
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {isAdmin ? "Administrador" : "Colaborador"}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:font-medium hover:bg-sidebar-accent"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && user && (
          <div className="px-2 py-1 text-xs text-muted-foreground truncate">{user.email}</div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
