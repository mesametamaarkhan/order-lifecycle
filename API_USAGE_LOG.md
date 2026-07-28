# AI Usage Log

AI (Claude) was used as a drafting aid throughout while I made the architecture,
data model, and API decisions; AI drafted code/reasoning against them, which
I then reviewed, tested, and corrected where needed.

## Design & API contract

| # | Decision | AI's role | My involvement |
|---|----------|-----------|------------------|
| 1 | Stack: Node/TS/Express/better-sqlite3 | Proposed & justified | Approved based on need for visible SQL (concurrency guard) |
| 2 | Inventory model: `total`/`reserved` split, not raw `available` | Proposed | Pushed back on the seed-file deviation, required justification before accepting; specified the mapping |
| 3 | Idempotency via DB unique constraint | Proposed | Confirmed reasoning (avoids check-then-insert race) |
| 4 | Atomic `UPDATE ... WHERE` concurrency guard | Proposed | Approved after confirming it sidesteps SQLite locking limits |
| 5 | Shared error shape + `line_status` enum | Drafted | Required per-line failure visibility; approved 4-value enum |

## Implementation

| # | Module | AI's role | What I reviewed / changed |
|---|--------|-----------|------------------------------|
| 6 | DB layer (schema, connection, seed) | Drafted DDL + seed loader | Verified seed mapping; **removed a FK on `order_items.product_id`** after tests exposed it broke the FAILED-line design; hardened `initSchema()` to drop tables before recreating, after the test runner was found retaining a stale schema |
| 7 | Product module | Drafted | Checked against contract, no changes needed |
| 8 | Inventory module | Drafted atomic reserve query + confirm/release | Verified idempotent no-op behavior on repeat confirm/release by test, not just by reading |
| 9 | Order module (orchestration + `inventoryClient` seam) | Drafted | **Caught a real bug**: missing-product handling threw *after* the order row was created, orphaning it in `PENDING`. Redirected to fail as an in-loop line failure instead |
| 10 | App wiring | Drafted | Confirmed error middleware ordering; added `/health` |
| 11 | Type-check + test run | Ran `tsc`, ran test suite, fixed surfaced issues | Reviewed each fix for correctness against the intended design |

## Two concrete corrections

**1. Orphaned PENDING order.** AI's first draft priced order lines (and could
throw on a missing product) *after* the order row was already inserted, so a
bad `product_id` left the order stuck in `PENDING` forever instead of
reaching `FAILED`. I traced the flow, caught it, and had it rewritten to
handle a missing product as a normal in-loop failure. Verified by
`order.compensation.test.ts`.

**2. FK silently breaking the failure path.** Running the test suite surfaced `order_items.product_id => products(id)` as a
hard FK. This rejected the exact FAILED-line insert that fix #1 relies on,
turning an intended `422` into an unhandled `500`. I isolated it with a
standalone repro script, confirmed the cause, and had the constraint removed
with a comment explaining why it's deliberately absent.

Both are fixed in the codebase and covered by passing tests (6/6 green), not
just described here.

## Maintaining the audit trail

This log was updated at each phase boundary (design => contracts => schema =>
implementation) as work happened, not reconstructed afterward. The entries
reflect what was actually checked, including real type-check and test runs,
not assumed outcomes. Kept at the granularity of one row per decision or
artifact, not per message.