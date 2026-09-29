export function acceptsNumericDraft(value,kind) {
  return kind === 'weight'
    ? /^\d*(?:[.,]\d{0,2})?$/.test(value)
    : /^\d*$/.test(value)
}

export function parseNumeric(value) {
  return Number(value.replace(',','.'))
}
