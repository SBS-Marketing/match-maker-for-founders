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
          description: string | null
          href: string | null
          id: string
          label: string | null
          metadata: Json | null
          minutes: number | null
          service: string | null
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
          description?: string | null
          href?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          minutes?: number | null
          service?: string | null
          status?: string
          task_date: string
          task_key: string
          title: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          href?: string | null
          id?: string
          label?: string | null
          metadata?: Json | null
          minutes?: number | null
          service?: string | null
          status?: string
          task_date?: string
          task_key?: string
          title?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
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
      match_results: {
        Row: {
          created_at: string
          fit_score: number | null
          id: string
          is_hidden: boolean
          reasons: Json | null
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fit_score?: number | null
          id?: string
          is_hidden?: boolean
          reasons?: Json | null
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          fit_score?: number | null
          id?: string
          is_hidden?: boolean
          reasons?: Json | null
          target_id?: string
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
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
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
          is_onboarded: boolean
          location: string | null
          looking_for: string | null
          onboarded_at: string | null
          partner_term: string | null
          path: Database["public"]["Enums"]["profile_path"] | null
          photo_url: string | null
          role: Database["public"]["Enums"]["founder_role"] | null
          skills: string[] | null
          stage: Database["public"]["Enums"]["founder_stage"] | null
          updated_at: string
          venture_term: string | null
          vision: string | null
        }
        Insert: {
          commitment?: Database["public"]["Enums"]["founder_commitment"] | null
          created_at?: string
          display_name?: string | null
          founder_type?: string | null
          id: string
          industry?: string | null
          is_onboarded?: boolean
          location?: string | null
          looking_for?: string | null
          onboarded_at?: string | null
          partner_term?: string | null
          path?: Database["public"]["Enums"]["profile_path"] | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["founder_role"] | null
          skills?: string[] | null
          stage?: Database["public"]["Enums"]["founder_stage"] | null
          updated_at?: string
          venture_term?: string | null
          vision?: string | null
        }
        Update: {
          commitment?: Database["public"]["Enums"]["founder_commitment"] | null
          created_at?: string
          display_name?: string | null
          founder_type?: string | null
          id?: string
          industry?: string | null
          is_onboarded?: boolean
          location?: string | null
          looking_for?: string | null
          onboarded_at?: string | null
          partner_term?: string | null
          path?: Database["public"]["Enums"]["profile_path"] | null
          photo_url?: string | null
          role?: Database["public"]["Enums"]["founder_role"] | null
          skills?: string[] | null
          stage?: Database["public"]["Enums"]["founder_stage"] | null
          updated_at?: string
          venture_term?: string | null
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
      waitlist: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          metadata: Json | null
          name: string | null
          status: string
          token: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          name?: string | null
          status?: string
          token?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          status?: string
          token?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_waitlist_entry: { Args: { p_token: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_waitlist: {
        Args: { p_email: string; p_metadata?: Json; p_name?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      founder_commitment: "full_time" | "part_time" | "exploring"
      founder_role: "tech" | "business" | "product" | "design" | "other"
      founder_stage: "idea" | "mvp" | "revenue" | "scaling"
      profile_path: "founder" | "joiner"
      swipe_direction: "like" | "pass"
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
    },
  },
} as const
