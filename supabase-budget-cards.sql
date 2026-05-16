-- Nueva tabla de tarjetas de presupuesto flexible
CREATE TABLE budget_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  color TEXT DEFAULT '#10b981',
  card_type TEXT NOT NULL DEFAULT 'expense' CHECK (card_type IN ('income', 'expense')),
  calc_type TEXT NOT NULL DEFAULT 'manual' CHECK (calc_type IN ('manual', 'category_sum', 'percentage')),
  manual_amount NUMERIC(12, 2),
  sum_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  source_card_id UUID REFERENCES budget_cards(id) ON DELETE SET NULL,
  percentage NUMERIC(5, 2),
  track_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE budget_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget cards" ON budget_cards FOR ALL USING (auth.uid() = user_id);
