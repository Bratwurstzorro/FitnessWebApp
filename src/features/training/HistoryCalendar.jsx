import { monthCells, shiftMonth, trainingDays } from './historyCalendar'

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function HistoryCalendar({month, sessions, selectedDay, onDayChange, onMonthChange}) {
  const markedDays = trainingDays(sessions)
  const today = new Date()
  const sameMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth()
  const title = month.toLocaleDateString('de-DE', {month: 'long', year: 'numeric'})
  return <section className="card history-calendar" aria-label="Trainingskalender">
    <div className="history-calendar-heading">
      <button type="button" aria-label="Vorheriger Monat" onClick={() => onMonthChange(shiftMonth(month, -1))}>‹</button>
      <h3 aria-live="polite"><button type="button" className="history-calendar-month" aria-label={`Alle Workouts im ${title} anzeigen`} aria-pressed={selectedDay===null} onClick={() => onDayChange(null)}>{title}</button></h3>
      <button type="button" aria-label="Nächster Monat" onClick={() => onMonthChange(shiftMonth(month, 1))}>›</button>
    </div>
    <div className="history-calendar-grid">
      {weekdays.map(day => <span className="history-calendar-weekday" key={day}>{day}</span>)}
      {monthCells(month).map((day, index) => day === null
        ? <span key={index} aria-hidden="true"/>
        : <button type="button" key={index} className={`history-calendar-day ${sameMonth && day === today.getDate() ? 'is-today' : ''} ${selectedDay===day ? 'is-selected' : ''}`}
            aria-pressed={selectedDay===day} onClick={() => onDayChange(day)}
            aria-current={sameMonth && day === today.getDate() ? 'date' : undefined}
            aria-label={`${day}. ${title}${markedDays.has(day) ? ', trainiert' : ''}`}>
            <span>{day}</span><span className={`history-calendar-dot ${markedDays.has(day) ? 'is-trained' : ''}`} aria-hidden="true"/>
          </button>)}
    </div>
  </section>
}
