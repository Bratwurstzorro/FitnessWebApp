export function monthStart(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

export function shiftMonth(month, offset) {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1)
}

export function historyForMonth(sessions, month) {
  return sessions.filter(session => {
    if (!session.finished_at) return false
    const stamp = new Date(session.finished_at)
    return stamp.getFullYear() === month.getFullYear() && stamp.getMonth() === month.getMonth()
  }).sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at))
}

export function trainingDays(sessions) {
  return new Set(sessions.filter(s => s.finished_at).map(s => new Date(s.finished_at).getDate()))
}

export function monthCells(month) {
  const first = monthStart(month)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return Array.from({length: Math.ceil((offset + days) / 7) * 7}, (_, index) => {
    const day = index - offset + 1
    return day >= 1 && day <= days ? day : null
  })
}
