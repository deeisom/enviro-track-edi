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
      _import_contacts_staging: {
        Row: {
          company: string
          email: string
          email2: string
          id: number
          mobile: string
          name: string
          phone: string
        }
        Insert: {
          company: string
          email?: string
          email2?: string
          id?: number
          mobile?: string
          name: string
          phone?: string
        }
        Update: {
          company?: string
          email?: string
          email2?: string
          id?: number
          mobile?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          id: string
          invoice_id: string | null
          invoice_number: string | null
          is_invoice_event: boolean
          new_status: string
          note: string
          previous_status: string | null
          project_id: string
          project_number: string
          timestamp: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          is_invoice_event?: boolean
          new_status: string
          note?: string
          previous_status?: string | null
          project_id: string
          project_number: string
          timestamp?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          is_invoice_event?: boolean
          new_status?: string
          note?: string
          previous_status?: string | null
          project_id?: string
          project_number?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string
          company_name: string
          created_at: string
          fax: string
          id: string
          industry_type: string
          notes: string
          phone: string
          updated_at: string
          website: string
        }
        Insert: {
          address?: string
          company_name: string
          created_at?: string
          fax?: string
          id?: string
          industry_type?: string
          notes?: string
          phone?: string
          updated_at?: string
          website?: string
        }
        Update: {
          address?: string
          company_name?: string
          created_at?: string
          fax?: string
          id?: string
          industry_type?: string
          notes?: string
          phone?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string
          id: string
          mobile_phone: string
          name: string
          phone: string
          secondary_email: string
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string
          id?: string
          mobile_phone?: string
          name: string
          phone?: string
          secondary_email?: string
          title?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          mobile_phone?: string
          name?: string
          phone?: string
          secondary_email?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counter: {
        Row: {
          counter: number
          type: string
        }
        Insert: {
          counter?: number
          type: string
        }
        Update: {
          counter?: number
          type?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          bill_to: Json
          client_id: string | null
          created_at: string
          date: string
          due_date: string
          id: string
          invoice_number: string
          line_items: Json
          parent_invoice_id: string | null
          po_number: string
          project_id: string | null
          project_summary: string
          status: string
          terms: string
          total: number
          type: string
          updated_at: string
        }
        Insert: {
          bill_to?: Json
          client_id?: string | null
          created_at?: string
          date?: string
          due_date?: string
          id?: string
          invoice_number: string
          line_items?: Json
          parent_invoice_id?: string | null
          po_number?: string
          project_id?: string | null
          project_summary?: string
          status?: string
          terms?: string
          total?: number
          type?: string
          updated_at?: string
        }
        Update: {
          bill_to?: Json
          client_id?: string | null
          created_at?: string
          date?: string
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json
          parent_invoice_id?: string | null
          po_number?: string
          project_id?: string | null
          project_summary?: string
          status?: string
          terms?: string
          total?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parent_invoice_id_fkey"
            columns: ["parent_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_counter: {
        Row: {
          counter: number
          year: number
        }
        Insert: {
          counter?: number
          year: number
        }
        Update: {
          counter?: number
          year?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          assigned_to: string[]
          client_id: string | null
          contact_id: string | null
          created_at: string
          description: string
          id: string
          location: string
          name: string
          notes: string
          parent_project_id: string | null
          project_number: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[]
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string
          name: string
          notes?: string
          parent_project_id?: string | null
          project_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[]
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string
          id?: string
          location?: string
          name?: string
          notes?: string
          parent_project_id?: string | null
          project_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_clauses: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_default: boolean
          service_types: string[]
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          service_types?: string[]
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          service_types?: string[]
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_counter: {
        Row: {
          counter: number
          id: number
        }
        Insert: {
          counter?: number
          id?: number
        }
        Update: {
          counter?: number
          id?: number
        }
        Relationships: []
      }
      proposals: {
        Row: {
          acceptance: Json
          background: Json
          building_area: string
          client_id: string | null
          client_signer_name: string
          client_signer_title: string
          company_rep_name: string
          company_rep_title: string
          cover_page: Json
          created_at: string
          estimate_id: string | null
          expiration_date: string
          fee_items: Json
          id: string
          project_id: string | null
          proposal_date: string
          proposal_details: Json
          proposal_number: string
          scope: Json
          service_type: string
          site_address: string
          site_name: string
          status: string
          terms_selections: Json
          updated_at: string
          version: number
        }
        Insert: {
          acceptance?: Json
          background?: Json
          building_area?: string
          client_id?: string | null
          client_signer_name?: string
          client_signer_title?: string
          company_rep_name?: string
          company_rep_title?: string
          cover_page?: Json
          created_at?: string
          estimate_id?: string | null
          expiration_date?: string
          fee_items?: Json
          id?: string
          project_id?: string | null
          proposal_date?: string
          proposal_details?: Json
          proposal_number: string
          scope?: Json
          service_type?: string
          site_address?: string
          site_name?: string
          status?: string
          terms_selections?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          acceptance?: Json
          background?: Json
          building_area?: string
          client_id?: string | null
          client_signer_name?: string
          client_signer_title?: string
          company_rep_name?: string
          company_rep_title?: string
          cover_page?: Json
          created_at?: string
          estimate_id?: string | null
          expiration_date?: string
          fee_items?: Json
          id?: string
          project_id?: string | null
          proposal_date?: string
          proposal_details?: Json
          proposal_number?: string
          scope?: Json
          service_type?: string
          site_address?: string
          site_name?: string
          status?: string
          terms_selections?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rates: {
        Row: {
          category: string
          default_rate: number
          description: string
          id: string
          item: string
          item_description: string
          name: string
          unit: string
        }
        Insert: {
          category?: string
          default_rate?: number
          description?: string
          id?: string
          item?: string
          item_description?: string
          name: string
          unit?: string
        }
        Update: {
          category?: string
          default_rate?: number
          description?: string
          id?: string
          item?: string
          item_description?: string
          name?: string
          unit?: string
        }
        Relationships: []
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
      get_next_invoice_number: { Args: { _type: string }; Returns: string }
      get_next_project_number: { Args: never; Returns: string }
      get_next_proposal_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "view_only"
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
      app_role: ["admin", "user", "view_only"],
    },
  },
} as const
