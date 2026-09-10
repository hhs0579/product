export function formatWon(value: number): string {
  return `₩${value.toLocaleString('ko-KR')}`
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('ko-KR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function partnerLabel(kind: 'sales' | 'purchase'): string {
  return kind === 'purchase' ? '매입처' : '매출처'
}

export function formatProductOptions(
  options: { name: string; extra_price: number }[] | undefined,
): string {
  if (!options?.length) return '-'
  return options
    .map((option) =>
      option.extra_price > 0
        ? `${option.name} (+${formatWon(option.extra_price)})`
        : option.name,
    )
    .join(', ')
}

export function productOptionsQueryText(
  options: { name: string }[] | undefined,
): string {
  return (options ?? []).map((option) => option.name).join(' ').toLowerCase()
}

export function supplyOptionName(
  product: { options?: { id: string; name: string }[] } | undefined,
  optionId: string | null | undefined,
): string {
  if (!optionId) return '기준'
  return product?.options?.find((item) => item.id === optionId)?.name ?? '-'
}

export function optionCost(
  product: { cost: number; options?: { id: string; extra_price: number }[] } | undefined,
  optionId: string | null | undefined,
): number {
  const base = product?.cost ?? 0
  if (!optionId) return base
  const extra = product?.options?.find((item) => item.id === optionId)?.extra_price ?? 0
  return base + extra
}

export function vendorNamesForProduct(
  productId: string,
  purchasePrices: { supplier_id: string; product_id: string }[],
  suppliers: { id: string; name: string }[],
): string {
  const names = purchasePrices
    .filter((pp) => pp.product_id === productId)
    .map((pp) => suppliers.find((s) => s.id === pp.supplier_id)?.name)
    .filter((name): name is string => Boolean(name))
  return names.length ? names.join(', ') : '-'
}
