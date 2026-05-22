export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          transfer_group_id?: string | null
          type?: string
          user_id?: string
        }
      }
      credit_cards: {
        Row: {
          created_at: string | null
          id: string
          name: string
          network: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          network?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          network?: string
          user_id?: string
        }
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
          user_id?: string
          year?: number
        }
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
      }
      budget_cards: {
        Row: {
          calc_type: string
          card_type: string
          color: string
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
          user_id: string
          year: number
        }
        Insert: {
          calc_type: string
          card_type: string
          color?: string
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
          user_id: string
          year: number
        }
        Update: {
          calc_type?: string
          card_type?: string
          color?: string
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
          user_id?: string
          year?: number
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
