import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from './lib/supabase'
import './styles.css'

const HEIGHT_METRIC = { key: 'height_cm', label: 'Größe', unit: 'cm', decimals: 0, icon: '📏' }

const METRICS = [
  { key: 'weight_kg', label: 'Gewicht', unit: 'kg', decimals: 1, icon: '⚖️' },
  { key: 'arm_left_cm', label: 'Arm links', unit: 'cm', decimals: 1, icon: '💪' },
  { key: 'arm_right_cm', label: 'Arm rechts', unit: 'cm', decimals: 1, icon: '💪' },
  { key: 'thigh_left_cm', label: 'Oberschenkel links', unit: 'cm', decimals: 1, icon: '🦵' },
  { key: 'thigh_right_cm', label: 'Oberschenkel rechts', unit: 'cm', decimals: 1, icon: '🦵' },
  { key: 'abdomen_cm', label: 'Bauchumfang', unit: 'cm', decimals: 1, icon: '◌' },
  { key: 'waist_cm', label: 'Taille', unit: 'cm', decimals: 1, icon: '◌' },
  { key: 'chest_cm', label: 'Brustumfang', unit: 'cm', decimals: 1, icon: '🫁' },
  { key: 'calf_left_cm', label: 'Wade links', unit: 'cm', decimals: 1, icon: '🦵' },
  { key: 'calf_right_cm', label: 'Wade rechts', unit: 'cm', decimals: 1, icon: '🦵' },
]

const CHART_RANGES = [
  { key: '1m', label: '1 Monat', shortLabel: '1M' },
  { key: '3m', label: '3 Monate', shortLabel: '3M' },
  { key: '6m', label: '6 Monate', shortLabel: '6M' },
  { key: '1y', label: '1 Jahr', shortLabel: '1J' },
  { key: '2y', label: '2 Jahre', shortLabel: '2J' },
  { key: 'all', label: 'Gesamt', shortLabel: 'Gesamt' },
]

const VALID_CHART_RANGES = new Set(CHART_RANGES.map((range) => range.key))

function normalizeChartRange(value) {
  return VALID_CHART_RANGES.has(value) ? value : 'all'
}

function sanitizeNumericInput(value) {
  const normalized = String(value).replace('.', ',')
  const cleaned = normalized.replace(/[^0-9,]/g, '')
  const [whole, ...fractionParts] = cleaned.split(',')
  return fractionParts.length ? `${whole},${fractionParts.join('')}` : whole
}

function inputValue(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value).replace('.', ',')
}

function measurementForm({ initialValues = {}, row = null } = {}) {
  return {
    measured_at: row?.measured_at || new Date().toISOString().slice(0, 10),
    ...Object.fromEntries(
      METRICS.map((metric) => [metric.key, inputValue(row ? row[metric.key] : initialValues[metric.key])]),
    ),
  }
}

function formatValue(value, decimals = 1) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  )
}

function cutoffDate(dateString, range) {
  if (range === 'all') return null

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0, 0)

  if (range.endsWith('m')) {
    date.setMonth(date.getMonth() - Number(range.slice(0, -1)))
  } else if (range.endsWith('y')) {
    date.setFullYear(date.getFullYear() - Number(range.slice(0, -1)))
  }

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function rowsForRange(rows, metric, range) {
  const metricRows = rows.filter(
    (row) => row[metric.key] !== null && row[metric.key] !== undefined,
  )

  if (!metricRows.length || range === 'all') return metricRows

  const latestDate = metricRows.reduce(
    (latest, row) => (row.measured_at > latest ? row.measured_at : latest),
    metricRows[0].measured_at,
  )
  const cutoff = cutoffDate(latestDate, range)
  return metricRows.filter((row) => row.measured_at >= cutoff && row.measured_at <= latestDate)
}

function ChartTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.payload
  if (!point?.measured_at) return null

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{formatDate(point.measured_at)}</div>
      <div>
        <strong>{metric.label}:</strong> {formatValue(point.value, metric.decimals)} {metric.unit}
      </div>
    </div>
  )
}

