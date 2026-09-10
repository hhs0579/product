import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { useData } from '../context/DataContext'
import { formatProductOptions, formatWon, optionCost, supplyOptionName, vendorNamesForProduct } from '../lib/format'

type SortDir = 'asc' | 'desc'

export function ByProduct() {
  const { data } = useData()
  const [selectedId, setSelectedId] = useState<string | null>(
    data.products[0]?.id ?? null,
  )
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [query, setQuery] = useState('')

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.products
      .filter((p) => {
        if (!q) return true
        const vendors = vendorNamesForProduct(p.id, data.purchase_prices, data.suppliers).toLowerCase()
        return p.name.toLowerCase().includes(q) || vendors.includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [data.products, data.purchase_prices, data.suppliers, query])

  const selected = data.products.find((p) => p.id === selectedId) ?? null

  const rows = useMemo(() => {
    if (!selected) return []
    const list = data.supply_prices
      .filter((sp) => sp.product_id === selected.id)
      .map((sp) => ({
        sp,
        supplier: data.suppliers.find((s) => s.id === sp.supplier_id),
      }))
      .filter((row) => row.supplier)

    return list.sort((a, b) =>
      sortDir === 'asc'
        ? a.sp.supply_price - b.sp.supply_price
        : b.sp.supply_price - a.sp.supply_price,
    )
  }, [data.suppliers, data.supply_prices, selected, sortDir])

  const minPrice = rows.length
    ? Math.min(...rows.map((r) => r.sp.supply_price))
    : null

  const purchaseRows = useMemo(() => {
    if (!selected) return []
    return data.purchase_prices
      .filter((pp) => pp.product_id === selected.id)
      .map((pp) => ({
        pp,
        vendor: data.suppliers.find((s) => s.id === pp.supplier_id),
      }))
      .filter((row) => row.vendor)
      .sort((a, b) => a.pp.purchase_price - b.pp.purchase_price)
  }, [data.purchase_prices, data.suppliers, selected])

  if (data.products.length === 0) {
    return (
      <div className="page">
        <div className="page__header">
          <div>
            <h1>상품별 보기</h1>
            <p className="page__desc">상품을 선택하고 업체별 공급가를 비교합니다.</p>
          </div>
        </div>
        <EmptyState
          title="등록된 상품이 없습니다"
          description="상품을 등록한 뒤 공급가를 연결하면 비교 화면을 사용할 수 있습니다."
          action={
            <Link to="/products" className="btn btn--primary">
              상품 관리로 이동
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>상품별 보기</h1>
          <p className="page__desc">상품을 선택하면 취급 업체와 공급가를 비교할 수 있습니다.</p>
        </div>
      </div>

      <div className="split-view">
        <section className="panel">
          <div className="panel__header">
            <h2>상품 목록</h2>
          </div>
          <div className="toolbar">
            <input
              className="input"
              placeholder="상품명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="list">
            {products.map((product) => {
              const count = new Set(
                data.supply_prices
                  .filter((sp) => sp.product_id === product.id)
                  .map((sp) => sp.supplier_id),
              ).size
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`list-item ${selectedId === product.id ? 'list-item--active' : ''}`}
                  onClick={() => setSelectedId(product.id)}
                >
                  <div>
                    <strong>{product.name}</strong>
                    <span className="muted">
                      원가 {formatWon(product.cost)} · 매입처{' '}
                      {vendorNamesForProduct(product.id, data.purchase_prices, data.suppliers)} · 매출처{' '}
                      {count}곳
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel__header panel__header--row">
            <div>
              <h2>{selected?.name ?? '상품 선택'}</h2>
              {selected ? (
                <p className="muted">
                  매입처 {vendorNamesForProduct(selected.id, data.purchase_prices, data.suppliers)} · 택배비{' '}
                  {formatWon(selected.shipping_fee)} ·
                  옵션 {formatProductOptions(selected.options)} · 카톤 {selected.carton_quantity} · 파레트{' '}
                  {selected.pallet_quantity}
                </p>
              ) : null}
            </div>
            <div className="sort-toggle">
              <button
                type="button"
                className={`btn btn--sm ${sortDir === 'asc' ? 'btn--primary' : ''}`}
                onClick={() => setSortDir('asc')}
              >
                공급가 ↑
              </button>
              <button
                type="button"
                className={`btn btn--sm ${sortDir === 'desc' ? 'btn--primary' : ''}`}
                onClick={() => setSortDir('desc')}
              >
                공급가 ↓
              </button>
            </div>
          </div>

          {!selected ? (
            <EmptyState
              title="상품을 선택하세요"
              description="왼쪽에서 상품을 고르면 매출처 공급가와 매입처 매입가를 볼 수 있습니다."
            />
          ) : (
            <>
              {rows.length === 0 ? (
                <EmptyState
                  title="이 상품의 공급가가 없습니다"
                  description="공급가 관리에서 매출처를 연결해 주세요."
                  action={
                    <Link to="/supply-prices" className="btn btn--primary">
                      공급가 등록
                    </Link>
                  }
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>매출처</th>
                        <th>공급가</th>
                        <th>상품 원가</th>
                        <th>택배비</th>
                        <th>옵션</th>
                        <th>카톤</th>
                        <th>파레트</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ sp, supplier }) => {
                        const isBest = sp.supply_price === minPrice
                        return (
                          <tr key={sp.id} className={isBest ? 'row--best' : undefined}>
                            <td>
                              {supplier?.name}
                              {isBest ? <span className="badge">최저가</span> : null}
                            </td>
                            <td className={`price ${isBest ? 'price--best' : ''}`}>
                              {formatWon(sp.supply_price)}
                            </td>
                            <td>{formatWon(optionCost(selected, sp.option_id))}</td>
                            <td>{formatWon(sp.shipping_fee ?? 0)}</td>
                            <td className="cell-options">{supplyOptionName(selected, sp.option_id)}</td>
                            <td>{selected.carton_quantity.toLocaleString('ko-KR')}</td>
                            <td>{selected.pallet_quantity.toLocaleString('ko-KR')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="panel__header" style={{ marginTop: '1.2rem' }}>
                <h2>매입처 매입가</h2>
              </div>
              {purchaseRows.length === 0 ? (
                <p className="muted">등록된 매입가가 없습니다. 업체 관리의 매입처에서 입력하세요.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>매입처</th>
                        <th>매입가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseRows.map(({ pp, vendor }) => (
                        <tr key={pp.id}>
                          <td>{vendor?.name}</td>
                          <td className="price">{formatWon(pp.purchase_price)}</td>
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
