import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatPercent, formatWon, optionCost } from '../lib/format'
import type { Product } from '../types'

type Line = {
  productId: string
  optionId: string
  quantity: string
  unitCost: string
  unitSupply: string
  cartonQuantity: string
  shippingFee: string
}

const emptyLine = (): Line => ({
  productId: '',
  optionId: '',
  quantity: '1',
  unitCost: '',
  unitSupply: '',
  cartonQuantity: '',
  shippingFee: '',
})

function toAmount(value: string): number | null {
  if (value.trim() === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function cartonCount(qty: number, perCarton: number): number {
  if (qty <= 0) return 0
  if (!(perCarton > 0)) return 1
  return Math.ceil(qty / perCarton)
}

export function Margin() {
  const { data } = useData()
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine()])

  const salesPartners = useMemo(
    () =>
      data.suppliers
        .filter((s) => s.kind === 'sales')
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [data.suppliers],
  )

  const products = useMemo(
    () => [...data.products].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [data.products],
  )

  const findSupply = (productId: string, optionId: string, partnerId = supplierId) => {
    if (!partnerId || !productId) return undefined
    return data.supply_prices.find(
      (sp) =>
        sp.supplier_id === partnerId &&
        sp.product_id === productId &&
        (sp.option_id ?? null) === (optionId || null),
    )
  }

  const lineDetails = useMemo(() => {
    return lines.map((line) => {
      const product = data.products.find((item) => item.id === line.productId) ?? null
      const optionId = line.optionId || null
      const quantity = Number(line.quantity)
      const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0
      const unitCost = toAmount(line.unitCost)
      const unitSupply = toAmount(line.unitSupply)
      const perCarton = toAmount(line.cartonQuantity) ?? 0
      const unitShipping = toAmount(line.shippingFee)
      const boxes = unitShipping == null ? 0 : cartonCount(qty, perCarton)
      const supply =
        supplierId && line.productId
          ? data.supply_prices.find(
              (sp) =>
                sp.supplier_id === supplierId &&
                sp.product_id === line.productId &&
                (sp.option_id ?? null) === optionId,
            )
          : undefined
      return {
        line,
        product,
        optionId,
        qty,
        unitCost,
        unitSupply,
        perCarton,
        unitShipping,
        boxes,
        missingSupply: Boolean(supplierId && product && !supply && unitSupply == null),
        costSum: (unitCost ?? 0) * qty,
        supplySum: unitSupply != null ? unitSupply * qty : null,
        shippingSum: unitShipping != null ? unitShipping * boxes : 0,
      }
    })
  }, [data.products, data.supply_prices, lines, supplierId])

  const result = useMemo(() => {
    const filled = lineDetails.filter((row) => row.qty > 0 && (row.unitCost != null || row.unitSupply != null))
    const totalCost = filled.reduce((sum, row) => sum + row.costSum, 0)
    const hasSupply = filled.length > 0 && filled.every((row) => row.supplySum != null)
    const totalSupply = hasSupply
      ? filled.reduce((sum, row) => sum + (row.supplySum ?? 0), 0)
      : null
    const shipping = lineDetails.reduce((sum, row) => sum + row.shippingSum, 0)
    const margin = totalSupply != null ? totalSupply - totalCost - shipping : null
    const rate = margin != null && totalSupply && totalSupply > 0 ? (margin / totalSupply) * 100 : null
    return { totalCost, totalSupply, shipping, margin, rate }
  }, [lineDetails])

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const fillFromProduct = (index: number, productId: string, optionId: string) => {
    const product = data.products.find((item) => item.id === productId)
    const supply = findSupply(productId, optionId)
    const shipping = supply?.shipping_fee ?? product?.shipping_fee
    updateLine(index, {
      productId,
      optionId,
      unitCost: product ? String(optionCost(product, optionId || null)) : '',
      unitSupply: supply ? String(supply.supply_price) : lines[index]?.unitSupply ?? '',
      cartonQuantity: product && product.carton_quantity > 0 ? String(product.carton_quantity) : '',
      shippingFee:
        shipping != null && shipping > 0
          ? String(shipping)
          : lines[index]?.shippingFee ?? '',
    })
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>마진 계산</h1>
          <p className="page__desc">
            매출처를 고르면 등록된 공급가·택배비가 채워집니다. 택배비는 카톤 수량 기준으로 자동 계산됩니다.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="form">
          <label className="field">
            <span>매출처</span>
            <select
              className="input"
              value={supplierId}
              onChange={(e) => {
                const nextId = e.target.value
                setSupplierId(nextId)
                setLines((current) =>
                  current.map((line) => {
                    if (!line.productId || !nextId) return line
                    const supply = findSupply(line.productId, line.optionId, nextId)
                    if (!supply) return line
                    return {
                      ...line,
                      unitSupply: String(supply.supply_price),
                      shippingFee: String(supply.shipping_fee ?? line.shippingFee),
                    }
                  }),
                )
              }}
            >
              <option value="">선택 안 함 (직접 입력)</option>
              {salesPartners.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <div className="table-wrap table-wrap--fluid">
            <table>
              <thead>
                <tr>
                  <th>제품</th>
                  <th>구분</th>
                  <th>수량</th>
                  <th>카톤</th>
                  <th>단위원가</th>
                  <th>단위공급가</th>
                  <th>택배비(카톤)</th>
                  <th>소계 원가</th>
                  <th>소계 공급가</th>
                  <th>소계 택배비</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineDetails.map((row, index) => (
                  <MarginLine
                    key={index}
                    products={products}
                    product={row.product}
                    line={row.line}
                    boxes={row.boxes}
                    unitCost={row.unitCost}
                    costSum={row.costSum}
                    supplySum={row.supplySum}
                    shippingSum={row.shippingSum}
                    missingSupply={row.missingSupply}
                    onProduct={(id) => fillFromProduct(index, id, '')}
                    onOption={(id) => fillFromProduct(index, row.line.productId, id)}
                    onQuantity={(value) => updateLine(index, { quantity: value })}
                    onCarton={(value) => updateLine(index, { cartonQuantity: value })}
                    onCost={(value) => updateLine(index, { unitCost: value })}
                    onSupply={(value) => updateLine(index, { unitSupply: value })}
                    onShipping={(value) => updateLine(index, { shippingFee: value })}
                    onRemove={() =>
                      setLines((current) =>
                        current.length <= 1 ? [emptyLine()] : current.filter((_, i) => i !== index),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="button-row">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              상품 추가
            </button>
          </div>
        </div>
      </section>

      <section className="result-grid">
        <article className="stat-card result-card">
          <span className="stat-card__label">총원가</span>
          <strong className="stat-card__value">{formatWon(result.totalCost)}</strong>
        </article>
        <article className="stat-card result-card">
          <span className="stat-card__label">총공급가</span>
          <strong className="stat-card__value">
            {result.totalSupply == null ? '-' : formatWon(result.totalSupply)}
          </strong>
        </article>
        <article className="stat-card result-card">
          <span className="stat-card__label">총택배비</span>
          <strong className="stat-card__value">{formatWon(result.shipping)}</strong>
        </article>
        <article
          className={`stat-card result-card ${
            result.margin == null ? '' : result.margin >= 0 ? 'result-card--plus' : 'result-card--minus'
          }`}
        >
          <span className="stat-card__label">마진</span>
          <strong className="stat-card__value">
            {result.margin == null ? '-' : formatWon(result.margin)}
          </strong>
        </article>
        <article
          className={`stat-card result-card ${
            result.rate == null ? '' : result.rate >= 0 ? 'result-card--plus' : 'result-card--minus'
          }`}
        >
          <span className="stat-card__label">마진율</span>
          <strong className="stat-card__value">
            {result.rate == null ? '-' : formatPercent(result.rate)}
          </strong>
        </article>
      </section>

      <p className="muted">
        총택배비 = 카톤당 택배비 × 올림(수량 ÷ 카톤수량). 예: 카톤 50개·택배비 ₩3,000이면 수량 150개는 3카톤이라 ₩9,000입니다.
        마진 = 총공급가 − 총원가 − 총택배비.
      </p>
    </div>
  )
}

function MarginLine({
  products,
  product,
  line,
  boxes,
  unitCost,
  costSum,
  supplySum,
  shippingSum,
  missingSupply,
  onProduct,
  onOption,
  onQuantity,
  onCarton,
  onCost,
  onSupply,
  onShipping,
  onRemove,
}: {
  products: Product[]
  product: Product | null
  line: Line
  boxes: number
  unitCost: number | null
  costSum: number
  supplySum: number | null
  shippingSum: number
  missingSupply: boolean
  onProduct: (id: string) => void
  onOption: (id: string) => void
  onQuantity: (value: string) => void
  onCarton: (value: string) => void
  onCost: (value: string) => void
  onSupply: (value: string) => void
  onShipping: (value: string) => void
  onRemove: () => void
}) {
  return (
    <tr>
      <td>
        <select
          className="input input--inline"
          value={line.productId}
          onChange={(e) => onProduct(e.target.value)}
        >
          <option value="">직접 입력</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="input input--inline"
          value={line.optionId}
          onChange={(e) => onOption(e.target.value)}
          disabled={!product}
        >
          <option value="">기준</option>
          {(product?.options ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="input input--inline"
          type="number"
          min="1"
          value={line.quantity}
          onChange={(e) => onQuantity(e.target.value)}
        />
      </td>
      <td>
        <input
          className="input input--inline"
          type="number"
          min="0"
          value={line.cartonQuantity}
          onChange={(e) => onCarton(e.target.value)}
          placeholder="50"
        />
      </td>
      <td>
        <input
          className="input input--inline"
          type="number"
          min="0"
          value={line.unitCost}
          onChange={(e) => onCost(e.target.value)}
          placeholder="원가"
        />
      </td>
      <td>
        <input
          className="input input--inline"
          type="number"
          min="0"
          value={line.unitSupply}
          onChange={(e) => onSupply(e.target.value)}
          placeholder={missingSupply ? '미등록 · 직접 입력' : '공급가'}
        />
      </td>
      <td>
        <input
          className="input input--inline"
          type="number"
          min="0"
          value={line.shippingFee}
          onChange={(e) => onShipping(e.target.value)}
          placeholder="3000"
        />
      </td>
      <td>{unitCost == null ? '-' : formatWon(costSum)}</td>
      <td>{supplySum == null ? '-' : formatWon(supplySum)}</td>
      <td>
        {line.shippingFee.trim() === '' ? (
          '-'
        ) : (
          <>
            {formatWon(shippingSum)}
            {boxes > 0 ? <span className="muted"> · {boxes}카톤</span> : null}
          </>
        )}
      </td>
      <td>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onRemove}>
          삭제
        </button>
      </td>
    </tr>
  )
}
