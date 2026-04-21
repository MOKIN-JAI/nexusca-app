-- ============================================================
-- NexusCA — Rich Demo Seed
-- ============================================================
-- BEFORE RUNNING: in Supabase Auth → Users, create THREE users:
--   1) priya@nexusca.demo   (password: Nexus@123)  — employee
--   2) rajesh@demo.in       (password: Nexus@123)  — customer
--   3) sunita@demo.in       (password: Nexus@123)  — customer
--
-- The on-signup trigger creates rows in profiles + user_roles
-- (default role = 'customer'). This script then PROMOTES Priya
-- to 'employee', enriches profiles, and inserts demo data.
-- ============================================================

-- 1. Promote Priya to employee + fix profile metadata.
do $$
declare priya uuid; rajesh uuid; sunita uuid;
begin
  select id into priya  from auth.users where email = 'priya@nexusca.demo';
  select id into rajesh from auth.users where email = 'rajesh@demo.in';
  select id into sunita from auth.users where email = 'sunita@demo.in';

  if priya is null or rajesh is null or sunita is null then
    raise exception 'Demo auth users not found. Create them in Supabase Auth first.';
  end if;

  -- Profiles
  update public.profiles
     set full_name = 'Priya Sharma', role = 'employee', phone = '+91 98200 11111'
   where id = priya;
  update public.profiles
     set full_name = 'Rajesh Kumar', role = 'customer',
         pan = 'ABCPK1234E', aadhaar = '123456789012', phone = '+91 98200 22222'
   where id = rajesh;
  update public.profiles
     set full_name = 'Sunita Patel', role = 'customer',
         pan = 'XYZPP5678Q', aadhaar = '987654321098', phone = '+91 98200 33333'
   where id = sunita;

  -- Roles (separate table, security source of truth)
  delete from public.user_roles where user_id = priya;
  insert into public.user_roles (user_id, role) values (priya, 'employee');

  -- 2. Banks (reference data, shared)
  insert into public.banks (name, ifsc_prefix) values
    ('HDFC Bank', 'HDFC'),
    ('ICICI Bank', 'ICIC'),
    ('State Bank of India', 'SBIN'),
    ('Axis Bank', 'UTIB'),
    ('Kotak Mahindra Bank', 'KKBK')
  on conflict (name) do nothing;

  -- 3. Customers
  insert into public.customers (
    user_id, assigned_to, full_name, pan, aadhaar, email, phone, dob, address,
    total_assets, total_liabilities, annual_revenue, annual_expenses, itr_status
  ) values
    (rajesh, priya, 'Rajesh Kumar', 'ABCPK1234E', '123456789012',
     'rajesh@demo.in', '+91 98200 22222', '1982-04-12',
     'A-401, Lodha Bellissimo, Mahalaxmi, Mumbai 400011',
     18500000, 6200000, 4800000, 1900000, 'filed'),
    (sunita, priya, 'Sunita Patel', 'XYZPP5678Q', '987654321098',
     'sunita@demo.in', '+91 98200 33333', '1987-09-25',
     '12, Vasant Vihar, Pune 411014',
     12700000, 8900000, 6200000, 2400000, 'pending')
  on conflict do nothing;
end $$;

-- 4. Everything below runs against existing rows.
-- ─── Bank accounts ────────────────────────────────────
with c as (
  select
    (select id from public.customers where pan = 'ABCPK1234E') as rajesh,
    (select id from public.customers where pan = 'XYZPP5678Q') as sunita,
    (select id from public.banks where name = 'HDFC Bank') as hdfc,
    (select id from public.banks where name = 'ICICI Bank') as icici,
    (select id from public.banks where name = 'State Bank of India') as sbi,
    (select id from public.banks where name = 'Axis Bank') as axis,
    (select id from public.banks where name = 'Kotak Mahindra Bank') as kotak
)
insert into public.bank_accounts (customer_id, bank_id, account_number, account_type, branch, ifsc, balance, opened_on)
select rajesh, hdfc,  '5012XXXX1001', 'Savings', 'Mahalaxmi', 'HDFC0000123', 1850000, '2018-06-12' from c union all
select rajesh, icici, '6271XXXX2002', 'Current', 'Worli',     'ICIC0000456', 2400000, '2020-01-04' from c union all
select rajesh, sbi,   '3001XXXX3003', 'Savings', 'Fort',      'SBIN0000789', 320000,  '2015-08-22' from c union all
select sunita, hdfc,  '5012XXXX4004', 'Savings', 'FC Road',   'HDFC0000234', 950000,  '2019-03-15' from c union all -- HDFC SHARED
select sunita, axis,  '9120XXXX5005', 'Current', 'Koregaon',  'UTIB0000567', 1820000, '2021-11-08' from c union all
select sunita, kotak, '7711XXXX6006', 'Savings', 'Aundh',     'KKBK0000890', 460000,  '2022-02-19' from c;

