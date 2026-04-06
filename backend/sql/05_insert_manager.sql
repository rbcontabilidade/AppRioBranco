-- Habilita a extensao de criptografia caso nao esteja
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $script$
DECLARE
    new_user_id uuid;
    v_email text;
    v_password text;
    v_role text;
    v_name text;
BEGIN
    new_user_id := gen_random_uuid();
    v_email     := 'manager@sistema.local';
    v_password  := 'manager123';
    v_role      := 'Gerente';
    v_name      := 'Manager';

    -- Verifica se o usuario ja existe para evitar erro
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE NOTICE 'O usuario % ja existe. Ignorando a criacao.', v_email;
        RETURN;
    END IF;

    -- 1. Cria o usuario na tabela auth.users do Supabase
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', v_name, 'role', v_role),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- 2. Insere a identidade — Supabase v2 exige o campo provider_id (NOT NULL)
    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        new_user_id,
        new_user_id,
        v_email,
        ('{"sub":"' || new_user_id::text || '","email":"' || v_email || '"}')::jsonb,
        'email',
        now(),
        now(),
        now()
    );

    -- 3. Insere diretamente na public.profiles
    INSERT INTO public.profiles (
        id,
        name,
        role
    )
    VALUES (
        new_user_id,
        v_name,
        v_role
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Usuario % criado com sucesso na auth.users e na public.profiles!', v_name;
END $script$;
