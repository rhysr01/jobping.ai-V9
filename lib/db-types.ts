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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      api_key_usage: {
        Row: {
          api_key_id: string
          id: string
          ip_address: string | null
          path: string | null
          used_at: string
        }
        Insert: {
          api_key_id: string
          id?: string
          ip_address?: string | null
          path?: string | null
          used_at?: string
        }
        Update: {
          api_key_id?: string
          id?: string
          ip_address?: string | null
          path?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          description: string | null
          disabled: boolean
          expires_at: string | null
          id: string
          key_hash: string
          tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          disabled?: boolean
          expires_at?: string | null
          id?: string
          key_hash: string
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          disabled?: boolean
          expires_at?: string | null
          id?: string
          key_hash?: string
          tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_api_keys_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppression: {
        Row: {
          created_at: string | null
          event_data: Json | null
          id: number
          reason: string
          user_email: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          id?: number
          reason: string
          user_email: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          id?: number
          reason?: string
          user_email?: string
        }
        Relationships: []
      }
      feedback_analytics: {
        Row: {
          avg_match_quality_score: number | null
          avg_relevance_score: number | null
          created_at: string | null
          id: number
          negative_feedback_count: number | null
          neutral_feedback_count: number | null
          period_end: string
          period_start: string
          positive_feedback_count: number | null
          total_feedback_count: number | null
          updated_at: string | null
        }
        Insert: {
          avg_match_quality_score?: number | null
          avg_relevance_score?: number | null
          created_at?: string | null
          id?: number
          negative_feedback_count?: number | null
          neutral_feedback_count?: number | null
          period_end: string
          period_start: string
          positive_feedback_count?: number | null
          total_feedback_count?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_match_quality_score?: number | null
          avg_relevance_score?: number | null
          created_at?: string | null
          id?: number
          negative_feedback_count?: number | null
          neutral_feedback_count?: number | null
          period_end?: string
          period_start?: string
          positive_feedback_count?: number | null
          total_feedback_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_learning_data: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          feedback_label: string
          id: number
          job_features: Json | null
          learning_weight: number | null
          match_features: Json | null
          training_iteration: number | null
          used_for_training: boolean | null
          user_profile_features: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_label: string
          id?: number
          job_features?: Json | null
          learning_weight?: number | null
          match_features?: Json | null
          training_iteration?: number | null
          used_for_training?: boolean | null
          user_profile_features?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_label?: string
          id?: number
          job_features?: Json | null
          learning_weight?: number | null
          match_features?: Json | null
          training_iteration?: number | null
          used_for_training?: boolean | null
          user_profile_features?: Json | null
        }
        Relationships: []
      }
      job_filter_audit: {
        Row: {
          action: string
          created_at: string | null
          id: number
          job_id: number
          new_city: string | null
          new_is_active: boolean | null
          prev_city: string | null
          prev_is_active: boolean | null
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: never
          job_id: number
          new_city?: string | null
          new_is_active?: boolean | null
          prev_city?: string | null
          prev_is_active?: boolean | null
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: never
          job_id?: number
          new_city?: string | null
          new_is_active?: boolean | null
          prev_city?: string | null
          prev_is_active?: boolean | null
          reason?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          ai_labels: string[]
          board: string | null
          categories: string[] | null
          city: string | null
          company: string
          company_name: string | null
          company_profile_url: string | null
          country: string | null
          created_at: string | null
          dedupe_key: string | null
          description: string | null
          experience_required: string | null
          filtered_reason: string | null
          freshness_tier: string | null
          id: number
          is_active: boolean | null
          is_graduate: boolean | null
          is_internship: boolean | null
          is_sent: boolean | null
          job_hash: string
          job_hash_score: number
          job_url: string | null
          lang: string | null
          lang_conf: number | null
          language_requirements: string[] | null
          last_seen_at: string
          location: string | null
          location_name: string | null
          original_posted_date: string | null
          platform: string | null
          posted_at: string | null
          region: string | null
          scrape_timestamp: string | null
          scraper_run_id: string | null
          source: string
          status: string
          title: string
          updated_at: string | null
          work_environment: string | null
          work_location: string
        }
        Insert: {
          ai_labels?: string[]
          board?: string | null
          categories?: string[] | null
          city?: string | null
          company: string
          company_name?: string | null
          company_profile_url?: string | null
          country?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          description?: string | null
          experience_required?: string | null
          filtered_reason?: string | null
          freshness_tier?: string | null
          id?: number
          is_active?: boolean | null
          is_graduate?: boolean | null
          is_internship?: boolean | null
          is_sent?: boolean | null
          job_hash: string
          job_hash_score?: number
          job_url?: string | null
          lang?: string | null
          lang_conf?: number | null
          language_requirements?: string[] | null
          last_seen_at?: string
          location?: string | null
          location_name?: string | null
          original_posted_date?: string | null
          platform?: string | null
          posted_at?: string | null
          region?: string | null
          scrape_timestamp?: string | null
          scraper_run_id?: string | null
          source: string
          status?: string
          title: string
          updated_at?: string | null
          work_environment?: string | null
          work_location?: string
        }
        Update: {
          ai_labels?: string[]
          board?: string | null
          categories?: string[] | null
          city?: string | null
          company?: string
          company_name?: string | null
          company_profile_url?: string | null
          country?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          description?: string | null
          experience_required?: string | null
          filtered_reason?: string | null
          freshness_tier?: string | null
          id?: number
          is_active?: boolean | null
          is_graduate?: boolean | null
          is_internship?: boolean | null
          is_sent?: boolean | null
          job_hash?: string
          job_hash_score?: number
          job_url?: string | null
          lang?: string | null
          lang_conf?: number | null
          language_requirements?: string[] | null
          last_seen_at?: string
          location?: string | null
          location_name?: string | null
          original_posted_date?: string | null
          platform?: string | null
          posted_at?: string | null
          region?: string | null
          scrape_timestamp?: string | null
          scraper_run_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string | null
          work_environment?: string | null
          work_location?: string
        }
        Relationships: []
      }
      jobs_norm: {
        Row: {
          company: string
          company_domain: string | null
          created_at: string | null
          id: string
          location_id: number | null
          location_name: string | null
          posted_at: string | null
          score: number | null
          seniority: string | null
          source: string | null
          title: string
          track: string | null
          url: string | null
        }
        Insert: {
          company: string
          company_domain?: string | null
          created_at?: string | null
          id: string
          location_id?: number | null
          location_name?: string | null
          posted_at?: string | null
          score?: number | null
          seniority?: string | null
          source?: string | null
          title: string
          track?: string | null
          url?: string | null
        }
        Update: {
          company?: string
          company_domain?: string | null
          created_at?: string | null
          id?: string
          location_id?: number | null
          location_name?: string | null
          posted_at?: string | null
          score?: number | null
          seniority?: string | null
          source?: string | null
          title?: string
          track?: string | null
          url?: string | null
        }
        Relationships: []
      }
      jobs_raw_mantiks: {
        Row: {
          company: string | null
          company_domain: string | null
          description: string | null
          external_id: string | null
          fetched_at: string | null
          id: number
          location_id: number | null
          location_name: string | null
          posted_at: string | null
          seniority: string | null
          source: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          company?: string | null
          company_domain?: string | null
          description?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: number
          location_id?: number | null
          location_name?: string | null
          posted_at?: string | null
          seniority?: string | null
          source?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          company?: string | null
          company_domain?: string | null
          description?: string | null
          external_id?: string | null
          fetched_at?: string | null
          id?: number
          location_id?: number | null
          location_name?: string | null
          posted_at?: string | null
          seniority?: string | null
          source?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      match_logs: {
        Row: {
          created_at: string
          error_message: string | null
          fallback_used: boolean
          id: number
          job_batch_id: string | null
          jobs_processed: number
          match_type: string | null
          matches_generated: number | null
          success: boolean
          timestamp: string | null
          updated_at: string
          user_career_path: string | null
          user_email: string
          user_professional_experience: string | null
          user_work_preference: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          fallback_used: boolean
          id?: number
          job_batch_id?: string | null
          jobs_processed: number
          match_type?: string | null
          matches_generated?: number | null
          success: boolean
          timestamp?: string | null
          updated_at?: string
          user_career_path?: string | null
          user_email: string
          user_professional_experience?: string | null
          user_work_preference?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          fallback_used?: boolean
          id?: number
          job_batch_id?: string | null
          jobs_processed?: number
          match_type?: string | null
          matches_generated?: number | null
          success?: boolean
          timestamp?: string | null
          updated_at?: string
          user_career_path?: string | null
          user_email?: string
          user_professional_experience?: string | null
          user_work_preference?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          ai_cost_usd: number | null
          ai_latency_ms: number | null
          ai_model: string | null
          cache_hit: boolean | null
          created_at: string | null
          fallback_reason: string | null
          freshness_tier: string | null
          id: number
          job_hash: string
          match_algorithm: string | null
          match_quality: string | null
          match_reason: string | null
          match_score: number
          match_tags: string[] | null
          matched_at: string | null
          prompt_version: string | null
          user_email: string
        }
        Insert: {
          ai_cost_usd?: number | null
          ai_latency_ms?: number | null
          ai_model?: string | null
          cache_hit?: boolean | null
          created_at?: string | null
          fallback_reason?: string | null
          freshness_tier?: string | null
          id?: number
          job_hash: string
          match_algorithm?: string | null
          match_quality?: string | null
          match_reason?: string | null
          match_score: number
          match_tags?: string[] | null
          matched_at?: string | null
          prompt_version?: string | null
          user_email: string
        }
        Update: {
          ai_cost_usd?: number | null
          ai_latency_ms?: number | null
          ai_model?: string | null
          cache_hit?: boolean | null
          created_at?: string | null
          fallback_reason?: string | null
          freshness_tier?: string | null
          id?: number
          job_hash?: string
          match_algorithm?: string | null
          match_quality?: string | null
          match_reason?: string | null
          match_score?: number
          match_tags?: string[] | null
          matched_at?: string | null
          prompt_version?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_job_hash_fkey"
            columns: ["job_hash"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_hash"]
          },
        ]
      }
      promo_activations: {
        Row: {
          activated_at: string
          code: string
          email: string
          id: number
        }
        Insert: {
          activated_at?: string
          code: string
          email: string
          id?: never
        }
        Update: {
          activated_at?: string
          code?: string
          email?: string
          id?: never
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string | null
          explanation: string | null
          feedback_type: string
          id: number
          job_context: Json | null
          job_hash: string
          match_context: Json | null
          match_hash: string | null
          match_quality_score: number | null
          relevance_score: number | null
          updated_at: string | null
          user_email: string
          user_preferences_snapshot: Json | null
          verdict: string
        }
        Insert: {
          created_at?: string | null
          explanation?: string | null
          feedback_type: string
          id?: number
          job_context?: Json | null
          job_hash: string
          match_context?: Json | null
          match_hash?: string | null
          match_quality_score?: number | null
          relevance_score?: number | null
          updated_at?: string | null
          user_email: string
          user_preferences_snapshot?: Json | null
          verdict: string
        }
        Update: {
          created_at?: string | null
          explanation?: string | null
          feedback_type?: string
          id?: number
          job_context?: Json | null
          job_hash?: string
          match_context?: Json | null
          match_hash?: string | null
          match_quality_score?: number | null
          relevance_score?: number | null
          updated_at?: string | null
          user_email?: string
          user_preferences_snapshot?: Json | null
          verdict?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          active: boolean | null
          career_path: string | null
          company_types: string[] | null
          created_at: string | null
          cv_url: string | null
          email: string
          email_count: number | null
          email_phase: string | null
          email_verified: boolean | null
          entry_level_preference: string | null
          full_name: string | null
          id: string
          languages_spoken: string[] | null
          last_email_sent: string | null
          onboarding_complete: boolean | null
          professional_experience: string | null
          professional_expertise: string | null
          roles_selected: string[] | null
          start_date: string | null
          subscription_active: boolean | null
          target_cities: string[]
          target_employment_start_date: string | null
          updated_at: string | null
          verification_token: string | null
          verification_token_expires: string | null
          visa_status: string | null
          work_environment: string | null
        }
        Insert: {
          active?: boolean | null
          career_path?: string | null
          company_types?: string[] | null
          created_at?: string | null
          cv_url?: string | null
          email: string
          email_count?: number | null
          email_phase?: string | null
          email_verified?: boolean | null
          entry_level_preference?: string | null
          full_name?: string | null
          id?: string
          languages_spoken?: string[] | null
          last_email_sent?: string | null
          onboarding_complete?: boolean | null
          professional_experience?: string | null
          professional_expertise?: string | null
          roles_selected?: string[] | null
          start_date?: string | null
          subscription_active?: boolean | null
          target_cities?: string[]
          target_employment_start_date?: string | null
          updated_at?: string | null
          verification_token?: string | null
          verification_token_expires?: string | null
          visa_status?: string | null
          work_environment?: string | null
        }
        Update: {
          active?: boolean | null
          career_path?: string | null
          company_types?: string[] | null
          created_at?: string | null
          cv_url?: string | null
          email?: string
          email_count?: number | null
          email_phase?: string | null
          email_verified?: boolean | null
          entry_level_preference?: string | null
          full_name?: string | null
          id?: string
          languages_spoken?: string[] | null
          last_email_sent?: string | null
          onboarding_complete?: boolean | null
          professional_experience?: string | null
          professional_expertise?: string | null
          roles_selected?: string[] | null
          start_date?: string | null
          subscription_active?: boolean | null
          target_cities?: string[]
          target_employment_start_date?: string | null
          updated_at?: string | null
          verification_token?: string | null
          verification_token_expires?: string | null
          visa_status?: string | null
          work_environment?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      feedback_summary: {
        Row: {
          avg_match_quality: number | null
          avg_relevance: number | null
          last_feedback: string | null
          negative_count: number | null
          neutral_count: number | null
          positive_count: number | null
          total_feedback: number | null
          user_email: string | null
        }
        Relationships: []
      }
      job_matching_performance: {
        Row: {
          avg_match_score: number | null
          date: string | null
          excellent_matches: number | null
          fair_matches: number | null
          good_matches: number | null
          low_matches: number | null
          total_matches: number | null
        }
        Relationships: []
      }
      system_performance: {
        Row: {
          active_records: number | null
          last_updated: string | null
          table_name: string | null
          total_records: number | null
        }
        Relationships: []
      }
      user_activity_summary: {
        Row: {
          active_users: number | null
          ai_matches: number | null
          avg_match_score: number | null
          date: string | null
          fallback_matches: number | null
          total_matches: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_feedback: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_match_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      normalize_city: {
        Args: { loc: string }
        Returns: string
      }
      update_job_freshness_tiers: {
        Args: Record<PropertyKey, never>
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

// Convenience type aliases for common operations
export type User = Tables<'users'>
export type Job = Tables<'jobs'>
export type Match = Tables<'matches'>
export type UserFeedback = Tables<'user_feedback'>
export type MatchLog = Tables<'match_logs'>

export type UserInsert = TablesInsert<'users'>
export type JobInsert = TablesInsert<'jobs'>
export type MatchInsert = TablesInsert<'matches'>
export type UserFeedbackInsert = TablesInsert<'user_feedback'>
export type MatchLogInsert = TablesInsert<'match_logs'>

export type UserUpdate = TablesUpdate<'users'>
export type JobUpdate = TablesUpdate<'jobs'>
export type MatchUpdate = TablesUpdate<'matches'>
export type UserFeedbackUpdate = TablesUpdate<'user_feedback'>
export type MatchLogUpdate = TablesUpdate<'match_logs'>
