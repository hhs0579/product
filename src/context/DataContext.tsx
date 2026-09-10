import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type {
  AppData,
  PartnerKind,
  Product,
  ProductInput,
  PurchasePrice,
  Supplier,
  SupplyPrice,
} from '../types'

type Result<T> = Promise<{ ok: true; value: T } | { ok: false; error: string }>
type VoidResult = Promise<{ ok: true } | { ok: false; error: string }>

type DataContextValue = {
  data: AppData
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addSupplier: (name: string, kind: PartnerKind) => Result<Supplier>
  updateSupplier: (id: string, name: string) => VoidResult
  deleteSupplier: (id: string) => VoidResult
  addProduct: (input: ProductInput) => Result<Product>
  updateProduct: (id: string, input: ProductInput) => VoidResult
  deleteProduct: (id: string) => VoidResult
  upsertSupplyPrice: (
    supplierId: string,
    productId: string,
    optionId: string | null,
    supplyPrice: number,
    shippingFee: number,
  ) => Result<{ item: SupplyPrice; updated: boolean }>
  upsertSupplyPrices: (
    supplierId: string,
    items: {
      productId: string
      optionId: string | null
      supplyPrice: number
      shippingFee: number
    }[],
  ) => Result<{ created: number; updated: number }>
  updateSupplyPrice: (id: string, supplyPrice: number, shippingFee: number) => VoidResult
  deleteSupplyPrice: (id: string) => VoidResult
  upsertPurchasePrice: (
    supplierId: string,
    productId: string,
    purchasePrice: number,
  ) => Result<{ item: PurchasePrice; updated: boolean }>
  updatePurchasePrice: (id: string, purchasePrice: number) => VoidResult
  deletePurchasePrice: (id: string) => VoidResult
  resetData: () => VoidResult
}

const emptyData: AppData = {
  suppliers: [],
  products: [],
  supply_prices: [],
  purchase_prices: [],
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const next = await api.getData()
    setData(next)
    setError(null)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const next = await api.getData()
        if (!alive) return
        setData(next)
        setError(null)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const addSupplier = useCallback(async (name: string, kind: PartnerKind) => {
    try {
      const supplier = await api.createSupplier(name, kind)
      await refresh()
      return { ok: true as const, value: supplier }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '등록에 실패했습니다.',
      }
    }
  }, [refresh])

  const updateSupplier = useCallback(async (id: string, name: string) => {
    try {
      await api.updateSupplier(id, name)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '수정에 실패했습니다.',
      }
    }
  }, [refresh])

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      await api.deleteSupplier(id)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '삭제에 실패했습니다.',
      }
    }
  }, [refresh])

  const addProduct = useCallback(
    async (input: ProductInput) => {
      try {
        const product = await api.createProduct(input)
        await refresh()
        return { ok: true as const, value: product }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : '등록에 실패했습니다.',
        }
      }
    },
    [refresh],
  )

  const updateProduct = useCallback(
    async (id: string, input: ProductInput) => {
      try {
        await api.updateProduct(id, input)
        await refresh()
        return { ok: true as const }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : '수정에 실패했습니다.',
        }
      }
    },
    [refresh],
  )

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await api.deleteProduct(id)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '삭제에 실패했습니다.',
      }
    }
  }, [refresh])

  const upsertSupplyPrice = useCallback(
    async (
      supplierId: string,
      productId: string,
      optionId: string | null,
      supplyPrice: number,
      shippingFee: number,
    ) => {
      try {
        const result = await api.upsertSupplyPrice(
          supplierId,
          productId,
          optionId,
          supplyPrice,
          shippingFee,
        )
        await refresh()
        return { ok: true as const, value: result }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : '저장에 실패했습니다.',
        }
      }
    },
    [refresh],
  )

  const upsertSupplyPrices = useCallback(
    async (
      supplierId: string,
      items: {
        productId: string
        optionId: string | null
        supplyPrice: number
        shippingFee: number
      }[],
    ) => {
      try {
        let created = 0
        let updated = 0
        for (const item of items) {
          const result = await api.upsertSupplyPrice(
            supplierId,
            item.productId,
            item.optionId,
            item.supplyPrice,
            item.shippingFee,
          )
          if (result.updated) updated += 1
          else created += 1
        }
        await refresh()
        return { ok: true as const, value: { created, updated } }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : '저장에 실패했습니다.',
        }
      }
    },
    [refresh],
  )

  const updateSupplyPrice = useCallback(async (id: string, supplyPrice: number, shippingFee: number) => {
    try {
      await api.updateSupplyPrice(id, supplyPrice, shippingFee)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '수정에 실패했습니다.',
      }
    }
  }, [refresh])

  const deleteSupplyPrice = useCallback(async (id: string) => {
    try {
      await api.deleteSupplyPrice(id)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '삭제에 실패했습니다.',
      }
    }
  }, [refresh])

  const upsertPurchasePrice = useCallback(
    async (supplierId: string, productId: string, purchasePrice: number) => {
      try {
        const result = await api.upsertPurchasePrice(supplierId, productId, purchasePrice)
        await refresh()
        return { ok: true as const, value: result }
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : '저장에 실패했습니다.',
        }
      }
    },
    [refresh],
  )

  const updatePurchasePrice = useCallback(async (id: string, purchasePrice: number) => {
    try {
      await api.updatePurchasePrice(id, purchasePrice)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '수정에 실패했습니다.',
      }
    }
  }, [refresh])

  const deletePurchasePrice = useCallback(async (id: string) => {
    try {
      await api.deletePurchasePrice(id)
      await refresh()
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '삭제에 실패했습니다.',
      }
    }
  }, [refresh])

  const resetData = useCallback(async () => {
    try {
      const next = await api.resetData()
      setData(next)
      return { ok: true as const }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : '복원에 실패했습니다.',
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addProduct,
      updateProduct,
      deleteProduct,
      upsertSupplyPrice,
      upsertSupplyPrices,
      updateSupplyPrice,
      deleteSupplyPrice,
      upsertPurchasePrice,
      updatePurchasePrice,
      deletePurchasePrice,
      resetData,
    }),
    [
      data,
      loading,
      error,
      refresh,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addProduct,
      updateProduct,
      deleteProduct,
      upsertSupplyPrice,
      upsertSupplyPrices,
      updateSupplyPrice,
      deleteSupplyPrice,
      upsertPurchasePrice,
      updatePurchasePrice,
      deletePurchasePrice,
      resetData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData는 DataProvider 안에서만 사용할 수 있습니다.')
  return ctx
}
