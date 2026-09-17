import { PGlite } from "@electric-sql/pglite";

async function check() {
  const pg = new PGlite(".data/pglite");
  try {
    await pg.waitReady;
    const users = await pg.query("SELECT id, email, role, status FROM \"user\"");
    console.log("Users in DB:", users.rows);
  } finally {
    await pg.close();
  }
}

check();
