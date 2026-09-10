import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { useData } from '../context/DataContext'
import { formatDate, formatProductOptions, formatWon, optionCost, partnerLabel, supplyOptionName } from '../lib/format'
import type { PartnerKind, PurchasePrice, Supplier, SupplyPrice } from '../types'

export function Suppliers() {
  const {
    data,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    upsertPurchasePrice,
    updatePurchasePrice,
    deletePurchasePrice,
  } = useData()
  const [kind, setKind] = useState<PartnerKind>('sales')
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [priceModalOpen, setPriceModalOpen] = useState(false)
  const [priceProductId, setPriceProductId] = useState('')
  const [priceValue, setPriceValue] = useState('')
  const [priceError, setPriceError] = useState('')
  const [editingPrice, setEditingPrice] = useState<PurchasePrice | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [deletePriceTarget, setDeletePriceTarget] = useState<PurchasePrice | null>(null)

  const label = partnerLabel(kind)

  const partners = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.suppliers
      .filter((s) => s.kind === kind)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [data.suppliers, kind, query])

  useEffect(() => {
    setSelectedId(null)
    setEditingPrice(null)
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
      .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ko'))
  }, [data.products, data.supply_prices, selected])

  const purchaseRows = useMemo(() => {
    if (!selected || selected.kind !== 'purchase') return []
    return data.purchase_prices
      .filter((pp) => pp.supplier_id === selected.id)
      .map((pp) => ({
        pp,
        product: data.products.find((p) => p.id === pp.product_id),
      }))
      .filter((row) => row.product)
      .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ko'))
  }, [data.products, data.purchase_prices, selected])

  const linkedProductIds = new Set(purchaseRows.map((row) => row.pp.product_id))
  const availableProducts = data.products.filter((p) => !linkedProductIds.has(p.id))

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

  const handleSavePurchasePrice = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const result = await upsertPurchasePrice(selected.id, priceProductId, Number(priceValue))
    if (!result.ok) {
      setPriceError(result.error)
      return
    }
    setPriceModalOpen(false)
    setPriceProductId('')
    setPriceValue('')
    setPriceError('')
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
          <p className="page__desc">매출처와 매입처를 나눠 등록하고, 매입처에는 매입가를 입력합니다.</p>
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
      </div>

      {partners.length === 0 ? (
        <EmptyState
          title={`등록된 ${label}가 없습니다`}
          description={
            kind === 'sales'
              ? '매출처를 등록하면 공급가를 연결할 수 있습니다.'
              : '매입처를 등록한 뒤 상품별 매입가를 입력하세요.'
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
                    onClick={() => setSelectedId(supplier.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedId(supplier.id)
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
              {kind === 'purchase' && selected ? (
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={availableProducts.length === 0}
                  onClick={() => {
                    setPriceProductId(availableProducts[0]?.id ?? '')
                    setPriceValue('')
                    setPriceError('')
                    setPriceModalOpen(true)
                  }}
                >
                  매입가 등록
                </button>
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
            ) : purchaseRows.length === 0 ? (
              <EmptyState
                title={`${selected.name}에 등록된 매입가가 없습니다`}
                description="상품을 선택하고 매입가를 입력해 주세요."
                action={
                  availableProducts.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        setPriceProductId(availableProducts[0]?.id ?? '')
                        setPriceValue('')
                        setPriceError('')
                        setPriceModalOpen(true)
                      }}
                    >
                      매입가 등록
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>매입가</th>
                      <th>원가</th>
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
                        <td className="price">
                          {editingPrice?.id === pp.id ? (
                            <input
                              className="input input--inline"
                              type="number"
                              min="0"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                            />
                          ) : (
                            formatWon(pp.purchase_price)
                          )}
                        </td>
                        <td>{formatWon(product?.cost ?? 0)}</td>
                        <td>{formatWon(product?.shipping_fee ?? 0)}</td>
                        <td className="cell-options">{formatProductOptions(product?.options)}</td>
                        <td>{product?.carton_quantity.toLocaleString('ko-KR')}</td>
                        <td>{product?.pallet_quantity.toLocaleString('ko-KR')}</td>
                        <td>
                          <div className="row-actions">
                            {editingPrice?.id === pp.id ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn--sm btn--primary"
                                  onClick={() => {
                                    void (async () => {
                                      const result = await updatePurchasePrice(pp.id, Number(editPrice))
                                      if (!result.ok) {
                                        setPriceError(result.error)
                                        return
                                      }
                                      setEditingPrice(null)
                                    })()
                                  }}
                                >
                                  저장
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--sm"
                                  onClick={() => setEditingPrice(null)}
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
                                    setEditingPrice(pp)
                                    setEditPrice(String(pp.purchase_price))
                                  }}
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--sm btn--danger-outline"
                                  onClick={() => setDeletePriceTarget(pp)}
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

      <Modal open={priceModalOpen} title="매입가 등록" onClose={() => setPriceModalOpen(false)}>
        <form className="form" onSubmit={(e) => void handleSavePurchasePrice(e)}>
          <label className="field">
            <span>상품</span>
            <select
              className="input"
              value={priceProductId}
              onChange={(e) => setPriceProductId(e.target.value)}
            >
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>매입가 (원)</span>
            <input
              className="input"
              type="number"
              min="0"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              placeholder="예: 180"
              autoFocus
            />
          </label>
          {priceError ? <p className="form-error">{priceError}</p> : null}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setPriceModalOpen(false)}>
              취소
            </button>
            <button type="submit" className="btn btn--primary" disabled={!priceProductId}>
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
        title="매입가 삭제"
        message="이 매입처·상품 조합의 매입가를 삭제할까요?"
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
