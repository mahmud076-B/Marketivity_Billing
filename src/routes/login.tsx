import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <main className="grid min-h-dvh place-items-center bg-background text-muted-foreground">Loading…</main>;
  }
  if (user) return <Navigate to="/" />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) throw new Error(res.error.message || "Invalid email or password");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
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
              Digital Growth Partners
            </div>
          </div>
        </div>
        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to the billing workspace. Think beyond marketing. Build for growth.
        </p>

        {authEnabled ? (
          <>
            <form className="mt-6 space-y-3" onSubmit={submit}>
              <label className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="brand" className="w-full" disabled={busy}>
                {busy ? "Please wait…" : "Sign in"}
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
