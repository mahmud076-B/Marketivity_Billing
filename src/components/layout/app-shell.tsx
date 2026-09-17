import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  SunMoon,
  Users,
  Wallet,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { greetingDhaka } from "@/lib/dates";
import { bootstrapWorkspace } from "@/lib/server/bootstrap";
import { globalSearch } from "@/lib/server/search";
import { getSettings, saveSettings } from "@/lib/server/settings";
import type { SearchHit, Settings as SettingsT } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/receipts", label: "Receipts", icon: Receipt },
  { to: "/transactions", label: "Transactions", icon: CreditCard },
  { to: "/services", label: "Services", icon: Package },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/team", label: "Team", icon: ShieldAlert, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const boot = await bootstrapWorkspace();
        if (!cancelled) {
          setSettings(boot.settings);
          applyTheme(boot.settings.theme);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isPending) return <ShellSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (!ready) return <ShellSkeleton />;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar/90 backdrop-blur-xl lg:flex">
        <NavBody settings={settings} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <NavBody settings={settings} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <TopBar
          onMenu={() => setMobileOpen(true)}
          settings={settings}
          onToggleTheme={async () => {
            const next = settings?.theme === "light" ? "dark" : "light";
            applyTheme(next);
            if (settings) {
              const updated = { ...settings, theme: next as "dark" | "light" };
              setSettings(updated);
              await saveSettings({ data: updated });
            }
          }}
        />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavBody({ settings, onNavigate }: { settings: SettingsT | null; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useCurrentUser();
  return (
    <>
      <div className="px-4 py-5">
        <Wordmark />
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          if (item.adminOnly && user?.role !== "admin") return null;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border px-4 py-4">
        <div className="font-display text-sm font-semibold">{settings?.agencyName || "Marketivity"}</div>
        <div className="text-[11px] text-muted-foreground">
          {settings?.positioning || "Digital Growth Partners"}
        </div>
        <div className="mt-3">
          <UserButton />
        </div>
      </div>
    </>
  );
}

function TopBar({
  onMenu,
  settings,
  onToggleTheme,
}: {
  onMenu: () => void;
  settings: SettingsT | null;
  onToggleTheme: () => void;
}) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  return (
    <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
      <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={onMenu}>
        <Menu />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-semibold sm:text-base">
          {greetingDhaka()}, {user?.displayName || settings?.agencyName || "Marketivity"}
        </div>
      </div>
      <GlobalSearch onGo={(href) => navigate({ to: href })} />
      <Button size="sm" variant="brand" onClick={() => navigate({ to: "/invoices/new" })}>
        <Plus /> <span className="hidden sm:inline">Create invoice</span>
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={onToggleTheme} aria-label="Toggle theme">
        <SunMoon />
      </Button>
    </header>
  );
}

function GlobalSearch({ onGo }: { onGo: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      globalSearch({ data: q })
        .then(setHits)
        .catch(() => setHits([]));
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative hidden w-72 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="global-search"
        className="pl-9"
        placeholder="Search clients, invoices…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />
      {open && hits.length > 0 && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {hits.map((h) => (
            <button
              key={`${h.kind}-${h.id}`}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-secondary"
              onMouseDown={() => {
                onGo(h.href);
                setQ("");
              }}
            >
              <span className="font-medium">{h.title}</span>
              <span className="text-xs text-muted-foreground">
                {h.kind} · {h.subtitle}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh bg-background p-6">
      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        <Skeleton className="hidden h-[80vh] lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

export function applyTheme(theme: "dark" | "light") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme !== "light");
  document.documentElement.classList.toggle("light", theme === "light");
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  const desc = useMemo(() => description, [description]);
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions}
    </div>
  );
}
