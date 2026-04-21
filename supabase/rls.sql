-- ============================================================
-- NexusCA — Row Level Security
-- Run AFTER schema.sql.
-- Customers see only their own rows. Employees see only clients
-- where assigned_to = auth.uid(). debtor_customer_id is treated
-- as firm-internal and is ONLY exposed via employee paths.
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

-- ─── Profiles ─────────────────────────────────────────
drop policy if exists "profiles read self or employee" on public.profiles;
create policy "profiles read self or employee" on public.profiles
  for select to authenticated using (
    id = auth.uid() or public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ─── user_roles (read-only to user) ───────────────────
drop policy if exists "user_roles read self" on public.user_roles;
create policy "user_roles read self" on public.user_roles
  for select to authenticated using (
    user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );

-- ─── Helper: who can see a given customer row ─────────
-- A user can see a customer if:
--   - they ARE that customer (customers.user_id = auth.uid()), OR
--   - they are the assigned employee (assigned_to = auth.uid()), OR
--   - they are admin.

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

-- Banks are reference data — readable by any authenticated user.
drop policy if exists "banks read all" on public.banks;
create policy "banks read all" on public.banks for select to authenticated using (true);

drop policy if exists "banks write employee" on public.banks;
create policy "banks write employee" on public.banks
  for all to authenticated using (
    public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  ) with check (
    public.has_role(auth.uid(), 'employee') or public.has_role(auth.uid(), 'admin')
  );

-- ─── Generic policy generator for child tables ─────────
-- Scoped via parent customer.
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'bank_accounts','bank_products_via_account',
      'properties','property_docs_via_property',
      'sundry_debtors','itr_records','kyc_documents'
    ])
  loop null;
  end loop;
end $$;

-- bank_accounts
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

-- bank_products
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

-- properties
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

-- property_docs
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

-- sundry_debtors
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

-- itr_records
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

-- kyc_documents
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

-- ─── Storage policies ─────────────────────────────────
-- Owners (customer matching the path's customer_id folder) can read/write
-- their own files; assigned employees can read/write all client files.
-- Convention: object name path = "{customer_id}/{filename}".

drop policy if exists "kyc-docs read scoped" on storage.objects;
create policy "kyc-docs read scoped" on storage.objects
  for select to authenticated using (
    bucket_id = 'kyc-docs' and (
      exists (
        select 1 from public.customers c
        where c.id::text = (storage.foldername(name))[1]
          and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
      )
    )
  );

drop policy if exists "kyc-docs write scoped" on storage.objects;
create policy "kyc-docs write scoped" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'kyc-docs' and (
      exists (
        select 1 from public.customers c
        where c.id::text = (storage.foldername(name))[1]
          and (c.user_id = auth.uid() or c.assigned_to = auth.uid() or public.has_role(auth.uid(), 'admin'))
      )
    )
  );

-- Repeat for property-docs, bank-docs, itr-docs (same pattern).
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

-- avatars bucket: public read, owner write
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
