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
      addiction_events: {
        Row: {
          addiction_id: string
          event_type: string
          id: string
          intervention: string | null
          note: string | null
          occurred_at: string
          trigger: string | null
          urge_after: number | null
          urge_before: number | null
          user_id: string
        }
        Insert: {
          addiction_id: string
          event_type: string
          id?: string
          intervention?: string | null
          note?: string | null
          occurred_at?: string
          trigger?: string | null
          urge_after?: number | null
          urge_before?: number | null
          user_id: string
        }
        Update: {
          addiction_id?: string
          event_type?: string
          id?: string
          intervention?: string | null
          note?: string | null
          occurred_at?: string
          trigger?: string | null
          urge_after?: number | null
          urge_before?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addiction_events_user_id_addiction_id_fkey"
            columns: ["user_id", "addiction_id"]
            isOneToOne: false
            referencedRelation: "addictions"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "addiction_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      addictions: {
        Row: {
          active: boolean
          created_at: string
          daily_cost: number | null
          id: string
          name: string
          replacement_plan: Json
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_cost?: number | null
          id?: string
          name: string
          replacement_plan?: Json
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_cost?: number | null
          id?: string
          name?: string
          replacement_plan?: Json
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_log: {
        Row: {
          action: string
          channel: string
          created_at: string
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          channel: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: { id: string; user_id: string; title: string; created_at: string; updated_at: string }
        Insert: { id?: string; user_id: string; title?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; user_id?: string; title?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      ai_messages: {
        Row: { id: string; user_id: string; conversation_id: string; role: string; content: string; sources: Json; proposed_action: Json | null; action_status: string | null; created_at: string }
        Insert: { id?: string; user_id: string; conversation_id: string; role: string; content: string; sources?: Json; proposed_action?: Json | null; action_status?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; conversation_id?: string; role?: string; content?: string; sources?: Json; proposed_action?: Json | null; action_status?: string | null; created_at?: string }
        Relationships: []
      }
      // NOTA: as três tabelas a seguir (focus_sessions, repertoire_items,
      // sleep_entries) foram adicionadas à mão porque o CLI local está
      // autenticado em outra conta e não consegue regenerar este arquivo.
      // Ao rodar `supabase gen types` com acesso ao projeto, elas serão
      // substituídas pela versão gerada — confira se o formato bate.
      focus_sessions: {
        Row: {
          actual_seconds: number
          commitment_id: string | null
          ended_at: string | null
          id: string
          interruptions: number
          name: string
          planned_minutes: number
          reflection: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          actual_seconds?: number
          commitment_id?: string | null
          ended_at?: string | null
          id?: string
          interruptions?: number
          name?: string
          planned_minutes: number
          reflection?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          actual_seconds?: number
          commitment_id?: string | null
          ended_at?: string | null
          id?: string
          interruptions?: number
          name?: string
          planned_minutes?: number
          reflection?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      repertoire_items: {
        Row: {
          author: string
          book_id: string | null
          comment: string | null
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          kind: string
          tags: string[]
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          author?: string
          book_id?: string | null
          comment?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          kind: string
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          author?: string
          book_id?: string | null
          comment?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sleep_entries: {
        Row: {
          created_at: string
          hours: number
          id: string
          note: string | null
          quality: number
          slept_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          note?: string | null
          quality: number
          slept_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          note?: string | null
          quality?: number
          slept_on?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          current_page: number
          finished_at: string | null
          id: string
          rating: number | null
          started_at: string | null
          status: string
          summary: string | null
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          rating?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          rating?: number | null
          started_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commitment_events: {
        Row: {
          carried_to: string | null
          reschedule_count: number
          commitment_id: string
          completed_at: string | null
          created_at: string
          id: string
          note: string | null
          scheduled_for: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carried_to?: string | null
          reschedule_count?: number
          commitment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          scheduled_for: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carried_to?: string | null
          reschedule_count?: number
          commitment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitment_events_user_id_commitment_id_fkey"
            columns: ["user_id", "commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "commitment_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commitments: {
        Row: {
          active: boolean
          category: string
          day_block: string
          source: string
          created_at: string
          frequency: Json
          goal_id: string | null
          id: string
          kind: string
          priority: number
          scheduled_date: string | null
          start_time: string | null
          duration_minutes: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category?: string
          day_block?: string
          source?: string
          created_at?: string
          frequency?: Json
          goal_id?: string | null
          id?: string
          kind: string
          priority?: number
          scheduled_date?: string | null
          start_time?: string | null
          duration_minutes?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          day_block?: string
          source?: string
          created_at?: string
          frequency?: Json
          goal_id?: string | null
          id?: string
          kind?: string
          priority?: number
          scheduled_date?: string | null
          start_time?: string | null
          duration_minutes?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_user_id_goal_id_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          body: Json
          created_at: string
          focus_session_id: string | null
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          body?: Json
          created_at?: string
          focus_session_id?: string | null
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          body?: Json
          created_at?: string
          focus_session_id?: string | null
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: true
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_votes: {
        Row: {
          feature_id: string
          season: string
          user_id: string
          voted_at: string
        }
        Insert: {
          feature_id: string
          season?: string
          user_id: string
          voted_at?: string
        }
        Update: {
          feature_id?: string
          season?: string
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          deadline: string | null
          id: string
          status: string
          target: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          status?: string
          target: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          deadline?: string | null
          id?: string
          status?: string
          target?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_milestones: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          due_date: string | null
          goal_id: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id: string
          id?: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          goal_id?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_milestones_user_id_goal_id_fkey"
            columns: ["user_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          progress: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          progress?: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          progress?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_notes: {
        Row: {
          application: string | null
          book_id: string | null
          content: string
          created_at: string
          id: string
          learning: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application?: string | null
          book_id?: string | null
          content?: string
          created_at?: string
          id?: string
          learning?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application?: string | null
          book_id?: string | null
          content?: string
          created_at?: string
          id?: string
          learning?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_notes_user_id_book_id_fkey"
            columns: ["user_id", "book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "knowledge_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_entries: {
        Row: {
          id: string
          mood: number
          note: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          id?: string
          mood: number
          note?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          id?: string
          mood?: number
          note?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_permissions: Json
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          notification_prefs: Json
          purpose: string
          stripe_customer_id: string | null
          timezone: string
          updated_at: string
          whatsapp_phone_e164: string | null
          whatsapp_verified_at: string | null
        }
        Insert: {
          ai_permissions?: Json
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          notification_prefs?: Json
          purpose?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_phone_e164?: string | null
          whatsapp_verified_at?: string | null
        }
        Update: {
          ai_permissions?: Json
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notification_prefs?: Json
          purpose?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_phone_e164?: string | null
          whatsapp_verified_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          price_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id: string
          price_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          price_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          occurred_at: string
          recurring: boolean
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          id?: string
          occurred_at?: string
          recurring?: boolean
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          occurred_at?: string
          recurring?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_state: {
        Row: {
          payload: Json
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          payload?: Json
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          payload?: Json
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_link_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          phone_e164: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          phone_e164: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          phone_e164?: string
        }
        Relationships: []
      }
      whatsapp_processed_messages: {
        Row: {
          created_at: string
          wamid: string
        }
        Insert: {
          created_at?: string
          wamid: string
        }
        Update: {
          created_at?: string
          wamid?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          active: boolean
          created_at: string
          exercises: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          exercises?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          exercises?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          id: string
          snapshot: Json
          started_at: string
          user_id: string
          volume_kg: number
          workout_plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          snapshot?: Json
          started_at?: string
          user_id: string
          volume_kg?: number
          workout_plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          snapshot?: Json
          started_at?: string
          user_id?: string
          volume_kg?: number
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_workout_plan_id_fkey"
            columns: ["user_id", "workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      feature_vote_counts: {
        Args: { target_season?: string }
        Returns: { feature_id: string; votes: number }[]
      }
      publish_focus_session: {
        Args: { target_session: string; show_name?: boolean }
        Returns: {
          author_avatar_url: string | null
          author_name: string
          body: Json
          created_at: string
          focus_session_id: string | null
          id: string
          kind: string
          user_id: string
        }
      }
      get_my_credit_account: {
        Args: Record<PropertyKey, never>
        Returns: { balance: number }[]
      }
      spend_credits: {
        Args: { p_amount: number; p_description?: string | null }
        Returns: { balance: number }[]
      }
      grant_credits: {
        Args: { p_user_id: string; p_amount: number; p_kind: string; p_provider: string; p_provider_reference: string; p_description?: string | null }
        Returns: Json
      }
      spend_credits_for: {
        Args: { p_user_id: string; p_amount: number; p_description?: string | null }
        Returns: { balance: number }[]
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
