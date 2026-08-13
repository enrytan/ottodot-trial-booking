-- Seat availability, defined once so the booking page and the roster header
-- cannot drift apart.
--
-- A read model only. By the time a caller reads it the number is stale --
-- confirm_booking() recounts under a lock, and that is what prevents
-- overbooking.

create view public.trial_class_availability
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.starts_at,
  c.capacity,

  -- count() returns bigint; cast to keep 64-bit values away from JavaScript.
  count(b.id)::integer as confirmed_count,
  (c.capacity - count(b.id))::integer as available_seats

from public.trial_classes c

-- The status test must stay in the JOIN condition. In a WHERE clause it would
-- drop classes with zero confirmed bookings entirely -- no name, no capacity,
-- nothing to render. Here they NULL-extend and count(b.id) returns 0.
left join public.bookings b
  on b.trial_class_id = c.id
 and b.status = 'confirmed'

group by c.id, c.name, c.starts_at, c.capacity;


-- security_invoker means the view runs with the caller's permissions, so it
-- honours RLS instead of silently bypassing it.
revoke all on public.trial_class_availability from anon, authenticated;
grant select on public.trial_class_availability to service_role;
