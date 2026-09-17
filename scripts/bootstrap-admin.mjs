// @ts-nocheck
import { parseArgs } from "node:util";
import { getSql } from "../src/lib/db.js";

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string", short: "e" },
      role: { type: "string", short: "r", default: "admin" },
    },
  });

  if (!values.email) {
    console.error("Usage: node scripts/bootstrap-admin.mjs --email <email> [--role <role>]");
    process.exit(1);
  }

  if (!["admin", "staff"].includes(values.role)) {
    console.error("Invalid role. Must be 'admin' or 'staff'.");
    process.exit(1);
  }

  const email = values.email.toLowerCase();
  const sql = await getSql();

  try {
    const res = await sql`
      update "user" 
      set "role" = ${values.role}, "status" = 'active', "updatedAt" = now() 
      where "email" = ${email}
      returning id
    `;

    if (res.length === 0) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Successfully assigned role '${values.role}' to user ${email} (ID: ${res[0].id}).`);
  } catch (err) {
    console.error("Failed to update user:", err);
  } finally {
    process.exit(0);
  }
}

main();
