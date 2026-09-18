# Admin/Staff Shared Data Audit Report

No passwords, auth secrets, database credentials, session cookies, invitation tokens, API keys, or private credentials are included in this report.

## 1. Problem Summary

**FIXED in code; MANUAL ACTION REQUIRED for deployment**

Admin and Staff were using the same database connection but seeing different business datasets. Before cleanup, production aggregates showed one active Admin and one active Staff: Admin-owned rows included 1 client, 1 invoice, 2 payments, and 13 services; Staff-owned rows included 4 clients, 5 invoices, 3 payments, and 13 services.

## 2. Root Cause

**FIXED**

The schema and server functions modeled all business records as per-user data. Clients, services, invoices, invoice items, payments, serials, settings, analytics, search, statements, exports, and backups filtered by the authenticated `context.userId`. `bootstrapWorkspace` also seeded sample services/clients/invoices separately for each user.

There was no team, organization, workspace, or agency scope in the schema. This was not primarily a React Query cache problem and was not a different production database.

## 3. Database Connection Comparison

**PASS: SAME DATABASE**

A read-only production check used the configured database connection and returned one public database/schema identity. User and business-row aggregates showed both Admin and Staff rows in that same database. No credentials or database URL were printed.

Production code also fails closed when `DATABASE_URL` is absent in `NODE_ENV=production`; it cannot silently use PGlite in that mode.

## 4. User/Team/Organization Scoping

**FIXED in code**

Better Auth still resolves the actual signed-in user. RBAC continues to use that verified user and role. A new shared-agency owner resolver selects the oldest active Admin as the stable owner key for shared business rows. The actor identity remains separate for audit attribution and authorization.

The existing Team page remains Admin-only, and Staff permissions remain unchanged.

## 5. Demo/Mock Data Findings

**PASS: CONFIRMED LEGACY/DEMO DATA — SAFE TO REMOVE**

`bootstrapWorkspace` contains an explicit sample catalog and seeds 4 clients, 5 invoices, 3 payments, and 13 services for a user. The production Staff rows matched this fingerprint exactly: all 4 clients, 13 services, and 5 invoices had `is_sample=true`; all 3 payments had the bootstrap-only `Sample payment` marker; all rows were created in a single ten-second burst; and no non-sample Staff clients or invoices existed. No sensitive record fields were reported.

The Staff dataset was therefore classified as **B. Legacy demo/seed data**. It was removed in one transaction only after exact-count prevalidation.

## 6. Cache/Query Findings

**FIXED in code**

Mutation handlers already invalidated queries broadly within a browser. That could not synchronize separate browser contexts by itself, and the server-side user filter was the controlling defect. Shared query keys remain compatible, and `refetchOnWindowFocus` is now enabled so stale shared data is refreshed when users return to the application.

Hard refresh and new sessions still remain the authoritative verification for cross-browser synchronization.

## 7. API Authorization Findings

**PASS**

Server functions continue to require `authMiddleware` and `requirePermission`. The fix changes the data scope from the authenticated user to the single agency owner only for shared business records. It does not grant Staff Admin-only operations such as team management, settings management, backup import/export, invoice voiding, or payment voiding.

## 8. Shared Data Model

**FIXED in code**

The application now uses one Marketivity agency business scope represented by the stable active-admin owner key. Admin and Staff retain separate authenticated identities and roles, but shared clients, services, invoices, payments, serials, settings, analytics, statements, search, and exports resolve through the same owner scope.

Migration `0006_shared_agency_workspace.sql` consolidates existing business rows and merges serial counters by maximum value. It now fails closed before updates if client codes, invoice numbers, transaction IDs, or receipt numbers collide. Historical serial rows are preserved; the shared owner serial is raised to the maximum instead of deleting/recreating serials. A rolled-back dry run passed against the configured production schema. **The migration remains unapplied and uncommitted.**

## 9. Fixes Applied

**FIXED**

- Added `src/lib/server/workspace.ts` with the shared agency owner resolver.
- Added `migrations/0006_shared_agency_workspace.sql`.
- Updated business queries and writes across analytics, bootstrap, clients, services, settings, search, backup, invoices, payments, and exports.
- Preserved actual user identity for RBAC and audit attribution.
- Enabled React Query refetch on window focus.
- Added shared-owner regression tests.
- Updated the test script to include the new tests.

