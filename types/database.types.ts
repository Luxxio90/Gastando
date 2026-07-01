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
      accounts: {
        Row: {
          balance: number
          color: string
          created_at: string | null
          currency: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          balance?: number
          color?: string
          created_at?: string | null
          currency?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          balance?: number
          color?: string
          created_at?: string | null
          currency?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_cards: {
        Row: {
          calc_type: string
          card_type: string
          color: string | null
          created_at: string | null
          exceeded_at: string | null
          id: string
          manual_amount: number | null
          month: number
          name: string
          percentage: number | null
          source_card_id: string | null
          sum_category_id: string | null
          track_account_id: string | null
          track_category_id: string | null
          user_id: string | null
          year: number
        }
        Insert: {
          calc_type?: string
          card_type?: string
          color?: string | null
          created_at?: string | null
          exceeded_at?: string | null
          id?: string
          manual_amount?: number | null
          month: number
          name: string
          percentage?: number | null
          source_card_id?: string | null
          sum_category_id?: string | null
          track_account_id?: string | null
          track_category_id?: string | null
          user_id?: string | null
          year: number
        }
        Update: {
          calc_type?: string
          card_type?: string
          color?: string | null
          created_at?: string | null
          exceeded_at?: string | null
          id?: string
          manual_amount?: number | null
          month?: number
          name?: string
          percentage?: number | null
          source_card_id?: string | null
          sum_category_id?: string | null
          track_account_id?: string | null
          track_category_id?: string | null
          user_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_cards_source_card_id_fkey"
            columns: ["source_card_id"]
            isOneToOne: false
            referencedRelation: "budget_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_cards_sum_category_id_fkey"
            columns: ["sum_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_cards_track_account_id_fkey"
            columns: ["track_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_cards_track_category_id_fkey"
            columns: ["track_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          id?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          expense_type_id: string | null
          icon: string
          id: string
          is_default: boolean
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string
          expense_type_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string
          expense_type_id?: string | null
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_items: {
        Row: {
          amount: number
          card_month_id: string
          created_at: string | null
          description: string
          id: string
          installment_current: number | null
          installment_total: number | null
          user_id: string
        }
        Insert: {
          amount?: number
          card_month_id: string
          created_at?: string | null
          description: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          card_month_id?: string
          created_at?: string | null
          description?: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_items_card_month_id_fkey"
            columns: ["card_month_id"]
            isOneToOne: false
            referencedRelation: "credit_card_months"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_months: {
        Row: {
          account_id: string | null
          card_id: string
          created_at: string | null
          due_date: string | null
          id: string
          month: number
          paid_amount: number | null
          paid_at: string | null
          status: string
          transaction_id: string | null
          user_id: string
          year: number
        }
        Insert: {
          account_id?: string | null
          card_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          month: number
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
          year: number
        }
        Update: {
          account_id?: string | null
          card_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          month?: number
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_months_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_months_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_months_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          name: string
          network: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          network?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          network?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fixed_expense_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          month: number
          name: string
          order: number
          user_id: string
          year: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          month: number
          name: string
          order?: number
          user_id: string
          year: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          month?: number
          name?: string
          order?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      fixed_expense_items: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string | null
          due_day: number | null
          group_id: string | null
          id: string
          month: number
          responsible: string | null
          status: string
          user_id: string
          year: number
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_day?: number | null
          group_id?: string | null
          id?: string
          month: number
          responsible?: string | null
          status?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_day?: number | null
          group_id?: string | null
          id?: string
          month?: number
          responsible?: string | null
          status?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_expense_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fixed_expense_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          created_at: string | null
          currency: string
          current_value: number
          id: string
          initial_amount: number
          name: string
          notes: string | null
          purchase_date: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string
          current_value: number
          id?: string
          initial_amount: number
          name: string
          notes?: string | null
          purchase_date: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          current_value?: number
          id?: string
          initial_amount?: number
          name?: string
          notes?: string | null
          purchase_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          created_at: string | null
          day_of_month: number
          description: string
          id: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number
          description: string
          id?: string
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string | null
          day_of_month?: number
          description?: string
          id?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      responsible_parties: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string
          created_at: string | null
          date: string
          description: string
          id: string
          notes: string | null
          recurring_transaction_id: string | null
          responsible_party_id: string | null
          transfer_group_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
          recurring_transaction_id?: string | null
          responsible_party_id?: string | null
          transfer_group_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          recurring_transaction_id?: string | null
          responsible_party_id?: string | null
          transfer_group_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_responsible_party_id_fkey"
            columns: ["responsible_party_id"]
            isOneToOne: false
            referencedRelation: "responsible_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_access: {
        Row: {
          id: string
          user_id: string
          token: string
          name: string
          account_ids: string[]
          fixed_group_names: string[]
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token?: string
          name: string
          account_ids: string[]
          fixed_group_names?: string[]
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          name?: string
          account_ids?: string[]
          fixed_group_names?: string[]
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_shared_access_record: {
        Args: { p_token: string; p_name: string; p_account_ids: string[]; p_fixed_group_names: string[] }
        Returns: Json
      }
      update_shared_access_record: {
        Args: { p_id: string; p_name: string; p_account_ids: string[]; p_fixed_group_names: string[] }
        Returns: undefined
      }
      delete_shared_access_record: {
        Args: { p_id: string }
        Returns: undefined
      }
      get_my_shared_access: {
        Args: Record<string, never>
        Returns: Json
      }
      get_shared_access_by_token: {
        Args: { p_token: string }
        Returns: Json
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
