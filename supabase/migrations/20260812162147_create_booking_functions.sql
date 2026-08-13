-- Booking state transitions.
--
-- These live in the database because supabase-js talks to PostgREST over HTTP:
-- each call is a separate request, so several cannot share one transaction.
--
-- security invoker: only service_role may execute these, and service_role
-- already bypasses RLS, so there is nothing for `definer` to elevate.
-- search_path = '': every object must be schema-qualified, which closes the
-- hijack where an attacker-created `bookings` elsewhere is found first.


-- ===========================================================================
-- confirm_booking(booking_id) -> text
--   'confirmed' | 'class_full' | 'already_confirmed' | 'invalid_status'
--   | 'not_found'
-- ===========================================================================
create or replace function public.confirm_booking(p_booking_id integer)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status    text;
  v_class_id  integer;
  v_capacity  integer;
  v_confirmed bigint;   -- count() returns bigint
begin

  -- Lock the booking: two concurrent calls for the same one queue here rather
  -- than interleaving.
  select b.status, b.trial_class_id
    into v_status, v_class_id
    from public.bookings b
   where b.id = p_booking_id
     for update;

  if not found then
    return 'not_found';
  end if;

  -- The lock above serialises; this guard is what makes a repeat call a no-op.
  -- Both are needed -- a lock alone would still allow a second charge.
  if v_status = 'confirmed' then
    return 'already_confirmed';
  end if;

  if v_status <> 'pending_payment' then
    return 'invalid_status';
  end if;

  -- The serialisation point. Every confirmation for this class queues here;
  -- other classes take different row locks and never block.
  --
  -- Lock order is always booking -> class. Anything that takes both must keep
  -- that order or it can deadlock against this.
  select c.capacity
    into v_capacity
    from public.trial_classes c
   where c.id = v_class_id
     for update;

  -- Recounting AFTER the lock is the whole mechanism. Any count read earlier --
  -- including the one on the page the parent is looking at -- is stale, and
  -- confirming against it is how a class ends up with five students.
  select count(*)
    into v_confirmed
    from public.bookings b
   where b.trial_class_id = v_class_id
     and b.status = 'confirmed';

  if v_confirmed < v_capacity then

    -- The status predicate is redundant under the row lock, kept as defence in
    -- depth. confirmed_at is mandatory -- confirmed_iff_timestamp enforces it.
    update public.bookings
       set status       = 'confirmed',
           confirmed_at = now(),
           updated_at   = now()
     where id = p_booking_id
       and status = 'pending_payment';

    -- Assertion, not error handling: we hold the lock and checked the status,
    -- so zero rows means reality contradicts that. An unchecked guard would be
    -- worse than none -- it would still write the payment row below.
    if not found then
      raise exception 'confirm_booking: pending booking % was not updated', p_booking_id;
    end if;

    -- No reason -- reason_required_unless_captured rejects a captured row with
    -- one.
    insert into public.payment_attempts (booking_id, status)
    values (p_booking_id, 'captured');

    return 'confirmed';
  end if;

  -- Class filled while this parent was paying. confirmed_at stays null, and
  -- the payment is voided rather than captured -- released, not refunded.
  update public.bookings
     set status              = 'cancelled',
         cancellation_reason = 'class_full',
         updated_at          = now()
   where id = p_booking_id
     and status = 'pending_payment';

  if not found then
    raise exception 'confirm_booking: pending booking % was not cancelled', p_booking_id;
  end if;

  insert into public.payment_attempts (booking_id, status, reason)
  values (p_booking_id, 'voided', 'class_full');

  return 'class_full';
end;
$$;


-- ===========================================================================
-- fail_booking_payment(booking_id) -> text
--   'payment_failed' | 'invalid_status' | 'not_found'
--
-- No class lock, deliberately: a decline cannot consume a seat, and taking the
-- lock would block every other parent's confirmation for no reason.
-- ===========================================================================
create or replace function public.fail_booking_payment(p_booking_id integer)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
begin

  select b.status
    into v_status
    from public.bookings b
   where b.id = p_booking_id
     for update;

  if not found then
    return 'not_found';
  end if;

  if v_status <> 'pending_payment' then
    return 'invalid_status';
  end if;

  -- Update, assert, then insert -- never an audit row for a state change that
  -- did not happen.
  update public.bookings
     set status     = 'payment_failed',
         updated_at = now()
   where id = p_booking_id
     and status = 'pending_payment';

  if not found then
    raise exception 'fail_booking_payment: pending booking % was not updated', p_booking_id;
  end if;

  insert into public.payment_attempts (booking_id, status, reason)
  values (p_booking_id, 'failed', 'card_declined');

  return 'payment_failed';
end;
$$;


-- RLS protects tables, not functions, and Postgres grants EXECUTE to PUBLIC by
-- default -- so these revokes do real work. Both functions are SECURITY
-- INVOKER, so an anon caller's reads would already be blocked by RLS; revoking
-- keeps these mutation RPCs off the public API surface so a future permissive
-- policy cannot quietly expose them.
revoke all on function public.confirm_booking(integer)
  from public, anon, authenticated;
grant execute on function public.confirm_booking(integer)
  to service_role;

revoke all on function public.fail_booking_payment(integer)
  from public, anon, authenticated;
grant execute on function public.fail_booking_payment(integer)
  to service_role;
