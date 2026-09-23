-- ====================================================================
-- Nudge: Section 43B(h) MSME Payment Compliance Copilot
-- Migration 001: Initial Database Schema & Row Level Security (RLS)
-- ====================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- 1. Organizations (Tenant boundary)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. Org membership — links Supabase auth.users to an organization
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- 3. Vendors, with Udyam/MSME classification
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  udyam_category text not null check (udyam_category in ('micro','small','medium','not_registered','unknown')) default 'unknown',
  udyam_registration_number text,
  udyam_certificate_path text,       -- Supabase Storage path
  udyam_verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vendor_id uuid references vendors(id) on delete set null,
  file_path text,                     -- Supabase Storage path
  raw_extracted jsonb,                -- full AI extraction output
  invoice_number text,
  amount numeric(14,2),
  currency text default 'INR',
  acceptance_date date,
  po_number text,
  agreement_basis text not null check (agreement_basis in ('no_agreement','written_agreement')) default 'no_agreement',
  agreement_days int,                 -- populated when written_agreement, capped at 45 in application logic
  computed_deadline date,             -- deterministic: acceptance_date + 15 or + min(agreement_days,45)
  payment_date date,                  -- null until paid
  status text not null check (status in ('on_track','at_risk','breached','paid_on_time','paid_late')) default 'on_track',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Deterministic MSMED interest calculations for breached invoices
create table if not exists interest_calculations (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  rbi_bank_rate numeric(5,2) not null,      -- rate used at calculation time
  applicable_rate numeric(5,2) not null,    -- 3x rbi_bank_rate
  days_overdue int not null,
  interest_amount numeric(14,2) not null,
  calculated_at timestamptz not null default now()
);

-- 6. Udyam declaration request / reply thread per vendor
create table if not exists declaration_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  direction text not null check (direction in ('outbound_draft','outbound_sent','inbound_reply')),
  subject text,
  body text not null,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 7. Internal alerts (deadline warnings, breach notifications)
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  severity text not null check (severity in ('info','warning','critical')),
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

-- 8. Audit log — every AI and system action, immutable
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor text not null,   -- 'ai', 'system', or a user_id string
  action text not null,  -- 'extraction','udyam_classification','declaration_drafted','declaration_sent','deadline_computed','interest_calculated','alert_raised','nl_query'
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 9. Org-level settings
create table if not exists org_settings (
  org_id uuid primary key references organizations(id) on delete cascade,
  alert_lead_time_days int not null default 5,
  rbi_bank_rate numeric(5,2) not null default 6.50,
  default_agreement_basis text not null default 'no_agreement',
  auto_send_declarations boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Create Indexes for High-Performance Queries
create index if not exists idx_org_members_user on org_members(user_id);
create index if not exists idx_org_members_org on org_members(org_id);
create index if not exists idx_vendors_org on vendors(org_id);
create index if not exists idx_invoices_org on invoices(org_id);
create index if not exists idx_invoices_vendor on invoices(vendor_id);
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_invoices_deadline on invoices(computed_deadline);
create index if not exists idx_alerts_org_ack on alerts(org_id, acknowledged);
create index if not exists idx_audit_log_org on audit_log(org_id, created_at desc);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & ISOLATION POLICIES
-- ====================================================================

-- Enable RLS on every table
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table vendors enable row level security;
alter table invoices enable row level security;
alter table interest_calculations enable row level security;
alter table declaration_requests enable row level security;
alter table alerts enable row level security;
alter table audit_log enable row level security;
alter table org_settings enable row level security;

-- Helper Function: Check if the authenticated user is a member of target_org
create or replace function is_org_member(target_org uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

-- 1. organizations policies
create policy "org_visible_to_members" on organizations
  for select using (is_org_member(id));

create policy "org_insert_authenticated" on organizations
  for insert with check (auth.role() = 'authenticated');

create policy "org_update_admin" on organizations
  for update using (
    exists (
      select 1 from org_members
      where org_id = organizations.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- 2. org_members policies
create policy "member_self_select" on org_members
  for select using (user_id = auth.uid() or is_org_member(org_id));

create policy "member_self_insert" on org_members
  for insert with check (user_id = auth.uid() or is_org_member(org_id));

create policy "member_admin_update" on org_members
  for update using (
    exists (
      select 1 from org_members
      where org_id = org_members.org_id and user_id = auth.uid() and role = 'admin'
    )
  );

create policy "member_admin_delete" on org_members
  for delete using (
    exists (
      select 1 from org_members
      where org_id = org_members.org_id and user_id = auth.uid() and role = 'admin'
    )
  );

-- 3. vendors policies
create policy "vendors_org_select" on vendors
  for select using (is_org_member(org_id));
create policy "vendors_org_insert" on vendors
  for insert with check (is_org_member(org_id));
create policy "vendors_org_update" on vendors
  for update using (is_org_member(org_id));
create policy "vendors_org_delete" on vendors
  for delete using (is_org_member(org_id));

-- 4. invoices policies
create policy "invoices_org_select" on invoices
  for select using (is_org_member(org_id));
create policy "invoices_org_insert" on invoices
  for insert with check (is_org_member(org_id));
create policy "invoices_org_update" on invoices
  for update using (is_org_member(org_id));
create policy "invoices_org_delete" on invoices
  for delete using (is_org_member(org_id));

-- 5. interest_calculations policies
create policy "interest_org_select" on interest_calculations
  for select using (is_org_member(org_id));
create policy "interest_org_insert" on interest_calculations
  for insert with check (is_org_member(org_id));
create policy "interest_org_update" on interest_calculations
  for update using (is_org_member(org_id));
create policy "interest_org_delete" on interest_calculations
  for delete using (is_org_member(org_id));

-- 6. declaration_requests policies
create policy "declaration_org_select" on declaration_requests
  for select using (is_org_member(org_id));
create policy "declaration_org_insert" on declaration_requests
  for insert with check (is_org_member(org_id));
create policy "declaration_org_update" on declaration_requests
  for update using (is_org_member(org_id));
create policy "declaration_org_delete" on declaration_requests
  for delete using (is_org_member(org_id));

-- 7. alerts policies
create policy "alerts_org_select" on alerts
  for select using (is_org_member(org_id));
create policy "alerts_org_insert" on alerts
  for insert with check (is_org_member(org_id));
create policy "alerts_org_update" on alerts
  for update using (is_org_member(org_id));
create policy "alerts_org_delete" on alerts
  for delete using (is_org_member(org_id));

-- 8. audit_log policies (IMMUTABLE: insert and select only, no update/delete allowed for users)
create policy "audit_org_select" on audit_log
  for select using (is_org_member(org_id));
create policy "audit_org_insert" on audit_log
  for insert with check (is_org_member(org_id));

-- 9. org_settings policies
create policy "settings_org_select" on org_settings
  for select using (is_org_member(org_id));
create policy "settings_org_insert" on org_settings
  for insert with check (is_org_member(org_id));
create policy "settings_org_update" on org_settings
  for update using (is_org_member(org_id));
create policy "settings_org_delete" on org_settings
  for delete using (is_org_member(org_id));

-- ====================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION (Private Documents)
-- ====================================================================
-- Note: Create bucket 'nudge-documents' in Supabase dashboard or via API
-- insert into storage.buckets (id, name, public) values ('nudge-documents', 'nudge-documents', false)
-- on conflict (id) do nothing;
