-- Fix: auth.users.email is varchar(255), but admin_* functions declared
-- "email text" in their RETURNS TABLE, causing Postgres error 42804
-- ("structure of query does not match function result type") at call time.
-- Cast u.email::text everywhere it is selected from auth.users.

create or replace function public.admin_search_user(p_email text)
returns table (
    id uuid,
    email text,
    credit_balance integer,
    is_blocked boolean,
    is_admin boolean,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    return query
    select u.id, u.email::text, p.credit_balance, p.is_blocked, p.is_admin, p.created_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.email ilike '%' || p_email || '%'
    order by p.created_at desc
    limit 20;
end;
$$;

create or replace function public.admin_list_users(p_limit integer default 50, p_offset integer default 0)
returns table (
    id uuid,
    email text,
    credit_balance integer,
    is_blocked boolean,
    is_admin boolean,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    return query
    select u.id, u.email::text, p.credit_balance, p.is_blocked, p.is_admin, p.created_at
    from auth.users u
    join public.profiles p on p.id = u.id
    order by p.created_at desc
    limit least(coalesce(p_limit, 50), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_top_spenders(p_limit integer default 20)
returns table (
    id uuid,
    email text,
    total_spent integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    return query
    select u.id, u.email::text, sum(-cl.amount)::integer as total_spent
    from public.credit_ledger cl
    join auth.users u on u.id = cl.user_id
    where cl.type = 'spend_tool'
    group by u.id, u.email
    order by total_spent desc
    limit least(coalesce(p_limit, 20), 200);
end;
$$;

create or replace function public.admin_list_coupons(p_limit integer default 100)
returns table (
    id uuid,
    code text,
    credit_value integer,
    redemptions_used integer,
    max_redemptions integer,
    restricted_to_email text,
    is_active boolean,
    expires_at timestamptz,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    return query
    select c.id, c.code, c.credit_value, c.redemptions_used, c.max_redemptions,
           u.email::text, c.is_active, c.expires_at, c.created_at
    from public.coupons c
    left join auth.users u on u.id = c.restricted_to_user_id
    order by c.created_at desc
    limit least(coalesce(p_limit, 100), 500);
end;
$$;
