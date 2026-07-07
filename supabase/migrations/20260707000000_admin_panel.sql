-- NexiTool.pro admin panel — schema additions + admin-only RPCs.
-- Admin panel itself lives in a separate private repo, run locally by the
-- site owner — it only ever talks to this project via these RPCs (never a
-- raw table write), gated by profiles.is_admin. See USER_GUIDE.md.

-- ============================================================================
-- Schema additions
-- ============================================================================

alter table public.profiles add column is_admin boolean not null default false;
alter table public.profiles add column is_blocked boolean not null default false;

-- A coupon can optionally be locked to one specific user (a "personal" coupon).
-- Null means anyone can redeem it — but every coupon is still single-use
-- overall (see constraint below), so a "public" coupon just means "whoever
-- redeems it first," not "many people can each redeem it."
alter table public.coupons add column restricted_to_user_id uuid references public.profiles (id) on delete cascade;

-- Hard caps requested by the site owner: no coupon can ever be worth more
-- than 1000 coins, and no coupon can ever allow more than one redemption
-- total (already the default, now enforced so it can never be raised).
alter table public.coupons add constraint coupons_credit_value_max check (credit_value <= 1000);
alter table public.coupons add constraint coupons_max_redemptions_single check (max_redemptions = 1);

-- ============================================================================
-- Grant the welcome bonus + is_admin flag at signup
--
-- The one designated admin (identified by email) is auto-flagged the moment
-- their account is created, regardless of whether they sign up before or
-- after this migration runs — no manual follow-up SQL needed.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.profiles (id, credit_balance, is_admin)
    values (new.id, 20, (new.email = 'pratiksolanki0703@gmail.com'));
    insert into public.credit_ledger (user_id, amount, type, balance_after)
        values (new.id, 20, 'earn_welcome', 20);
    return new;
end;
$$;

-- ============================================================================
-- Enforce is_blocked in every earning/spending RPC
-- ============================================================================

create or replace function public.earn_ad_tick()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_balance integer;
    v_blocked boolean;
    v_recent integer;
    v_amount integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select credit_balance, is_blocked into v_balance, v_blocked from public.profiles where id = v_uid for update;

    if v_blocked then
        return jsonb_build_object('balance', v_balance, 'granted', 0, 'capped', false, 'blocked', true);
    end if;

    select coalesce(sum(amount), 0) into v_recent
    from public.credit_ledger
    where user_id = v_uid
      and type in ('earn_ad', 'earn_video')
      and created_at > now() - interval '1 minute';

    v_amount := least(5, greatest(90 - v_recent, 0));

    if v_amount > 0 then
        v_balance := v_balance + v_amount;
        update public.profiles set credit_balance = v_balance where id = v_uid;
        insert into public.credit_ledger (user_id, amount, type, meta, balance_after)
        values (v_uid, v_amount, 'earn_ad', '{}'::jsonb, v_balance);
    end if;

    return jsonb_build_object('balance', v_balance, 'granted', v_amount, 'capped', v_amount < 5);
end;
$$;

create or replace function public.earn_video_ad()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_balance integer;
    v_blocked boolean;
    v_recent integer;
    v_amount integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select credit_balance, is_blocked into v_balance, v_blocked from public.profiles where id = v_uid for update;

    if v_blocked then
        return jsonb_build_object('balance', v_balance, 'granted', 0, 'capped', false, 'blocked', true);
    end if;

    select coalesce(sum(amount), 0) into v_recent
    from public.credit_ledger
    where user_id = v_uid
      and type in ('earn_ad', 'earn_video')
      and created_at > now() - interval '1 minute';

    v_amount := least(30, greatest(90 - v_recent, 0));

    if v_amount > 0 then
        v_balance := v_balance + v_amount;
        update public.profiles set credit_balance = v_balance where id = v_uid;
        insert into public.credit_ledger (user_id, amount, type, meta, balance_after)
        values (v_uid, v_amount, 'earn_video', '{}'::jsonb, v_balance);
    end if;

    return jsonb_build_object('balance', v_balance, 'granted', v_amount, 'capped', v_amount < 30);
end;
$$;

