# AI Usage

## Tools I used

- **Claude Code:** my main implementation assistant. After deciding the
  approach, I used it to draft and apply changes across the migrations,
  database functions, TypeScript, tests, and UI.
- **ChatGPT:** my main learning and review channel. I used it to understand
  unfamiliar parts of Supabase, Server Actions, and PostgreSQL, and to review
  or question Claude's proposed changes.

## What I used AI for

This was my first time building a solution with Supabase and Next.js Server
Actions. I mainly used ChatGPT to learn how the unfamiliar parts worked,
including the local Supabase setup, PostgreSQL functions, generated database
types, the `.rpc()` boundary, Server Actions, and the server-only Supabase
client.

AI helped me compare possible approaches, but I made the final decisions on the
architecture, scope, and booking rules. Claude Code then helped implement them.
As the project progressed, I reviewed the changes, asked follow-up questions
when something was unclear, and adjusted or rejected parts that did not match
the requirements.

## Where AI helped me move faster

The biggest time saving was learning and implementing the PostgreSQL locking
code. I had not previously implemented a concurrent booking flow or written a
`plpgsql` function using `SELECT ... FOR UPDATE`, `RAISE EXCEPTION` for
unexpected state changes, and a restricted `search_path`.

ChatGPT helped me understand how PostgreSQL handled the same problem, while
Claude Code helped turn that approach into the database function. I could then
review how the lock and recount worked and focus on verifying whether the
implementation actually prevented overbooking. This also helped me get familiar
with Supabase generated types and calling database functions through `.rpc()`
without spending a large part of the exercise learning the API from scratch.

## Where I corrected or rejected AI output

One important decision was whether a seat should be held when the user reached
checkout. AI initially framed seat holds as a worse design, but I disagreed. A
short hold with a countdown could provide better user experience in a real
product. I left it out because it would change the flow required by the brief,
so pending bookings reserve nothing and capacity is decided atomically at
confirmation.

I also caught generated output that did not match the application, including
contradictory seat labels in the UI and documentation that referenced a removed
`age` column and an incorrect migration filename. I corrected these by manually
testing the UI and checking the documentation against the final schema and
repository.

## What I would change about my AI workflow next time

I spent too long reviewing the plan before running the first migration. Some of
those discussions were useful, but several rounds were spent on choices that
were easy to change, such as integer versus UUID keys and text constraints
versus enums.

Next time I would timebox the design discussion, build the schema and concurrency
test earlier, and use failures from the running system to guide the next review.
For example, the first local run exposed a `service_role` permission issue that
both AI reviews had missed. Running the code earlier would have found it sooner.

I would still use a second AI tool for review, but I would give it smaller,
specific questions instead of repeatedly asking for a full design review.

## How I verified the final implementation

I did not treat AI review as proof that the implementation was correct. I used:

- **Automated tests:** 20 integration tests against local PostgreSQL with no
  database mocks. They cover the last-seat race, duplicate bookings, payment
  failure, and roster behaviour.
- **Repeated concurrency testing:** the last-seat race runs 20 times with a
  fresh class each time. Every run must finish with one winner, four confirmed
  students, and a `voided` payment attempt for the losing booking.
- **A negative control:** I temporarily removed the class-row `FOR UPDATE` and
  reran the race test. It failed with two confirmed results and five students in
  a class with capacity four. Restoring the lock returned the suite to 20
  passing tests.
- **Manual UI testing:** I walked through the two-tab race, duplicate redirect,
  payment failure and retry, full-class state, roster page, and roster JSON in
  the browser. During these checks, I fixed UI behaviour bugs and adjusted the
  wording and feedback where the next action or booking result could be
  confusing.
