import crypto from 'node:crypto'
import {
  SAMPLE_PRODUCTS,
  SAMPLE_PURCHASE_PRICES,
  SAMPLE_SUPPLIERS,
  SAMPLE_SUPPLY_PRICES,
} from './sampleData.js'
import { query } from './db.js'

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function parseKind(kind) {
  return kind === 'purchase' ? 'purchase' : 'sales'
}

function kindLabel(kind) {
  return kind === 'purchase' ? '매입처' : '매출처'
}

function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    kind: parseKind(row.kind),
    created_at: row.created_at.toISOString(),
  }
}

function mapOption(row) {
  return {
    id: row.id,
    name: row.name,
    extra_price: Number(row.extra_price ?? 0),
  }
}

function mapProduct(row, options = []) {
  return {
    id: row.id,
    name: row.name,
    cost: Number(row.cost),
    shipping_fee: Number(row.shipping_fee ?? 0),
    carton_quantity: Number(row.carton_quantity),
    pallet_quantity: Number(row.pallet_quantity),
    options,
    created_at: row.created_at.toISOString(),
  }
}

function fail(message, status) {
  const error = new Error(message)
  error.status = status
  throw error
}

function parseOptions(input) {
  if (Array.isArray(input.options)) {
    const parsed = []
    const seen = new Set()
    for (const item of input.options) {
      const name = String(item?.name ?? '').trim()
      const extraRaw = item?.extra_price
      const extra = extraRaw === '' || extraRaw == null ? 0 : Number(extraRaw)
      if (!name && extra === 0) continue
      if (!name) fail('옵션명을 입력해 주세요.', 400)
      if (!Number.isFinite(extra) || extra < 0) {
        fail('옵션 추가금을 올바르게 입력해 주세요.', 400)
      }
      const key = name.toLowerCase()
      if (seen.has(key)) {
        fail('같은 상품에 동일한 옵션명을 중복으로 넣을 수 없습니다.', 400)
      }
      seen.add(key)
      const id = String(item?.id ?? '').trim()
      parsed.push({ id: id || undefined, name, extra_price: extra })
    }
    return parsed
  }

  const legacy = String(input.option ?? '').trim()
  return legacy ? [{ name: legacy, extra_price: 0 }] : []
}

function parseProductFields(input) {
  const name = String(input.name ?? '').trim()
  const purchaseSource = String(input.purchase_source ?? '').trim()
  const cost = Number(input.cost)
  const shippingFee = Number(input.shipping_fee)
  const carton = Number(input.carton_quantity)
  const pallet = Number(input.pallet_quantity)
  const options = parseOptions(input)
  const optionLabel = options.map((option) => option.name).join(', ')

  if (!name) fail('상품명을 입력해 주세요.', 400)
  if (!Number.isFinite(cost) || cost < 0) fail('원가를 올바르게 입력해 주세요.', 400)
  if (!Number.isFinite(shippingFee) || shippingFee < 0) {
    fail('택배비를 올바르게 입력해 주세요.', 400)
  }
  if (!Number.isFinite(carton) || carton < 0) fail('카톤 수량을 올바르게 입력해 주세요.', 400)
  if (!Number.isFinite(pallet) || pallet < 0) fail('파레트 수량을 올바르게 입력해 주세요.', 400)

  return { name, purchaseSource, cost, shippingFee, carton, pallet, options, optionLabel }
}

async function saveProductOptions(productId, options) {
  const existing = await query(
    'SELECT * FROM product_options WHERE product_id = $1',
    [productId],
  )
  const kept = new Set()

  for (const option of options) {
    const incomingId = String(option.id ?? '').trim()
    let match = incomingId
      ? existing.rows.find((row) => row.id === incomingId && !kept.has(row.id))
      : null
    if (!match) {
      match = existing.rows.find(
        (row) =>
          row.name.toLowerCase() === option.name.toLowerCase() && !kept.has(row.id),
      )
    }
    if (match) {
      await query(
        `UPDATE product_options SET name = $2, extra_price = $3 WHERE id = $1`,
        [match.id, option.name, option.extra_price],
      )
      kept.add(match.id)
    } else {
      const id = createId('opt')
      await query(
        `INSERT INTO product_options (id, product_id, name, extra_price)
         VALUES ($1, $2, $3, $4)`,
        [id, productId, option.name, option.extra_price],
      )
      kept.add(id)
    }
  }

  for (const row of existing.rows) {
    if (!kept.has(row.id)) {
      await query('DELETE FROM product_options WHERE id = $1', [row.id])
    }
  }
}

