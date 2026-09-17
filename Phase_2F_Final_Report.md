# Phase 2F — Final Verification

## Verification Checklist

### 1. Invitation Acceptance Atomicity
- **Verified**: The `verifyInvitation` endpoint checks if the token is valid, unexpired, and unused, then sets an `invite_token` cookie.
- **Verified**: Better Auth's `databaseHooks.user.create.before` retrieves this cookie. It hashes the token and executes an atomic `UPDATE team_invitations SET "usedAt" = CURRENT_TIMESTAMP WHERE "tokenHash" = $2 AND "usedAt" IS NULL RETURNING role`.
- **Verified**: If the update returns 0 rows, the registration aborts. This guarantees single-use semantics atomically, even under concurrent requests.

### 2. Role Security
- **Verified**: The `user.role` is populated directly from the `team_invitations` table inside the `create.before` hook. The user cannot choose their own role during registration.
- **Verified**: `src/routes/invite.tsx` strictly passes the invite token. The user only chooses their Name and Password.

### 3. Authorization & Permissions
- **Verified**: `authz.ts` enforces `requirePermission`.
- **Verified**: Staff users are prevented from accessing Team Management, Catalog Management, Voiding Invoices/Payments, and Data Exports, unless specifically authorized.
- **Verified**: Deactivating an account invalidates active sessions instantly using the `session` table deletion in `updateUserStatus` (`src/lib/server/team.ts`).

### 4. Admin Protections
- **Verified**: The `updateUserRole` and `updateUserStatus` server functions specifically query `select count(*) from user where role = 'admin' and status = 'active'` to prevent demoting or deactivating the last active Admin.
- **Verified**: `bootstrap-admin.mjs` allows an initial user to be promoted to admin.

### 5. Typecheck & Build
- **Verified**: `npm run typecheck` passes with no errors.
- **Verified**: Native HTML Table and NativeSelect are used in `team/index.tsx` instead of missing components, resolving UI typecheck errors.

## Conclusion
The Marketivity application has successfully transitioned into a closed, secure internal agency application with comprehensive role-based access control. All Phase 2F objectives have been met.
