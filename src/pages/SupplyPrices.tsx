import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { SortSelect } from '../components/SortSelect'
import { useData } from '../context/DataContext'
import { formatWon, formatProductOptions, optionCost, productOptionsQueryText, supplyOptionName, vendorNamesForProduct } from '../lib/format'
import { compareDateDesc, compareKo, compareNumberAsc } from '../lib/sort'
import type { Product, SupplyPrice } from '../types'

type ProductSort = 'name' | 'created'
type SupplySort = 'supplier' | 'product' | 'created' | 'price'

const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: '상품명순' },
  { value: 'created', label: '등록일순' },
]

const SUPPLY_SORT_OPTIONS: { value: SupplySort; label: string }[] = [
  { value: 'supplier', label: '매출처순' },
  { value: 'product', label: '상품명순' },
  { value: 'created', label: '등록일순' },
  { value: 'price', label: '공급가순' },
]

type PriceDraft = {
  productId: string
  optionId: string | null
  price: string
  shippingFee: string
}

function draftKey(productId: string, optionId: string | null) {
  return `${productId}:${optionId ?? ''}`
}

function optionSlots(product: Product) {
  const options = product.options ?? []
  return [{ id: null as string | null, name: '기준', extra_price: 0 }, ...options]
}

export function SupplyPrices() {
  const { data, upsertSupplyPrices, updateSupplyPrice, deleteSupplyPrice } = useData()
  const [step, setStep] = useState(1)
  const [supplierId, setSupplierId] = useState('')
  const [productIds, setProductIds] = useState<string[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [productSort, setProductSort] = useState<ProductSort>('name')
  const [listSort, setListSort] = useState<SupplySort>('supplier')
  const [drafts, setDrafts] = useState<PriceDraft[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<SupplyPrice | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editShippingFee, setEditShippingFee] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SupplyPrice | null>(null)

  const salesPartners = useMemo(
    () =>
      data.suppliers
        .filter((s) => s.kind === 'sales')
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [data.suppliers],
  )

  const selectedSupplier = data.suppliers.find((s) => s.id === supplierId)

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    return data.products
      .filter((p) => {
        if (!q) return true
        const vendors = vendorNamesForProduct(p.id, data.purchase_prices, data.suppliers).toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          productOptionsQueryText(p.options).includes(q) ||
          vendors.includes(q)
        )
      })
      .sort((a, b) => {
        if (productSort === 'created') {
          const byDate = compareDateDesc(a.created_at, b.created_at)
          return byDate !== 0 ? byDate : compareKo(a.name, b.name)
        }
        return compareKo(a.name, b.name)
      })
  }, [data.products, data.purchase_prices, data.suppliers, productQuery, productSort])

  const selectedProducts = useMemo(
    () =>
      data.products
        .filter((p) => productIds.includes(p.id))
        .sort((a, b) => {
          if (productSort === 'created') {
            const byDate = compareDateDesc(a.created_at, b.created_at)
            return byDate !== 0 ? byDate : compareKo(a.name, b.name)
          }
          return compareKo(a.name, b.name)
        }),
    [data.products, productIds, productSort],
  )

  const existingCount = useMemo(
    () =>
      selectedProducts.reduce((count, product) => {
        return (
          count +
          optionSlots(product).filter((option) =>
            data.supply_prices.some(
              (sp) =>
                sp.supplier_id === supplierId &&
                sp.product_id === product.id &&
                (sp.option_id ?? null) === (option.id ?? null),
            ),
          ).length
        )
      }, 0),
    [data.supply_prices, selectedProducts, supplierId],
  )

  const draftCount = useMemo(
    () => selectedProducts.reduce((count, product) => count + optionSlots(product).length, 0),
    [selectedProducts],
  )

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => productIds.includes(p.id))

  const rows = useMemo(() => {
    return data.supply_prices
      .map((sp) => ({
        sp,
        supplier: data.suppliers.find((s) => s.id === sp.supplier_id),
        product: data.products.find((p) => p.id === sp.product_id),
      }))
      .filter((row) => row.supplier && row.product)
      .sort((a, b) => {
        if (listSort === 'created') {
          const byDate = compareDateDesc(a.sp.created_at, b.sp.created_at)
          return byDate !== 0 ? byDate : compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        if (listSort === 'price') {
          const byPrice = compareNumberAsc(a.sp.supply_price, b.sp.supply_price)
          if (byPrice !== 0) return byPrice
          return compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        if (listSort === 'product') {
          const byProduct = compareKo(a.product?.name ?? '', b.product?.name ?? '')
          if (byProduct !== 0) return byProduct
          return supplyOptionName(a.product, a.sp.option_id).localeCompare(
            supplyOptionName(b.product, b.sp.option_id),
            'ko',
          )
        }
        const bySupplier = compareKo(a.supplier?.name ?? '', b.supplier?.name ?? '')
        if (bySupplier !== 0) return bySupplier
        const byProduct = compareKo(a.product?.name ?? '', b.product?.name ?? '')
        if (byProduct !== 0) return byProduct
        return supplyOptionName(a.product, a.sp.option_id).localeCompare(
          supplyOptionName(b.product, b.sp.option_id),
          'ko',
        )
      })
  }, [data.products, data.suppliers, data.supply_prices, listSort])

  const resetWizard = () => {
    setStep(1)
    setSupplierId('')
    setProductIds([])
    setProductQuery('')
    setDrafts([])
    setError('')
  }

  const toggleProduct = (id: string) => {
    setProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const toggleFilteredProducts = () => {
    if (allFilteredSelected) {
      const visible = new Set(filteredProducts.map((p) => p.id))
      setProductIds((current) => current.filter((id) => !visible.has(id)))
      return
    }
    setProductIds((current) => {
      const next = new Set(current)
      for (const product of filteredProducts) next.add(product.id)
      return [...next]
    })
  }

  const goToPriceStep = () => {
    setDrafts((current) => {
      const kept = new Map(current.map((draft) => [draftKey(draft.productId, draft.optionId), draft]))
      return selectedProducts.flatMap((product) =>
        optionSlots(product).map((option) => {
          const optionId = option.id ?? null
          const exact = data.supply_prices.find(
            (sp) =>
              sp.supplier_id === supplierId &&
              sp.product_id === product.id &&
              (sp.option_id ?? null) === optionId,
          )
          const base = data.supply_prices.find(
            (sp) =>
              sp.supplier_id === supplierId &&
              sp.product_id === product.id &&
              sp.option_id == null,
          )
          const extra = option.extra_price ?? 0
          const suggested =
            exact?.supply_price ??
            (optionId && base ? Number(base.supply_price) + extra : undefined)
          const previous = kept.get(draftKey(product.id, optionId))
          return {
            productId: product.id,
            optionId,
            price: previous?.price ?? (suggested != null ? String(suggested) : ''),
            shippingFee:
              previous?.shippingFee ??
              String(exact?.shipping_fee ?? base?.shipping_fee ?? product.shipping_fee ?? 0),
          }
        }),
      )
    })
    setError('')
    setStep(3)
  }

  const updateDraft = (
    productId: string,
    optionId: string | null,
    field: 'price' | 'shippingFee',
    value: string,
  ) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.productId === productId && (draft.optionId ?? null) === optionId
          ? { ...draft, [field]: value }
          : draft,
      ),
    )
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const items: {
      productId: string
      optionId: string | null
      supplyPrice: number
      shippingFee: number
    }[] = []

    for (const draft of drafts) {
      const product = data.products.find((p) => p.id === draft.productId)
      const optionName = supplyOptionName(product, draft.optionId)
      const supplyPrice = Number(draft.price)
      const shippingFee = Number(draft.shippingFee)
      if (!Number.isFinite(supplyPrice) || supplyPrice < 0) {
        setError(`${product?.name ?? '상품'} (${optionName}) 공급가를 올바르게 입력해 주세요.`)
        setMessage('')
        return
      }
      if (!Number.isFinite(shippingFee) || shippingFee < 0) {
        setError(`${product?.name ?? '상품'} (${optionName}) 택배비를 올바르게 입력해 주세요.`)
        setMessage('')
        return
      }
      items.push({
        productId: draft.productId,
        optionId: draft.optionId,
        supplyPrice,
        shippingFee,
      })
    }

    if (items.length === 0) {
      setError('상품을 선택해 주세요.')
      setMessage('')
      return
    }

    const result = await upsertSupplyPrices(supplierId, items)
    if (!result.ok) {
      setError(result.error)
      setMessage('')
      return
    }

    const parts = [
      result.value.created ? `${result.value.created}건 등록` : '',
      result.value.updated ? `${result.value.updated}건 수정` : '',
    ].filter(Boolean)
    setMessage(parts.length ? `공급가를 저장했습니다. (${parts.join(', ')})` : '공급가를 저장했습니다.')
    setError('')
    resetWizard()
  }

  if (salesPartners.length === 0 || data.products.length === 0) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <h1>공급가 관리</h1>
            <p className="page__desc">매출처와 상품을 선택한 뒤 공급가를 입력합니다.</p>
          </div>
        </div>
        <EmptyState
          title="먼저 매출처와 상품을 등록해 주세요"
          description="공급가는 매출처·상품·옵션 조합으로 관리됩니다."
          action={
            <div className="button-row">
              <Link to="/suppliers" className="btn btn--primary">
                업체 관리
              </Link>
              <Link to="/products" className="btn btn--ghost">
                상품 관리
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>공급가 관리</h1>
          <p className="page__desc">매출처를 고른 뒤 상품을 여러 개 선택하고, 옵션별 공급가·택배비를 입력합니다.</p>
        </div>
      </div>

      {message ? <div className="toast toast--success">{message}</div> : null}

      <section className="panel">
        <div className="steps">
          <div className={`step ${step >= 1 ? 'step--active' : ''}`}>
            <span>1</span> 매출처 선택
          </div>
          <div className={`step ${step >= 2 ? 'step--active' : ''}`}>
            <span>2</span> 상품 선택
          </div>
          <div className={`step ${step >= 3 ? 'step--active' : ''}`}>
            <span>3</span> 공급가 입력
          </div>
        </div>

        {step === 1 ? (
          <div className="wizard-body">
            <label className="field">
              <span>매출처</span>
              <select
                className="input"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">매출처를 선택하세요</option>
                {salesPartners.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={!supplierId}
                onClick={() => setStep(2)}
              >
                다음
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-body">
            <p className="muted">선택 매출처: <strong>{selectedSupplier?.name}</strong></p>
            <div className="toolbar">
              <input
                className="input"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="상품명으로 검색"
              />
              <SortSelect value={productSort} options={PRODUCT_SORT_OPTIONS} onChange={setProductSort} />
            </div>
            <div className="select-toolbar">
              <p className="muted">{productIds.length}개 선택됨</p>
              <button
                type="button"
                className="btn btn--sm"
                disabled={filteredProducts.length === 0}
                onClick={toggleFilteredProducts}
              >
                {allFilteredSelected ? '현재 목록 선택 해제' : '현재 목록 전체 선택'}
              </button>
            </div>
            <div className="select-list">
              {filteredProducts.map((product) => {
                const selected = productIds.includes(product.id)
                const registered = data.supply_prices.some(
                  (sp) => sp.supplier_id === supplierId && sp.product_id === product.id,
                )
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={`select-card ${selected ? 'select-card--active' : ''}`}
                    onClick={() => toggleProduct(product.id)}
                    aria-pressed={selected}
                  >
                    <span className="select-card__check" aria-hidden="true">
                      {selected ? '✓' : ''}
                    </span>
                    <span className="select-card__body">
                      <strong>{product.name}</strong>
                      <span>
                        원가 {formatWon(product.cost)} · 옵션 {formatProductOptions(product.options)}
                        {registered ? ' · 이미 등록됨' : ''}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>
                이전
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={productIds.length === 0}
                onClick={goToPriceStep}
              >
                다음 ({productIds.length})
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <form className="wizard-body" onSubmit={(e) => void handleSave(e)}>
            <div className="info-box">
              <div>
                <span className="muted">매출처</span>
                <strong>{selectedSupplier?.name}</strong>
              </div>
              <div>
                <span className="muted">공급가 입력</span>
                <strong>{draftCount}건</strong>
              </div>
            </div>

            {existingCount > 0 ? (
              <p className="hint">
                {existingCount}건은 이미 등록되어 있습니다. 저장하면 해당 공급가가 수정됩니다.
              </p>
            ) : null}
            <p className="muted">첫 줄의 기준은 옵션이 붙지 않은 기본 공급가입니다. 아래 옵션은 각각 따로 입력합니다.</p>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>상품</th>
                    <th>원가</th>
                    <th>구분</th>
                    <th>공급가</th>
                    <th>택배비</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => {
                    const product = data.products.find((p) => p.id === draft.productId)
                    const option = product?.options?.find((item) => item.id === draft.optionId)
                    return (
                      <tr key={draftKey(draft.productId, draft.optionId)}>
                        <td>
                          <strong>{product?.name}</strong>
                        </td>
                        <td>{formatWon(optionCost(product, draft.optionId))}</td>
                        <td className="cell-options">
                          {supplyOptionName(product, draft.optionId)}
                          {option && option.extra_price > 0
                            ? ` · 추가금 ${formatWon(option.extra_price)}`
                            : ''}
                        </td>
                        <td>
                          <input
                            className="input input--inline"
                            type="number"
                            min="0"
                            value={draft.price}
                            onChange={(e) =>
                              updateDraft(draft.productId, draft.optionId, 'price', e.target.value)
                            }
                            placeholder="예: 12000"
                            required
                          />
                        </td>
                        <td>
                          <input
                            className="input input--inline"
                            type="number"
                            min="0"
                            value={draft.shippingFee}
                            onChange={(e) =>
                              updateDraft(
                                draft.productId,
                                draft.optionId,
                                'shippingFee',
                                e.target.value,
                              )
                            }
                            placeholder="예: 3500"
                            required
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(2)}>
                이전
              </button>
              <button type="submit" className="btn btn--primary">
                {existingCount === drafts.length && drafts.length > 0
                  ? `${drafts.length}개 공급가 수정`
                  : `${drafts.length}개 공급가 저장`}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__header panel__header--row">
          <h2>등록된 공급가 ({rows.length})</h2>
          {rows.length > 0 ? (
            <SortSelect value={listSort} options={SUPPLY_SORT_OPTIONS} onChange={setListSort} />
          ) : null}
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="등록된 공급가가 없습니다"
            description="위 단계에서 매출처와 상품을 선택하고 공급가를 저장해 보세요."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>매출처</th>
                  <th>상품</th>
                  <th>공급가</th>
                  <th>원가</th>
                  <th>택배비</th>
                  <th>옵션</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ sp, supplier, product }) => (
                  <tr key={sp.id}>
                    <td>{supplier?.name}</td>
                    <td>{product?.name}</td>
                    <td className="price">
                      {editing?.id === sp.id ? (
                        <input
                          className="input input--inline"
                          type="number"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      ) : (
                        formatWon(sp.supply_price)
                      )}
                    </td>
                    <td>{formatWon(optionCost(product, sp.option_id))}</td>
                    <td className="price">
                      {editing?.id === sp.id ? (
                        <input
                          className="input input--inline"
                          type="number"
                          min="0"
                          value={editShippingFee}
                          onChange={(e) => setEditShippingFee(e.target.value)}
                        />
                      ) : (
                        formatWon(sp.shipping_fee)
                      )}
                    </td>
                    <td className="cell-options">{supplyOptionName(product, sp.option_id)}</td>
                    <td>
                      <div className="row-actions">
                        {editing?.id === sp.id ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--sm btn--primary"
                              onClick={() => {
                                void (async () => {
                                  const result = await updateSupplyPrice(
                                    sp.id,
                                    Number(editPrice),
                                    Number(editShippingFee),
                                  )
                                  if (!result.ok) {
                                    setError(result.error)
                                    return
                                  }
                                  setEditing(null)
                                  setMessage('공급가와 택배비가 수정되었습니다.')
                                })()
                              }}
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => setEditing(null)}
                            >
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => {
                                setEditing(sp)
                                setEditPrice(String(sp.supply_price))
                                setEditShippingFee(String(sp.shipping_fee))
                              }}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--danger-outline"
                              onClick={() => setDeleteTarget(sp)}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="공급가 삭제"
        message="이 매출처·상품·옵션 조합의 공급가를 삭제할까요?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteSupplyPrice(deleteTarget.id)
          setDeleteTarget(null)
          setMessage('공급가가 삭제되었습니다.')
        }}
      />
    </div>
  )
}
