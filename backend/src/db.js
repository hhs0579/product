import crypto from 'node:crypto'
import pg from 'pg'

const {
  DATABASE_URL = 'postgres://product:product_dev@127.0.0.1:5433/product',
} = process.env

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function ensureSchema() {
  await query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS purchase_source TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
  `)
  await query(`
    ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sales'
  `)
  await query(`ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_name_key`)
  await query(`DROP INDEX IF EXISTS suppliers_name_key`)
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name_kind_idx
      ON suppliers (name, kind)
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS purchase_prices (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (supplier_id, product_id)
    )
  `)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_prices_supplier ON purchase_prices(supplier_id)
  `)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_prices_product ON purchase_prices(product_id)
  `)
  await query(`
    ALTER TABLE supply_prices
      ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
  `)
  await query(`
    UPDATE supply_prices sp
    SET shipping_fee = p.shipping_fee
    FROM products p
    WHERE p.id = sp.product_id
      AND sp.shipping_fee = 0
      AND p.shipping_fee > 0
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS product_options (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      extra_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (extra_price >= 0),
      UNIQUE (product_id, name)
    )
  `)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id)
  `)

  const leftovers = await query(`
    SELECT id, option FROM products
    WHERE TRIM(COALESCE(option, '')) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM product_options po WHERE po.product_id = products.id
      )
  `)
  for (const row of leftovers.rows) {
    await query(
      `INSERT INTO product_options (id, product_id, name, extra_price)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (product_id, name) DO NOTHING`,
      [`opt_${crypto.randomUUID().slice(0, 8)}`, row.id, String(row.option).trim()],
    )
  }

  await query(`ALTER TABLE supply_prices ADD COLUMN IF NOT EXISTS option_id TEXT`)
  await query(`ALTER TABLE supply_prices DROP CONSTRAINT IF EXISTS supply_prices_supplier_id_product_id_key`)
  await query(`DROP INDEX IF EXISTS supply_prices_supplier_id_product_id_key`)
  await query(`ALTER TABLE supply_prices DROP CONSTRAINT IF EXISTS supply_prices_option_id_fkey`)
  await query(`
    ALTER TABLE supply_prices
      ADD CONSTRAINT supply_prices_option_id_fkey
      FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE
  `)
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS supply_prices_supplier_product_option_idx
      ON supply_prices (supplier_id, product_id, COALESCE(option_id, ''))
  `)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_supply_prices_option ON supply_prices(option_id)
  `)

  const orphans = await query(`
    SELECT * FROM supply_prices
    WHERE option_id IS NULL
      AND EXISTS (
        SELECT 1 FROM product_options po WHERE po.product_id = supply_prices.product_id
      )
  `)
  for (const row of orphans.rows) {
    const options = await query(
      'SELECT id FROM product_options WHERE product_id = $1 ORDER BY name',
      [row.product_id],
    )
    for (const option of options.rows) {
      try {
        await query(
          `INSERT INTO supply_prices
            (id, supplier_id, product_id, option_id, supply_price, shipping_fee, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `sp_${crypto.randomUUID().slice(0, 8)}`,
            row.supplier_id,
            row.product_id,
            option.id,
            row.supply_price,
            row.shipping_fee,
            row.created_at,
            row.updated_at,
          ],
        )
      } catch (err) {
        if (err.code !== '23505') throw err
      }
    }
  }

  const missingBase = await query(`
    SELECT DISTINCT sp.supplier_id, sp.product_id
    FROM supply_prices sp
    WHERE sp.option_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM supply_prices base
        WHERE base.supplier_id = sp.supplier_id
          AND base.product_id = sp.product_id
          AND base.option_id IS NULL
      )
  `)
  for (const row of missingBase.rows) {
    const source = await query(
      `SELECT sp.*
       FROM supply_prices sp
       LEFT JOIN product_options po ON po.id = sp.option_id
       WHERE sp.supplier_id = $1 AND sp.product_id = $2
       ORDER BY COALESCE(po.extra_price, 0) ASC, sp.supply_price ASC
       LIMIT 1`,
      [row.supplier_id, row.product_id],
    )
    if (!source.rows[0]) continue
    try {
      await query(
        `INSERT INTO supply_prices
          (id, supplier_id, product_id, option_id, supply_price, shipping_fee, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)`,
        [
          `sp_${crypto.randomUUID().slice(0, 8)}`,
          row.supplier_id,
          row.product_id,
          source.rows[0].supply_price,
          source.rows[0].shipping_fee,
          source.rows[0].created_at,
          source.rows[0].updated_at,
        ],
      )
    } catch (err) {
      if (err.code !== '23505') throw err
    }
  }
}
