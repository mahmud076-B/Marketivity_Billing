import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const adminEmail = 'mahmudjoy989@gmail.com';
    const adminRes = await pool.query('SELECT id FROM "user" WHERE email = $1', [adminEmail]);
    const adminId = adminRes.rows[0]?.id;

    if (!adminId) {
      throw new Error(`Admin user ${adminEmail} not found in Postgres DB!`);
    }

    console.log(`Preserving Admin User ID: ${adminId}`);

    // Begin Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete all non-admin users from auth tables
      await client.query('DELETE FROM session WHERE "userId" != $1', [adminId]);
      await client.query('DELETE FROM account WHERE "userId" != $1', [adminId]);
      await client.query('DELETE FROM "user" WHERE id != $1', [adminId]);

      // 2. Cascade invitations
      await client.query('DELETE FROM team_invitations');

      // 3. Clear business data
      await client.query('DELETE FROM audit_log');
      await client.query('DELETE FROM payments');
      await client.query('DELETE FROM invoice_items');
      await client.query('DELETE FROM invoices');
      await client.query('DELETE FROM services');
      await client.query('DELETE FROM clients');
      
      // Clear non-admin settings if any
      await client.query('DELETE FROM settings WHERE user_id != $1', [adminId]);

      // Update the admin user role and status to ensure they are active and admin
      await client.query('UPDATE "user" SET role = $1, status = $2 WHERE id = $3', ['admin', 'active', adminId]);

      await client.query('COMMIT');
      console.log('Cleanup completed successfully in Postgres.');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