create or replace function public.spend_credit(p_model_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_cost integer;
    v_active boolean;
    v_balance integer;
    v_blocked boolean;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select cost, is_active into v_cost, v_active from public.models where id = p_model_id;

    if v_cost is null or not v_active then
        return jsonb_build_object('success', false, 'reason', 'invalid_model');
    end if;

    select credit_balance, is_blocked into v_balance, v_blocked from public.profiles where id = v_uid for update;

    if v_blocked then
        return jsonb_build_object('success', false, 'reason', 'user_blocked');
    end if;

    if v_balance < v_cost then
        return jsonb_build_object('success', false, 'reason', 'insufficient_balance', 'balance', v_balance);
    end if;

    v_balance := v_balance - v_cost;
    update public.profiles set credit_balance = v_balance where id = v_uid;
    insert into public.credit_ledger (user_id, amount, type, model_id, balance_after)
    values (v_uid, -v_cost, 'spend_tool', p_model_id, v_balance);

    return jsonb_build_object('success', true, 'balance', v_balance, 'spent', v_cost);
end;
$$;

-- ============================================================================
-- redeem_coupon: adds is_blocked check, personal-coupon targeting, and a
-- per-user daily cap of 2 redemptions (calendar day, UTC).
-- ============================================================================

create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_blocked boolean;
    v_today_count integer;
    v_coupon_id uuid;
    v_credit_value integer;
    v_max integer;
    v_used integer;
    v_expires timestamptz;
    v_active boolean;
    v_restricted_to uuid;
    v_balance integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select is_blocked into v_blocked from public.profiles where id = v_uid;
    if v_blocked then
        return jsonb_build_object('success', false, 'reason', 'user_blocked');
    end if;

    select count(*) into v_today_count
    from public.coupon_redemptions
    where user_id = v_uid
      and redeemed_at >= date_trunc('day', now());

    if v_today_count >= 2 then
        return jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
    end if;

    select id, credit_value, max_redemptions, redemptions_used, expires_at, is_active, restricted_to_user_id
    into v_coupon_id, v_credit_value, v_max, v_used, v_expires, v_active, v_restricted_to
    from public.coupons
    where upper(code) = upper(p_code)
    for update;

    if v_coupon_id is null then
        return jsonb_build_object('success', false, 'reason', 'not_found');
    end if;

    if v_restricted_to is not null and v_restricted_to <> v_uid then
        return jsonb_build_object('success', false, 'reason', 'not_eligible');
    end if;

    if not v_active or (v_expires is not null and v_expires < now()) then
        return jsonb_build_object('success', false, 'reason', 'expired_or_inactive');
    end if;

    if v_used >= v_max then
        return jsonb_build_object('success', false, 'reason', 'exhausted');
    end if;

    begin
        insert into public.coupon_redemptions (coupon_id, user_id) values (v_coupon_id, v_uid);
    exception when unique_violation then
        return jsonb_build_object('success', false, 'reason', 'already_redeemed');
    end;

    update public.coupons set redemptions_used = redemptions_used + 1 where id = v_coupon_id;

    select credit_balance into v_balance from public.profiles where id = v_uid for update;
    v_balance := v_balance + v_credit_value;
    update public.profiles set credit_balance = v_balance where id = v_uid;
    insert into public.credit_ledger (user_id, amount, type, meta, balance_after)
    values (v_uid, v_credit_value, 'earn_coupon', jsonb_build_object('coupon_code', upper(p_code)), v_balance);

    return jsonb_build_object('success', true, 'balance', v_balance, 'granted', v_credit_value);
end;
$$;

-- ============================================================================
-- Admin RPCs — every one checks is_current_admin() first. Client role grants
-- are broad (matches the rest of this schema's pattern); the real gate is the
-- internal check, not the grant.
-- ============================================================================

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

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
    select u.id, u.email, p.credit_balance, p.is_blocked, p.is_admin, p.created_at
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
    select u.id, u.email, p.credit_balance, p.is_blocked, p.is_admin, p.created_at
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
    select u.id, u.email, sum(-cl.amount)::integer as total_spent
    from public.credit_ledger cl
    join auth.users u on u.id = cl.user_id
    where cl.type = 'spend_tool'
    group by u.id, u.email
    order by total_spent desc
    limit least(coalesce(p_limit, 20), 200);
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_total_users integer;
    v_total_coins bigint;
    v_signups_today integer;
    v_signups_7d integer;
    v_signups_30d integer;
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    select count(*) into v_total_users from auth.users;
    select coalesce(sum(credit_balance), 0) into v_total_coins from public.profiles;
    select count(*) into v_signups_today from auth.users where created_at >= date_trunc('day', now());
    select count(*) into v_signups_7d from auth.users where created_at >= now() - interval '7 days';
    select count(*) into v_signups_30d from auth.users where created_at >= now() - interval '30 days';

    return jsonb_build_object(
        'total_users', v_total_users,
        'total_coins_in_circulation', v_total_coins,
        'signups_today', v_signups_today,
        'signups_last_7_days', v_signups_7d,
        'signups_last_30_days', v_signups_30d
    );
end;
$$;

create or replace function public.admin_set_blocked(p_user_id uuid, p_blocked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    if p_user_id = auth.uid() then
        raise exception 'cannot block yourself';
    end if;

    update public.profiles set is_blocked = p_blocked where id = p_user_id;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'user_not_found');
    end if;

    return jsonb_build_object('success', true, 'user_id', p_user_id, 'is_blocked', p_blocked);
end;
$$;

create or replace function public.admin_generate_coupon(
    p_code text,
    p_value integer,
    p_expires_at timestamptz default null,
    p_target_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_code text := upper(trim(coalesce(p_code, '')));
begin
    if not public.is_current_admin() then
        raise exception 'not authorized';
    end if;

    if v_code = '' then
        return jsonb_build_object('success', false, 'reason', 'invalid_code');
    end if;

    if p_value is null or p_value <= 0 or p_value > 1000 then
        return jsonb_build_object('success', false, 'reason', 'invalid_value');
    end if;

    begin
        insert into public.coupons (code, credit_value, max_redemptions, expires_at, restricted_to_user_id, is_active)
        values (v_code, p_value, 1, p_expires_at, p_target_user_id, true);
    exception when unique_violation then
        return jsonb_build_object('success', false, 'reason', 'code_already_exists');
    end;

    return jsonb_build_object('success', true, 'code', v_code);
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
           u.email, c.is_active, c.expires_at, c.created_at
    from public.coupons c
    left join auth.users u on u.id = c.restricted_to_user_id
    order by c.created_at desc
    limit least(coalesce(p_limit, 100), 500);
end;
$$;

grant execute on function public.is_current_admin() to authenticated;
grant execute on function public.admin_search_user(text) to authenticated;
grant execute on function public.admin_list_users(integer, integer) to authenticated;
grant execute on function public.admin_top_spenders(integer) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_generate_coupon(text, integer, timestamptz, uuid) to authenticated;
grant execute on function public.admin_list_coupons(integer) to authenticated;
