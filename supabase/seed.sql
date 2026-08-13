-- Demo data. Run by `supabase db reset` locally, and re-runnable by hand
-- against a hosted project by pasting this file into the SQL Editor.
--
-- Insert order is load-bearing: the README links to /bookings/4 and
-- /bookings/5, so do not reorder without updating it.

-- WARNING: deletes every row in these tables. `restart identity` resets the
-- sequences so IDs start from 1 again -- without it a re-seed produces
-- bookings 12..22 and the README's links point at nothing.
truncate
  public.payment_attempts,
  public.bookings,
  public.students,
  public.trial_classes,
  public.parents
  restart identity cascade;


-- id 1..4
insert into public.parents (name, email) values
  ('Parent 1', 'parent1@example.com'),
  ('Parent 2', 'parent2@example.com'),
  ('Parent 3', 'parent3@example.com'),
  ('Parent 4', 'parent4@example.com');


-- id 1..9. The digit is the parent, the letter distinguishes siblings.
-- Parent 1 has three children and is the default selection on first load.
-- 1C, 2B and 3B have no bookings, so there is always a clean child available.
insert into public.students (parent_id, name) values
  (1, 'Child 1A'),   -- 1  racer A
  (1, 'Child 1B'),   -- 2  duplicate-booking target
  (1, 'Child 1C'),   -- 3
  (2, 'Child 2A'),   -- 4
  (2, 'Child 2B'),   -- 5
  (3, 'Child 3A'),   -- 6  payment-failure case
  (3, 'Child 3B'),   -- 7
  (4, 'Child 4A'),   -- 8
  (4, 'Child 4B');   -- 9  racer B


-- id 1..3. Relative dates, so the demo never shows classes in the past.
insert into public.trial_classes (name, starts_at, capacity) values
  ('Junior Science Trial', now() + interval '10 days',         4),  -- 3/4, race target
  ('Math Explorers Trial', now() + interval '11 days 4 hours', 4),  -- 1/4, seats free
  ('Coding Basics Trial',  now() + interval '17 days',         4);  -- 4/4, full


-- id 1..11. Confirmed rows must set confirmed_at or confirmed_iff_timestamp
-- rejects them.
insert into public.bookings (student_id, trial_class_id, status, confirmed_at) values
  (4, 1, 'confirmed',       now() - interval '3 days'),   -- 1  Child 2A
  (6, 1, 'confirmed',       now() - interval '3 days'),   -- 2  Child 3A
  (8, 1, 'confirmed',       now() - interval '2 days'),   -- 3  Child 4A

  -- The last-seat race: two pending bookings, different families, one seat.
  -- The only pending bookings in the seed -- consuming either destroys it.
  (1, 1, 'pending_payment', null),                        -- 4  Child 1A (Parent 1)
  (9, 1, 'pending_payment', null),                        -- 5  Child 4B (Parent 4)

  -- Selecting Child 1B + Math Explorers again hits the duplicate path.
  (2, 2, 'confirmed',       now() - interval '1 day'),    -- 6  Child 1B

  -- Absent from the Math Explorers roster: static proof a failed payment never
  -- reaches it. Child 3A can also rebook, since payment_failed is unindexed.
  (6, 2, 'payment_failed',  null),                        -- 7  Child 3A

  (4, 3, 'confirmed',       now() - interval '5 days'),   -- 8  Child 2A
  (6, 3, 'confirmed',       now() - interval '5 days'),   -- 9  Child 3A
  (8, 3, 'confirmed',       now() - interval '4 days'),   -- 10 Child 4A
  (2, 3, 'confirmed',       now() - interval '4 days');   -- 11 Child 1B


-- Bookings 4 and 5 have no attempt -- nobody has pressed Pay on them.
insert into public.payment_attempts (booking_id, status, reason) values
  (1,  'captured', null),
  (2,  'captured', null),
  (3,  'captured', null),
  (6,  'captured', null),
  (7,  'failed',   'card_declined'),
  (8,  'captured', null),
  (9,  'captured', null),
  (10, 'captured', null),
  (11, 'captured', null);
