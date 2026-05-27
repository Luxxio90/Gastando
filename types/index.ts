export type TransactionType = 'income' | 'expense'
export type InvestmentType = 'stock' | 'crypto' | 'real_estate' | 'fixed_income' | 'other'
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'savings' | 'other'

export interface Account {
  id: string
  user_id: string
  name: string
  type: string
  balance: number
  currency: string
  color: string
  created_at: string | null
}

export interface ExpenseType {
  id: string
  user_id: string | null
  name: string
  color: string
  is_default: boolean | null
  created_at: string | null
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color: string
  type: string
  is_default: boolean
  expense_type_id: string | null
  expense_type?: { id: string; name: string; is_default?: boolean | null; color?: string; user_id?: string | null; created_at?: string | null } | null
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  type: string
  amount: number
  description: string
  date: string
  notes: string | null
  transfer_group_id: string | null
  responsible_party_id: string | null
  created_at: string | null
  account?: Account | null
  category?: Category | null
  responsible?: Responsible | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  month: number
  year: number
  created_at: string | null
  category?: Category
  spent?: number
}

export interface BudgetCard {
  id: string
  user_id: string
  name: string
  month: number
  year: number
  color: string
  card_type: string
  calc_type: string
  manual_amount: number | null
  sum_category_id: string | null
  source_card_id: string | null
  percentage: number | null
  track_category_id: string | null
  track_account_id: string | null
  exceeded_at: string | null
  created_at: string | null
  sum_category?: Pick<Category, 'id' | 'name' | 'icon' | 'type'>
  track_category?: Pick<Category, 'id' | 'name' | 'icon' | 'type'>
}

export type FixedExpenseStatus = 'paid' | 'not_applicable' | 'pending'

export interface FixedExpenseGroup {
  id: string
  user_id: string
  month: number
  year: number
  name: string
  color: string
  order: number
  created_at: string | null
}

export interface FixedExpenseItem {
  id: string
  user_id: string
  month: number
  year: number
  group_id: string | null
  category_id: string | null
  description: string | null
  amount: number
  status: string
  responsible: string | null
  due_day: number | null
  created_at: string | null
  category?: Pick<Category, 'id' | 'name' | 'icon' | 'color'>
}

export interface Responsible {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string | null
}

export type CreditCardNetwork = 'visa' | 'mastercard' | 'nacion' | 'provincia' | 'modo' | 'cabal' | 'naranja' | 'amex' | 'other'
export type CreditCardStatus = 'paid' | 'pending'

export interface CreditCard {
  id: string
  user_id: string
  name: string
  network: string
  account_id: string | null
  created_at: string | null
}

export interface CreditCardMonth {
  id: string
  card_id: string
  user_id: string
  month: number
  year: number
  due_date: string | null
  status: string
  paid_at: string | null
  account_id: string | null
  paid_amount: number | null
  transaction_id: string | null
  created_at: string | null
  card?: CreditCard
}

export interface CreditCardItem {
  id: string
  card_month_id: string
  user_id: string
  description: string
  installment_current: number | null
  installment_total: number | null
  amount: number
  created_at: string | null
}

export interface RecurringTransaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: string
  category_id: string | null
  account_id: string | null
  day_of_month: number
  notes: string | null
  active: boolean
  created_at: string | null
  category?: Category | null
  account?: Account | null
}

export interface Investment {
  id: string
  user_id: string
  name: string
  type: string
  initial_amount: number
  current_value: number
  currency: string
  purchase_date: string
  notes: string | null
  created_at: string | null
}
