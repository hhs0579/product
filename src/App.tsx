import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DataProvider } from './context/DataContext'
import { ByProduct } from './pages/ByProduct'
import { BySupplier } from './pages/BySupplier'
import { Dashboard } from './pages/Dashboard'
import { Margin } from './pages/Margin'
import { Products } from './pages/Products'
import { Suppliers } from './pages/Suppliers'
import { SupplyPrices } from './pages/SupplyPrices'

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="products" element={<Products />} />
            <Route path="supply-prices" element={<SupplyPrices />} />
            <Route path="margin" element={<Margin />} />
            <Route path="by-product" element={<ByProduct />} />
            <Route path="by-supplier" element={<BySupplier />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
