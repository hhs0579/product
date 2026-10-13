import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { SortSelect } from '../components/SortSelect'
import { useData } from '../context/DataContext'
import { formatDate, formatProductOptions, formatWon, optionCost, partnerLabel, productOptionsQueryText, supplyOptionName } from '../lib/format'
import { compareDateDesc, compareKo, compareNumberAsc } from '../lib/sort'
import type { PartnerKind, PurchasePrice, Supplier, SupplyPrice } from '../types'

type NameSort = 'name' | 'created'
type ItemSort = 'name' | 'created' | 'price'

const PARTNER_SORT_OPTIONS: { value: NameSort; label: string }[] = [
  { value: 'name', label: '업체명순' },
  { value: 'created', label: '등록일순' },
]

const ITEM_SORT_OPTIONS: { value: ItemSort; label: string }[] = [
  { value: 'name', label: '상품명순' },
  { value: 'created', label: '등록일순' },
  { value: 'price', label: '가격순' },
]

export function Suppliers() {
  const {
    data,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    upsertPurchasePrice,
    deletePurchasePrice,
  } = useData()
  const [kind, setKind] = useState<PartnerKind>('sales')
  const [query, setQuery] = useState('')
  const [partnerSort, setPartnerSort] = useState<NameSort>('name')
  const [itemSort, setItemSort] = useState<ItemSort>('name')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [busyProductId, setBusyProductId] = useState<string | null>(null)
  const [priceError, setPriceError] = useState('')
  const [deletePriceTarget, setDeletePriceTarget] = useState<PurchasePrice | null>(null)

  const label = partnerLabel(kind)

  const partners = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.suppliers
      .filter((s) => s.kind === kind)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (partnerSort === 'created') {
          const byDate = compareDateDesc(a.created_at, b.created_at)
          return byDate !== 0 ? byDate : compareKo(a.name, b.name)
        }
        return compareKo(a.name, b.name)
      })
  }, [data.suppliers, kind, partnerSort, query])

  useEffect(() => {
    setSelectedId(null)
    setProductQuery('')
    setPriceError('')
  }, [kind])

  useEffect(() => {
    if (!selectedId && partners.length > 0) {
      setSelectedId(partners[0].id)
      return
    }
    if (selectedId && !partners.some((s) => s.id === selectedId)) {
      setSelectedId(partners[0]?.id ?? null)
    }
  }, [partners, selectedId])

  const selected = data.suppliers.find((s) => s.id === selectedId) ?? null

  const salesRows = useMemo(() => {
    if (!selected || selected.kind !== 'sales') return []
    return data.supply_prices
      .filter((sp) => sp.supplier_id === selected.id)
      .map((sp) => ({
        sp,
        product: data.products.find((p) => p.id === sp.product_id),
      }))
      .filter((row) => row.product)
      .sort((a, b) => {
        if (itemSort === 'created') {
          const byDate = compareDateDesc(a.product?.created_at, b.product?.created_at)
          return byDate !== 0 ? byDate : compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        if (itemSort === 'price') {
          const byPrice = compareNumberAsc(a.sp.supply_price, b.sp.supply_price)
          return byPrice !== 0 ? byPrice : compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        return compareKo(a.product?.name ?? '', b.product?.name ?? '')
      })
  }, [data.products, data.supply_prices, itemSort, selected])

  const purchaseRows = useMemo(() => {
    if (!selected || selected.kind !== 'purchase') return []
    return data.purchase_prices
      .filter((pp) => pp.supplier_id === selected.id)
      .map((pp) => ({
        pp,
        product: data.products.find((p) => p.id === pp.product_id),
      }))
      .filter((row) => row.product)
      .sort((a, b) => {
        if (itemSort === 'created') {
          const byDate = compareDateDesc(a.product?.created_at, b.product?.created_at)
          return byDate !== 0 ? byDate : compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        if (itemSort === 'price') {
          const byPrice = compareNumberAsc(a.pp.purchase_price, b.pp.purchase_price)
          return byPrice !== 0 ? byPrice : compareKo(a.product?.name ?? '', b.product?.name ?? '')
        }
        return compareKo(a.product?.name ?? '', b.product?.name ?? '')
      })
  }, [data.products, data.purchase_prices, itemSort, selected])

  const availableProducts = useMemo(() => {
    if (!selected || selected.kind !== 'purchase') return []
    const linkedAnywhere = new Set(data.purchase_prices.map((pp) => pp.product_id))
    const q = productQuery.trim().toLowerCase()
    return data.products
      .filter((p) => !linkedAnywhere.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          productOptionsQueryText(p.options).includes(q),
      )
      .sort((a, b) => {
        if (itemSort === 'created') {
          const byDate = compareDateDesc(a.created_at, b.created_at)
          return byDate !== 0 ? byDate : compareKo(a.name, b.name)
        }
        if (itemSort === 'price') {
          const byCost = compareNumberAsc(a.cost, b.cost)
          return byCost !== 0 ? byCost : compareKo(a.name, b.name)
        }
        return compareKo(a.name, b.name)
      })
  }, [data.products, data.purchase_prices, itemSort, productQuery, selected])

  const addProductToVendor = async (productId: string) => {
    if (!selected || selected.kind !== 'purchase' || busyProductId) return
    const product = data.products.find((p) => p.id === productId)
    if (!product) return
    setBusyProductId(productId)
    setPriceError('')
    const result = await upsertPurchasePrice(selected.id, product.id, product.cost)
    setBusyProductId(null)
    if (!result.ok) setPriceError(result.error)
  }

  const openCreate = () => {
    setEditing(null)
    setName('')
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier)
    setName(supplier.name)
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = editing
      ? await updateSupplier(editing.id, name)
      : await addSupplier(name, kind)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setModalOpen(false)
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="toast toast--error">{error}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>업체 관리</h1>
          <p className="page__desc">
            매출처와 매입처를 나눠 등록합니다. 매입처는 상품을 누르면 상품 원가가 매입가로 연결됩니다.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          {label} 등록
        </button>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${kind === 'sales' ? 'tab--active' : ''}`}
          onClick={() => {
            setKind('sales')
            setQuery('')
          }}
        >
          매출처
        </button>
        <button
          type="button"
          className={`tab ${kind === 'purchase' ? 'tab--active' : ''}`}
          onClick={() => {
            setKind('purchase')
            setQuery('')
          }}
        >
          매입처
        </button>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder={`${label}명 검색`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SortSelect value={partnerSort} options={PARTNER_SORT_OPTIONS} onChange={setPartnerSort} />
      </div>

      {partners.length === 0 ? (
        <EmptyState
          title={`등록된 ${label}가 없습니다`}
          description={
            kind === 'sales'
              ? '매출처를 등록하면 공급가를 연결할 수 있습니다.'
              : '매입처를 등록한 뒤 상품을 눌러 연결하세요. 매입가는 상품 원가입니다.'
          }
          action={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              {label} 등록하기
            </button>
          }
        />
      ) : (
        <div className="split-view">
          <section className="panel">
            <div className="panel__header">
              <h2>
                {label} 목록 ({partners.length})
              </h2>
            </div>
            <div className="list">
              {partners.map((supplier) => {
                const count =
                  kind === 'sales'
                    ? new Set(
                        data.supply_prices
                          .filter((sp) => sp.supplier_id === supplier.id)
                          .map((sp) => sp.product_id),
                      ).size
                    : data.purchase_prices.filter((pp) => pp.supplier_id === supplier.id).length
                return (
                  <div
                    key={supplier.id}
                    className={`list-item ${selectedId === supplier.id ? 'list-item--active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedId(supplier.id)
                      setProductQuery('')
                      setPriceError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(supplier.id)
                        setProductQuery('')
                        setPriceError('')
                      }
                    }}
                  >
                    <div>
                      <strong>{supplier.name}</strong>
                      <span className="muted">
                        상품 {count}개 · {formatDate(supplier.created_at)}
                      </span>
                    </div>
                    <div className="list-item__actions">
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(supplier)
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger-outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(supplier)
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel__header panel__header--row">
              <h2>{selected ? `${selected.name} 상품 목록` : `${label}별 상품`}</h2>
              {selected && (kind === 'sales' ? salesRows.length > 0 : data.products.length > 0) ? (
                <SortSelect value={itemSort} options={ITEM_SORT_OPTIONS} onChange={setItemSort} />
              ) : null}
            </div>
            {!selected ? (
              <EmptyState
                title={`${label}를 선택하세요`}
                description={`왼쪽 목록에서 ${label}를 선택하면 등록된 상품을 볼 수 있습니다.`}
              />
            ) : kind === 'sales' ? (
              salesRows.length === 0 ? (
                <EmptyState
                  title={`${selected.name}에 등록된 상품이 없습니다`}
                  description="공급가 관리에서 이 매출처에 상품을 연결해 주세요."
                  action={
                    <Link to="/supply-prices" className="btn btn--primary">
                      공급가 등록
                    </Link>
                  }
                />
              ) : (
                <PriceTable
                  rows={salesRows.map(({ sp, product }) => ({
                    id: sp.id,
                    name: product?.name ?? '',
                    price: sp.supply_price,
                    cost: optionCost(product, sp.option_id),
                    shippingFee: sp.shipping_fee ?? 0,
                    option: supplyOptionName(product, sp.option_id),
                    carton: product?.carton_quantity ?? 0,
                    pallet: product?.pallet_quantity ?? 0,
                    priceLabel: '공급가',
                    item: sp,
                  }))}
                />
              )
            ) : data.products.length === 0 ? (
              <EmptyState
                title="연결할 상품이 없습니다"
                description="상품 관리에서 상품을 등록하면 여기서 눌러 바로 연결할 수 있습니다."
                action={
                  <Link to="/products" className="btn btn--primary">
                    상품 등록
                  </Link>
                }
              />
            ) : (
              <>
                <p className="muted">
                  상품을 누르면 원가가 매입가로 연결됩니다. 이미 다른 매입처에 붙은 상품은 목록에서 빠집니다.
                </p>
                {priceError ? <div className="toast toast--error">{priceError}</div> : null}
                {availableProducts.length > 0 || productQuery ? (
                  <>
                    <div className="toolbar">
                      <input
                        className="input"
                        placeholder="연결할 상품 검색"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                      />
                    </div>
                    {availableProducts.length === 0 ? (
                      <p className="muted">검색된 미연결 상품이 없습니다.</p>
                    ) : (
                      <div className="select-list">
                        {availableProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="select-card"
                            disabled={busyProductId === product.id}
                            onClick={() => void addProductToVendor(product.id)}
                          >
                            <span className="select-card__check" aria-hidden="true" />
                            <span className="select-card__body">
                              <strong>{product.name}</strong>
                              <span>
                                원가 {formatWon(product.cost)} · 옵션{' '}
                                {formatProductOptions(product.options)}
                                {busyProductId === product.id ? ' · 연결 중…' : ''}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="hint">
                    연결할 수 있는 상품이 없습니다. 다른 매입처에 이미 붙은 상품은 목록에 나오지 않으며,
                    연결을 해제하면 다시 선택할 수 있습니다.
                  </p>
                )}

                {purchaseRows.length === 0 ? (
                  <p className="muted" style={{ marginTop: '0.9rem' }}>
                    아직 연결된 상품이 없습니다. 위에서 상품을 눌러 주세요.
                  </p>
                ) : (
                  <div className="table-wrap" style={{ marginTop: '0.9rem' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>상품명</th>
                          <th>매입가 (원가)</th>
                          <th>택배비</th>
                          <th>옵션</th>
                          <th>카톤</th>
                          <th>파레트</th>
                          <th>관리</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRows.map(({ pp, product }) => (
                          <tr key={pp.id}>
                            <td>
                              <strong>{product?.name}</strong>
                            </td>
                            <td className="price">{formatWon(product?.cost ?? pp.purchase_price)}</td>
                            <td>{formatWon(product?.shipping_fee ?? 0)}</td>
                            <td className="cell-options">{formatProductOptions(product?.options)}</td>
                            <td>{product?.carton_quantity.toLocaleString('ko-KR')}</td>
                            <td>{product?.pallet_quantity.toLocaleString('ko-KR')}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn--sm btn--danger-outline"
                                onClick={() => setDeletePriceTarget(pp)}
                              >
                                연결 해제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? `${label} 수정` : `${label} 등록`} onClose={() => setModalOpen(false)}>
        <form className="form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="field">
            <span>{label}명</span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'sales' ? '예: 한빛물류' : '예: 제주워터'}
              autoFocus
            />
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`${label} 삭제`}
        message={
          kind === 'sales'
            ? `‘${deleteTarget?.name ?? ''}’ 매출처를 삭제하면 연결된 공급가도 함께 삭제됩니다. 계속할까요?`
            : `‘${deleteTarget?.name ?? ''}’ 매입처를 삭제하면 연결된 매입가도 함께 삭제됩니다. 계속할까요?`
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void deleteSupplier(deleteTarget.id)
          }
          setDeleteTarget(null)
        }}
      />

      <ConfirmDialog
        open={!!deletePriceTarget}
        title="상품 연결 해제"
        message="이 매입처에서 해당 상품 연결을 해제할까요?"
        onCancel={() => setDeletePriceTarget(null)}
        onConfirm={() => {
          if (deletePriceTarget) void deletePurchasePrice(deletePriceTarget.id)
          setDeletePriceTarget(null)
        }}
      />
    </div>
  )
}

function PriceTable({
  rows,
}: {
  rows: {
    id: string
    name: string
    price: number
    cost: number
    shippingFee: number
    option: string
    carton: number
    pallet: number
    priceLabel: string
    item: SupplyPrice
  }[]
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>상품명</th>
            <th>{rows[0]?.priceLabel ?? '공급가'}</th>
            <th>원가</th>
            <th>택배비</th>
            <th>옵션</th>
            <th>카톤</th>
            <th>파레트</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.name}</strong>
              </td>
              <td className="price">{formatWon(row.price)}</td>
              <td>{formatWon(row.cost)}</td>
              <td>{formatWon(row.shippingFee)}</td>
              <td className="cell-options">{row.option || '-'}</td>
              <td>{row.carton.toLocaleString('ko-KR')}</td>
              <td>{row.pallet.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
