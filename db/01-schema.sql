CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'sales' CHECK (kind IN ('sales', 'purchase')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, kind)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
  option TEXT NOT NULL DEFAULT '',
  purchase_source TEXT NOT NULL DEFAULT '',
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  carton_quantity INTEGER NOT NULL DEFAULT 0 CHECK (carton_quantity >= 0),
  pallet_quantity INTEGER NOT NULL DEFAULT 0 CHECK (pallet_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_options (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  extra_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
  UNIQUE (product_id, name)
);

CREATE TABLE IF NOT EXISTS supply_prices (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_id TEXT REFERENCES product_options(id) ON DELETE CASCADE,
  supply_price NUMERIC(12, 2) NOT NULL CHECK (supply_price >= 0),
  shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_prices (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_supply_prices_supplier ON supply_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supply_prices_product ON supply_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_supply_prices_option ON supply_prices(option_id);
CREATE UNIQUE INDEX IF NOT EXISTS supply_prices_supplier_product_option_idx
  ON supply_prices (supplier_id, product_id, COALESCE(option_id, ''));
CREATE INDEX IF NOT EXISTS idx_purchase_prices_supplier ON purchase_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_prices_product ON purchase_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_kind ON suppliers(kind);
