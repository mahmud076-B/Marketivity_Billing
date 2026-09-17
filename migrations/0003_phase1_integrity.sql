-- Phase 1 Integrity Migration: Payment voiding & Client archiving

-- Add status and void metadata to payments
alter table payments add column if not exists status text not null default 'active';
alter table payments add column if not exists voided_at timestamptz;
alter table payments add column if not exists void_reason text not null default '';
create index if not exists payments_status_idx on payments (user_id, status);

-- Add archived flag to clients for safe client archiving when historical invoices exist
alter table clients add column if not exists is_archived boolean not null default false;
create index if not exists clients_archived_idx on clients (user_id, is_archived);
