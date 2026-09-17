import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: "postgresql://postgres.ihbweamcebvajmdnkxyv:Mahmudhasan%283314076%29@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" });
  const res = await pool.query('SELECT "userId", email, password FROM "account" JOIN "user" ON "user".id = "account"."userId"');
  console.log(res.rows);
  await pool.end();
}
main().catch(console.error);
