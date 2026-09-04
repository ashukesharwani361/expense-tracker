# Supabase database checkpoint

This repository contains a schema and row-level-security (RLS) checkpoint for
the Finora Expense Tracker. It is based on authoritative live-database metadata
captured on 2026-09-04. It is an audit/reproducibility artifact and must be
reviewed before being used to recreate production.

The checkpoint migration is
`supabase/migrations/20260904120000_live_schema_checkpoint.sql`.

## Application configuration

The application uses Supabase Auth for email/password sessions and its browser
client requires these environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use local environment files only. Do not commit API keys, passwords, service-role
credentials, or other secrets. The repository `.gitignore` ignores `.env`,
`.env.local`, and `.env.*.local` files.

## Ownership and RLS

Every application row has a non-null `user_id` UUID that references
`auth.users(id)`. The application uses this as the row owner. RLS is enabled on
all three tables, and the existing policies enforce row-level isolation through
`auth.uid() = user_id` for the `authenticated` role.

## Tables

### `public.expenses`

Stores individual income and expense transactions.

- `id uuid NOT NULL DEFAULT gen_random_uuid()`; primary key `expenses_pkey`
- `user_id uuid NOT NULL`; foreign key `expenses_user_id_fkey` to `auth.users(id)`
- `title text NOT NULL`
- `amount numeric NOT NULL`
- `category text NOT NULL`
- `payment_method text NULL`
- `date date NOT NULL`
- `note text NULL`
- `type text NOT NULL`
- `source text NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

The live database also has the check constraint `expenses_type_check`. Its
expression was not available in the authoritative inspection, so it is not
silently recreated in the checkpoint migration.

### `public.recurring_expenses`

Stores recurring-expense definitions rather than generated transactions.

- `id uuid NOT NULL DEFAULT gen_random_uuid()`; primary key `recurring_expenses_pkey`
- `user_id uuid NOT NULL`; foreign key `recurring_expenses_user_id_fkey` to `auth.users(id)`
- `title text NOT NULL`
- `amount numeric NOT NULL`
- `category text NOT NULL`
- `payment_method text NULL`
- `cadence text NOT NULL`
- `next_date date NOT NULL`
- `is_active boolean NOT NULL DEFAULT true`
- `note text NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

The live database also has the check constraint
`recurring_expenses_cadence_check`. Its expression was not available in the
authoritative inspection, so it is not silently recreated in the checkpoint
migration.

### `public.monthly_budgets`

Stores a user's budget amount for a calendar-month key.

- `id uuid NOT NULL DEFAULT gen_random_uuid()`; primary key `monthly_budgets_pkey`
- `user_id uuid NOT NULL`; foreign key `monthly_budgets_user_id_fkey` to `auth.users(id)`
- `month text NOT NULL`
- `amount numeric NOT NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`
- unique constraint `monthly_budgets_user_id_month_key` on `(user_id, month)`

## Existing RLS policies

All policies are permissive and apply to the `authenticated` role.

### `public.expenses`

- `Users can delete their own expenses`: `DELETE`, `USING (auth.uid() = user_id)`
- `Users can insert their own expenses`: `INSERT`, `WITH CHECK (auth.uid() = user_id)`
- `Users can update their own expenses`: `UPDATE`, `USING (auth.uid() = user_id)`, `WITH CHECK (auth.uid() = user_id)`
- `Users can view their own expenses`: `SELECT`, `USING (auth.uid() = user_id)`

### `public.monthly_budgets`

- `Users can delete their own budgets`: `DELETE`, `USING (auth.uid() = user_id)`
- `Users can insert their own budgets`: `INSERT`, `WITH CHECK (auth.uid() = user_id)`
- `Users can update their own budgets`: `UPDATE`, `USING (auth.uid() = user_id)`, `WITH CHECK (auth.uid() = user_id)`
- `Users can view their own budgets`: `SELECT`, `USING (auth.uid() = user_id)`

### `public.recurring_expenses`

- `Users can delete their own recurring expenses`: `DELETE`, `USING (auth.uid() = user_id)`
- `Users can insert their own recurring expenses`: `INSERT`, `WITH CHECK (auth.uid() = user_id)`
- `Users can update their own recurring expenses`: `UPDATE`, `USING (auth.uid() = user_id)`, `WITH CHECK (auth.uid() = user_id)`
- `Users can view their own recurring expenses`: `SELECT`, `USING (auth.uid() = user_id)`

## Deliberately unverified details

The captured metadata confirmed foreign-key names and that the two check
constraints exist, but did not expose the FK `ON DELETE` actions or check
expressions. The migration therefore states no `ON DELETE` clause and does not
create either check constraint. It also does not claim numeric precision/scale,
additional indexes, or any database behavior not confirmed by the inspection.

Before using the migration to recreate production, obtain and review the exact
live FK actions and check expressions, then add them in a separate reviewed
migration.