async function loadProduct(id) {
  const result = await query('SELECT * FROM products WHERE id = $1', [id])
  if (!result.rows[0]) return null
  const options = await query(
    'SELECT * FROM product_options WHERE product_id = $1 ORDER BY name',
    [id],
  )
  return mapProduct(result.rows[0], options.rows.map(mapOption))
}

function mapSupplyPrice(row) {
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    product_id: row.product_id,
    option_id: row.option_id ?? null,
    supply_price: Number(row.supply_price),
    shipping_fee: Number(row.shipping_fee ?? 0),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

function mapPurchasePrice(row) {
  return {
    id: row.id,
    supplier_id: row.supplier_id,
    product_id: row.product_id,
    purchase_price: Number(row.purchase_price),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

async function requireSupplierKind(id, expected) {
  const result = await query('SELECT * FROM suppliers WHERE id = $1', [id])
  if (!result.rows[0]) {
    const error = new Error(`${kindLabel(expected)}를 찾을 수 없습니다.`)
    error.status = 404
    throw error
  }
  if (parseKind(result.rows[0].kind) !== expected) {
    const error = new Error(`${kindLabel(expected)}만 선택할 수 있습니다.`)
    error.status = 400
    throw error
  }
  return result.rows[0]
}

export async function getAllData() {
  const [suppliers, products, supplyPrices, purchasePrices, options] = await Promise.all([
    query('SELECT * FROM suppliers ORDER BY name'),
    query('SELECT * FROM products ORDER BY name'),
    query('SELECT * FROM supply_prices ORDER BY created_at'),
    query('SELECT * FROM purchase_prices ORDER BY created_at'),
    query('SELECT * FROM product_options ORDER BY name'),
  ])

  const optionsByProduct = new Map()
  for (const row of options.rows) {
    const list = optionsByProduct.get(row.product_id) ?? []
    list.push(mapOption(row))
    optionsByProduct.set(row.product_id, list)
  }

  return {
    suppliers: suppliers.rows.map(mapSupplier),
    products: products.rows.map((row) =>
      mapProduct(row, optionsByProduct.get(row.id) ?? []),
    ),
    supply_prices: supplyPrices.rows.map(mapSupplyPrice),
    purchase_prices: purchasePrices.rows.map(mapPurchasePrice),
  }
}

export async function createSupplier(name, kind) {
  const trimmed = String(name ?? '').trim()
  const parsedKind = parseKind(kind)
  if (!trimmed) {
    const error = new Error('업체명을 입력해 주세요.')
    error.status = 400
    throw error
  }

  try {
    const id = createId(parsedKind === 'purchase' ? 'ven' : 'sup')
    const result = await query(
      `INSERT INTO suppliers (id, name, kind) VALUES ($1, $2, $3)
       RETURNING *`,
      [id, trimmed, parsedKind],
    )
    return mapSupplier(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error(`이미 등록된 ${kindLabel(parsedKind)}입니다.`)
      error.status = 409
      throw error
    }
    throw err
  }
}

export async function updateSupplier(id, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) {
    const error = new Error('업체명을 입력해 주세요.')
    error.status = 400
    throw error
  }

  try {
    const result = await query(
      `UPDATE suppliers SET name = $2 WHERE id = $1 RETURNING *`,
      [id, trimmed],
    )
    if (!result.rows[0]) {
      const error = new Error('업체를 찾을 수 없습니다.')
      error.status = 404
      throw error
    }
    return mapSupplier(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('이미 등록된 업체명입니다.')
      error.status = 409
      throw error
    }
    throw err
  }
}

export async function deleteSupplier(id) {
  const result = await query(`DELETE FROM suppliers WHERE id = $1 RETURNING id`, [id])
  if (!result.rows[0]) {
    const error = new Error('업체를 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
}

export async function createProduct(input) {
  const fields = parseProductFields(input)

  try {
    const id = createId('prd')
    await query(
      `INSERT INTO products
        (id, name, cost, option, purchase_source, shipping_fee, carton_quantity, pallet_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        fields.name,
        fields.cost,
        fields.optionLabel,
        fields.purchaseSource,
        fields.shippingFee,
        fields.carton,
        fields.pallet,
      ],
    )
    await saveProductOptions(id, fields.options)
    return loadProduct(id)
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('이미 등록된 상품명입니다.')
      error.status = 409
      throw error
    }
    throw err
  }
}

export async function updateProduct(id, input) {
  const fields = parseProductFields(input)

  try {
    const result = await query(
      `UPDATE products
       SET name = $2,
           cost = $3,
           option = $4,
           purchase_source = $5,
           shipping_fee = $6,
           carton_quantity = $7,
           pallet_quantity = $8
       WHERE id = $1
       RETURNING *`,
      [
        id,
        fields.name,
        fields.cost,
        fields.optionLabel,
        fields.purchaseSource,
        fields.shippingFee,
        fields.carton,
        fields.pallet,
      ],
    )
    if (!result.rows[0]) {
      const error = new Error('상품을 찾을 수 없습니다.')
      error.status = 404
      throw error
    }
    await saveProductOptions(id, fields.options)
    return loadProduct(id)
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('이미 등록된 상품명입니다.')
      error.status = 409
      throw error
    }
    throw err
  }
}

export async function deleteProduct(id) {
  const result = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id])
  if (!result.rows[0]) {
    const error = new Error('상품을 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
}

export async function upsertSupplyPrice(supplierId, productId, optionId, supplyPrice, shippingFee) {
  const price = Number(supplyPrice)
  const shipping = Number(shippingFee)
  const normalizedOptionId = String(optionId ?? '').trim() || null
  if (!supplierId || !productId) {
    const error = new Error('매출처와 상품을 선택해 주세요.')
    error.status = 400
    throw error
  }
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error('올바른 공급가를 입력해 주세요.')
    error.status = 400
    throw error
  }
  if (!Number.isFinite(shipping) || shipping < 0) {
    const error = new Error('택배비를 올바르게 입력해 주세요.')
    error.status = 400
    throw error
  }

  await requireSupplierKind(supplierId, 'sales')

  const product = await query('SELECT id FROM products WHERE id = $1', [productId])
  if (!product.rows[0]) {
    const error = new Error('상품을 찾을 수 없습니다.')
    error.status = 404
    throw error
  }

  const options = await query(
    'SELECT id FROM product_options WHERE product_id = $1',
    [productId],
  )
  if (normalizedOptionId && !options.rows.some((row) => row.id === normalizedOptionId)) {
    const error = new Error('해당 상품의 옵션이 아닙니다.')
    error.status = 400
    throw error
  }

  const existing = await query(
    `SELECT * FROM supply_prices
     WHERE supplier_id = $1 AND product_id = $2 AND option_id IS NOT DISTINCT FROM $3`,
    [supplierId, productId, normalizedOptionId],
  )

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE supply_prices
       SET supply_price = $2, shipping_fee = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.rows[0].id, price, shipping],
    )
    return { item: mapSupplyPrice(result.rows[0]), updated: true }
  }

  try {
    const id = createId('sp')
    const result = await query(
      `INSERT INTO supply_prices
        (id, supplier_id, product_id, option_id, supply_price, shipping_fee)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, supplierId, productId, normalizedOptionId, price, shipping],
    )
    return { item: mapSupplyPrice(result.rows[0]), updated: false }
  } catch (err) {
    if (err.code === '23503') {
      const error = new Error('업체, 상품 또는 옵션을 찾을 수 없습니다.')
      error.status = 404
      throw error
    }
    throw err
  }
}

export async function updateSupplyPrice(id, supplyPrice, shippingFee) {
  const price = Number(supplyPrice)
  const shipping = Number(shippingFee)
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error('올바른 공급가를 입력해 주세요.')
    error.status = 400
    throw error
  }
  if (!Number.isFinite(shipping) || shipping < 0) {
    const error = new Error('택배비를 올바르게 입력해 주세요.')
    error.status = 400
    throw error
  }

  const result = await query(
    `UPDATE supply_prices
     SET supply_price = $2, shipping_fee = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, price, shipping],
  )
  if (!result.rows[0]) {
    const error = new Error('공급가를 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
  return mapSupplyPrice(result.rows[0])
}

export async function deleteSupplyPrice(id) {
  const result = await query(
    `DELETE FROM supply_prices WHERE id = $1 RETURNING id`,
    [id],
  )
  if (!result.rows[0]) {
    const error = new Error('공급가를 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
}

export async function upsertPurchasePrice(supplierId, productId, purchasePrice) {
  const price = Number(purchasePrice)
  if (!supplierId || !productId) {
    const error = new Error('매입처와 상품을 선택해 주세요.')
    error.status = 400
    throw error
  }
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error('올바른 매입가를 입력해 주세요.')
    error.status = 400
    throw error
  }

  await requireSupplierKind(supplierId, 'purchase')

  const existing = await query(
    `SELECT * FROM purchase_prices
     WHERE supplier_id = $1 AND product_id = $2`,
    [supplierId, productId],
  )

  if (existing.rows[0]) {
    const result = await query(
      `UPDATE purchase_prices
       SET purchase_price = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.rows[0].id, price],
    )
    return { item: mapPurchasePrice(result.rows[0]), updated: true }
  }

  try {
    const id = createId('pp')
    const result = await query(
      `INSERT INTO purchase_prices
        (id, supplier_id, product_id, purchase_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, supplierId, productId, price],
    )
    return { item: mapPurchasePrice(result.rows[0]), updated: false }
  } catch (err) {
    if (err.code === '23503') {
      const error = new Error('매입처 또는 상품을 찾을 수 없습니다.')
      error.status = 404
      throw error
    }
    throw err
  }
}

export async function updatePurchasePrice(id, purchasePrice) {
  const price = Number(purchasePrice)
  if (!Number.isFinite(price) || price < 0) {
    const error = new Error('올바른 매입가를 입력해 주세요.')
    error.status = 400
    throw error
  }

  const result = await query(
    `UPDATE purchase_prices
     SET purchase_price = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, price],
  )
  if (!result.rows[0]) {
    const error = new Error('매입가를 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
  return mapPurchasePrice(result.rows[0])
}

export async function deletePurchasePrice(id) {
  const result = await query(
    `DELETE FROM purchase_prices WHERE id = $1 RETURNING id`,
    [id],
  )
  if (!result.rows[0]) {
    const error = new Error('매입가를 찾을 수 없습니다.')
    error.status = 404
    throw error
  }
}

export async function resetSampleData() {
  await query('TRUNCATE TABLE purchase_prices, supply_prices, product_options, products, suppliers CASCADE')

  for (const supplier of SAMPLE_SUPPLIERS) {
    await query(
      `INSERT INTO suppliers (id, name, kind, created_at) VALUES ($1, $2, $3, $4)`,
      [supplier.id, supplier.name, supplier.kind, daysAgo(supplier.daysAgo)],
    )
  }

  for (const product of SAMPLE_PRODUCTS) {
    const optionLabel = (product.options ?? []).map((option) => option.name).join(', ')
    await query(
      `INSERT INTO products
        (id, name, cost, option, shipping_fee, carton_quantity, pallet_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        product.id,
        product.name,
        product.cost,
        optionLabel,
        product.shipping_fee,
        product.carton_quantity,
        product.pallet_quantity,
        daysAgo(product.daysAgo),
      ],
    )
    for (const option of product.options ?? []) {
      await query(
        `INSERT INTO product_options (id, product_id, name, extra_price)
         VALUES ($1, $2, $3, $4)`,
        [option.id, product.id, option.name, option.extra_price],
      )
    }
  }

  for (const sp of SAMPLE_SUPPLY_PRICES) {
    await query(
      `INSERT INTO supply_prices
        (id, supplier_id, product_id, option_id, supply_price, shipping_fee, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sp.id,
        sp.supplier_id,
        sp.product_id,
        sp.option_id ?? null,
        sp.supply_price,
        sp.shipping_fee,
        daysAgo(sp.createdDaysAgo),
        daysAgo(sp.updatedDaysAgo),
      ],
    )
  }

  for (const pp of SAMPLE_PURCHASE_PRICES) {
    await query(
      `INSERT INTO purchase_prices
        (id, supplier_id, product_id, purchase_price, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        pp.id,
        pp.supplier_id,
        pp.product_id,
        pp.purchase_price,
        daysAgo(pp.createdDaysAgo),
        daysAgo(pp.updatedDaysAgo),
      ],
    )
  }

  return getAllData()
}
