-- NexiTool.pro coin/credit economy — Phase 1 infrastructure
-- See repo MEMORY.md for the full product/architecture discussion this implements.

create extension if not exists pgcrypto;

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    credit_balance integer not null default 0 check (credit_balance >= 0),
    created_at timestamptz not null default now()
);

create table public.models (
    id text primary key,
    name text not null,
    type text not null check (type in ('image', 'video', 'text', 'voice')),
    cost integer not null check (cost > 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.credit_ledger (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    amount integer not null check (amount <> 0),
    type text not null check (type in ('earn_ad', 'earn_video', 'earn_coupon', 'spend_tool')),
    model_id text references public.models (id),
    meta jsonb not null default '{}'::jsonb,
    balance_after integer not null,
    created_at timestamptz not null default now()
);

create index credit_ledger_user_type_created_idx
    on public.credit_ledger (user_id, type, created_at);

create table public.coupons (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    credit_value integer not null check (credit_value > 0),
    max_redemptions integer not null default 1 check (max_redemptions > 0),
    redemptions_used integer not null default 0 check (redemptions_used <= max_redemptions),
    expires_at timestamptz,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.coupon_redemptions (
    id bigint generated always as identity primary key,
    coupon_id uuid not null references public.coupons (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    redeemed_at timestamptz not null default now(),
    unique (coupon_id, user_id)
);

-- ============================================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.profiles (id, credit_balance) values (new.id, 0);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.models enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "select own profile" on public.profiles
    for select using (id = auth.uid());

create policy "select active models" on public.models
    for select using (is_active = true);

create policy "select own ledger" on public.credit_ledger
    for select using (user_id = auth.uid());

-- coupons: intentionally no SELECT policy at all — codes/values are only ever
-- read from inside the SECURITY DEFINER redeem_coupon() function below, never
-- directly by a client (even the redeeming user), to stop code-scraping.

create policy "select own redemptions" on public.coupon_redemptions
    for select using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies exist on any table above — every mutation
-- goes through a SECURITY DEFINER RPC function, never a direct client write.

revoke all on public.profiles from anon, authenticated;
revoke all on public.models from anon, authenticated;
revoke all on public.credit_ledger from anon, authenticated;
revoke all on public.coupons from anon, authenticated;
revoke all on public.coupon_redemptions from anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.models to anon, authenticated;
grant select on public.credit_ledger to authenticated;
grant select on public.coupon_redemptions to authenticated;

-- ============================================================================
-- RPC functions
--
-- Every function derives identity ONLY from auth.uid() (the verified JWT) —
-- never from a client-supplied parameter. Every function returns jsonb
-- including the updated balance so the client never needs a separate re-fetch.
-- "for update" row locks make the check-then-write atomic and race-free.
-- ============================================================================

create function public.earn_ad_tick()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_balance integer;
    v_recent integer;
    v_amount integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select credit_balance into v_balance from public.profiles where id = v_uid for update;

    select coalesce(sum(amount), 0) into v_recent
    from public.credit_ledger
    where user_id = v_uid
      and type in ('earn_ad', 'earn_video')
      and created_at > now() - interval '1 minute';

    v_amount := least(8, greatest(90 - v_recent, 0));

    if v_amount > 0 then
        v_balance := v_balance + v_amount;
        update public.profiles set credit_balance = v_balance where id = v_uid;
        insert into public.credit_ledger (user_id, amount, type, meta, balance_after)
        values (v_uid, v_amount, 'earn_ad', jsonb_build_object('nominal', 8), v_balance);
    end if;

    return jsonb_build_object('balance', v_balance, 'granted', v_amount, 'capped', v_amount < 8);
end;
$$;

create function public.earn_video_ad()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_balance integer;
    v_recent integer;
    v_amount integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select credit_balance into v_balance from public.profiles where id = v_uid for update;

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

create function public.spend_credit(p_model_id text)
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
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select cost, is_active into v_cost, v_active from public.models where id = p_model_id;

    if v_cost is null or not v_active then
        return jsonb_build_object('success', false, 'reason', 'invalid_model');
    end if;

    select credit_balance into v_balance from public.profiles where id = v_uid for update;

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

create function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_coupon_id uuid;
    v_credit_value integer;
    v_max integer;
    v_used integer;
    v_expires timestamptz;
    v_active boolean;
    v_balance integer;
begin
    if v_uid is null then
        raise exception 'not authenticated';
    end if;

    select id, credit_value, max_redemptions, redemptions_used, expires_at, is_active
    into v_coupon_id, v_credit_value, v_max, v_used, v_expires, v_active
    from public.coupons
    where code = p_code
    for update;

    if v_coupon_id is null then
        return jsonb_build_object('success', false, 'reason', 'not_found');
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
    values (v_uid, v_credit_value, 'earn_coupon', jsonb_build_object('coupon_code', p_code), v_balance);

    return jsonb_build_object('success', true, 'balance', v_balance, 'granted', v_credit_value);
end;
$$;

grant execute on function public.earn_ad_tick() to authenticated;
grant execute on function public.earn_video_ad() to authenticated;
grant execute on function public.spend_credit(text) to authenticated;
grant execute on function public.redeem_coupon(text) to authenticated;
