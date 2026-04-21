/* Auto-style typed schema mirroring supabase/schema.sql.
 * Kept hand-written (not generated) so the project compiles before the user
 * connects their Supabase project. */

export type AppRole = "admin" | "employee" | "customer";
export type ItrStatus = "filed" | "pending" | "overdue";
export type KycStatus = "missing" | "uploaded" | "verified";
export type ProductType = "loan" | "fd" | "card";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  pan: string | null;
  aadhaar: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string | null;
  assigned_to: string | null;
  full_name: string;
  pan: string;
  aadhaar: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  address: string | null;
  avatar_url: string | null;
  total_assets: number;
  total_liabilities: number;
  annual_revenue: number;
  annual_expenses: number;
  itr_status: ItrStatus;
  created_at: string;
}

export interface Bank {
  id: string;
  name: string;
  ifsc_prefix: string | null;
  logo_url: string | null;
}

export interface BankAccount {
  id: string;
  customer_id: string;
  bank_id: string;
  account_number: string;
  account_type: string;
  branch: string | null;
  ifsc: string | null;
  balance: number;
  opened_on: string | null;
}

export interface BankProduct {
  id: string;
  account_id: string;
  product_type: ProductType;
  name: string;
  amount: number;
  interest_rate: number | null;
  start_date: string | null;
  maturity_date: string | null;
  emi: number | null;
  doc_url: string | null;
}

export interface Property {
  id: string;
  customer_id: string;
  title: string;
  address: string;
  city: string | null;
  state: string | null;
  property_type: string;
  area_sqft: number | null;
  market_value: number;
  purchase_value: number | null;
  purchased_on: string | null;
  latitude: number;
  longitude: number;
}

export interface PropertyDoc {
  id: string;
  property_id: string;
  doc_type: string;
  file_url: string | null;
  uploaded_at: string | null;
  status: KycStatus;
}

export interface SundryDebtor {
  id: string;
  customer_id: string;
  debtor_name: string;
  debtor_pan: string | null;
  amount_outstanding: number;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  /** Cross-firm link — when set, this debtor IS another client of the firm. */
  debtor_customer_id: string | null;
}

export interface ItrRecord {
  id: string;
  customer_id: string;
  assessment_year: string;
  filed_on: string | null;
  total_income: number;
  tax_paid: number;
  refund: number;
  status: ItrStatus;
  acknowledgment_no: string | null;
  doc_url: string | null;
}

export interface KycDocument {
  id: string;
  customer_id: string;
  doc_type: string;
  file_url: string | null;
  uploaded_at: string | null;
  verified_at: string | null;
  status: KycStatus;
}

/* Loose Supabase Database type — sufficient for typed `.from()` calls. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer> };
      banks: { Row: Bank; Insert: Partial<Bank>; Update: Partial<Bank> };
      bank_accounts: { Row: BankAccount; Insert: Partial<BankAccount>; Update: Partial<BankAccount> };
      bank_products: { Row: BankProduct; Insert: Partial<BankProduct>; Update: Partial<BankProduct> };
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property> };
      property_docs: { Row: PropertyDoc; Insert: Partial<PropertyDoc>; Update: Partial<PropertyDoc> };
      sundry_debtors: { Row: SundryDebtor; Insert: Partial<SundryDebtor>; Update: Partial<SundryDebtor> };
      itr_records: { Row: ItrRecord; Insert: Partial<ItrRecord>; Update: Partial<ItrRecord> };
      kyc_documents: { Row: KycDocument; Insert: Partial<KycDocument>; Update: Partial<KycDocument> };
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole };
        Insert: { user_id: string; role: AppRole };
        Update: { role?: AppRole };
      };
    };
    Functions: {
      has_role: { Args: { _user_id: string; _role: AppRole }; Returns: boolean };
    };
    Enums: { app_role: AppRole };
  };
}
