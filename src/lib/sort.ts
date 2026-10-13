export function compareKo(a: string, b: string) {
  return a.localeCompare(b, 'ko')
}

/** 등록일순 — 최신 먼저 */
export function compareDateDesc(a?: string | null, b?: string | null) {
  return (b ?? '').localeCompare(a ?? '')
}

export function compareNumberAsc(a: number, b: number) {
  return a - b
}

export function compareNumberDesc(a: number, b: number) {
  return b - a
}
