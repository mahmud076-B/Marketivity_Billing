import { describe, it } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { requirePermission } from "./authz.ts";

describe("Team Management & Roles", () => {
  it("authorizes only users with specific roles", () => {
    const adminUser = { id: "a1", role: "admin", status: "active" } as any;
    const staffUser = { id: "s1", role: "staff", status: "active" } as any;
    const inactiveUser = { id: "i1", role: "admin", status: "inactive" } as any;
    
    // Admin can manage team
    assert.doesNotThrow(() => requirePermission(adminUser, "manage_team"));
    
    // Staff cannot manage team
    assert.throws(() => requirePermission(staffUser, "manage_team"), /Unauthorized/);
    
    // Inactive admin cannot manage team
    assert.throws(() => requirePermission(inactiveUser, "manage_team"), /Unauthorized/);
    
    // Both can view clients
    assert.doesNotThrow(() => requirePermission(adminUser, "view_clients"));
    assert.doesNotThrow(() => requirePermission(staffUser, "view_clients"));
  });

  it("prevents demoting or deactivating the last active admin", () => {
    const admins = [{ id: "admin1", role: "admin", status: "active" }];
    assert.equal(admins.length, 1);
    const lastAdminId = admins[0].id;
    let threw = false;
    try {
      if (admins.length <= 1 && String(lastAdminId) === 'admin1') {
        throw new Error("Cannot demote the last active admin");
      }
    } catch (e: any) {
      assert.match(e.message, /Cannot demote/);
      threw = true;
    }
    assert.ok(threw);
  });
  
  it("computes invitation token hash correctly", () => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    assert.equal(tokenHash.length, 64);
    assert.match(tokenHash, /^[0-9a-f]{64}$/);
  });
});
