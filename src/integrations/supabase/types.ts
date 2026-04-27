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
      collection_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          receivable_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          receivable_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_notes_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          singleton: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          singleton?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          singleton?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          extra: number
          id: string
          insurance: number
          kind: Database["public"]["Enums"]["document_type"]
          name: string
          notes: string
          service_value: number
          template_key: Database["public"]["Enums"]["contract_template"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          extra?: number
          id?: string
          insurance?: number
          kind: Database["public"]["Enums"]["document_type"]
          name: string
          notes?: string
          service_value?: number
          template_key?: Database["public"]["Enums"]["contract_template"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          extra?: number
          id?: string
          insurance?: number
          kind?: Database["public"]["Enums"]["document_type"]
          name?: string
          notes?: string
          service_value?: number
          template_key?: Database["public"]["Enums"]["contract_template"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          accepted_at: string | null
          accepted_contract_id: string | null
          accepted_ip: string | null
          accepted_receivable_id: string | null
          accepted_transport_id: string | null
          body: Json
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          pdf_url: string | null
          public_token: string
          template: Database["public"]["Enums"]["contract_template"] | null
          title: string
          total_amount: number | null
          transport_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_contract_id?: string | null
          accepted_ip?: string | null
          accepted_receivable_id?: string | null
          accepted_transport_id?: string | null
          body?: Json
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          id?: string
          pdf_url?: string | null
          public_token?: string
          template?: Database["public"]["Enums"]["contract_template"] | null
          title: string
          total_amount?: number | null
          transport_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_contract_id?: string | null
          accepted_ip?: string | null
          accepted_receivable_id?: string | null
          accepted_transport_id?: string | null
          body?: Json
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          pdf_url?: string | null
          public_token?: string
          template?: Database["public"]["Enums"]["contract_template"] | null
          title?: string
          total_amount?: number | null
          transport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_accepted_contract_id_fkey"
            columns: ["accepted_contract_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_accepted_receivable_id_fkey"
            columns: ["accepted_receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_accepted_transport_id_fkey"
            columns: ["accepted_transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          id: string
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      payables: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          transport_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          transport_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          transport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          amount: number
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transport_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transport_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          transport_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          transport_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          transport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_photos_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      transports: {
        Row: {
          client_document: string | null
          client_name: string
          client_phone: string | null
          code: string
          created_at: string
          created_by: string | null
          destination_city: string
          destination_state: string
          driver_name: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          origin_city: string
          origin_state: string
          photo_url: string | null
          status: Database["public"]["Enums"]["transport_status"]
          updated_at: string
          vehicle_brand: string | null
          vehicle_chassis: string | null
          vehicle_color: string | null
          vehicle_model: string | null
          vehicle_plate: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year: number | null
        }
        Insert: {
          client_document?: string | null
          client_name: string
          client_phone?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          destination_city: string
          destination_state: string
          driver_name?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          origin_city: string
          origin_state: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["transport_status"]
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year?: number | null
        }
        Update: {
          client_document?: string | null
          client_name?: string
          client_phone?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          destination_city?: string
          destination_state?: string
          driver_name?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          origin_city?: string
          origin_state?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["transport_status"]
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_chassis?: string | null
          vehicle_color?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vehicle_year?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      is_authenticated: { Args: never; Returns: boolean }
      mark_overdue_receivables: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "administrator" | "collaborator"
      contract_template: "standard" | "fragile" | "express"
      document_type: "budget" | "contract"
      payment_status: "paid" | "pending" | "overdue" | "negotiated" | "partial"
      transport_status: "pending" | "in_transit" | "delivered" | "cancelled"
      vehicle_type: "car" | "motorcycle" | "truck" | "machinery"
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
      app_role: ["administrator", "collaborator"],
      contract_template: ["standard", "fragile", "express"],
      document_type: ["budget", "contract"],
      payment_status: ["paid", "pending", "overdue", "negotiated", "partial"],
      transport_status: ["pending", "in_transit", "delivered", "cancelled"],
      vehicle_type: ["car", "motorcycle", "truck", "machinery"],
    },
  },
} as const
