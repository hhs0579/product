import type {
  AppData,
  PartnerKind,
  Product,
  ProductInput,
  PurchasePrice,
  Supplier,
  SupplyPrice,
} from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || '요청에 실패했습니다.')
  }
  return payload as T
}

export const api = {
  getData: () => request<AppData>('/data'),
  createSupplier: (name: string, kind: PartnerKind) =>
    request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name, kind }),
    }),
  updateSupplier: (id: string, name: string) =>
    request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteSupplier: (id: string) =>
    request<void>(`/suppliers/${id}`, { method: 'DELETE' }),
  createProduct: (input: ProductInput) =>
    request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProduct: (id: string, input: ProductInput) =>
    request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),
  upsertSupplyPrice: (
    supplierId: string,
    productId: string,
    optionId: string | null,
    supplyPrice: number,
    shippingFee: number,
  ) =>
    request<{ item: SupplyPrice; updated: boolean }>('/supply-prices', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: supplierId,
        product_id: productId,
        option_id: optionId,
        supply_price: supplyPrice,
        shipping_fee: shippingFee,
      }),
    }),
  updateSupplyPrice: (id: string, supplyPrice: number, shippingFee: number) =>
    request<SupplyPrice>(`/supply-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ supply_price: supplyPrice, shipping_fee: shippingFee }),
    }),
  deleteSupplyPrice: (id: string) =>
    request<void>(`/supply-prices/${id}`, { method: 'DELETE' }),
  upsertPurchasePrice: (supplierId: string, productId: string, purchasePrice: number) =>
    request<{ item: PurchasePrice; updated: boolean }>('/purchase-prices', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: supplierId,
        product_id: productId,
        purchase_price: purchasePrice,
      }),
    }),
  updatePurchasePrice: (id: string, purchasePrice: number) =>
    request<PurchasePrice>(`/purchase-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ purchase_price: purchasePrice }),
    }),
  deletePurchasePrice: (id: string) =>
    request<void>(`/purchase-prices/${id}`, { method: 'DELETE' }),
  resetData: () =>
    request<AppData>('/reset', {
      method: 'POST',
    }),
}
