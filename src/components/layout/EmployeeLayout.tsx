import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/lib/auth-store";
import { Badge } from "@/components/ui/badge";

export function EmployeeLayout() {
  const { profile } = useAuth();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1" />
            <Badge variant="outline" className="hidden gap-1 border-primary/40 text-xs sm:flex">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-medium">{profile?.full_name}</span>
            </Badge>
            <ThemeToggle />
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