-- ─── Bank products (loans / FDs / cards) ──────────────
insert into public.bank_products (account_id, product_type, name, amount, interest_rate, start_date, maturity_date, emi)
select a.id, 'loan'::public.product_type, 'Home Loan — Bellissimo', 5500000, 8.4, '2019-01-15', '2034-01-15', 54200
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='HDFC Bank' and a.account_number='5012XXXX1001'
union all
select a.id, 'fd', '5-yr Tax Saver FD', 500000, 7.1, '2022-04-01', '2027-03-31', null
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='ICICI Bank' and a.account_number='6271XXXX2002'
union all
select a.id, 'card', 'HDFC Diners Black', 0, 36.0, '2020-08-10', null, null
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='HDFC Bank' and a.account_number='5012XXXX1001'
union all
select a.id, 'fd', 'Senior Citizen FD', 1000000, 7.5, '2023-01-01', '2026-01-01', null
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='State Bank of India' and a.account_number='3001XXXX3003'
union all
-- Sunita
select a.id, 'loan', 'Business Loan', 3200000, 11.2, '2021-06-01', '2026-06-01', 42100
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='Axis Bank' and a.account_number='9120XXXX5005'
union all
select a.id, 'fd', 'Quarterly Payout FD (maturing soon)', 750000, 6.9, '2023-05-01', current_date + 18, null
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='HDFC Bank' and a.account_number='5012XXXX4004'
union all
select a.id, 'card', 'Kotak White Reserve', 0, 38.5, '2022-09-12', null, null
  from public.bank_accounts a join public.banks b on b.id=a.bank_id where b.name='Kotak Mahindra Bank' and a.account_number='7711XXXX6006';

-- ─── Properties (real Maharashtra coords) ─────────────
insert into public.properties (customer_id, title, address, city, state, property_type, area_sqft, market_value, purchase_value, purchased_on, latitude, longitude)
select id, 'Lodha Bellissimo (3BHK)', 'A-401, Mahalaxmi, Mumbai', 'Mumbai', 'Maharashtra', 'Residential', 1850, 95000000, 42000000, '2018-05-10', 18.9853, 72.8156
  from public.customers where pan='ABCPK1234E'
union all
select id, 'Office — Worli', 'Unit 712, Lotus Corporate Park, Worli', 'Mumbai', 'Maharashtra', 'Commercial', 1100, 38000000, 28000000, '2020-12-01', 19.0125, 72.8175
  from public.customers where pan='ABCPK1234E'
union all
select id, 'Vasant Vihar Bungalow', '12, Vasant Vihar, Pune', 'Pune', 'Maharashtra', 'Residential', 3200, 42000000, 22000000, '2017-11-22', 18.5642, 73.7769
  from public.customers where pan='XYZPP5678Q'
union all
select id, 'Plot — Lonavala', 'Survey 184/3, Tungarli, Lonavala', 'Lonavala', 'Maharashtra', 'Land', 4800, 18000000, 8000000, '2022-08-08', 18.7546, 73.4062
  from public.customers where pan='XYZPP5678Q';

-- ─── Property docs ─────────────────────────────────────
insert into public.property_docs (property_id, doc_type, status)
select p.id, dt, 'uploaded'::public.kyc_status
  from public.properties p
       cross join unnest(array['7/12 Extract','Property Card','Sale Deed','Index II','NOC','Mutation']) dt;

