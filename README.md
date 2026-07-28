# Order Lifecycle — README

## Problem Understanding
This project implements an order lifecycle across three modules: Product, Inventory, and Order. It demonstrates reservation, confirmation, compensation, and persistence using SQLite.

## Scope
- Core: Product, Inventory, Order modules; place-order flow with reservation + confirm; idempotency; SQLite persistence; HTTP API.
- Stretch: concurrency safety and reservation TTL stored (no background expiry worker), in-process client seam for cross-process HTTP.

## User Flow
1. Client POSTs to `/orders` with `idempotency_key` and `items` (product_id, quantity).
2. Order service creates a `PENDING` order, reserves each line via Inventory, compensates on failure, confirms and decrements stock on success.

## Technical Approach
- Single-process Node.js + Express app written in TypeScript.
- SQLite (better-sqlite3) for persistence; DB schema in `src/db/schema.sql`.
- Idempotency enforced via `orders.idempotency_key` UNIQUE + idempotency read path.
- Reservation is atomic via SQL `UPDATE ... WHERE (total - reserved) >= ?`.
- Reservation TTLs are recorded (expires_at) but no expiry worker is included.

## How to Run (quick)
Prereqs: Node (16+), npm.

1. Install dependencies
```bash
npm install
```

2. Seed sample data (uses `seeds/products-inventory.json`):
```bash
npm run seed
```

3. Run in dev mode (auto-reload):
```bash
npm run dev
```

4. API endpoints
- `GET /health` — healthcheck
- `GET /products` and `GET /products/:id`
- `GET /inventory/:product_id` and `POST /inventory/:product_id/reserve`
- `POST /reservations/:id/confirm` and `POST /reservations/:id/release`
- `POST /orders` and `GET /orders/:id`

Environment variables:
- `DB_PATH` — path to SQLite file (default: `data.sqlite`)
- `SEED_PATH` — custom seed JSON path

## Tests
Run the test suite with:
```bash
npm test
```
Tests are in `tests/` and cover idempotency, compensation, and concurrency behaviors.

Additional smoke tests were performed using `./smoke-tests.sh`.

## Tradeoffs
- Single-process design simplifies testing and local development; an `inventoryClient` seam exists to swap in cross-process HTTP later.
- Reservation TTL is recorded but automatic expiry requires an additional worker/service which was omitted for brevity.

## Future Improvements
- Implement expiry worker to transition expired reservations and release stock.
- Replace `order/inventoryClient.ts` with an HTTP client and run services as separate processes.
- Add an outbox/event log for durable saga coordination and retries.

## Files of interest
- `src/app.ts` — app entry and router mounts
- `src/order/service.ts` — place-order state machine and compensation
- `src/inventory/service.ts` — reserve/confirm/release logic
- `src/inventory/repository.ts` — atomic SQL guard for reservation & confirm/decrement
- `src/db/schema.sql` — DB schema

