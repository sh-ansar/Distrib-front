// Search across legal entities and retail outlets. No network or external API is involved.
export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

export function matchesSearch(query: string, fields: Array<string | number | null | undefined>): boolean {
  const normalized = normalizeSearch(query)
  if (!normalized) return true
  const parts = normalized.split(' ')
  const combined = fields.map(v => normalizeSearch(String(v ?? ''))).join(' ')
  const digits = fields.map(v => String(v ?? '').replace(/\D/g, '')).join(' ')
  const queryDigits = query.replace(/\D/g, '')
  return parts.every(part => combined.includes(part)) || (queryDigits.length >= 5 && digits.includes(queryDigits))
}
