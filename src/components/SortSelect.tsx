type SortOption<T extends string> = {
  value: T
  label: string
}

type SortSelectProps<T extends string> = {
  value: T
  options: SortOption<T>[]
  onChange: (value: T) => void
  label?: string
}

export function SortSelect<T extends string>({
  value,
  options,
  onChange,
  label = '정렬',
}: SortSelectProps<T>) {
  return (
    <label className="sort-select">
      <span className="sr-only">{label}</span>
      <select
        className="input input--sort"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
