-- Live Supabase schema checkpoint for Finora Expense Tracker.
--
-- This migration contains only DDL verified from the live database on 2026-09-04.
-- The live CHECK constraint names are known, but their expressions are not; they
-- are intentionally not recreated here. The foreign-key delete actions are also
-- unverified, so no ON DELETE clause is stated below. Review SUPABASE.md before
-- using this checkpoint to recreate a production database.

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  payment_method text NULL,
  date date NOT NULL,
  note text NULL,
  type text NOT NULL,
  source text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

CREATE TABLE public.recurring_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  payment_method text NULL,
  cadence text NOT NULL,
  next_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

CREATE TABLE public.monthly_budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_budgets_pkey PRIMARY KEY (id),
  CONSTRAINT monthly_budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id),
  CONSTRAINT monthly_budgets_user_id_month_key UNIQUE (user_id, month)
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own expenses"
  ON public.expenses AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own expenses"
  ON public.expenses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own budgets"
  ON public.monthly_budgets AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own budgets"
  ON public.monthly_budgets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own budgets"
  ON public.monthly_budgets AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own budgets"
  ON public.monthly_budgets AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own recurring expenses"
  ON public.recurring_expenses AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own recurring expenses"
  ON public.recurring_expenses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own recurring expenses"
  ON public.recurring_expenses AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view their own recurring expenses"
  ON public.recurring_expenses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
