import { getSql, ensureDbReady } from "../src/lib/db.ts";

async function cleanup() {
  await ensureDbReady();
  const sql = await getSql();
  
  console.log("Starting DB cleanup...");

  try {
    await sql.transaction(async (tx) => {
      // 1. Find Admin user
      const adminUsers = await tx.query("SELECT id, email FROM \"user\" WHERE email = $1", ["mahmudjoy989@gmail.com"]);
      const adminUserId = adminUsers.length > 0 ? adminUsers[0].id : null;
      
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

      // 3. Clear business data
      await tx.query("DELETE FROM transactions");
      await tx.query("DELETE FROM payments");
      await tx.query("DELETE FROM services");
      await tx.query("DELETE FROM invoices");
      await tx.query("DELETE FROM clients");
      
      // 4. Update the admin user role and status if present
      if (adminUserId) {
         await tx.query("UPDATE \"user\" SET role = 'admin', status = 'active' WHERE id = $1", [adminUserId]);
      }

      console.log("Cleanup completed successfully within transaction.");
    });
  } catch (err) {
    console.error("Cleanup failed:", err);
    process.exit(1);
  }
}

cleanup();
