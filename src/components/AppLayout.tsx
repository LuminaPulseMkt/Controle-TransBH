import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Props {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, actions }: Props) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between gap-3 border-b border-border bg-card/50 backdrop-blur px-4">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              {title && (
                <h1 className="text-display text-2xl text-foreground truncate">{title}</h1>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 bg-grid">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
