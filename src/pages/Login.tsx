import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuth } from "@/lib/auth-store";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, role, loading } = useAuth();

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sign-up state
  const [suFullName, setSuFullName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suPan, setSuPan] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suSubmitting, setSuSubmitting] = useState(false);

  // Forgot password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Backend not connected");
      return;
    }
    setForgotSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSubmitting(false);
    if (error) {
      toast.error("Could not send reset email", { description: error.message });
      return;
    }
    toast.success("Reset email sent", { description: "Check your inbox for the link." });
    setForgotOpen(false);
    setForgotEmail("");
  }

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user && role) {
      navigate(role === "customer" ? "/client" : "/employee", { replace: true });
    }
  }, [loading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      toast.error("Sign-in failed", { description: error });
      return;
    }
    toast.success("Welcome back");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Backend not connected");
      return;
    }
    if (suPassword.length < 6) {
      toast.error("Password too short", { description: "Use at least 6 characters." });
      return;
    }
    setSuSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: suEmail.trim(),
        password: suPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: suFullName.trim(),
            role: "customer",
          },
        },
      });
      if (error) {
        toast.error("Signup failed", { description: error.message });
        return;
      }

      // If session is returned (auto-confirm on), create the customer record so
      // RLS-bound features (banks, properties, debtors) work immediately.
      if (data.user && data.session) {
        const customerPayload = {
          user_id: data.user.id,
          full_name: suFullName.trim(),
          pan: suPan.trim().toUpperCase() || `PENDING${data.user.id.slice(0, 4).toUpperCase()}`,
          email: suEmail.trim(),
          phone: suPhone.trim() || null,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: custErr } = await (supabase.from("customers") as any).insert(customerPayload);
        if (custErr) {
          // Non-fatal — profile/role still created via trigger.
          console.warn("customer insert failed", custErr);
        }
        toast.success("Account created", { description: "Signing you in…" });
      } else {
        toast.success("Check your email", {
          description: "Confirm your address to finish signing up.",
        });
      }
    } finally {
      setSuSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-primary blur-3xl opacity-20" />
      </div>

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="relative z-10 w-full max-w-md border-border bg-surface-1 shadow-elegant">
        <CardHeader className="items-center text-center space-y-3">
          <Logo className="scale-110" />
          <div>
            <CardTitle className="text-2xl tracking-tight">CA Firm Intelligence</CardTitle>
            <CardDescription className="mt-1.5">
              The relational workspace for India's Chartered Accountants.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!supabaseConfigured && (
            <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
              <p className="font-medium">Backend not connected</p>
            </div>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@nexusca.demo"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Sign in
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotOpen(true);
                  }}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot your password?
                </button>
              </form>

              <div className="mt-6 rounded-md border border-border bg-surface-2/50 p-3 text-[11px] text-muted-foreground">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Demo accounts
                </p>
                <ul className="space-y-0.5 tabular">
                  <li>priya@nexusca.demo · employee</li>
                  <li>rajesh@demo.in · customer</li>
                  <li>sunita@demo.in · customer</li>
                  <li className="pt-0.5 text-muted-foreground/80">Password (all): Nexus@123</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input
                    id="su-name"
                    value={suFullName}
                    onChange={(e) => setSuFullName(e.target.value)}
                    placeholder="Anjali Sharma"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    type="password"
                    autoComplete="new-password"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pan">PAN (optional)</Label>
                    <Input
                      id="su-pan"
                      value={suPan}
                      onChange={(e) => setSuPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-phone">Phone (optional)</Label>
                    <Input
                      id="su-phone"
                      value={suPhone}
                      onChange={(e) => setSuPhone(e.target.value)}
                      placeholder="+91 …"
                      maxLength={20}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary text-primary-foreground"
                  disabled={suSubmitting}
                >
                  {suSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Create customer account
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  New accounts are created with the <strong>customer</strong> role.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              We'll email you a secure link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgot} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={forgotSubmitting}>
                {forgotSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
