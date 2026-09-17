import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { uid } from "@/lib/utils";
import { setCookie } from "@tanstack/react-start/server";
import { requirePermission } from "./authz";
import { DEV_USER_ID } from "@/lib/auth/verify.server";
import crypto from "crypto";

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    requirePermission(context.user, "manage_team");
    const sql = await getSql();

    const users = await sql`
      select "id", "name", "email", "role", "status", "createdAt", "updatedAt"
      from "user"
      order by "createdAt" desc
    `;

    const invites = await sql`
      select "id", "email", "role", "expiresAt", "createdAt"
      from "team_invitations"
      where "usedAt" is null
      order by "createdAt" desc
    `;

    return {
      users: users.map((u) => ({
        id: String(u.id),
        name: String(u.name),
        email: String(u.email),
        role: String(u.role),
        status: String(u.status),
        createdAt: String(u.createdAt),
      })),
      invitations: invites.map((i) => ({
        id: String(i.id),
        email: String(i.email),
        role: String(i.role),
        expiresAt: String(i.expiresAt),
        createdAt: String(i.createdAt),
      })),
    };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; role: string }) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_team");
    const sql = await getSql();

    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    if (!["admin", "staff"].includes(data.role)) throw new Error("Invalid role");

    // Check if user already exists
    const existingUser = await sql`select id from "user" where email = ${email}`;
    if (existingUser.length > 0) throw new Error("User already exists");

    const id = uid();
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    
    // We only store the hash of the token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    
    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await sql`
      insert into "team_invitations" (
        "id", "email", "role", "tokenHash", "expiresAt", "createdBy"
      ) values (
        ${id}, ${email}, ${data.role}, ${tokenHash}, ${expiresAt}, ${context.userId}
      )
    `;

    // In a real app, you would send an email here.
    // Since we don't have an email provider, we will return the token so the admin can copy the link.
    return { id, token };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    requirePermission(context.user, "manage_team");
    const sql = await getSql();
    await sql`delete from "team_invitations" where "id" = ${id}`;
    return { ok: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: string }) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_team");
    if (!["admin", "staff"].includes(data.role)) throw new Error("Invalid role");
    const sql = await getSql();

    if (data.role !== "admin") {
      // Prevent demoting the last admin
      const admins = await sql`select id from "user" where role = 'admin' and status = 'active'`;
      if (admins.length <= 1 && admins.find((a) => String(a.id) === data.userId)) {
        throw new Error("Cannot demote the last active admin");
      }
    }

    await sql`update "user" set "role" = ${data.role}, "updatedAt" = now() where "id" = ${data.userId}`;
    return { ok: true };
  });

export const updateUserStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    requirePermission(context.user, "manage_team");
    if (!["active", "inactive"].includes(data.status)) throw new Error("Invalid status");
    const sql = await getSql();

    if (data.status === "inactive") {
      // Prevent deactivating the last admin
      const admins = await sql`select id from "user" where role = 'admin' and status = 'active'`;
      if (admins.length <= 1 && admins.find((a) => String(a.id) === data.userId)) {
        throw new Error("Cannot deactivate the last active admin");
      }
    }

    await sql`update "user" set "status" = ${data.status}, "updatedAt" = now() where "id" = ${data.userId}`;
    
    if (data.status === "inactive") {
      // Invalidate all active sessions for this user so they are immediately logged out
      await sql`delete from "session" where "userId" = ${data.userId}`;
    }

    return { ok: true };
  });

export const verifyInvitation = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }) => {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sql = await getSql();
    
    const rows = await sql`
      select "email" from "team_invitations" 
      where "tokenHash" = ${tokenHash} 
        and "usedAt" is null 
        and "expiresAt" > now()
    `;
    
    if (rows.length === 0) throw new Error("Invalid or expired invitation link.");
    
    // Set a cookie so the signUp process can read it.
    // Max age 1 hour. It's consumed on use.
    setCookie("invite_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600
    });
    
    return { email: String(rows[0].email) };
  });
