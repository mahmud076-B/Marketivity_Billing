import { PGlite } from "@electric-sql/pglite";

async function cleanup() {
  console.log("Starting DB cleanup directly using PGlite...");
  const pg = new PGlite(".data/pglite");

  try {
    await pg.waitReady;
    
    await pg.transaction(async (tx) => {
      // 1. Find Admin user
      const adminUsers = await tx.query("SELECT id, email FROM \"user\" WHERE email = $1", ["mahmudjoy989@gmail.com"]);
      const adminUserId = adminUsers.rows.length > 0 ? adminUsers.rows[0].id : null;
      
      console.log("Admin user ID:", adminUserId);

      // 2. Delete non-admin users and their stuff
      if (adminUserId) {
        await tx.query("DELETE FROM session WHERE \"userId\" != $1", [adminUserId]);
        await tx.query("DELETE FROM account WHERE \"userId\" != $1", [adminUserId]);
        await tx.query("DELETE FROM \"user\" WHERE id != $1", [adminUserId]);
      } else {
        await tx.query("DELETE FROM session");
        await tx.query("DELETE FROM account");
        await tx.query("DELETE FROM \"user\"");
      }

      // cascade invitations
      await tx.query("DELETE FROM team_invitations"); // clear all invites
      
      // 3. Clear business data
      await tx.query("DELETE FROM audit_log");
      await tx.query("DELETE FROM payments");
      await tx.query("DELETE FROM invoice_items");
      await tx.query("DELETE FROM invoices");
      await tx.query("DELETE FROM services");
      await tx.query("DELETE FROM clients");
      
      // Clear non-admin settings if any
      if (adminUserId) {
         await tx.query("DELETE FROM settings WHERE user_id != $1", [adminUserId]);
      }
      // keep teams if needed, or clear non-admin ones
      // since the prompt says "preserve real agency configuration", maybe leave teams alone or wipe those not owned by admin

      // 4. Update the admin user role and status if present
      if (adminUserId) {
         await tx.query("UPDATE \"user\" SET role = 'admin', status = 'active' WHERE id = $1", [adminUserId]);
      }

      console.log("Cleanup completed successfully within transaction.");
    });
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  } finally {
    await pg.close();
  }
}

cleanup();
