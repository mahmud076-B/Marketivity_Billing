import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Plus, Trash2, UserCog, UserMinus, ShieldAlert, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { inviteUser, listTeamMembers, revokeInvitation, updateUserRole, updateUserStatus } from "@/lib/server/team";
import { useCurrentUser } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/_app/team/")({
  component: TeamPage,
});

function TeamPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["team"],
    queryFn: () => listTeamMembers(),
  });

  const currentUser = useCurrentUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviteLink, setInviteLink] = useState("");

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (res) => {
      refetch();
      // Preview has no fixed public origin; production returns its configured canonical URL.
      if (res.inviteUrl) {
        setInviteLink(res.inviteUrl);
      } else {
        const url = new URL("/invite", window.location.origin);
        url.searchParams.set("token", res.token);
        setInviteLink(url.toString());
      }
    },
    onError: (err: any) => {
      toast.error("Failed to invite", { description: err.message });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      refetch();
      toast.success("Invitation revoked");
    },
  });

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      refetch();
      toast.success("Role updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update role", { description: err.message });
    },
  });

  const statusMutation = useMutation({
    mutationFn: updateUserStatus,
    onSuccess: () => {
      refetch();
      toast.success("Status updated");
    },
    onError: (err: any) => {
      toast.error("Failed to update status", { description: err.message });
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="py-12 text-center">
        <ShieldAlert className="mx-auto size-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Access Denied</h2>
        <p className="mt-1 text-sm text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Team & Access"
        description="Manage internal agency access and permissions."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus /> Invite User
          </Button>
        }
      />

      <div className="space-y-8">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-card-foreground">Active Team</h3>
          </div>
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name || "Unknown"}</div>
                        <div className="text-sm text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <NativeSelect
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ data: { userId: u.id, role: e.target.value } })}
                          disabled={roleMutation.isPending || u.id === currentUser.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </NativeSelect>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`size-2 rounded-full ${
                              u.status === "active" ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-sm capitalize">{u.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={statusMutation.isPending || u.id === currentUser.id}
                          onClick={() =>
                            statusMutation.mutate({ data: { userId: u.id, status: u.status === "active" ? "inactive" : "active" } })
                          }
                        >
                          {u.status === "active" ? (
                            <><UserMinus className="mr-2 size-4" /> Deactivate</>
                          ) : (
                            <><BadgeCheck className="mr-2 size-4" /> Reactivate</>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data?.users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="h-24 text-center text-muted-foreground">
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-card-foreground">Pending Invitations</h3>
          </div>
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.invitations.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{i.email}</td>
                      <td className="px-4 py-3 capitalize">{i.role}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(i.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate({ data: i.id })}
                        >
                          <Trash2 className="mr-2 size-4 text-red-500" /> Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data?.invitations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="h-24 text-center text-muted-foreground">
                        No pending invitations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={inviteOpen} onOpenChange={(o) => {
        setInviteOpen(o);
        if (!o) {
          setInviteEmail("");
          setInviteLink("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Generate a single-use registration link.
            </DialogDescription>
          </DialogHeader>
          
          {inviteLink ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
                Invitation created successfully. Send this link to the team member:
              </div>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly />
                <Button variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Copied to clipboard");
                }}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  placeholder="colleague@agency.com" 
                  value={inviteEmail} 
                  onChange={(e) => setInviteEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <NativeSelect value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="admin">Admin (Full Access)</option>
                  <option value="staff">Staff (Limited Access)</option>
                </NativeSelect>
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate({ data: { email: inviteEmail, role: inviteRole } })}
                >
                  {inviteMutation.isPending ? "Generating..." : "Generate Invite Link"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
