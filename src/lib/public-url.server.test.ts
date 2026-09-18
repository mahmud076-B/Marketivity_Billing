import assert from "node:assert/strict";
import test from "node:test";
import { buildInvitationUrl, getConfiguredPublicOrigin } from "./public-url.server.ts";

const originalEnv = {
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  nodeEnv: process.env.NODE_ENV,
  projectId: process.env.GROK_PROJECT_ID,
};

function restoreEnv(): void {
  if (originalEnv.betterAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = originalEnv.betterAuthUrl;
  if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.nodeEnv;
  if (originalEnv.projectId === undefined) delete process.env.GROK_PROJECT_ID;
  else process.env.GROK_PROJECT_ID = originalEnv.projectId;
}

test.afterEach(restoreEnv);

test("normalizes the configured origin and builds canonical invite URLs", () => {
  process.env.NODE_ENV = "production";
  process.env.BETTER_AUTH_URL = "https://billing.marketivity.agency/";

  assert.equal(getConfiguredPublicOrigin(), "https://billing.marketivity.agency");
  assert.equal(
    buildInvitationUrl("token-value"),
    "https://billing.marketivity.agency/invite?token=token-value",
  );
});

test("allows localhost only outside production", () => {
  delete process.env.NODE_ENV;
  delete process.env.GROK_PROJECT_ID;
  process.env.BETTER_AUTH_URL = "http://localhost:8080";

  assert.equal(getConfiguredPublicOrigin(), "http://localhost:8080");
  assert.equal(
    buildInvitationUrl("token-value"),
    "http://localhost:8080/invite?token=token-value",
  );
});

test("fails closed when production has no safe canonical origin", () => {
  process.env.NODE_ENV = "production";
  delete process.env.BETTER_AUTH_URL;
  assert.throws(() => getConfiguredPublicOrigin(), /BETTER_AUTH_URL is required/);

  process.env.BETTER_AUTH_URL = "https://localhost:8080";
  assert.throws(() => getConfiguredPublicOrigin(), /must not point to localhost/);

  process.env.BETTER_AUTH_URL = "https://old.example.com";
  assert.throws(() => getConfiguredPublicOrigin(), /must be https:\/\/billing\.marketivity\.agency/);
});