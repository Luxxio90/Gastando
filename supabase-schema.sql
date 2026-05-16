-- =============================================
-- GASTANDO - Schema SQL para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- CUENTAS
-- =============================================
create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'credit_card', 'savings', 'other')),
  balance numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  color text not null default '#10b981',
  created_at timestamptz default now()
);

alter table accounts enable row level security;

create policy "Users manage own accounts" on accounts
  for all using (auth.uid() = user_id);

-- =============================================
-- CATEGORÍAS
-- =============================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default '💰',
  color text not null default '#6b7280',
  type text not null check (type in ('income', 'expense')),
  is_default boolean not null default false
);

alter table categories enable row level security;

create policy "Users read own + default categories" on categories
  for select using (auth.uid() = user_id or is_default = true);

create policy "Users manage own categories" on categories
  for insert with check (auth.uid() = user_id);

create policy "Users update own categories" on categories
  for update using (auth.uid() = user_id);

create policy "Users delete own categories" on categories
  for delete using (auth.uid() = user_id);

-- Categorías por defecto (gastos)
insert into categories (name, icon, color, type, is_default) values
  ('Alimentación', '🛒', '#f59e0b', 'expense', true),
  ('Transporte', '🚗', '#3b82f6', 'expense', true),
  ('Vivienda', '🏠', '#8b5cf6', 'expense', true),
  ('Salud', '🏥', '#ef4444', 'expense', true),
  ('Educación', '📚', '#06b6d4', 'expense', true),
  ('Entretenimiento', '🎬', '#ec4899', 'expense', true),
  ('Ropa', '👕', '#f97316', 'expense', true),
  ('Tecnología', '💻', '#6366f1', 'expense', true),
  ('Restaurantes', '🍽️', '#d97706', 'expense', true),
  ('Servicios', '💡', '#84cc16', 'expense', true),
  ('Otros gastos', '💸', '#6b7280', 'expense', true);

-- Categorías por defecto (ingresos)
insert into categories (name, icon, color, type, is_default) values
  ('Sueldo', '💼', '#10b981', 'income', true),
  ('Freelance', '🖥️', '#34d399', 'income', true),
  ('Inversiones', '📈', '#3b82f6', 'income', true),
  ('Otros ingresos', '💰', '#6b7280', 'income', true);

-- =============================================
-- TRANSACCIONES
-- =============================================
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id uuid references accounts(id) on delete cascade not null,
  category_id uuid references categories(id) not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  date date not null,
  notes text,
  created_at timestamptz default now()
);

alter table transactions enable row level security;

create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id);

-- =============================================
-- PRESUPUESTOS
-- =============================================
create table budgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) not null,
  amount numeric(12,2) not null check (amount > 0),
  month integer not null check (month between 1 and 12),
  year integer not null,
  created_at timestamptz default now(),
  unique(user_id, category_id, month, year)
);

alter table budgets enable row level security;

create policy "Users manage own budgets" on budgets
  for all using (auth.uid() = user_id);

-- =============================================
-- INVERSIONES
-- =============================================
create table investments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('stock', 'crypto', 'real_estate', 'fixed_income', 'other')),
  initial_amount numeric(12,2) not null check (initial_amount >= 0),
  current_value numeric(12,2) not null check (current_value >= 0),
  currency text not null default 'ARS',
  purchase_date date not null,
  notes text,
  created_at timestamptz default now()
);

alter table investments enable row level security;

create policy "Users manage own investments" on investments
  for all using (auth.uid() = user_id);
