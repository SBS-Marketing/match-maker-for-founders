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
      advisor_recommendations: {
        Row: {
          advisor_id: string | null
          created_at: string
          fit_score: number | null
          id: string
          reasons: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          advisor_id?: string | null
          created_at?: string
          fit_score?: number | null
          id?: string
          reasons?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          advisor_id?: string | null
          created_at?: string
          fit_score?: number | null
          id?: string
          reasons?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_recommendations_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_recommendations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_context: {
        Row: {
          city: string | null
          goal: string | null
          id: string
          idea: string | null
          raw_context: Json | null
          risk: string | null
          role: string | null
          session_id: string | null
          stage: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          goal?: string | null
          id?: string
          idea?: string | null
          raw_context?: Json | null
          risk?: string | null
          role?: string | null
          session_id?: string | null
          stage?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          goal?: string | null
          id?: string
          idea?: string | null
          raw_context?: Json | null
          risk?: string | null
          role?: string | null
          session_id?: string | null
          stage?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_context_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_context_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_documents: {
        Row: {
          content: string
          created_at: string
          draft_content: string | null
          fill_pct: number | null
          id: string
          metadata: Json | null
          session_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          draft_content?: string | null
          fill_pct?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          draft_content?: string | null
          fill_pct?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model_used: string | null
          role: string
          session_id: string
          sources: Json | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model_used?: string | null
          role: string
          session_id: string
          sources?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model_used?: string | null
          role?: string
          session_id?: string
          sources?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copilot_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          created_at: string
          description: string
          href: string
          id: string
          label: string | null
          metadata: Json
          minutes: number
          service: string
          status: string
          task_date: string
          task_key: string
          title: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          href: string
          id?: string
          label?: string | null
          metadata?: Json
          minutes?: number
          service: string
          status?: string
          task_date?: string
          task_key: string
          title: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          href?: string
          id?: string
          label?: string | null
          metadata?: Json
          minutes?: number
          service?: string
          status?: string
          task_date?: string
          task_key?: string
          title?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          created_at: string
          due_date: string
          id: string
          notes: string | null
          priority: string
          session_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          priority?: string
          session_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          priority?: string
          session_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "copilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_assessment: {
        Row: {
          created_at: string
          id: string
          raw_answers: Json
          scores: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_answers: Json
          scores: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_answers?: Json
          scores?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_skills: {
        Row: {
          availability: number | null
          categories: Json | null
          created_at: string
          id: string
          looking_for: Json | null
          skills: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: number | null
          categories?: Json | null
          created_at?: string
          id?: string
          looking_for?: Json | null
          skills?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: number | null
          categories?: Json | null
          created_at?: string
          id?: string
          looking_for?: Json | null
          skills?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          match_id: string
          reply_to_id: string | null
          sender_id: string
          status: Database["public"]["Enums"]["message_status"] | null
          attachments: Json | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          match_id: string
          reply_to_id?: string | null
          sender_id: string
          status?: Database["public"]["Enums"]["message_status"] | null
          attachments?: Json | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          match_id?: string
          reply_to_id?: string | null
          sender_id?: string
          status?: Database["public"]["Enums"]["message_status"] | null
          attachments?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          commitment: Database["public"]["Enums"]["founder_commitment"] | null
          created_at: string
          display_name: string | null
          founder_type: string | null
          id: string
          industry: string | null
          location: string | null
          looking_for: string | null
          onboarded_at: string | null
          path: Database["public"]["Enums"]["profile_path"] | null
          photo_url: string | null
          role: Database["public"]["Enums"]["founder_role"] | null
          skills: string[] | null
          stage: Database["public"]["Enums"]["founder_stage"] | null
          updated_at: string
          vision: string | null
        }
        Insert: {
          commitment?: Database["public"]["Enums"]["founder_commitment"] | null
          created_at?: string
          display_name?: string | null
          founder_type?: string | null
          id: string
          industry?: string | null
          location?: string | null
          looking_for?: string | null
          onboarded_at?: string | null
          path?: Database["public"]["Enums"]["profile_path"] | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["founder_role"] | null
          skills?: string[] | null
          stage?: Database["public"]["Enums"]["founder_stage"] | null
          updated_at?: string
          vision?: string | null
        }
        Update: {
          commitment?: Database["public"]["Enums"]["founder_commitment"] | null
          created_at?: string
          display_name?: string | null
          founder_type?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          looking_for?: string | null
          onboarded_at?: string | null
          path?: Database["public"]["Enums"]["profile_path"] | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["founder_role"] | null
          skills?: string[] | null
          stage?: Database["public"]["Enums"]["founder_stage"] | null
          updated_at?: string
          vision?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id: string
          swiper_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiper_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["swipe_direction"]
          id?: string
          swiper_id?: string
          target_id?: string
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
      conversations: {
        Row: {
          id: string
          match_id: string | null
          user_a: string
          user_b: string
          last_message_at: string | null
          last_message_preview: string | null
          unread_count_a: number | null
          unread_count_b: number | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id?: string | null
          user_a: string
          user_b: string
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count_a?: number | null
          unread_count_b?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string | null
          user_a?: string
          user_b?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count_a?: number | null
          unread_count_b?: number | null
          is_active?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "mutual_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          id: string
          founder_id: string
          title: string
          description: string | null
          problem: string | null
          solution: string | null
          stage: Database["public"]["Enums"]["project_stage"] | null
          industry: string | null
          tags: string[] | null
          website_url: string | null
          pitch_deck_url: string | null
          logo_url: string | null
          is_looking_for: string[] | null
          is_public: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          title: string
          description?: string | null
          problem?: string | null
          solution?: string | null
          stage?: Database["public"]["Enums"]["project_stage"] | null
          industry?: string | null
          tags?: string[] | null
          website_url?: string | null
          pitch_deck_url?: string | null
          logo_url?: string | null
          is_looking_for?: string[] | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          title?: string
          description?: string | null
          problem?: string | null
          solution?: string | null
          stage?: Database["public"]["Enums"]["project_stage"] | null
          industry?: string | null
          tags?: string[] | null
          website_url?: string | null
          pitch_deck_url?: string | null
          logo_url?: string | null
          is_looking_for?: string[] | null
          is_public?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_embeddings: {
        Row: {
          id: string
          profile_id: string
          embedding: string
          content_hash: string
          model: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          embedding: string
          content_hash: string
          model?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          embedding?: string
          content_hash?: string
          model?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_embeddings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          id: string
          user_id: string
          target_id: string
          target_type: string
          total_score: number
          dimension_scores: Json | null
          badges: Json | null
          dealbreaker: boolean | null
          dealbreaker_reason: string | null
          computed_at: string
          skill_overlap_score: number | null
          location_score: number | null
          embedding_score: number | null
          combined_score: number | null
          explanation: Json | null
          is_hidden: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          target_id: string
          target_type: string
          total_score: number
          dimension_scores?: Json | null
          badges?: Json | null
          dealbreaker?: boolean | null
          dealbreaker_reason?: string | null
          computed_at?: string
          skill_overlap_score?: number | null
          location_score?: number | null
          embedding_score?: number | null
          combined_score?: number | null
          explanation?: Json | null
          is_hidden?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          target_type?: string
          total_score?: number
          dimension_scores?: Json | null
          badges?: Json | null
          dealbreaker?: boolean | null
          dealbreaker_reason?: string | null
          computed_at?: string
          skill_overlap_score?: number | null
          location_score?: number | null
          embedding_score?: number | null
          combined_score?: number | null
          explanation?: Json | null
          is_hidden?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "match_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_interactions: {
        Row: {
          id: string
          user_id: string
          target_id: string
          target_type: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_id: string
          target_type: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_id?: string
          target_type?: string
          action?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mutual_matches: {
        Row: {
          id: string
          user_a: string
          user_b: string
          score_a: number | null
          score_b: number | null
          avg_score: number | null
          status: string
          created_at: string
          conversation_id: string | null
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          score_a?: number | null
          score_b?: number | null
          avg_score?: number | null
          status?: string
          created_at?: string
          conversation_id?: string | null
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          score_a?: number | null
          score_b?: number | null
          avg_score?: number | null
          status?: string
          created_at?: string
          conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mutual_matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutual_matches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "user"
      founder_commitment: "full_time" | "part_time" | "exploring"
      founder_role: "tech" | "business" | "product" | "design" | "other"
      founder_stage: "idea" | "mvp" | "revenue" | "scaling"
      profile_path: "founder" | "joiner"
      swipe_direction: "like" | "pass"
      match_status: "pending" | "accepted" | "declined" | "blocked"
      message_status: "sent" | "delivered" | "read"
      project_stage: "idea" | "prototype" | "mvp" | "revenue" | "scaling"
      availability_type: "full_time" | "part_time" | "freelance" | "open"
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
      app_role: ["admin", "user"],
      founder_commitment: ["full_time", "part_time", "exploring"],
      founder_role: ["tech", "business", "product", "design", "other"],
      founder_stage: ["idea", "mvp", "revenue", "scaling"],
      profile_path: ["founder", "joiner"],
      swipe_direction: ["like", "pass"],
      match_status: ["pending", "accepted", "declined", "blocked"],
      message_status: ["sent", "delivered", "read"],
      project_stage: ["idea", "prototype", "mvp", "revenue", "scaling"],
      availability_type: ["full_time", "part_time", "freelance", "open"],
    },
  },
} as const
