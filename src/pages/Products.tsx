import { useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { SortSelect } from '../components/SortSelect'
import { useData } from '../context/DataContext'
import {
  formatDate,
  formatProductOptions,
  formatWon,
  productOptionsQueryText,
  vendorNamesForProduct,
} from '../lib/format'
import { compareDateDesc, compareKo, compareNumberAsc } from '../lib/sort'
import type { Product } from '../types'

type ProductSort = 'name' | 'created' | 'cost'

const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'name', label: '상품명순' },
  { value: 'created', label: '등록일순' },
  { value: 'cost', label: '원가순' },
]

type OptionDraft = {
  id?: string
  name: string
  extra_price: string
}

const emptyOption = (): OptionDraft => ({ name: '', extra_price: '' })

const emptyForm = {
  name: '',
  cost: '',
  shipping_fee: '',
  carton_quantity: '',
  pallet_quantity: '',
  options: [emptyOption()],
}

export function Products() {
  const { data, addProduct, updateProduct, deleteProduct } = useData()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ProductSort>('name')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.products
      .filter((p) => {
        if (!q) return true
        const vendors = vendorNamesForProduct(p.id, data.purchase_prices, data.suppliers).toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          productOptionsQueryText(p.options).includes(q) ||
          vendors.includes(q)
        )
      })
      .sort((a, b) => {
        if (sort === 'created') {
          const byDate = compareDateDesc(a.created_at, b.created_at)
          return byDate !== 0 ? byDate : compareKo(a.name, b.name)
        }
        if (sort === 'cost') {
          const byCost = compareNumberAsc(a.cost, b.cost)
          return byCost !== 0 ? byCost : compareKo(a.name, b.name)
        }
        return compareKo(a.name, b.name)
      })
  }, [data.products, data.purchase_prices, data.suppliers, query, sort])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, options: [emptyOption()] })
    setError('')
    setModalOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditing(product)
    setForm({
      name: product.name,
      cost: String(product.cost),
      shipping_fee: String(product.shipping_fee),
      carton_quantity: String(product.carton_quantity),
      pallet_quantity: String(product.pallet_quantity),
      options: (product.options ?? []).length
        ? product.options.map((option) => ({
            id: option.id,
            name: option.name,
            extra_price: option.extra_price ? String(option.extra_price) : '',
          }))
        : [emptyOption()],
    })
    setError('')
    setModalOpen(true)
  }

  const updateOption = (index: number, field: keyof OptionDraft, value: string) => {
    setForm((current) => ({
      ...current,
      options: (current.options ?? [emptyOption()]).map((option, i) =>
        i === index ? { ...option, [field]: value } : option,
      ),
    }))
  }

  const addOptionRow = () => {
    setForm((current) => ({
      ...current,
      options: [...(current.options ?? [emptyOption()]), emptyOption()],
    }))
  }

  const removeOptionRow = (index: number) => {
    setForm((current) => {
      const list = current.options ?? [emptyOption()]
      return {
        ...current,
        options: list.length <= 1 ? [emptyOption()] : list.filter((_, i) => i !== index),
      }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const parsedOptions: { id?: string; name: string; extra_price: number }[] = []
    for (const option of form.options ?? []) {
      const name = option.name.trim()
      const extra = option.extra_price === '' ? 0 : Number(option.extra_price)
      if (!name && extra === 0) continue
      if (!name) {
        setError('옵션명을 입력해 주세요.')
        return
      }
      if (!Number.isFinite(extra) || extra < 0) {
        setError('옵션 추가금을 올바르게 입력해 주세요.')
        return
      }
      parsedOptions.push({
        id: option.id,
        name,
        extra_price: extra,
      })
    }

    const names = parsedOptions.map((option) => option.name.toLowerCase())
    if (new Set(names).size !== names.length) {
      setError('같은 상품에 동일한 옵션명을 중복으로 넣을 수 없습니다.')
      return
    }

    const payload = {
      name: form.name,
      cost: Number(form.cost),
      shipping_fee: Number(form.shipping_fee),
      carton_quantity: Number(form.carton_quantity),
      pallet_quantity: Number(form.pallet_quantity),
      options: parsedOptions,
    }

    if (!Number.isFinite(payload.cost) || payload.cost < 0) {
      setError('원가를 올바르게 입력해 주세요.')
      return
    }
    if (!Number.isFinite(payload.shipping_fee) || payload.shipping_fee < 0) {
      setError('택배비를 올바르게 입력해 주세요.')
      return
    }
    if (!Number.isFinite(payload.carton_quantity) || payload.carton_quantity < 0) {
      setError('카톤 수량을 올바르게 입력해 주세요.')
      return
    }
    if (!Number.isFinite(payload.pallet_quantity) || payload.pallet_quantity < 0) {
      setError('파레트 수량을 올바르게 입력해 주세요.')
      return
    }

    const result = editing
      ? await updateProduct(editing.id, payload)
      : await addProduct(payload)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setModalOpen(false)
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>상품 관리</h1>
          <p className="page__desc">
            상품 기본 정보와 옵션별 추가금을 등록합니다. 매입처·매입가는 업체 관리에서 입력합니다.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          상품 등록
        </button>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="상품명, 옵션, 매입처 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SortSelect value={sort} options={PRODUCT_SORT_OPTIONS} onChange={setSort} />
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="등록된 상품이 없습니다"
          description="상품을 먼저 등록하면 공급가 입력 시 기본 정보가 자동으로 연결됩니다."
          action={
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              상품 등록하기
            </button>
          }
        />
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>원가</th>
                  <th>매입처</th>
                  <th>택배비</th>
                  <th>옵션</th>
                  <th>카톤</th>
                  <th>파레트</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{formatWon(product.cost)}</td>
                    <td>{vendorNamesForProduct(product.id, data.purchase_prices, data.suppliers)}</td>
                    <td>{formatWon(product.shipping_fee)}</td>
                    <td className="cell-options">{formatProductOptions(product.options ?? [])}</td>
                    <td>{product.carton_quantity.toLocaleString('ko-KR')}</td>
                    <td>{product.pallet_quantity.toLocaleString('ko-KR')}</td>
                    <td>{formatDate(product.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn--sm" onClick={() => openEdit(product)}>
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn btn--sm btn--danger-outline"
                          onClick={() => setDeleteTarget(product)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={modalOpen}
        title={editing ? '상품 수정' : '상품 등록'}
        onClose={() => setModalOpen(false)}
      >
        <form className="form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="field">
            <span>상품명</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 프리미엄 생수 500ml"
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>원가</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="180"
              />
            </label>
            <label className="field">
              <span>택배비</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.shipping_fee}
                onChange={(e) => setForm((f) => ({ ...f, shipping_fee: e.target.value }))}
                placeholder="3500"
              />
            </label>
            <label className="field">
              <span>카톤 수량</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.carton_quantity}
                onChange={(e) => setForm((f) => ({ ...f, carton_quantity: e.target.value }))}
                placeholder="24"
              />
            </label>
            <label className="field">
              <span>파레트 수량</span>
              <input
                className="input"
                type="number"
                min="0"
                value={form.pallet_quantity}
                onChange={(e) => setForm((f) => ({ ...f, pallet_quantity: e.target.value }))}
                placeholder="60"
              />
            </label>
          </div>
          <div className="field">
            <span>옵션 / 추가금</span>
            <p className="field-hint">옵션마다 추가금을 넣을 수 있습니다. 추가금이 없으면 비워 두거나 0원으로 입력하세요.</p>
            <div className="option-list">
              {(form.options ?? [emptyOption()]).map((option, index) => (
                <div className="option-row" key={index}>
                  <label className="field">
                    {index === 0 ? <span>옵션명</span> : <span className="sr-only">옵션명</span>}
                    <input
                      className="input"
                      value={option.name}
                      onChange={(e) => updateOption(index, 'name', e.target.value)}
                      placeholder="예: 24병/박스"
                    />
                  </label>
                  <label className="field">
                    {index === 0 ? <span>추가금</span> : <span className="sr-only">추가금</span>}
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={option.extra_price}
                      onChange={(e) => updateOption(index, 'extra_price', e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => removeOptionRow(index)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn--sm option-list__add" onClick={addOptionRow}>
              옵션 추가
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="상품 삭제"
        message={`‘${deleteTarget?.name ?? ''}’ 상품을 삭제하면 연결된 공급가도 함께 삭제됩니다. 계속할까요?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void deleteProduct(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
