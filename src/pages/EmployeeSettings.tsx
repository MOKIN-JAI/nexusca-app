import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function EmployeeSettings() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Card className="border-border bg-surface-1">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Toggle dark/light. Persisted to this browser.</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs tabular text-muted-foreground">{profile?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
