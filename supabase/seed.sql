-- NEXUSCA CORRECTED SEED — Uses verified Auth UIDs
-- ================================================

-- Step 1: Upsert Profiles
INSERT INTO profiles (id, email, full_name, role)
VALUES
  ('32f79ed2-7337-40ff-9a3e-d7658f2d7fa4','priya@nexusca.employee','Priya Sharma','employee'),
  ('308763dd-07d6-417e-a7cc-f3ea83ff57ee','arjun@nexusca.employee','Arjun Mehta','employee'),
  ('846ffbf5-f9f5-4061-a7a6-a4226d5ac9de','rajesh@demo.customer','Rajesh Kumar','customer'),
  ('b93e9313-a589-4c7e-b671-de6c91100d5f','sunita@demo.customer','Sunita Patel','customer'),
  ('d6fe1f4a-857b-470c-ab1a-2dc9c14dd151','mohan@demo.customer','Mohan Verma','customer'),
  ('7e9bccda-d5d4-4bf5-86d0-72f40f787148','kavita@demo.customer','Kavita Singh','customer'),
  ('2bb864ef-42b1-4a6d-82fd-5ec0c13f6ffa','deepak@demo.customer','Deepak Joshi','customer'),
  ('acf3e135-9004-475b-96c9-87bdbd0ae19a','suresh@demo.customer','Suresh Mehta','customer')
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- Step 2: Update app_metadata roles
UPDATE auth.users SET raw_app_meta_data =
  jsonb_set(COALESCE(raw_app_meta_data,'{}'), '{role}', '"employee"')
WHERE email IN ('priya@nexusca.employee','arjun@nexusca.employee');

UPDATE auth.users SET raw_app_meta_data =
  jsonb_set(COALESCE(raw_app_meta_data,'{}'), '{role}', '"customer"')
WHERE email IN ('rajesh@demo.customer','sunita@demo.customer',
  'mohan@demo.customer','kavita@demo.customer',
  'deepak@demo.customer','suresh@demo.customer');
