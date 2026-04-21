-- ============================================================
-- NexusCA — Schema
-- Run this FIRST in your Supabase SQL editor.
-- Then run: rls.sql, then seed.sql.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum ('admin', 'employee', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.itr_status as enum ('filed', 'pending', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.kyc_status as enum ('missing', 'uploaded', 'verified');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_type as enum ('loan', 'fd', 'card');
exception when duplicate_object then null; end $$;

-- ─── Profiles ───────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null default 'customer', -- DISPLAY HINT ONLY
  pan text,
  aadhaar text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─── Separate user_roles table (security) ───────────────
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- has_role() — security definer to avoid recursive RLS
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ─── Customers ──────────────────────────────────────────
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  full_name text not null,
  pan text not null,
  aadhaar text,
  email text,
  phone text,
  dob date,
  address text,
  avatar_url text,
  total_assets numeric not null default 0,
  total_liabilities numeric not null default 0,
  annual_revenue numeric not null default 0,
  annual_expenses numeric not null default 0,
  itr_status public.itr_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists customers_user_id_idx on public.customers(user_id);
create index if not exists customers_assigned_to_idx on public.customers(assigned_to);

-- ─── Banks ──────────────────────────────────────────────
create table if not exists public.banks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  ifsc_prefix text,
  logo_url text
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  bank_id uuid not null references public.banks(id) on delete restrict,
  account_number text not null,
  account_type text not null default 'Savings',
  branch text,
  ifsc text,
  balance numeric not null default 0,
  opened_on date
);
create index if not exists bank_accounts_customer_idx on public.bank_accounts(customer_id);
create index if not exists bank_accounts_bank_idx on public.bank_accounts(bank_id);

create table if not exists public.bank_products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  product_type public.product_type not null,
  name text not null,
  amount numeric not null default 0,
  interest_rate numeric,
  start_date date,
  maturity_date date,
  emi numeric,
  doc_url text
);
create index if not exists bank_products_account_idx on public.bank_products(account_id);

-- ─── Properties ─────────────────────────────────────────
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  address text not null,
  city text,
  state text,
  property_type text not null default 'Residential',
  area_sqft numeric,
  market_value numeric not null default 0,
  purchase_value numeric,
  purchased_on date,
  latitude double precision not null,
  longitude double precision not null
);
create index if not exists properties_customer_idx on public.properties(customer_id);

create table if not exists public.property_docs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  doc_type text not null,
  file_url text,
  uploaded_at timestamptz,
  status public.kyc_status not null default 'missing'
);

-- ─── Sundry Debtors (with cross-firm link) ──────────────
create table if not exists public.sundry_debtors (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  debtor_name text not null,
  debtor_pan text,
  amount_outstanding numeric not null default 0,
  invoice_date date,
  due_date date,
  notes text,
  -- THE USP: cross-link when this debtor is also a client of the firm.
  debtor_customer_id uuid references public.customers(id) on delete set null
);
create index if not exists sundry_debtors_customer_idx on public.sundry_debtors(customer_id);
create index if not exists sundry_debtors_xref_idx on public.sundry_debtors(debtor_customer_id);

-- ─── ITR Records ────────────────────────────────────────
create table if not exists public.itr_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  assessment_year text not null,
  filed_on date,
  total_income numeric not null default 0,
  tax_paid numeric not null default 0,
  refund numeric not null default 0,
  status public.itr_status not null default 'pending',
  acknowledgment_no text,
  doc_url text,
  unique (customer_id, assessment_year)
);

-- ─── KYC Documents ──────────────────────────────────────
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  doc_type text not null,
  file_url text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  status public.kyc_status not null default 'missing',
  unique (customer_id, doc_type)
);

-- ─── Auto-create profile + customer-role on signup ──────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer'))
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Storage buckets ────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('kyc-docs', 'kyc-docs', false),
  ('property-docs', 'property-docs', false),
  ('bank-docs', 'bank-docs', false),
  ('itr-docs', 'itr-docs', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;
