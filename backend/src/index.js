import cors from 'cors'
import express from 'express'
import { pool, ensureSchema } from './db.js'
import * as store from './store.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5176'

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.redirect(302, FRONTEND_URL)
})

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message })
  }
})

app.get('/api/data', async (_req, res, next) => {
  try {
    res.json(await store.getAllData())
  } catch (err) {
    next(err)
  }
})

app.post('/api/suppliers', async (req, res, next) => {
  try {
    const supplier = await store.createSupplier(req.body.name, req.body.kind)
    res.status(201).json(supplier)
  } catch (err) {
    next(err)
  }
})

app.put('/api/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await store.updateSupplier(req.params.id, req.body.name)
    res.json(supplier)
  } catch (err) {
    next(err)
  }
})

app.delete('/api/suppliers/:id', async (req, res, next) => {
  try {
    await store.deleteSupplier(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/products', async (req, res, next) => {
  try {
    const product = await store.createProduct(req.body)
    res.status(201).json(product)
  } catch (err) {
    next(err)
  }
})

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const product = await store.updateProduct(req.params.id, req.body)
    res.json(product)
  } catch (err) {
    next(err)
  }
})

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    await store.deleteProduct(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/supply-prices', async (req, res, next) => {
  try {
    const result = await store.upsertSupplyPrice(
      req.body.supplier_id,
      req.body.product_id,
      req.body.option_id,
      req.body.supply_price,
      req.body.shipping_fee,
    )
    res.status(result.updated ? 200 : 201).json(result)
  } catch (err) {
    next(err)
  }
})

app.put('/api/supply-prices/:id', async (req, res, next) => {
  try {
    const item = await store.updateSupplyPrice(
      req.params.id,
      req.body.supply_price,
      req.body.shipping_fee,
    )
    res.json(item)
  } catch (err) {
    next(err)
  }
})

app.delete('/api/supply-prices/:id', async (req, res, next) => {
  try {
    await store.deleteSupplyPrice(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/purchase-prices', async (req, res, next) => {
  try {
    const result = await store.upsertPurchasePrice(
      req.body.supplier_id,
      req.body.product_id,
      req.body.purchase_price,
    )
    res.status(result.updated ? 200 : 201).json(result)
  } catch (err) {
    next(err)
  }
})

app.put('/api/purchase-prices/:id', async (req, res, next) => {
  try {
    const item = await store.updatePurchasePrice(req.params.id, req.body.purchase_price)
    res.json(item)
  } catch (err) {
    next(err)
  }
})

app.delete('/api/purchase-prices/:id', async (req, res, next) => {
  try {
    await store.deletePurchasePrice(req.params.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

app.post('/api/reset', async (_req, res, next) => {
  try {
    res.json(await store.resetSampleData())
  } catch (err) {
    next(err)
  }
})

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  res.status(status).json({
    error: err.message || '서버 오류가 발생했습니다.',
  })
})

app.listen(PORT, async () => {
  console.log(`화면: ${FRONTEND_URL}`)
  console.log(`API:  http://127.0.0.1:${PORT}`)
  try {
    await ensureSchema()
    const result = await store.getAllData()
    const hanbit = result.suppliers.find((s) => s.id === 'sup_001')
    const needsSeed =
      result.suppliers.length === 0 ||
      (hanbit && hanbit.name !== '한빛물류')

    if (needsSeed) {
      await store.resetSampleData()
      console.log('Sample data seeded')
    }
  } catch (err) {
    console.error('Failed to check/seed database:', err.message)
  }
})
