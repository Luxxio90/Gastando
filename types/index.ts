export type TransactionType = 'income' | 'expense'
export type InvestmentType = 'stock' | 'crypto' | 'real_estate' | 'fixed_income' | 'other'

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'credit_card' | 'savings' | 'other'
  balance: number
  currency: string
  color: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color: string
  type: TransactionType
  is_default: boolean
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  type: TransactionType
  amount: number
  description: string
  date: string
  notes: string | null
  created_at: string
  account?: Account
  category?: Category
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  created_at: string
  category?: Category
  spent?: number
}

export interface Investment {
  id: string
  user_id: string
  name: string
  type: InvestmentType
  initial_amount: number
  current_value: number
  currency: string
  purchase_date: string
  notes: string | null
  created_at: string
}
