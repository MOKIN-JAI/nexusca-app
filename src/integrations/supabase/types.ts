export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_number: string
          account_type: string
          balance: number
          bank_id: string
          branch: string | null
          customer_id: string
          id: string
          ifsc: string | null
          opened_on: string | null
        }
        Insert: {
          account_number: string
          account_type?: string
          balance?: number
          bank_id: string
          branch?: string | null
          customer_id: string
          id?: string
          ifsc?: string | null
          opened_on?: string | null
        }
        Update: {
          account_number?: string
          account_type?: string
          balance?: number
          bank_id?: string
          branch?: string | null
          customer_id?: string
          id?: string
          ifsc?: string | null
          opened_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_products: {
        Row: {
          account_id: string
          amount: number
          doc_url: string | null
          emi: number | null
          id: string
          interest_rate: number | null
          maturity_date: string | null
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          start_date: string | null
        }
        Insert: {
          account_id: string
          amount?: number
          doc_url?: string | null
          emi?: number | null
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          start_date?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          doc_url?: string | null
          emi?: number | null
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_products_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          id: string
          ifsc_prefix: string | null
          logo_url: string | null
          name: string
        }
        Insert: {
          id?: string
          ifsc_prefix?: string | null
          logo_url?: string | null
          name: string
        }
        Update: {
          id?: string
          ifsc_prefix?: string | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          aadhaar: string | null
          address: string | null
          annual_expenses: number
          annual_revenue: number
          assigned_to: string | null
          avatar_url: string | null
          created_at: string
          dob: string | null
          email: string | null
          full_name: string
          id: string
          itr_status: Database["public"]["Enums"]["itr_status"]
          pan: string
          phone: string | null
          total_assets: number
          total_liabilities: number
          user_id: string | null
        }
        Insert: {
          aadhaar?: string | null
          address?: string | null
          annual_expenses?: number
          annual_revenue?: number
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name: string
          id?: string
          itr_status?: Database["public"]["Enums"]["itr_status"]
          pan: string
          phone?: string | null
          total_assets?: number
          total_liabilities?: number
          user_id?: string | null
        }
        Update: {
          aadhaar?: string | null
          address?: string | null
          annual_expenses?: number
          annual_revenue?: number
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          full_name?: string
          id?: string
          itr_status?: Database["public"]["Enums"]["itr_status"]
          pan?: string
          phone?: string | null
          total_assets?: number
          total_liabilities?: number
          user_id?: string | null
        }
        Relationships: []
      }
      itr_records: {
        Row: {
          acknowledgment_no: string | null
          assessment_year: string
          customer_id: string
          doc_url: string | null
          filed_on: string | null
          id: string
          refund: number
          status: Database["public"]["Enums"]["itr_status"]
          tax_paid: number
          total_income: number
        }
        Insert: {
          acknowledgment_no?: string | null
          assessment_year: string
          customer_id: string
          doc_url?: string | null
          filed_on?: string | null
          id?: string
          refund?: number
          status?: Database["public"]["Enums"]["itr_status"]
          tax_paid?: number
          total_income?: number
        }
        Update: {
          acknowledgment_no?: string | null
          assessment_year?: string
          customer_id?: string
          doc_url?: string | null
          filed_on?: string | null
          id?: string
          refund?: number
          status?: Database["public"]["Enums"]["itr_status"]
          tax_paid?: number
          total_income?: number
        }
        Relationships: [
          {
            foreignKeyName: "itr_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          customer_id: string
          doc_type: string
          file_url: string | null
          id: string
          status: Database["public"]["Enums"]["kyc_status"]
          uploaded_at: string | null
          verified_at: string | null
        }
        Insert: {
          customer_id: string
          doc_type: string
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Update: {
          customer_id?: string
          doc_type?: string
          file_url?: string | null
          id?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          pan: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          aadhaar?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          pan?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          aadhaar?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          pan?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          area_sqft: number | null
          city: string | null
          customer_id: string
          id: string
          latitude: number
          longitude: number
          market_value: number
          property_type: string
          purchase_value: number | null
          purchased_on: string | null
          state: string | null
          title: string
        }
        Insert: {
          address: string
          area_sqft?: number | null
          city?: string | null
          customer_id: string
          id?: string
          latitude: number
          longitude: number
          market_value?: number
          property_type?: string
          purchase_value?: number | null
          purchased_on?: string | null
          state?: string | null
          title: string
        }
        Update: {
          address?: string
          area_sqft?: number | null
          city?: string | null
          customer_id?: string
          id?: string
          latitude?: number
          longitude?: number
          market_value?: number
          property_type?: string
          purchase_value?: number | null
          purchased_on?: string | null
          state?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_docs: {
        Row: {
          doc_type: string
          file_url: string | null
          id: string
          property_id: string
          status: Database["public"]["Enums"]["kyc_status"]
          uploaded_at: string | null
        }
        Insert: {
          doc_type: string
          file_url?: string | null
          id?: string
          property_id: string
          status?: Database["public"]["Enums"]["kyc_status"]
          uploaded_at?: string | null
        }
        Update: {
          doc_type?: string
          file_url?: string | null
          id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["kyc_status"]
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_docs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sundry_debtors: {
        Row: {
          amount_outstanding: number
          customer_id: string
          debtor_customer_id: string | null
          debtor_name: string
          debtor_pan: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          notes: string | null
        }
        Insert: {
          amount_outstanding?: number
          customer_id: string
          debtor_customer_id?: string | null
          debtor_name: string
          debtor_pan?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
        }
        Update: {
          amount_outstanding?: number
          customer_id?: string
          debtor_customer_id?: string | null
          debtor_name?: string
          debtor_pan?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sundry_debtors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sundry_debtors_debtor_customer_id_fkey"
            columns: ["debtor_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_demo_for_customer: {
        Args: { _customer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "customer"
      itr_status: "filed" | "pending" | "overdue"
      kyc_status: "missing" | "uploaded" | "verified"
      product_type: "loan" | "fd" | "card"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "employee", "customer"],
      itr_status: ["filed", "pending", "overdue"],
      kyc_status: ["missing", "uploaded", "verified"],
      product_type: ["loan", "fd", "card"],
    },
  },
} as const
