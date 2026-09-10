import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useData } from '../context/DataContext'
import { formatProductOptions, formatWon, optionCost, partnerLabel, supplyOptionName } from '../lib/format'
import type { PartnerKind } from '../types'

export function BySupplier() {
  const { data } = useData()
  const [kind, setKind] = useState<PartnerKind>('sales')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [supplierQuery, setSupplierQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')

  const label = partnerLabel(kind)

  const partners = useMemo(() => {
    const q = supplierQuery.trim().toLowerCase()
    return data.suppliers
      .filter((s) => s.kind === kind)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [data.suppliers, kind, supplierQuery])

  useEffect(() => {
    setSelectedId(null)
    setProductQuery('')
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

  const rows = useMemo(() => {
    if (!selected) return []
    const q = productQuery.trim().toLowerCase()
    if (kind === 'sales') {
      return data.supply_prices
        .filter((sp) => sp.supplier_id === selected.id)
        .map((sp) => ({
          id: sp.id,
          price: sp.supply_price,
          shippingFee: sp.shipping_fee ?? 0,
          optionId: sp.option_id,
          product: data.products.find((p) => p.id === sp.product_id),
        }))
        .filter((row) => {
          if (!row.product) return false
          if (!q) return true
          return row.product.name.toLowerCase().includes(q)
        })
        .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ko'))
    }
    return data.purchase_prices
      .filter((pp) => pp.supplier_id === selected.id)
        .map((pp) => ({
          id: pp.id,
          price: pp.purchase_price,
          shippingFee: data.products.find((p) => p.id === pp.product_id)?.shipping_fee ?? 0,
          optionId: null as string | null,
          product: data.products.find((p) => p.id === pp.product_id),
        }))
      .filter((row) => {
        if (!row.product) return false
        if (!q) return true
        return row.product.name.toLowerCase().includes(q)
      })
      .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'ko'))
  }, [data.products, data.purchase_prices, data.supply_prices, kind, productQuery, selected])

  if (partners.length === 0 && !supplierQuery) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <h1>업체별 보기</h1>
            <p className="page__desc">매출처·매입처를 선택하고 취급 상품을 조회합니다.</p>
          </div>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={`tab ${kind === 'sales' ? 'tab--active' : ''}`}
            onClick={() => setKind('sales')}
          >
            매출처
          </button>
          <button
            type="button"
            className={`tab ${kind === 'purchase' ? 'tab--active' : ''}`}
            onClick={() => setKind('purchase')}
          >
            매입처
          </button>
        </div>
        <EmptyState
          title={`등록된 ${label}가 없습니다`}
          description="업체 관리에서 등록한 뒤 가격을 연결하면 조회할 수 있습니다."
          action={
            <Link to="/suppliers" className="btn btn--primary">
              업체 관리로 이동
            </Link>
          }
        />
      </div>
    )
  }

  const priceLabel = kind === 'sales' ? '공급가' : '매입가'

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>업체별 보기</h1>
          <p className="page__desc">매출처와 매입처를 나눠 상품과 가격을 확인합니다.</p>
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${kind === 'sales' ? 'tab--active' : ''}`}
          onClick={() => setKind('sales')}
        >
          매출처
        </button>
        <button
          type="button"
          className={`tab ${kind === 'purchase' ? 'tab--active' : ''}`}
          onClick={() => setKind('purchase')}
        >
          매입처
        </button>
      </div>

      <div className="split-view">
        <section className="panel">
          <div className="panel__header">
            <h2>{label} 목록</h2>
          </div>
          <div className="toolbar">
            <input
              className="input"
              placeholder={`${label}명 검색`}
              value={supplierQuery}
              onChange={(e) => setSupplierQuery(e.target.value)}
            />
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
                <button
                  key={supplier.id}
                  type="button"
                  className={`list-item ${selectedId === supplier.id ? 'list-item--active' : ''}`}
                  onClick={() => {
                    setSelectedId(supplier.id)
                    setProductQuery('')
                  }}
                >
                  <div>
                    <strong>{supplier.name}</strong>
                    <span className="muted">상품 {count}개</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header panel__header--row">
            <div>
              <h2>{selected?.name ?? `${label} 선택`}</h2>
              <p className="muted">상품명으로 필터링할 수 있습니다.</p>
            </div>
          </div>

          {!selected ? (
            <EmptyState
              title={`${label}를 선택하세요`}
              description={`왼쪽에서 ${label}를 고르면 취급 상품 목록이 표시됩니다.`}
            />
          ) : (
            <>
              <div className="toolbar">
                <input
                  className="input"
                  placeholder="상품명 검색"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                />
              </div>
              {rows.length === 0 ? (
                <EmptyState
                  title={productQuery ? '검색 결과가 없습니다' : `이 ${label}에 등록된 상품이 없습니다`}
                  description={
                    productQuery
                      ? '다른 상품명으로 다시 검색해 보세요.'
                      : kind === 'sales'
                        ? '공급가 관리에서 상품을 연결해 주세요.'
                        : '업체 관리의 매입처에서 매입가를 입력해 주세요.'
                  }
                  action={
                    !productQuery ? (
                      <Link
                        to={kind === 'sales' ? '/supply-prices' : '/suppliers'}
                        className="btn btn--primary"
                      >
                        {kind === 'sales' ? '공급가 등록' : '매입가 등록'}
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>상품명</th>
                        <th>{priceLabel}</th>
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
                            <strong>{row.product?.name}</strong>
                          </td>
                          <td className="price">{formatWon(row.price)}</td>
                          <td>
                            {formatWon(
                              kind === 'sales'
                                ? optionCost(row.product, row.optionId)
                                : (row.product?.cost ?? 0),
                            )}
                          </td>
                          <td>{formatWon(row.shippingFee)}</td>
                          <td className="cell-options">
                            {kind === 'sales'
                              ? supplyOptionName(row.product, row.optionId)
                              : formatProductOptions(row.product?.options)}
                          </td>
                          <td>{row.product?.carton_quantity.toLocaleString('ko-KR')}</td>
                          <td>{row.product?.pallet_quantity.toLocaleString('ko-KR')}</td>
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
    </div>
  )
}
