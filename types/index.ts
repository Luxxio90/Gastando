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

export interface ExpenseType {
  id: string
  user_id: string | null
  name: string
  color: string
  is_default: boolean
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
  expense_type_id: string | null
  expense_type?: ExpenseType
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
  transfer_group_id: string | null
  responsible_party_id: string | null
  created_at: string
  account?: Account
  category?: Category
  responsible?: Responsible
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

export interface BudgetCard {
  id: string
  user_id: string
  name: string
  month: number
  year: number
  color: string
  card_type: 'income' | 'expense'
  calc_type: 'manual' | 'category_sum' | 'percentage'
  manual_amount: number | null
  sum_category_id: string | null
  source_card_id: string | null
  percentage: number | null
  track_category_id: string | null
  track_account_id: string | null
  exceeded_at: string | null
  created_at: string
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
  created_at: string
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
  status: FixedExpenseStatus
  responsible: string | null
  due_day: number | null
  created_at: string
  category?: Pick<Category, 'id' | 'name' | 'icon' | 'color'>
}

export interface Responsible {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export type CreditCardNetwork = 'visa' | 'mastercard' | 'nacion' | 'provincia' | 'modo' | 'cabal' | 'naranja' | 'amex' | 'other'
export type CreditCardStatus = 'paid' | 'pending'

export interface CreditCard {
  id: string
  user_id: string
  name: string
  network: CreditCardNetwork
  account_id: string | null
  created_at: string
}

export interface CreditCardMonth {
  id: string
  card_id: string
  user_id: string
  month: number
  year: number
  due_date: string | null
  status: CreditCardStatus
  paid_at: string | null
  account_id: string | null
  paid_amount: number | null
  transaction_id: string | null
  created_at: string
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
  created_at: string
}

export interface RecurringTransaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  account_id: string | null
  day_of_month: number
  notes: string | null
  active: boolean
  created_at: string
  category?: Category
  account?: Account
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
