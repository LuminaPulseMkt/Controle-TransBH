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
} from "lucide-react";
import logo from "@/assets/logo-transbh.png";
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
import { Button } from "@/components/ui/button";

const allItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: false },
  { title: "Transportes", url: "/transports", icon: Truck, adminOnly: false },
  { title: "Financeiro", url: "/financial", icon: Wallet, adminOnly: true },
  { title: "Cobranças", url: "/collections", icon: AlertTriangle, adminOnly: true },
  { title: "Contratos & Orçamentos", url: "/documents", icon: FileText, adminOnly: false },
  { title: "Social & Marketing", url: "/social", icon: Share2, adminOnly: false },
  { title: "Usuários", url: "/users", icon: Users, adminOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  const items = allItems.filter((i) => !i.adminOnly || isAdmin);

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <img
            src={logo}
            alt="TransBH - Transportes de Veículos"
            className={collapsed ? "h-7 w-auto object-contain" : "h-12 w-auto object-contain"}
          />
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
