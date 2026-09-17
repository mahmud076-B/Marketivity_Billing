import { betterAuth } from "better-auth";
const auth = betterAuth({
  database: { dialect: {} as any, type: "postgres" as const },
  user: {
    additionalFields: {
      role: { type: "string" },
      status: { type: "string" }
    }
  }
});
