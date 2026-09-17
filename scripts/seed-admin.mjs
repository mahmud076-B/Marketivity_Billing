import pg from "pg";
import crypto from "crypto";

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  // Create a bootstrap user so the invitation has a valid "createdBy"
  const systemId = 'system-bootstrap-id';
  await pool.query(`
    INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "status")
    VALUES ($1, 'System', 'system-admin@marketivity.agency', true, 'admin', 'active')
    ON CONFLICT ("id") DO NOTHING
  `, [systemId]);

  const token = 'admin_setup_' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const adminEmail = 'mahmudjoy989@gmail.com';

  await pool.query(`DELETE FROM "team_invitations" WHERE email = $1`, [adminEmail]);

  await pool.query(`
    INSERT INTO "team_invitations" ("id", "email", "role", "tokenHash", "expiresAt", "createdBy")
    VALUES ($1, $2, 'admin', $3, now() + interval '7 days', $4)
  `, [crypto.randomUUID(), adminEmail, tokenHash, systemId]);

  console.log(token);
  await pool.end();
}

main().catch(console.error);
