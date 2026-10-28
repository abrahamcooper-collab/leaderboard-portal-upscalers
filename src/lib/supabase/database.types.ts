/**
 * Types for the schema in `supabase/migrations`. Hand-written to match the
 * shape `supabase gen types typescript` produces; once a project is linked,
 * regenerate with `pnpm db:types` and this file is replaced wholesale.
 */

export type UserRole = "admin" | "closer";

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          closer_id: string;
          name: string;
          celebration_video_path: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          closer_id: string;
          name: string;
          celebration_video_path?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          celebration_video_path?: string | null;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_closer_id_fkey";
            columns: ["closer_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      agents: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          phone: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          team_id?: string;
          name?: string;
          phone?: string | null;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agents_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_targets: {
        Row: { agent_id: string; month: string; amount: number };
        Insert: { agent_id: string; month: string; amount: number };
        Update: { amount?: number };
        Relationships: [
          {
            foreignKeyName: "monthly_targets_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          agent_id: string;
          amount: number;
          sold_at: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          amount: number;
          sold_at?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          agent_id?: string;
          amount?: number;
          sold_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: never; Returns: boolean };
      create_closer: {
        Args: {
          p_user_id: string;
          p_full_name: string;
          p_phone: string | null;
          p_team_name: string;
        };
        Returns: string;
      };
      update_closer: {
        Args: {
          p_team_id: string;
          p_full_name: string;
          p_phone: string | null;
          p_team_name: string;
        };
        Returns: undefined;
      };
      archive_team: { Args: { p_team_id: string }; Returns: string };
      leaderboard: {
        Args: { p_month: string; p_tz: string };
        Returns: {
          team_id: string;
          team_name: string;
          closer_name: string;
          agent_id: string | null;
          agent_name: string | null;
          agent_archived: boolean | null;
          target: number | null;
          sales_count: number;
          sales_total: number;
        }[];
      };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: { [_ in never]: never };
  };
};
