-- Add an optional inactivity filter to admin_list_users, and surface
-- last_sign_in_at, so the admin can find "old/dormant" users to re-target
-- with a personal coupon (bulk multi-user personal coupons are handled
-- entirely client-side in the admin panel by calling admin_generate_coupon
-- once per selected user — no new RPC needed for that part).

create or replace function public.admin_list_users(
    p_limit integer default 50,
    p_offset integer default 0,
    p_inactive_days integer default null
)
returns table (
    id uuid,
    email text,
    credit_balance integer,
    is_blocked boolean,
    is_admin boolean,
    created_at timestamptz,
    last_sign_in_at timestamptz
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
    select u.id, u.email::text, p.credit_balance, p.is_blocked, p.is_admin, p.created_at, u.last_sign_in_at
    from auth.users u
    join public.profiles p on p.id = u.id
    where p_inactive_days is null
       or coalesce(u.last_sign_in_at, u.created_at) <= now() - (p_inactive_days || ' days')::interval
    order by p.created_at desc
    limit least(coalesce(p_limit, 50), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
