-- Marketivity billing schema (per-user, never reuse serials)

create table if not exists serials (
  user_id     text not null,
  kind        text not null,
  year        integer not null,
  last_number integer not null default 0,
  primary key (user_id, kind, year)
);

create table if not exists settings (
  user_id               text primary key,
  agency_name           text not null default 'Marketivity',
  tagline               text not null default 'Think beyond marketing. Build for growth.',
  positioning           text not null default 'Digital Growth Partners',
  phone                 text not null default '',
  whatsapp              text not null default '',
  email                 text not null default '',
  address               text not null default '',
  website               text not null default '',
  facebook_page         text not null default '',
  bkash_number          text not null default '',
  nagad_number          text not null default '',
  bank_info             text not null default '',
  logo_data_url         text not null default '',
  accent_color          text not null default '#F5A623',
  footer_text           text not null default 'Think beyond marketing. Build for growth.',
  payment_instructions  text not null default '',
  terms                 text not null default '',
  theme                 text not null default 'dark',
  invoice_theme         text not null default 'classic',
  sample_loaded         boolean not null default false,
  updated_at            timestamptz not null default now()
);

create table if not exists clients (
  id            text primary key,
  user_id       text not null,
  client_code   text not null,
  name          text not null,
  business_name text not null default '',
  phone         text not null default '',
  email         text not null default '',
  address       text not null default '',
  facebook_page text not null default '',
  website       text not null default '',
  notes         text not null default '',
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now()
);
create unique index if not exists clients_user_code_idx on clients (user_id, client_code);
create index if not exists clients_user_id_idx on clients (user_id);

create table if not exists services (
  id            text primary key,
  user_id       text not null,
  name          text not null,
  description   text not null default '',
  default_rate  numeric not null default 0,
  is_boosting   boolean not null default false,
  usd_rate      numeric,
  is_sample     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists services_user_id_idx on services (user_id);

create table if not exists invoices (
  id                  text primary key,
  user_id             text not null,
  invoice_number      text not null,
  client_id           text not null,
  issue_date          date not null,
  issue_time          text not null,
  due_date            date,
  status              text not null default 'unpaid',
  subtotal            numeric not null default 0,
  discount_type       text not null default 'none',
  discount_value      numeric not null default 0,
  tax_enabled         boolean not null default false,
  tax_rate            numeric not null default 0,
  tax_amount          numeric not null default 0,
  service_charge      numeric not null default 0,
  total               numeric not null default 0,
  paid_amount         numeric not null default 0,
  due_amount          numeric not null default 0,
  payment_terms       text not null default '',
  notes               text not null default '',
  is_boosting         boolean not null default false,
  ad_budget_usd       numeric,
  marketivity_rate    numeric,
  is_sample           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists invoices_user_number_idx on invoices (user_id, invoice_number);
create index if not exists invoices_user_id_idx on invoices (user_id);
create index if not exists invoices_client_id_idx on invoices (client_id);

create table if not exists invoice_items (
  id            text primary key,
  invoice_id    text not null,
  user_id       text not null,
  service_id    text,
  service_name  text not null,
  description   text not null default '',
  qty           numeric not null default 1,
  unit_price    numeric not null default 0,
  amount        numeric not null default 0,
  sort_order    integer not null default 0
);
create index if not exists invoice_items_invoice_idx on invoice_items (invoice_id);

create table if not exists payments (
  id              text primary key,
  user_id         text not null,
  invoice_id      text not null,
  transaction_id  text not null,
  receipt_number  text not null,
  amount          numeric not null,
  method          text not null,
  payment_date    date not null,
  payment_time    text not null,
  external_txn_id text not null default '',
  notes           text not null default '',
  previous_due    numeric not null default 0,
  remaining_due   numeric not null default 0,
  created_at      timestamptz not null default now()
);
create unique index if not exists payments_user_txn_idx on payments (user_id, transaction_id);
create unique index if not exists payments_user_receipt_idx on payments (user_id, receipt_number);
create index if not exists payments_user_id_idx on payments (user_id);
create index if not exists payments_invoice_id_idx on payments (invoice_id);

create table if not exists audit_log (
  id           text primary key,
  user_id      text not null,
  entity_type  text not null,
  entity_id    text not null,
  action       text not null,
  details      text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_user_idx on audit_log (user_id, created_at desc);
