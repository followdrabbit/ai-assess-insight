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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string | null
          evidence_links: string[] | null
          evidence_ok: string | null
          framework_id: string | null
          id: string
          notes: string | null
          question_id: string
          response: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_links?: string[] | null
          evidence_ok?: string | null
          framework_id?: string | null
          id?: string
          notes?: string | null
          question_id: string
          response?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_links?: string[] | null
          evidence_ok?: string | null
          framework_id?: string | null
          id?: string
          notes?: string | null
          question_id?: string
          response?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_meta: {
        Row: {
          created_at: string | null
          enabled_frameworks: string[] | null
          id: string
          name: string | null
          selected_frameworks: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_frameworks?: string[] | null
          id?: string
          name?: string | null
          selected_frameworks?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_frameworks?: string[] | null
          id?: string
          name?: string | null
          selected_frameworks?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      change_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: number
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: number
        }
        Relationships: []
      }
      custom_frameworks: {
        Row: {
          assessment_scope: string | null
          category: string | null
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          framework_id: string
          framework_name: string
          reference_links: string[] | null
          short_name: string
          target_audience: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          assessment_scope?: string | null
          category?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          framework_id: string
          framework_name: string
          reference_links?: string[] | null
          short_name: string
          target_audience?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          assessment_scope?: string | null
          category?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          framework_id?: string
          framework_name?: string
          reference_links?: string[] | null
          short_name?: string
          target_audience?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      custom_questions: {
        Row: {
          created_at: string | null
          criticality: string | null
          domain_id: string
          expected_evidence: string | null
          frameworks: string[] | null
          imperative_checks: string | null
          is_disabled: boolean | null
          ownership_type: string | null
          question_id: string
          question_text: string
          risk_summary: string | null
          subcat_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criticality?: string | null
          domain_id: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          imperative_checks?: string | null
          is_disabled?: boolean | null
          ownership_type?: string | null
          question_id: string
          question_text: string
          risk_summary?: string | null
          subcat_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criticality?: string | null
          domain_id?: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          imperative_checks?: string | null
          is_disabled?: boolean | null
          ownership_type?: string | null
          question_id?: string
          question_text?: string
          risk_summary?: string | null
          subcat_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      default_frameworks: {
        Row: {
          assessment_scope: string | null
          category: string | null
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          framework_id: string
          framework_name: string
          reference_links: string[] | null
          short_name: string
          target_audience: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          assessment_scope?: string | null
          category?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          framework_id: string
          framework_name: string
          reference_links?: string[] | null
          short_name: string
          target_audience?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          assessment_scope?: string | null
          category?: string | null
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          framework_id?: string
          framework_name?: string
          reference_links?: string[] | null
          short_name?: string
          target_audience?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      default_questions: {
        Row: {
          created_at: string | null
          domain_id: string
          expected_evidence: string | null
          frameworks: string[] | null
          imperative_checks: string | null
          ownership_type: string | null
          question_id: string
          question_text: string
          risk_summary: string | null
          subcat_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain_id: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          imperative_checks?: string | null
          ownership_type?: string | null
          question_id: string
          question_text: string
          risk_summary?: string | null
          subcat_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain_id?: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          imperative_checks?: string | null
          ownership_type?: string | null
          question_id?: string
          question_text?: string
          risk_summary?: string | null
          subcat_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "default_questions_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["domain_id"]
          },
          {
            foreignKeyName: "default_questions_subcat_id_fkey"
            columns: ["subcat_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["subcat_id"]
          },
        ]
      }
      disabled_frameworks: {
        Row: {
          disabled_at: string | null
          framework_id: string
        }
        Insert: {
          disabled_at?: string | null
          framework_id: string
        }
        Update: {
          disabled_at?: string | null
          framework_id?: string
        }
        Relationships: []
      }
      disabled_questions: {
        Row: {
          disabled_at: string | null
          question_id: string
        }
        Insert: {
          disabled_at?: string | null
          question_id: string
        }
        Update: {
          disabled_at?: string | null
          question_id?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          banking_relevance: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          domain_id: string
          domain_name: string
          nist_ai_rmf_function: string | null
          strategic_question: string | null
          updated_at: string | null
        }
        Insert: {
          banking_relevance?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          domain_id: string
          domain_name: string
          nist_ai_rmf_function?: string | null
          strategic_question?: string | null
          updated_at?: string | null
        }
        Update: {
          banking_relevance?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          domain_id?: string
          domain_name?: string
          nist_ai_rmf_function?: string | null
          strategic_question?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          created_at: string | null
          criticality: string | null
          definition: string | null
          domain_id: string
          framework_refs: string[] | null
          objective: string | null
          ownership_type: string | null
          risk_summary: string | null
          security_outcome: string | null
          subcat_id: string
          subcat_name: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          criticality?: string | null
          definition?: string | null
          domain_id: string
          framework_refs?: string[] | null
          objective?: string | null
          ownership_type?: string | null
          risk_summary?: string | null
          security_outcome?: string | null
          subcat_id: string
          subcat_name: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          criticality?: string | null
          definition?: string | null
          domain_id?: string
          framework_refs?: string[] | null
          objective?: string | null
          ownership_type?: string | null
          risk_summary?: string | null
          security_outcome?: string | null
          subcat_id?: string
          subcat_name?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["domain_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
