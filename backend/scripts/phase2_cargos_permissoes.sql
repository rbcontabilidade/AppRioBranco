-- DB Migration Script for Phase 2: Harden cargos_permissoes safely
-- This is an idempotent script that adds missing standard columns and safe constraints
-- without breaking production or deleting existing data.

-- 1. Add 'status' to roles if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='cargos_permissoes' AND column_name='status'
    ) THEN
        ALTER TABLE cargos_permissoes ADD COLUMN status BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Add 'created_at' if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='cargos_permissoes' AND column_name='created_at'
    ) THEN
        ALTER TABLE cargos_permissoes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Add 'updated_at' if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='cargos_permissoes' AND column_name='updated_at'
    ) THEN
        ALTER TABLE cargos_permissoes ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 4. Normalize slightly without breaking compatibility
UPDATE cargos_permissoes 
SET nome_cargo = TRIM(nome_cargo) 
WHERE nome_cargo IS NOT NULL AND nome_cargo != TRIM(nome_cargo);

-- 5. Add UNIQUE constraint to prevent duplicate role names if safe to do so
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cargos_permissoes_nome_cargo_key'
    ) THEN
        BEGIN
            -- Attempt to add the unique constraint.
            -- If the table already contains duplicates, this will throw an exception
            -- and the exception block will catch it, preventing the transaction from failing.
            ALTER TABLE cargos_permissoes ADD CONSTRAINT cargos_permissoes_nome_cargo_key UNIQUE (nome_cargo);
        EXCEPTION
            WHEN unique_violation THEN
                RAISE NOTICE 'UNIQUE constraint on nome_cargo was NOT added because duplicates already exist in production data. Please resolve duplicates manually.';
        END;
    END IF;
END $$;
