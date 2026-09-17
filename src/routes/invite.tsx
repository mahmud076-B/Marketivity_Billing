import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, authEnabled } from "@/lib/auth/client";
import { verifyInvitation } from "@/lib/server/team";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/invite")({
  component: InvitePage,
});

function InvitePage() {
  const nav = useNavigate();
  const search = Route.useSearch() as { token?: string };
  const { user, isPending } = useCurrentUserState();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isPending) return;
    
    // If auth is disabled, redirect to home
    if (!authEnabled) {
      nav({ to: "/" });
      return;
    }

    if (user) {
      nav({ to: "/" });
      return;
    }

    if (!search.token) {
      setError("No invitation token provided. Please use the link sent to you.");
      setChecking(false);
      return;
    }

    // Verify token and set cookie
    verifyInvitation({ data: search.token })
      .then((res) => {
        setEmail(res.email);
        setChecking(false);
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invitation.");
        setChecking(false);
      });
  }, [search.token, isPending, user, nav]);

  if (isPending || checking) {
    return <main className="grid min-h-dvh place-items-center bg-background text-muted-foreground">Verifying invitation…</main>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await authClient.signUp.email({ email, password, name: name || "Colleague" });
      if (res.error) throw new Error(res.error.message || "Could not create account");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <Mark className="size-11" />
          <div>
            <div className="font-display text-xl font-bold tracking-tight">Marketivity</div>
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Team Registration
            </div>
          </div>
        </div>

        {error ? (
          <div>
            <h1 className="font-display text-2xl font-semibold text-destructive">Invitation Failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-6 w-full" onClick={() => nav({ to: "/login" })}>
              Return to Login
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold">Join the team</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your account to access the billing workspace.
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <label className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} disabled className="bg-secondary/50" />
                <p className="text-xs text-muted-foreground">Assigned from invitation</p>
              </label>
              <label className="grid gap-1.5">
                <Label>Your Name</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  placeholder="Jane Doe"
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Choose a Password</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              
              <Button type="submit" variant="brand" className="mt-2 w-full" disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
