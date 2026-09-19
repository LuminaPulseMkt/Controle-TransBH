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
          facebook_url: string | null
          google_business_url: string | null
          google_review_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          phone: string | null
          singleton: boolean
          updated_at: string
          website: string | null
          whatsapp: string | null
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_business_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          singleton?: boolean
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          facebook_url?: string | null
          google_business_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          singleton?: boolean
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_url?: string | null
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
          client_signature_url: string | null
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          generated_at: string | null
          generated_receivable_id: string | null
          generated_transport_ids: string[]
          id: string
          pdf_url: string | null
          public_token: string
          signed_at: string | null
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
          client_signature_url?: string | null
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          generated_at?: string | null
          generated_receivable_id?: string | null
          generated_transport_ids?: string[]
          id?: string
          pdf_url?: string | null
          public_token?: string
          signed_at?: string | null
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
          client_signature_url?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          generated_at?: string | null
          generated_receivable_id?: string | null
          generated_transport_ids?: string[]
          id?: string
          pdf_url?: string | null
          public_token?: string
          signed_at?: string | null
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
      leads: {
        Row: {
          created_at: string | null
          destination: string
          email: string | null
          id: string
          message: string | null
          name: string
          origin: string
          vehicle_quantity: number
          vehicle_type: string
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          destination: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          origin: string
          vehicle_quantity?: number
          vehicle_type: string
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          destination?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          origin?: string
          vehicle_quantity?: number
          vehicle_type?: string
          whatsapp?: string
        }
        Relationships: []
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
      partners: {
        Row: {
          base_city: string | null
          created_at: string
          created_by: string | null
          default_amount: number
          document: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          pricing_notes: string | null
          routes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          base_city?: string | null
          created_at?: string
          created_by?: string | null
          default_amount?: number
          document?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          pricing_notes?: string | null
          routes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          base_city?: string | null
          created_at?: string
          created_by?: string | null
          default_amount?: number
          document?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          pricing_notes?: string | null
          routes?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      receivable_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          paid_at: string
          receivable_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          receivable_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string
          receivable_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivable_payments_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
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
          paid_amount: number | null
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
          paid_amount?: number | null
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
          paid_amount?: number | null
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
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      transport_feedback: {
        Row: {
          client_name: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          transport_code: string | null
        }
        Insert: {
          client_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          transport_code?: string | null
        }
        Update: {
          client_name?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          transport_code?: string | null
        }
        Relationships: []
      }
      transport_location_updates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string
          note: string | null
          transport_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location: string
          note?: string | null
          transport_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string
          note?: string | null
          transport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_location_updates_transport_id_fkey"
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
          created_by: string | null
          id: string
          photo_url: string
          transport_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url: string
          transport_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
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
          current_location: string | null
          destination_city: string
          destination_state: string
          driver_name: string | null
          estimated_delivery: string | null
          id: string
          location_updated_at: string | null
          notes: string | null
          origin_city: string
          origin_state: string
          partner_id: string | null
          partner_notified_at: string | null
          partner_quoted_amount: number | null
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
          current_location?: string | null
          destination_city: string
          destination_state: string
          driver_name?: string | null
          estimated_delivery?: string | null
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          origin_city: string
          origin_state: string
          partner_id?: string | null
          partner_notified_at?: string | null
          partner_quoted_amount?: number | null
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
          current_location?: string | null
          destination_city?: string
          destination_state?: string
          driver_name?: string | null
          estimated_delivery?: string | null
          id?: string
          location_updated_at?: string | null
          notes?: string | null
          origin_city?: string
          origin_state?: string
          partner_id?: string | null
          partner_notified_at?: string | null
          partner_quoted_amount?: number | null
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
        Relationships: [
          {
            foreignKeyName: "transports_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_sheets: {
        Row: {
          created_at: string
          created_by: string
          expenses: Json | null
          id: string
          phone: string | null
          return_date: string | null
          rows: Json
          sheet_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expenses?: Json | null
          id?: string
          phone?: string | null
          return_date?: string | null
          rows?: Json
          sheet_date?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expenses?: Json | null
          id?: string
          phone?: string | null
          return_date?: string | null
          rows?: Json
          sheet_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          permission?: string
          updated_at?: string
          user_id?: string
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
      vehicle_checklists: {
        Row: {
          chassis: string | null
          checklist_date: string | null
          checklist_time: string | null
          client_name: string | null
          color: string | null
          created_at: string
          created_by: string | null
          delivery: Json
          dut: string | null
          fuel_level: string | null
          id: string
          items: Json
          km: string | null
          location: string | null
          model: string | null
          observations: string | null
          pickup: Json
          plate: string | null
          tires: Json
          transport_id: string | null
          updated_at: string
        }
        Insert: {
          chassis?: string | null
          checklist_date?: string | null
          checklist_time?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivery?: Json
          dut?: string | null
          fuel_level?: string | null
          id?: string
          items?: Json
          km?: string | null
          location?: string | null
          model?: string | null
          observations?: string | null
          pickup?: Json
          plate?: string | null
          tires?: Json
          transport_id?: string | null
          updated_at?: string
        }
        Update: {
          chassis?: string | null
          checklist_date?: string | null
          checklist_time?: string | null
          client_name?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivery?: Json
          dut?: string | null
          fuel_level?: string | null
          id?: string
          items?: Json
          km?: string | null
          location?: string | null
          model?: string | null
          observations?: string | null
          pickup?: Json
          plate?: string | null
          tires?: Json
          transport_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checklists_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_budget_by_token: {
        Args: {
          _client_signature_url?: string
          _estimated_delivery?: string
          _token: string
        }
        Returns: Json
      }
      can_manage_settings: { Args: { _uid: string }; Returns: boolean }
      get_contract_token_for_budget: {
        Args: { _budget_token: string }
        Returns: string
      }
      get_document_by_token: {
        Args: { _token: string }
        Returns: {
          accepted_at: string
          accepted_contract_id: string
          body: Json
          client_document: string
          client_email: string
          client_name: string
          client_phone: string
          client_signature_url: string
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          public_token: string
          signed_at: string
          title: string
          total_amount: number
        }[]
      }
      get_public_company_info: {
        Args: never
        Returns: {
          address: string
          cnpj: string
          email: string
          facebook_url: string
          google_business_url: string
          google_review_url: string
          instagram_url: string
          logo_url: string
          name: string
          phone: string
          website: string
          whatsapp: string
          whatsapp_url: string
        }[]
      }
      has_permission: {
        Args: { _perm: string; _uid: string }
        Returns: boolean
      }
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
      vehicle_type: "motorcycle" | "sedan" | "hatch" | "caminhonete" | "suv"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      vehicle_type: ["motorcycle", "sedan", "hatch", "caminhonete", "suv"],
    },
  },
} as const
