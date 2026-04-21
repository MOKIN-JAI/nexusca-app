import { Outlet, useNavigate } from "react-router-dom";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

export function ClientLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
        <Logo />
        <div className="flex-1" />
        <div className="hidden items-center gap-2 sm:flex">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
              {initials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs">{profile?.full_name}</span>
        </div>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await signOut();
            navigate("/", { replace: true });
          }}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
