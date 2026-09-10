import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { formatWon, supplyOptionName } from '../lib/format'

export function Dashboard() {
  const { data, loading, error, resetData } = useData()

  const cheapest = [...data.supply_prices]
    .sort((a, b) => a.supply_price - b.supply_price)
    .slice(0, 3)
    .map((sp) => {
      const product = data.products.find((p) => p.id === sp.product_id)
      const supplier = data.suppliers.find((s) => s.id === sp.supplier_id)
      return { sp, product, supplier }
    })

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
        <p className="muted">Docker DB와 API 서버가 실행 중인지 확인해 주세요.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>대시보드</h1>
          <p className="page__desc">매출처·매입처·상품·공급가 현황을 한눈에 확인하세요.</p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            void resetData()
          }}
        >
          샘플 데이터 복원
        </button>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">매출처</span>
          <strong className="stat-card__value">
            {data.suppliers.filter((s) => s.kind === 'sales').length}
          </strong>
          <Link to="/suppliers" className="stat-card__link">
            업체 관리 →
          </Link>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">매입처</span>
          <strong className="stat-card__value">
            {data.suppliers.filter((s) => s.kind === 'purchase').length}
          </strong>
          <Link to="/suppliers" className="stat-card__link">
            매입처 관리 →
          </Link>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">전체 상품</span>
          <strong className="stat-card__value">{data.products.length}</strong>
          <Link to="/products" className="stat-card__link">
            상품 관리 →
          </Link>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">등록 공급가</span>
          <strong className="stat-card__value">{data.supply_prices.length}</strong>
          <Link to="/supply-prices" className="stat-card__link">
            공급가 관리 →
          </Link>
        </article>
      </div>

      <section className="panel">
        <div className="panel__header">
          <h2>빠른 이동</h2>
        </div>
        <div className="quick-links">
          <Link to="/by-product" className="quick-link">
            <strong>상품별 보기</strong>
            <span>상품을 고르고 업체별 공급가를 비교합니다.</span>
          </Link>
          <Link to="/by-supplier" className="quick-link">
            <strong>업체별 보기</strong>
            <span>매출처를 고르고 취급 상품을 조회합니다.</span>
          </Link>
          <Link to="/margin" className="quick-link">
            <strong>마진 계산</strong>
            <span>매출처·상품·수량으로 원가·공급가·마진을 계산합니다.</span>
          </Link>
          <Link to="/supply-prices" className="quick-link">
            <strong>공급가 등록</strong>
            <span>매출처 → 상품 → 공급가 순으로 입력합니다.</span>
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>최저 공급가 TOP 3</h2>
        </div>
        {cheapest.length === 0 ? (
          <p className="muted">등록된 공급가가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>상품</th>
                  <th>업체</th>
                  <th>공급가</th>
                </tr>
              </thead>
              <tbody>
                {cheapest.map((row, index) => (
                  <tr key={row.sp.id}>
                    <td>{index + 1}</td>
                    <td>
                      {row.product?.name ?? '-'}
                      {row.product
                        ? ` · ${supplyOptionName(row.product, row.sp.option_id)}`
                        : ''}
                    </td>
                    <td>{row.supplier?.name ?? '-'}</td>
                    <td className="price price--best">{formatWon(row.sp.supply_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
