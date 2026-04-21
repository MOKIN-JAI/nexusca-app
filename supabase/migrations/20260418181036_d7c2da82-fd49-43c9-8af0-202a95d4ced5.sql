-- ============================================================
-- NexusCA — Schema + RLS (combined)
-- ============================================================

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
  role public.app_role not null default 'customer',
  pan text,
  aadhaar text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ─── user_roles (security source of truth) ──────────────
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

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

-- ─── Sundry Debtors ─────────────────────────────────────
create table if not exists public.sundry_debtors (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  debtor_name text not null,
  debtor_pan text,
  amount_outstanding numeric not null default 0,
  invoice_date date,
  due_date date,
  notes text,
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

-- ─── Auto-create profile + role on signup ───────────────
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

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.user_roles      enable row level security;
alter table public.customers       enable row level security;
alter table public.banks           enable row level security;
alter table public.bank_accounts   enable row level security;
alter table public.bank_products   enable row level security;
alter table public.properties      enable row level security;
alter table public.property_docs   enable row level security;
alter table public.sundry_debtors  enable row level security;
alter table public.itr_records     enable row level security;
alter table public.kyc_documents   enable row level security;

drop policy if exists "profiles read self or employee" on public.profiles;
create policy "profiles read self or employee" on public.profiles
  for select to authenticated using (
    id = auth.uid() or public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid());

drop policy if exists "user_roles read self" on public.user_roles;
create policy "user_roles read self" on public.user_roles
  for select to authenticated using (
    user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "customers read scoped" on public.customers;
create policy "customers read scoped" on public.customers
  for select to authenticated using (
    user_id = auth.uid()
    or assigned_to = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "customers write employee" on public.customers;
create policy "customers write employee" on public.customers
  for all to authenticated using (
    assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin')
  ) with check (
    assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "banks read all" on public.banks;
create policy "banks read all" on public.banks for select to authenticated using (true);

drop policy if exists "banks write employee" on public.banks;
create policy "banks write employee" on public.banks
  for all to authenticated using (
    public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  ) with check (
    public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "bank_accounts scoped" on public.bank_accounts;
create policy "bank_accounts scoped" on public.bank_accounts
  for all to authenticated using (
    exists (
      select 1 from public.customers c
      where c.id = bank_accounts.customer_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.customers c
      where c.id = bank_accounts.customer_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "bank_products scoped" on public.bank_products;
create policy "bank_products scoped" on public.bank_products
  for all to authenticated using (
    exists (
      select 1 from public.bank_accounts a
      join public.customers c on c.id = a.customer_id
      where a.id = bank_products.account_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.bank_accounts a
      join public.customers c on c.id = a.customer_id
      where a.id = bank_products.account_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "properties scoped" on public.properties;
create policy "properties scoped" on public.properties
  for all to authenticated using (
    exists (
      select 1 from public.customers c
      where c.id = properties.customer_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.customers c
      where c.id = properties.customer_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "property_docs scoped" on public.property_docs;
create policy "property_docs scoped" on public.property_docs
  for all to authenticated using (
    exists (
      select 1 from public.properties p
      join public.customers c on c.id = p.customer_id
      where p.id = property_docs.property_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.properties p
      join public.customers c on c.id = p.customer_id
      where p.id = property_docs.property_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "sundry_debtors scoped" on public.sundry_debtors;
create policy "sundry_debtors scoped" on public.sundry_debtors
  for all to authenticated using (
    exists (
      select 1 from public.customers c
      where c.id = sundry_debtors.customer_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.customers c
      where c.id = sundry_debtors.customer_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "itr_records scoped" on public.itr_records;
create policy "itr_records scoped" on public.itr_records
  for all to authenticated using (
    exists (
      select 1 from public.customers c
      where c.id = itr_records.customer_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.customers c
      where c.id = itr_records.customer_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "kyc_documents scoped" on public.kyc_documents;
create policy "kyc_documents scoped" on public.kyc_documents
  for all to authenticated using (
    exists (
      select 1 from public.customers c
      where c.id = kyc_documents.customer_id
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  ) with check (
    exists (
      select 1 from public.customers c
      where c.id = kyc_documents.customer_id
        and (c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

-- Storage policies
drop policy if exists "kyc-docs read scoped" on storage.objects;
create policy "kyc-docs read scoped" on storage.objects
  for select to authenticated using (
    bucket_id = 'kyc-docs' and exists (
      select 1 from public.customers c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "kyc-docs write scoped" on storage.objects;
create policy "kyc-docs write scoped" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'kyc-docs' and exists (
      select 1 from public.customers c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
    )
  );

do $$
declare b text;
begin
  for b in select unnest(array['property-docs','bank-docs','itr-docs']) loop
    execute format($f$
      drop policy if exists "%1$s read scoped" on storage.objects;
      create policy "%1$s read scoped" on storage.objects
        for select to authenticated using (
          bucket_id = %2$L and exists (
            select 1 from public.customers c
            where c.id::text = (storage.foldername(name))[1]
              and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
          )
        );
      drop policy if exists "%1$s write scoped" on storage.objects;
      create policy "%1$s write scoped" on storage.objects
        for insert to authenticated with check (
          bucket_id = %2$L and exists (
            select 1 from public.customers c
            where c.id::text = (storage.foldername(name))[1]
              and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
          )
        );
    $f$, b, b);
  end loop;
end $$;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );