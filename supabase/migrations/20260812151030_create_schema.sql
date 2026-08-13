-- Trial booking — core schema.
--
-- This file cannot prevent overbooking; confirm_booking() owns that. What it
-- does own is duplicate prevention, which a unique index guarantees outright.

-- ---------------------------------------------------------------- parents ---
create table public.parents (
  id         integer generated always as identity primary key,
  name       text        not null,
  email      text        not null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- students ---
create table public.students (
  id         integer     generated always as identity primary key,
  parent_id  integer     not null references public.parents (id),
  name       text        not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------- trial_classes ---
create table public.trial_classes (
  id        integer generated always as identity primary key,
  name      text    not null,
  starts_at timestamptz not null,

  -- A column, not a hardcoded 4, so confirm_booking() never mentions the
  -- number. The upper bound encodes the brief's four-student cap; smaller
  -- trials stay expressible.
  capacity integer not null default 4
    constraint capacity_valid check (capacity between 1 and 4),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- bookings ---
create table public.bookings (
  id             integer generated always as identity primary key,

  -- These keep the student -> parent link valid but cannot verify that a
  -- SUBMITTED student belongs to a SUBMITTED parent. That check is in the
  -- backend.
  student_id     integer not null references public.students (id),
  trial_class_id integer not null references public.trial_classes (id),

  status text not null default 'pending_payment'
    constraint bookings_status_valid check (
      status in ('pending_payment', 'confirmed', 'payment_failed', 'cancelled')
    ),

  -- Only produced by losing the last-seat race.
  cancellation_reason text
    constraint cancellation_reason_valid check (
      cancellation_reason is null or cancellation_reason = 'class_full'
    ),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  confirmed_at timestamptz,

  -- Comparing two booleans with = reads as "these must agree". Without it both
  -- (confirmed + class_full) and (cancelled + null) would be storable.
  constraint cancelled_iff_reason check (
    (status = 'cancelled') = (cancellation_reason is not null)
  ),

  -- Holds only because 'confirmed' is terminal here. Adding cancellation of a
  -- confirmed booking would produce (cancelled + a timestamp) and this would
  -- have to go.
  constraint confirmed_iff_timestamp check (
    (status = 'confirmed') = (confirmed_at is not null)
  )
);

-- ------------------------------------------------------- payment_attempts ---
-- The audit trail that proves a parent who lost the race was never charged, so
-- every non-captured row must explain itself.
create table public.payment_attempts (
  id         integer not null generated always as identity primary key,
  booking_id integer not null references public.bookings (id),

  -- voided = authorisation released, never captured. Not a refund.
  status text not null
    constraint payment_status_valid check (status in ('captured', 'failed', 'voided')),

  -- Free text, not a CHECK list: provider decline codes are open-ended.
  reason text,

  created_at timestamptz not null default now(),

  constraint reason_required_unless_captured check (
    (status = 'captured' and reason is null)
    or (status in ('failed', 'voided') and reason is not null)
  )
);

-- ---------------------------------------------------------------- indexes ---

-- The duplicate-booking guarantee. Partial by design: payment_failed and
-- cancelled sit outside it, so a decline or a lost race does not lock a child
-- out. The backend pre-checks too, but that can lose a race -- this cannot.
create unique index one_active_booking_per_student_class
  on public.bookings (student_id, trial_class_id)
  where status in ('pending_payment', 'confirmed');

-- Supports the count inside confirm_booking(), which runs while the class row
-- is locked -- so its duration is how long competing confirmations stay
-- blocked.
create index confirmed_bookings_by_class
  on public.bookings (trial_class_id)
  where status = 'confirmed';

-- -------------------------------------------------------------------- RLS ---
-- Enabled with no policies: deny-all for anon and authenticated. All access is
-- server-side under the secret key, which bypasses RLS -- so a leaked
-- publishable key grants nothing. Per-parent policies need real auth first.
alter table public.parents          enable row level security;
alter table public.students         enable row level security;
alter table public.trial_classes    enable row level security;
alter table public.bookings         enable row level security;
alter table public.payment_attempts enable row level security;


-- ------------------------------------------------------------- privileges ---
-- Privileges and RLS are two separate gates and a role must pass both. Do not
-- rely on Supabase's default privileges here -- depending on CLI version, new
-- tables can reach service_role with no grants at all, surfacing as `42501:
-- permission denied` long after the schema looks correct.
--
-- DELETE is for the integration tests, which remove their own fixtures.
grant select, insert, update, delete on
  public.parents,
  public.students,
  public.trial_classes,
  public.bookings,
  public.payment_attempts
to service_role;

-- Redundant alongside deny-all RLS, but it means adding a policy later cannot
-- silently open table access as a side effect.
revoke all on
  public.parents,
  public.students,
  public.trial_classes,
  public.bookings,
  public.payment_attempts
from anon, authenticated;
