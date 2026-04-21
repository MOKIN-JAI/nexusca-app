-- Function: seed demo data for a single customer
create or replace function public.seed_demo_for_customer(_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _bank_id uuid;
  _account_id uuid;
  _property_id uuid;
begin
  -- Pick HDFC if it exists, else any bank, else create one
  select id into _bank_id from public.banks where name ilike 'HDFC%' limit 1;
  if _bank_id is null then
    select id into _bank_id from public.banks limit 1;
  end if;
  if _bank_id is null then
    insert into public.banks (name, ifsc_prefix) values ('HDFC Bank', 'HDFC') returning id into _bank_id;
  end if;

  -- Bank account (only if customer has none)
  if not exists (select 1 from public.bank_accounts where customer_id = _customer_id) then
    insert into public.bank_accounts (customer_id, bank_id, account_number, account_type, branch, ifsc, balance, opened_on)
    values (_customer_id, _bank_id,
      'XXXX' || lpad((floor(random()*9000+1000))::text, 4, '0'),
      'Savings', 'Andheri East', 'HDFC0001234',
      round((random()*450000 + 50000)::numeric, 2),
      current_date - (interval '1 day' * floor(random()*1500)::int))
    returning id into _account_id;

    -- Sample FD product
    insert into public.bank_products (account_id, product_type, name, amount, interest_rate, start_date, maturity_date)
    values (_account_id, 'fd', 'Fixed Deposit – 18 months',
      round((random()*200000 + 100000)::numeric, 2), 7.10,
      current_date - interval '6 months', current_date + interval '12 months');
  end if;

  -- Property
  if not exists (select 1 from public.properties where customer_id = _customer_id) then
    insert into public.properties (customer_id, title, address, city, state, property_type, area_sqft, market_value, purchase_value, purchased_on, latitude, longitude)
    values (_customer_id, '2BHK Apartment',
      'Sky Residency, Andheri West', 'Mumbai', 'Maharashtra', 'Residential',
      950, 18500000, 12500000, current_date - interval '4 years',
      19.1364, 72.8296)
    returning id into _property_id;

    insert into public.property_docs (property_id, doc_type, status)
    values (_property_id, 'Sale Deed', 'uploaded'),
           (_property_id, 'Property Tax Receipt', 'missing');
  end if;

  -- Sundry debtor
  if not exists (select 1 from public.sundry_debtors where customer_id = _customer_id) then
    insert into public.sundry_debtors (customer_id, debtor_name, debtor_pan, amount_outstanding, invoice_date, due_date, notes)
    values (_customer_id, 'Acme Industries Pvt Ltd', 'AACCA1234B',
      round((random()*200000 + 50000)::numeric, 2),
      current_date - interval '45 days', current_date + interval '15 days',
      'Consulting retainer — Q3 invoice');
  end if;

  -- ITR record
  if not exists (select 1 from public.itr_records where customer_id = _customer_id) then
    insert into public.itr_records (customer_id, assessment_year, filed_on, total_income, tax_paid, refund, status, acknowledgment_no)
    values (_customer_id, '2024-25', current_date - interval '60 days',
      1850000, 285000, 12000, 'filed',
      'ACK' || lpad((floor(random()*900000+100000))::text, 6, '0'));
  end if;

  -- KYC docs
  if not exists (select 1 from public.kyc_documents where customer_id = _customer_id) then
    insert into public.kyc_documents (customer_id, doc_type, status)
    values (_customer_id, 'PAN Card', 'verified'),
           (_customer_id, 'Aadhaar Card', 'verified'),
           (_customer_id, 'Bank Statement', 'missing');
  end if;
end;
$$;

-- Trigger function
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_demo_for_customer(new.id);
  return new;
end;
$$;

drop trigger if exists trg_seed_new_customer on public.customers;
create trigger trg_seed_new_customer
after insert on public.customers
for each row execute function public.handle_new_customer();

-- Backfill: seed demo data for any existing customer with no data yet
do $$
declare r record;
begin
  for r in select id from public.customers loop
    perform public.seed_demo_for_customer(r.id);
  end loop;
end $$;