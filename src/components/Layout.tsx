import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', end: true },
  { to: '/suppliers', label: '업체 관리' },
  { to: '/products', label: '상품 관리' },
  { to: '/supply-prices', label: '공급가 관리' },
  { to: '/margin', label: '마진 계산' },
  { to: '/by-product', label: '상품별 보기' },
  { to: '/by-supplier', label: '업체별 보기' },
]

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__mark">SP</span>
          <div>
            <strong>공급가 관리</strong>
            <p>매출처 · 매입처 · 상품</p>
          </div>
        </div>
        <nav className="sidebar__nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <div className="topbar__title">
            <span>공급가 관리 시스템</span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