-- ─── Sundry debtors (with cross-firm link!) ───────────
-- Sunita is owed money by Suresh Mehta. Suresh's PAN matches a debtor row of
-- Rajesh's. We link Sunita's row to Rajesh's customer record? No — for the
-- canonical demo: one of Rajesh's debtors (Suresh Mehta) IS Sunita as a client.
insert into public.sundry_debtors (customer_id, debtor_name, debtor_pan, amount_outstanding, invoice_date, due_date, debtor_customer_id, notes)
select c.id, 'Suresh Mehta',     'XYZPP5678Q', 380000, current_date - 45, current_date + 15,
       (select id from public.customers where pan='XYZPP5678Q'),
       'Long-time client — payment expected post Q2 close.'
  from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, 'Mehul Traders',    'AAACM2233F',  220000, current_date - 60, current_date - 5, null, 'Followed up twice.' from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, 'BlueLine Logistics','AAACB9988K',  140000, current_date - 30, current_date + 30, null, null from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, 'Patel Corp',       'AAFCP4455G',   90000, current_date - 15, current_date + 45, null, null from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, 'Deepak Industries','AAACD7766L',  610000, current_date - 90, current_date - 30, null, 'Disputed — partial settlement under negotiation.' from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, 'Anil Stores',      'AKCPS9988R',   45000, current_date - 20, current_date + 10, null, null from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, 'NextGen Tech',     'AAGCN2244H',  290000, current_date - 50, current_date + 5, null, null from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, 'Maruti Vendors',   'AABCM5599J',  120000, current_date - 10, current_date + 20, null, null from public.customers c where c.pan='XYZPP5678Q';

-- ─── ITR records (3-4 years per client) ───────────────
insert into public.itr_records (customer_id, assessment_year, filed_on, total_income, tax_paid, refund, status, acknowledgment_no)
select c.id, '2021-22', '2021-09-12', 3200000, 720000, 18000, 'filed', 'ACK21-887421' from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, '2022-23', '2022-08-05', 3800000, 880000, 22000, 'filed', 'ACK22-998812' from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, '2023-24', '2023-09-30', 4100000, 950000, 30000, 'filed', 'ACK23-771209' from public.customers c where c.pan='ABCPK1234E'
union all
select c.id, '2024-25', '2024-07-22', 4800000, 1120000, 12000, 'filed', 'ACK24-300114' from public.customers c where c.pan='ABCPK1234E'
union all
-- Sunita: missing latest year
select c.id, '2021-22', '2021-10-02', 4200000, 990000, 11000, 'filed', 'ACK21-552201' from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, '2022-23', '2022-09-18', 5100000, 1230000, 4000,  'filed', 'ACK22-661193' from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, '2023-24', '2023-10-12', 5800000, 1410000, 7000,  'filed', 'ACK23-114577' from public.customers c where c.pan='XYZPP5678Q'
union all
select c.id, '2024-25', null, 0, 0, 0, 'overdue', null from public.customers c where c.pan='XYZPP5678Q';

-- ─── KYC documents (12 standard types) ─────────────────
insert into public.kyc_documents (customer_id, doc_type, status, uploaded_at, verified_at)
select c.id, dt,
       case when dt in ('PAN Card','Aadhaar Card','Address Proof') then 'verified'::public.kyc_status
            when dt in ('Passport','Bank Statement','Salary Slip') then 'uploaded'::public.kyc_status
            else 'missing'::public.kyc_status end,
       case when dt not in ('Driving License','Voter ID','GST Certificate','MSME Certificate','Form 16','Investment Proof') then now() - interval '20 days' else null end,
       case when dt in ('PAN Card','Aadhaar Card','Address Proof') then now() - interval '15 days' else null end
  from public.customers c
       cross join unnest(array[
         'PAN Card','Aadhaar Card','Passport','Driving License','Voter ID',
         'Bank Statement','Salary Slip','Form 16','GST Certificate','MSME Certificate',
         'Address Proof','Investment Proof'
       ]) dt;
