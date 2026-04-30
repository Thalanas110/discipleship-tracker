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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      discipleship_relationships: {
        Row: {
          created_at: string
          disciple_id: string
          id: string
          leader_id: string
          ministry_id: string | null
          notes: string | null
          stage: Database["public"]["Enums"]["relationship_stage"]
          start_date: string
          status: Database["public"]["Enums"]["relationship_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          disciple_id: string
          id?: string
          leader_id: string
          ministry_id?: string | null
          notes?: string | null
          stage?: Database["public"]["Enums"]["relationship_stage"]
          start_date?: string
          status?: Database["public"]["Enums"]["relationship_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          disciple_id?: string
          id?: string
          leader_id?: string
          ministry_id?: string | null
          notes?: string | null
          stage?: Database["public"]["Enums"]["relationship_stage"]
          start_date?: string
          status?: Database["public"]["Enums"]["relationship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipleship_relationships_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          relationship_id: string
          status: Database["public"]["Enums"]["followup_status"]
          task: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          relationship_id: string
          status?: Database["public"]["Enums"]["followup_status"]
          task: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          relationship_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
          task?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "discipleship_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          member_id: string
          role_in_group: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          member_id: string
          role_in_group?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          member_id?: string
          role_in_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          ministry_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          ministry_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          ministry_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          habit_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          checkin_date?: string
          created_at?: string
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checkins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          frequency: Database["public"]["Enums"]["habit_frequency"]
          id: string
          name: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          id?: string
          name: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["habit_frequency"]
          id?: string
          name?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meeting_date: string
          next_steps: string | null
          relationship_id: string
          spiritual_notes: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          next_steps?: string | null
          relationship_id: string
          spiritual_notes?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          next_steps?: string | null
          relationship_id?: string
          spiritual_notes?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "discipleship_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          achieved_on: string
          created_at: string
          created_by: string | null
          disciple_id: string
          id: string
          notes: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          achieved_on?: string
          created_at?: string
          created_by?: string | null
          disciple_id: string
          id?: string
          notes?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          achieved_on?: string
          created_at?: string
          created_by?: string | null
          disciple_id?: string
          id?: string
          notes?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ministries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          about_user_id: string
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          visibility: Database["public"]["Enums"]["note_visibility"]
        }
        Insert: {
          about_user_id: string
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Update: {
          about_user_id?: string
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["note_visibility"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          answered: boolean
          answered_at: string | null
          answered_note: string | null
          created_at: string
          description: string | null
          id: string
          ministry_id: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["prayer_visibility"]
        }
        Insert: {
          answered?: boolean
          answered_at?: string | null
          answered_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ministry_id?: string | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["prayer_visibility"]
        }
        Update: {
          answered?: boolean
          answered_at?: string | null
          answered_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ministry_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["prayer_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          ministry_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          ministry_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          ministry_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: Database["public"]["Enums"]["app_role"]
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_leader_of: {
        Args: { _disciple: string; _leader: string }
        Returns: boolean
      }
      user_ministry: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "pastor"
        | "leader"
        | "disciple"
        | "viewer"
        | "developer"
      followup_status: "pending" | "completed" | "missed" | "cancelled"
      habit_frequency: "daily" | "weekly" | "monthly"
      note_visibility: "private" | "leader_only" | "pastor_visible"
      prayer_visibility: "private" | "leader_only" | "public"
      relationship_stage:
        | "new_believer"
        | "foundations"
        | "growing"
        | "serving"
        | "mentoring"
        | "multiplying"
      relationship_status: "active" | "paused" | "completed"
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
      app_role: [
        "admin",
        "pastor",
        "leader",
        "disciple",
        "viewer",
        "developer",
      ],
      followup_status: ["pending", "completed", "missed", "cancelled"],
      habit_frequency: ["daily", "weekly", "monthly"],
      note_visibility: ["private", "leader_only", "pastor_visible"],
      prayer_visibility: ["private", "leader_only", "public"],
      relationship_stage: [
        "new_believer",
        "foundations",
        "growing",
        "serving",
        "mentoring",
        "multiplying",
      ],
      relationship_status: ["active", "paused", "completed"],
    },
  },
} as const
