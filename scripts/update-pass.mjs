import { hashPassword } from '@better-auth/utils/password';
import pg from 'pg';

async function main() {
  const hash = await hashPassword('Mahmud(3314)');
  console.log("Hash generated:", hash);
  
  const pool = new pg.Pool({ connectionString: "postgresql://postgres.ihbweamcebvajmdnkxyv:Mahmudhasan%283314076%29@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" });
  
  const res = await pool.query('UPDATE "account" SET password = $1 WHERE "userId" = (SELECT id FROM "user" WHERE email = $2)', [hash, 'mahmudjoy989@gmail.com']);
  console.log("Updated rows:", res.rowCount);
  
  await pool.end();
}

main().catch(console.error);