function MetricChart({ rows, metric, large = false }) {
  const chartRows = [...rows]
    .filter((row) => row[metric.key] !== null && row[metric.key] !== undefined)
    .sort((a, b) =>
      `${a.measured_at}${a.created_at || ''}`.localeCompare(`${b.measured_at}${b.created_at || ''}`),
    )
    .map((row) => ({ ...row, value: Number(row[metric.key]) }))

  if (!chartRows.length) {
    return <div className={large ? 'empty-chart large-empty-chart' : 'empty-chart'}>Keine Daten in diesem Zeitraum</div>
  }

  return (
    <ResponsiveContainer width="100%" height={large ? 340 : 88}>
      <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        {large && <Tooltip content={<ChartTooltip metric={metric} />} />}
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent)"
          strokeWidth={large ? 3 : 2}
          dot={large ? { r: 4, fill: 'var(--accent)' } : false}
          activeDot={large ? { r: 6 } : false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    try {
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })

      if (result.error) throw result.error
      if (mode === 'register' && !result.data.session) {
        setMessage('Registrierung erfolgreich. Prüfe deine E-Mail zur Bestätigung.')
      }
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand large-brand">
          <span className="brand-mark">BT</span>
          <div>
            <strong>BodyTrack</strong>
            <span>Körpermaße im Blick</span>
          </div>
        </div>
        <div className="auth-copy">
          <h1>{mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h1>
          <p>Speichere deine Messungen und verfolge deine Entwicklung über die Zeit.</p>
        </div>
        <form onSubmit={submit} className="stack">
          <label>
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <button className="primary-button" disabled={busy}>
            {busy ? 'Bitte warten …' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
        <button className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon registriert? Anmelden'}
        </button>
      </section>
    </main>
  )
}

function ProfileModal({ height, overviewChartRange, onClose, onSave, saving }) {
  const [value, setValue] = useState(inputValue(height))
  const [chartRange, setChartRange] = useState(normalizeChartRange(overviewChartRange))
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')

    let parsedHeight = null
    if (value) {
      parsedHeight = Number(value.replace(',', '.'))
      if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) {
        return setError('Bitte eine gültige Größe eingeben.')
      }
    }

    try {
      await onSave({ height: parsedHeight, overviewChartRange: chartRange })
    } catch (err) {
      setError(err.message || 'Profil konnte nicht gespeichert werden.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Profil</span>
            <h2>Feste Profildaten</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <form onSubmit={submit} className="profile-form">
          <label>
            📏 Größe
            <div className="input-with-unit">
              <input
                inputMode="decimal"
                type="text"
                value={value}
                onChange={(e) => setValue(sanitizeNumericInput(e.target.value))}
              />
              <span>cm</span>
            </div>
          </label>
          <p className="field-help">Die Größe wird im Profil gespeichert und muss bei neuen Messungen nicht erneut eingegeben werden.</p>

          <label className="profile-select-field">
            📈 Standard-Zeitraum der Vorschaugraphen
            <select value={chartRange} onChange={(e) => setChartRange(e.target.value)}>
              {CHART_RANGES.map((range) => (
                <option key={range.key} value={range.key}>{range.label}</option>
              ))}
            </select>
          </label>
          <p className="field-help">Dieser Zeitraum gilt für die kleinen Graphen in deiner Gesamtübersicht. Vergrößerte Graphen starten immer mit 6 Monaten.</p>

          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Abbrechen</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Speichern …' : 'Profil speichern'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function MeasurementModal({ initialValues, row, onClose, onSave, saving }) {
  const editing = Boolean(row)
  const [form, setForm] = useState(() => measurementForm({ initialValues, row }))
  const [error, setError] = useState('')

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.measured_at) return setError('Bitte ein Messdatum auswählen.')

    const payload = { measured_at: form.measured_at }
    let count = 0

    METRICS.forEach((metric) => {
      let raw = form[metric.key]

      if (!editing && raw === '' && initialValues?.[metric.key] !== null && initialValues?.[metric.key] !== undefined) {
        raw = inputValue(initialValues[metric.key])
      }

      if (raw !== '') {
        payload[metric.key] = Number(String(raw).replace(',', '.'))
        count += 1
      } else if (editing) {
        payload[metric.key] = null
      }
    })

    if (!count) return setError('Bitte mindestens einen Messwert eingeben.')

    try {
      await onSave(payload)
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{editing ? 'Messung bearbeiten' : 'Neue Messung'}</span>
            <h2>{editing ? 'Falscheingabe korrigieren' : 'Fortschritt festhalten'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <form onSubmit={submit}>
          <label className="date-field">
            Messdatum
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.measured_at}
              onChange={(e) => update('measured_at', e.target.value)}
              required
            />
          </label>
          {!editing && <p className="field-help prefill-help">Vorhandene Werte sind mit deiner letzten bekannten Messung vorbelegt. Du musst nur Änderungen anpassen.</p>}
          <div className="form-grid">
            {METRICS.map((metric) => (
              <label key={metric.key}>
                {metric.icon} {metric.label}
                <div className="input-with-unit">
                  <input
                    inputMode="decimal"
                    type="text"
                    placeholder="—"
                    value={form[metric.key]}
                    onChange={(e) => update(metric.key, sanitizeNumericInput(e.target.value))}
                  />
                  <span>{metric.unit}</span>
                </div>
              </label>
            ))}
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Abbrechen</button>
            <button className="primary-button" disabled={saving}>
              {saving ? 'Speichern …' : editing ? 'Änderungen speichern' : 'Messung speichern'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DetailModal({ metric, rows, onClose, onEdit }) {
  const [chartRange, setChartRange] = useState('6m')
  const filteredRows = useMemo(
    () => rowsForRange(rows, metric, chartRange),
    [rows, metric, chartRange],
  )

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card chart-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Verlauf</span>
            <h2>{metric.label}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <MetricChart rows={filteredRows} metric={metric} large />
        <div className="chart-range-controls" role="group" aria-label="Zeitraum des Graphen">
          {CHART_RANGES.map((range) => (
            <button
              key={range.key}
              type="button"
              className={`chart-range-button ${chartRange === range.key ? 'active' : ''}`}
              onClick={() => setChartRange(range.key)}
              aria-pressed={chartRange === range.key}
              title={range.label}
            >
              {range.shortLabel}
            </button>
          ))}
        </div>
        <div className="history-list">
          {[...rows]
            .filter((historyRow) => historyRow[metric.key] !== null && historyRow[metric.key] !== undefined)
            .sort((a, b) => `${b.measured_at}${b.created_at}`.localeCompare(`${a.measured_at}${a.created_at}`))
            .map((historyRow) => (
              <div className="history-row" key={historyRow.id}>
                <div className="history-row-main">
                  <span>{formatDate(historyRow.measured_at)}</span>
                  <strong>{formatValue(historyRow[metric.key], metric.decimals)} {metric.unit}</strong>
                </div>
                <button type="button" className="history-edit" onClick={() => onEdit(historyRow)}>Bearbeiten</button>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}

function Dashboard({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [editingRow, setEditingRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [profileHeight, setProfileHeight] = useState(user.user_metadata?.height_cm ?? '')
  const [overviewChartRange, setOverviewChartRange] = useState(
    normalizeChartRange(user.user_metadata?.overview_chart_range ?? user.user_metadata?.default_chart_range),
  )

  async function loadRows() {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .order('created_at', { ascending: false })
    if (queryError) setError(queryError.message)
    setRows(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadRows()
  }, [user.id])

  useEffect(() => {
    setProfileHeight(user.user_metadata?.height_cm ?? '')
    setOverviewChartRange(
      normalizeChartRange(user.user_metadata?.overview_chart_range ?? user.user_metadata?.default_chart_range),
    )
  }, [
    user.user_metadata?.height_cm,
    user.user_metadata?.overview_chart_range,
    user.user_metadata?.default_chart_range,
  ])

  const lastDate = rows[0]?.measured_at
  const totalMeasurements = rows.length

  const latestValues = useMemo(() => {
    const result = {}
    METRICS.forEach((metric) => {
      const found = rows.find((row) => row[metric.key] !== null && row[metric.key] !== undefined)
      result[metric.key] = found?.[metric.key] ?? null
    })
    return result
  }, [rows])

  const historicalHeight = useMemo(() => {
    const found = rows.find((row) => row.height_cm !== null && row.height_cm !== undefined)
    return found?.height_cm ?? ''
  }, [rows])

  const displayedHeight = profileHeight || historicalHeight

  const changeMap = useMemo(() => {
    const result = {}
    METRICS.forEach((metric) => {
      const values = rows.filter((row) => row[metric.key] !== null && row[metric.key] !== undefined)
      if (values.length >= 2) {
        result[metric.key] = Number(values[0][metric.key]) - Number(values[1][metric.key])
      }
    })
    return result
  }, [rows])

  async function addMeasurement(payload) {
    setSaving(true)
    const { error: insertError } = await supabase.from('measurements').insert({ ...payload, user_id: user.id })
    setSaving(false)
    if (insertError) throw insertError
    setShowAdd(false)
    await loadRows()
  }

  async function updateMeasurement(payload) {
    if (!editingRow) return
    setSaving(true)
    const { error: updateError } = await supabase
      .from('measurements')
      .update(payload)
      .eq('id', editingRow.id)
      .eq('user_id', user.id)
    setSaving(false)
    if (updateError) throw updateError
    setEditingRow(null)
    await loadRows()
  }

  async function saveProfile({ height, overviewChartRange: nextOverviewChartRange }) {
    setSaving(true)
    const normalizedRange = normalizeChartRange(nextOverviewChartRange)
    const { data, error: profileError } = await supabase.auth.updateUser({
      data: {
        height_cm: height,
        overview_chart_range: normalizedRange,
      },
    })
    setSaving(false)
    if (profileError) throw profileError
    setProfileHeight(data.user?.user_metadata?.height_cm ?? height ?? '')
    setOverviewChartRange(
      normalizeChartRange(data.user?.user_metadata?.overview_chart_range ?? normalizedRange),
    )
    setShowProfile(false)
  }

  function startEditing(row) {
    setSelectedMetric(null)
    setEditingRow(row)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">BT</span>
          <div>
            <strong>BodyTrack</strong>
            <span>Körpermaße & Fortschritt</span>
          </div>
        </div>
        <div className="top-actions">
          <button className="secondary-button" onClick={() => setShowProfile(true)}>Profil</button>
          <button className="secondary-button" onClick={signOut}>Abmelden</button>
          <button className="primary-button add-button" onClick={() => setShowAdd(true)}>＋ Neue Messung</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">Dein Profil</span>
          <h1>Deine Entwicklung auf einen Blick.</h1>
          <p>
            {lastDate ? `Letzte Messung am ${formatDate(lastDate)}.` : 'Noch keine Messung gespeichert.'} Du hast bisher{' '}
            <strong>{totalMeasurements}</strong> {totalMeasurements === 1 ? 'Messung' : 'Messungen'} erfasst.
          </p>
        </div>
        <button className="hero-add" onClick={() => setShowAdd(true)}>
          <span>＋</span>
          <div><strong>Messung hinzufügen</strong><small>Letzte Werte sind bereits vorbelegt</small></div>
        </button>
      </section>

      {error && <div className="alert error page-alert">{error}</div>}

      {loading ? (
        <div className="loading-card">Daten werden geladen …</div>
      ) : rows.length === 0 ? (
        <section className="empty-state">
          <div className="empty-icon">📈</div>
          <h2>Dein Verlauf startet hier</h2>
          <p>Füge deine erste Messung hinzu. Danach erscheinen hier aktuelle Werte und Verlaufsgrafiken.</p>
          <button className="primary-button" onClick={() => setShowAdd(true)}>＋ Erste Messung anlegen</button>
        </section>
      ) : (
        <section className="metric-grid">
          <button className="metric-card profile-metric-card" onClick={() => setShowProfile(true)}>
            <div className="metric-card-top">
              <div className="metric-name"><span>{HEIGHT_METRIC.icon}</span>{HEIGHT_METRIC.label}</div>
              <span className="open-chart">✎</span>
            </div>
            <div className="metric-value">{formatValue(displayedHeight, HEIGHT_METRIC.decimals)} <span>{HEIGHT_METRIC.unit}</span></div>
            <div className="profile-metric-space">Fester Profilwert</div>
            <div className="metric-delta">Ändern über „Profil“</div>
          </button>

          {METRICS.map((metric) => {
            const value = latestValues[metric.key]
            const delta = changeMap[metric.key]
            const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : ''
            const previewRows = rowsForRange(rows, metric, overviewChartRange)
            return (
              <button className="metric-card" key={metric.key} onClick={() => setSelectedMetric(metric)}>
                <div className="metric-card-top">
                  <div className="metric-name"><span>{metric.icon}</span>{metric.label}</div>
                  <span className="open-chart">↗</span>
                </div>
                <div className="metric-value">{formatValue(value, metric.decimals)} <span>{metric.unit}</span></div>
                <div className="metric-chart"><MetricChart rows={previewRows} metric={metric} /></div>
                <div className={`metric-delta ${direction}`}>
                  {delta === undefined ? 'Ein Messwert' : `${delta > 0 ? '+' : ''}${formatValue(delta, metric.decimals)} ${metric.unit} seit der letzten Messung`}
                </div>
              </button>
            )
          })}
        </section>
      )}

      {showAdd && (
        <MeasurementModal
          initialValues={latestValues}
          onClose={() => !saving && setShowAdd(false)}
          onSave={addMeasurement}
          saving={saving}
        />
      )}
      {editingRow && (
        <MeasurementModal
          row={editingRow}
          onClose={() => !saving && setEditingRow(null)}
          onSave={updateMeasurement}
          saving={saving}
        />
      )}
      {showProfile && (
        <ProfileModal
          height={displayedHeight}
          overviewChartRange={overviewChartRange}
          onClose={() => !saving && setShowProfile(false)}
          onSave={saveProfile}
          saving={saving}
        />
      )}
      {selectedMetric && (
        <DetailModal
          metric={selectedMetric}
          rows={rows}
          onClose={() => setSelectedMetric(null)}
          onEdit={startEditing}
        />
      )}
    </main>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (loading) return <div className="app-loading">BodyTrack wird geladen …</div>
  if (!session) return <AuthScreen />
  return <Dashboard user={session.user} />
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
