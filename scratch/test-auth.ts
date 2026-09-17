import { betterAuth } from "better-auth";

const auth = betterAuth({
  database: {
    dialect: "postgres",
    type: "postgres",
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "staff" },
      status: { type: "string", required: true, defaultValue: "active" },
      inviteToken: { type: "string", required: false },
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          console.log("Hook received:", user);
          delete (user as any).inviteToken;
          return { data: user };
        }
      }
    }
  }
});

console.log("Auth initialized", auth);
