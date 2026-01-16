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
      ai_providers: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          endpoint_url: string | null
          extra_config: Json | null
          id: string
          is_default: boolean
          is_enabled: boolean
          max_tokens: number | null
          model_id: string | null
          name: string
          provider_type: string
          system_prompt: string | null
          temperature: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          endpoint_url?: string | null
          extra_config?: Json | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number | null
          model_id?: string | null
          name: string
          provider_type: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          endpoint_url?: string | null
          extra_config?: Json | null
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          max_tokens?: number | null
          model_id?: string | null
          name?: string
          provider_type?: string
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
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
          security_domain_id: string | null
          updated_at: string | null
          user_id: string | null
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
          security_domain_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          security_domain_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      assessment_meta: {
        Row: {
          created_at: string | null
          enabled_frameworks: string[] | null
          id: string
          name: string | null
          security_domain_id: string | null
          selected_frameworks: string[] | null
          updated_at: string | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          enabled_frameworks?: string[] | null
          id?: string
          name?: string | null
          security_domain_id?: string | null
          selected_frameworks?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          enabled_frameworks?: string[] | null
          id?: string
          name?: string | null
          security_domain_id?: string | null
          selected_frameworks?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: []
      }
      change_logs: {
        Row: {
          action: string
          browser_name: string | null
          changes: Json | null
          created_at: string | null
          device_type: string | null
          entity_id: string
          entity_type: string
          geo_city: string | null
          geo_country: string | null
          id: number
          ip_address: unknown
          os_name: string | null
          request_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          browser_name?: string | null
          changes?: Json | null
          created_at?: string | null
          device_type?: string | null
          entity_id: string
          entity_type: string
          geo_city?: string | null
          geo_country?: string | null
          id?: number
          ip_address?: unknown
          os_name?: string | null
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          browser_name?: string | null
          changes?: Json | null
          created_at?: string | null
          device_type?: string | null
          entity_id?: string
          entity_type?: string
          geo_city?: string | null
          geo_country?: string | null
          id?: number
          ip_address?: unknown
          os_name?: string | null
          request_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chart_annotations: {
        Row: {
          annotation_date: string
          annotation_type: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          security_domain_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          annotation_date: string
          annotation_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          security_domain_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          annotation_date?: string
          annotation_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          security_domain_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
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
          security_domain_id: string | null
          short_name: string
          target_audience: string[] | null
          updated_at: string | null
          user_id: string | null
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
          security_domain_id?: string | null
          short_name: string
          target_audience?: string[] | null
          updated_at?: string | null
          user_id?: string | null
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
          security_domain_id?: string | null
          short_name?: string
          target_audience?: string[] | null
          updated_at?: string | null
          user_id?: string | null
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
          security_domain_id: string | null
          subcat_id: string | null
          updated_at: string | null
          user_id: string | null
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
          security_domain_id?: string | null
          subcat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          security_domain_id?: string | null
          subcat_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          security_domain_id: string | null
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
          security_domain_id?: string | null
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
          security_domain_id?: string | null
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
          security_domain_id: string | null
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
          security_domain_id?: string | null
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
          security_domain_id?: string | null
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
          user_id: string | null
        }
        Insert: {
          disabled_at?: string | null
          framework_id: string
          user_id?: string | null
        }
        Update: {
          disabled_at?: string | null
          framework_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      disabled_questions: {
        Row: {
          disabled_at: string | null
          question_id: string
          user_id: string | null
        }
        Insert: {
          disabled_at?: string | null
          question_id: string
          user_id?: string | null
        }
        Update: {
          disabled_at?: string | null
          question_id?: string
          user_id?: string | null
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
          security_domain_id: string | null
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
          security_domain_id?: string | null
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
          security_domain_id?: string | null
          strategic_question?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maturity_snapshots: {
        Row: {
          answered_questions: number
          created_at: string
          critical_gaps: number
          domain_metrics: Json
          evidence_readiness: number
          framework_category_metrics: Json
          framework_metrics: Json
          id: string
          maturity_level: number
          overall_coverage: number
          overall_score: number
          security_domain_id: string | null
          snapshot_date: string
          snapshot_type: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          answered_questions: number
          created_at?: string
          critical_gaps: number
          domain_metrics?: Json
          evidence_readiness: number
          framework_category_metrics?: Json
          framework_metrics?: Json
          id?: string
          maturity_level: number
          overall_coverage: number
          overall_score: number
          security_domain_id?: string | null
          snapshot_date?: string
          snapshot_type?: string
          total_questions: number
          user_id?: string | null
        }
        Update: {
          answered_questions?: number
          created_at?: string
          critical_gaps?: number
          domain_metrics?: Json
          evidence_readiness?: number
          framework_category_metrics?: Json
          framework_metrics?: Json
          id?: string
          maturity_level?: number
          overall_coverage?: number
          overall_score?: number
          security_domain_id?: string | null
          snapshot_date?: string
          snapshot_type?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          language: string | null
          notify_assessment_updates: boolean | null
          notify_new_features: boolean | null
          notify_security_alerts: boolean | null
          notify_weekly_digest: boolean | null
          organization: string | null
          role: string | null
          stt_api_key_encrypted: string | null
          stt_endpoint_url: string | null
          stt_model: string | null
          stt_provider: string | null
          updated_at: string
          user_id: string
          voice_auto_speak: boolean | null
          voice_language: string | null
          voice_name: string | null
          voice_pitch: number | null
          voice_rate: number | null
          voice_volume: number | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string | null
          notify_assessment_updates?: boolean | null
          notify_new_features?: boolean | null
          notify_security_alerts?: boolean | null
          notify_weekly_digest?: boolean | null
          organization?: string | null
          role?: string | null
          stt_api_key_encrypted?: string | null
          stt_endpoint_url?: string | null
          stt_model?: string | null
          stt_provider?: string | null
          updated_at?: string
          user_id: string
          voice_auto_speak?: boolean | null
          voice_language?: string | null
          voice_name?: string | null
          voice_pitch?: number | null
          voice_rate?: number | null
          voice_volume?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string | null
          notify_assessment_updates?: boolean | null
          notify_new_features?: boolean | null
          notify_security_alerts?: boolean | null
          notify_weekly_digest?: boolean | null
          organization?: string | null
          role?: string | null
          stt_api_key_encrypted?: string | null
          stt_endpoint_url?: string | null
          stt_model?: string | null
          stt_provider?: string | null
          updated_at?: string
          user_id?: string
          voice_auto_speak?: boolean | null
          voice_language?: string | null
          voice_name?: string | null
          voice_pitch?: number | null
          voice_rate?: number | null
          voice_volume?: number | null
        }
        Relationships: []
      }
      question_versions: {
        Row: {
          annotations: Json | null
          change_summary: string | null
          change_type: string
          changed_by: string | null
          created_at: string
          criticality: string | null
          domain_id: string
          expected_evidence: string | null
          frameworks: string[] | null
          id: string
          imperative_checks: string | null
          ownership_type: string | null
          question_id: string
          question_text: string
          risk_summary: string | null
          security_domain_id: string | null
          subcat_id: string | null
          tags: string[] | null
          version_number: number
        }
        Insert: {
          annotations?: Json | null
          change_summary?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string
          criticality?: string | null
          domain_id: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          id?: string
          imperative_checks?: string | null
          ownership_type?: string | null
          question_id: string
          question_text: string
          risk_summary?: string | null
          security_domain_id?: string | null
          subcat_id?: string | null
          tags?: string[] | null
          version_number?: number
        }
        Update: {
          annotations?: Json | null
          change_summary?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string
          criticality?: string | null
          domain_id?: string
          expected_evidence?: string | null
          frameworks?: string[] | null
          id?: string
          imperative_checks?: string | null
          ownership_type?: string | null
          question_id?: string
          question_text?: string
          risk_summary?: string | null
          security_domain_id?: string | null
          subcat_id?: string | null
          tags?: string[] | null
          version_number?: number
        }
        Relationships: []
      }
      security_domains: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          domain_id: string
          domain_name: string
          icon: string | null
          is_enabled: boolean | null
          short_name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          domain_id: string
          domain_name: string
          icon?: string | null
          is_enabled?: boolean | null
          short_name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          domain_id?: string
          domain_name?: string
          icon?: string | null
          is_enabled?: boolean | null
          short_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      siem_event_queue: {
        Row: {
          created_at: string
          error_message: string | null
          event_data: Json
          id: string
          integration_id: string | null
          processed_at: string | null
          retry_count: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_data: Json
          id?: string
          integration_id?: string | null
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_data?: Json
          id?: string
          integration_id?: string | null
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "siem_event_queue_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "siem_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      siem_integrations: {
        Row: {
          action_filter: string[] | null
          auth_header: string | null
          auth_type: string
          auth_value_encrypted: string | null
          avg_latency_ms: number | null
          consecutive_failures: number | null
          created_at: string
          endpoint_url: string
          entity_filter: string[] | null
          events_sent: number
          format: string
          health_status: string | null
          id: string
          include_device: boolean
          include_geo: boolean
          include_ip: boolean
          is_enabled: boolean
          last_error_at: string | null
          last_error_message: string | null
          last_success_at: string | null
          name: string
          severity_filter: string[] | null
          success_rate: number | null
          total_failures: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_filter?: string[] | null
          auth_header?: string | null
          auth_type?: string
          auth_value_encrypted?: string | null
          avg_latency_ms?: number | null
          consecutive_failures?: number | null
          created_at?: string
          endpoint_url: string
          entity_filter?: string[] | null
          events_sent?: number
          format?: string
          health_status?: string | null
          id?: string
          include_device?: boolean
          include_geo?: boolean
          include_ip?: boolean
          is_enabled?: boolean
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          name: string
          severity_filter?: string[] | null
          success_rate?: number | null
          total_failures?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_filter?: string[] | null
          auth_header?: string | null
          auth_type?: string
          auth_value_encrypted?: string | null
          avg_latency_ms?: number | null
          consecutive_failures?: number | null
          created_at?: string
          endpoint_url?: string
          entity_filter?: string[] | null
          events_sent?: number
          format?: string
          health_status?: string | null
          id?: string
          include_device?: boolean
          include_geo?: boolean
          include_ip?: boolean
          is_enabled?: boolean
          last_error_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          name?: string
          severity_filter?: string[] | null
          success_rate?: number | null
          total_failures?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      siem_metrics: {
        Row: {
          error_code: string | null
          error_message: string | null
          events_batch_size: number
          id: string
          integration_id: string
          latency_ms: number
          response_status: number | null
          success: boolean
          timestamp: string
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          events_batch_size?: number
          id?: string
          integration_id: string
          latency_ms: number
          response_status?: number | null
          success: boolean
          timestamp?: string
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          events_batch_size?: number
          id?: string
          integration_id?: string
          latency_ms?: number
          response_status?: number | null
          success?: boolean
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "siem_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "siem_integrations"
            referencedColumns: ["id"]
          },
        ]
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
          security_domain_id: string | null
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
          security_domain_id?: string | null
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
          security_domain_id?: string | null
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
      voice_enrollment_samples: {
        Row: {
          audio_features: Json
          duration_ms: number
          id: string
          phrase_index: number
          phrase_text: string
          quality_score: number | null
          recorded_at: string
          sample_rate: number
          voice_profile_id: string
        }
        Insert: {
          audio_features: Json
          duration_ms: number
          id?: string
          phrase_index: number
          phrase_text: string
          quality_score?: number | null
          recorded_at?: string
          sample_rate?: number
          voice_profile_id: string
        }
        Update: {
          audio_features?: Json
          duration_ms?: number
          id?: string
          phrase_index?: number
          phrase_text?: string
          quality_score?: number | null
          recorded_at?: string
          sample_rate?: number
          voice_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_enrollment_samples_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          created_at: string
          enrolled_at: string | null
          enrollment_level: string
          enrollment_phrases_count: number
          id: string
          is_enabled: boolean
          noise_threshold: number | null
          profile_name: string
          updated_at: string
          user_id: string
          voice_features: Json | null
        }
        Insert: {
          created_at?: string
          enrolled_at?: string | null
          enrollment_level?: string
          enrollment_phrases_count?: number
          id?: string
          is_enabled?: boolean
          noise_threshold?: number | null
          profile_name?: string
          updated_at?: string
          user_id: string
          voice_features?: Json | null
        }
        Update: {
          created_at?: string
          enrolled_at?: string | null
          enrollment_level?: string
          enrollment_phrases_count?: number
          id?: string
          is_enabled?: boolean
          noise_threshold?: number | null
          profile_name?: string
          updated_at?: string
          user_id?: string
          voice_features?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_siem_integration_health: {
        Args: { p_integration_id: string }
        Returns: undefined
      }
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
