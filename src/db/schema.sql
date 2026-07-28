-- products: owned by Product module
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL
);

-- inventory: owned by Inventory module
CREATE TABLE IF NOT EXISTS inventory (
  product_id TEXT PRIMARY KEY REFERENCES products(id),
  total INTEGER NOT NULL,
  reserved INTEGER NOT NULL DEFAULT 0,
  CHECK (reserved >= 0),
  CHECK (reserved <= total)
);

-- reservations: owned by Inventory module
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('RESERVED','CONFIRMED','RELEASED','EXPIRED')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON reservations(order_id);

-- orders: owned by Order module
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','FAILED')),
  failure_reason TEXT,
  total_amount INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- order_items: owned by Order module
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  line_status TEXT NOT NULL CHECK (line_status IN ('CONFIRMED','RESERVED_THEN_RELEASED','FAILED','NOT_ATTEMPTED')),
  reservation_id TEXT REFERENCES reservations(id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
