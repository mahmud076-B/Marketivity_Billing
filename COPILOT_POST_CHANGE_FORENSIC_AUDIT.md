# Forensic Audit Report: Post-Change Admin/Staff Data Mismatch

**Date**: September 18, 2026
**Status**: Read-Only Audit Completed

## 1. Executive Summary

The critical issue where Staff UI shows empty data while Admin UI shows mixed (real + demo) data is caused by a **deployment mismatch between the database schema and the Vercel application code**.

Specifically, the database migration (`0006_shared_agency_workspace.sql`) was executed against the production Supabase database, transferring ownership of all business records to the Admin account. However, the application code that instructs the system to read from the Admin's account (using `getAgencyOwnerId()`) has **not yet been deployed to Vercel**. 

As a result, the live application on Vercel is still running the old logic (querying by the logged-in user's ID), leading to the observed symptoms.

## 2. Detailed Findings

### A. Database State
* The migration script `0006_shared_agency_workspace.sql` was successfully applied to the production Supabase database.
* This migration contained the following logic:
  ```sql
  UPDATE clients SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE services SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE invoices SET user_id = agency_owner WHERE user_id <> agency_owner;
  UPDATE payments SET user_id = agency_owner WHERE user_id <> agency_owner;
  ```
* **Impact**: All records previously owned by the Staff user (`evjqcQxPTSaaD7iGofo3Ph0Vpu4R3S9Z`) were reassigned to the Admin user (`6umQZV41V8h9QSss18dvTNeygYcDyndV`).
* The production database currently holds:
  * Admin (`6umQ...`): 5 Clients (Afzal Hossain + 4 demo clients), 39 Services, 6 Invoices, 5 Payments.
  * Staff (`evjqc...`): 0 Clients, 13 Services (these 13 services were likely seeded after the migration but before the code was updated), 0 Invoices, 0 Payments.

### B. Application Code State (Vercel vs Local)
* **Local Codebase**: The local files (e.g., `src/lib/server/analytics.ts`, `src/lib/server/clients.ts`, `workspace.ts`) have been successfully updated by Copilot/Antigravity to use `ownerId = await getAgencyOwnerId(sql)`. If this code were running, both Admin and Staff would see the exact same data.
* **Vercel (Live) Codebase**: Since no `git push` or deployment has occurred recently, Vercel is still running the previous code where queries are strictly isolated by `context.userId`.

### C. Symptom Analysis
1. **Why Admin sees mixed data (Real + Demo)**: When Admin logs into Vercel, the old code fetches records where `user_id = <Admin ID>`. Since the database migration gave the Admin *all* records (including the Staff's demo records), the Admin sees Afzal Hossain (real) alongside the demo data.
2. **Why Staff sees zeros/empty**: When Staff logs into Vercel, the old code fetches records where `user_id = <Staff ID>`. Since the database migration took away all of Staff's records, the query returns 0 results.

## 3. Production Data Safety Verification

* **Real Data Preserved**: The real client `Afzal Hossain` and their payment record (৳1,520) **have not been deleted or altered**. They are safely stored in the production database under the Admin's `user_id`.
* **No Accidental Deletions**: No business data was dropped. The issue is purely an access/routing mismatch caused by the partial rollout (database updated, but not the frontend/backend code).

## 4. Next Steps (When Authorized)

To fix this issue permanently and achieve the "One Marketivity Business Dataset" architecture, the following steps are required (DO NOT perform these until explicitly authorized):

1. **Commit and Push**: Commit the local changes (the new `workspace.ts` and updated server files) to the `main` branch.
2. **Deploy to Vercel**: Once Vercel builds the new code, the Vercel app will begin using `getAgencyOwnerId(sql)` instead of `context.userId`.
3. **Data Cleanup (Optional)**: After deployment, the Admin can safely delete the lingering demo data from the UI, leaving only the real records (Afzal Hossain).

---
*End of Audit Report. No production data was modified during this investigation.*
