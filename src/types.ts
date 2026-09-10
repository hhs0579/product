export type PartnerKind = 'sales' | 'purchase'

export type Supplier = {
  id: string
  name: string
  kind: PartnerKind
  created_at: string
}

export type ProductOption = {
  id: string
  name: string
  extra_price: number
}

export type ProductInput = {
  name: string
  cost: number
  shipping_fee: number
  carton_quantity: number
  pallet_quantity: number
  options: { id?: string; name: string; extra_price: number }[]
}

export type Product = {
  id: string
  name: string
  cost: number
  shipping_fee: number
  carton_quantity: number
  pallet_quantity: number
  options: ProductOption[]
  created_at: string
}

export type SupplyPrice = {
  id: string
  supplier_id: string
  product_id: string
  option_id: string | null
  supply_price: number
  shipping_fee: number
  created_at: string
  updated_at: string
}

export type PurchasePrice = {
  id: string
  supplier_id: string
  product_id: string
  purchase_price: number
  created_at: string
  updated_at: string
}

export type AppData = {
  suppliers: Supplier[]
  products: Product[]
  supply_prices: SupplyPrice[]
  purchase_prices: PurchasePrice[]
}