Bootstrap audit entries now retain the authenticated actor (rather than substituting the shared owner). The existing sample-clear helper now removes logical dependents transactionally; it was not used for the production cleanup.

No financial calculations, invoice/payment rules, RBAC definitions, invitation token security, or UI redesign was changed.

## 10. Admin -> Staff Synchronization Tests

**NOT VERIFIABLE against live deployment**

The code and migration now use the same agency owner scope. A real two-browser Admin-created client/invoice/service test must be rerun after a fresh production deployment applies migration `0006`.

## 11. Staff -> Admin Synchronization Tests

**NOT VERIFIABLE against live deployment**

Staff write permissions remain enabled where previously allowed, and writes now target the shared owner scope. A real two-browser Staff edit/create test must be rerun after deployment.

## 12. Team Management Cross-Check

**NOT VERIFIABLE**

The production database confirms one active Admin and one active Staff. Live invitation and team-management testing requires an authenticated Admin session. Staff remains denied `manage_team` by the existing RBAC policy.

## 13. Analytics/Statement Cross-Check

**FIXED in code; NOT VERIFIABLE live after migration**

Dashboard, analytics, client profiles, statements, payments, transactions, and exports now resolve shared rows through the agency owner scope. Live totals and statements must be checked after deployment using controlled QA records.

## 14. Production Browser QA

**NOT VERIFIABLE**

The public production login page and unauthenticated protected-route redirect were previously verified. Separate authenticated Admin and Staff browser contexts were not available, and the current deployed version has not yet been confirmed to include migration `0006` and the new query code.

Required post-deployment checks:

- Admin and Staff login in separate browser contexts.
- Admin-created client, service, invoice, and controlled payment visible to authorized Staff.
- Staff-created/edited permitted records visible to Admin.
- Hard refresh, logout/login, direct routes, analytics, statements, and transactions.
- No role escalation or access to Admin-only Team/Settings actions.

## 15. Automated Test Results

**PASS**

- `npm run typecheck`: passed.
- `npm test`: 63 tests passed.
- Safe Vite/Nitro production build (without the `db:migrate` deploy hook): passed. `npm run build` was intentionally not run because it would apply the pending production migration, contrary to the hold instruction.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Production migration dry run: passed and rolled back; no production changes committed.
- Duplicate identifier precheck: no duplicate client codes, invoice numbers, transaction IDs, or receipt numbers found across current production rows.

## 16. Security Regression

**PASS**

Origin validation, CSRF protection, secure cookies, session verification, Fetch-Metadata isolation, invitation token hashing/expiry/single-use behavior, RBAC, last-admin protection, session revocation, and server-side authorization remain intact.

The shared scope does not trust client-supplied user IDs and does not change Admin/Staff permissions.

## 17. QA Data Cleanup

**PASS: LEGACY DEMO CLEANUP COMPLETED**

No new QA records were created. A guarded production transaction removed only confirmed Staff bootstrap data: 4 clients, 13 services, 5 invoices, 6 invoice items, 3 payments, and 11 sample-related audit entries. It checked exact preconditions and Admin row-count invariants before commit. Admin records remained 1 client, 13 services, 1 invoice, and 2 payments. Staff business rows are now zero; no orphaned invoice items or payments remain. Serial values were not reset or changed.

## 18. Post-Cleanup Production Recheck

**PASS**

The read-only recheck returned 5 clients, 26 services, 6 invoices, 7 invoice items, and 5 payments, with one active Admin and one active Staff. The rollback-only migration verification preserved those exact row counts and would scope all surviving business rows to the stable Admin agency owner. It also verified that the owner serial counters were not below the global maxima.

## 19. Remaining Issues

**MANUAL ACTION REQUIRED**

1. Deploy the code and migration to production.
2. Confirm the fresh deployment is serving `https://billing.marketivity.agency`.
3. Run the required two-browser Admin/Staff QA with controlled, clearly marked records.
4. Confirm hard refresh and logout/login behavior after deployment.
5. Recheck analytics, statements, serial generation, and Team visibility according to permissions.

Until deployment and two-session QA are complete, the live production issue cannot be declared resolved.

## Final Verdict

**ADMIN/STAFF SHARED DATA AUDIT PASSED WITH MANUAL DEPLOYMENT VERIFICATION REQUIRED**
