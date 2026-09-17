import { betterAuth } from "better-auth";
const auth = betterAuth({
  database: { dialect: {} as any, type: "postgres" as const },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // just to check ctx type
          return { data: user };
        }
      }
    }
  }
});
