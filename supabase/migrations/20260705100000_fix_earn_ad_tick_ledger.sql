-- Fix earn_ad_tick(): it never inserted a credit_ledger row, so the 90/min
-- combined rate cap (which sums credit_ledger rows) only ever counted
-- earn_video entries. Calling earn_ad_tick() directly and repeatedly (e.g.
-- from the browser console, bypassing the 30s client-side timer) had no
-- server-side ceiling at all — an unlimited coin farm. This re-creates the
-- function with the missing ledger insert, matching earn_video_ad()'s
-- pattern, and keeps the already-decided 5-coin grant amount.

create or replace function public.earn_ad_tick()
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
