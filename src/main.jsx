import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from './lib/supabase'
import './styles.css'

const METRICS = [
  { key: 'weight_kg', label: 'Gewicht', unit: 'kg', decimals: 1, icon: '⚖️' },
  { key: 'height_cm', label: 'Größe', unit: 'cm', decimals: 0, icon: '📏' },
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

const emptyForm = () => ({
  measured_at: new Date().toISOString().slice(0, 10),
  ...Object.fromEntries(METRICS.map((metric) => [metric.key, ''])),
})

function formatValue(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
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

function MetricChart({ rows, metric, large = false }) {
  const chartRows = rows
    .filter((row) => row[metric.key] !== null && row[metric.key] !== undefined)
    .map((row) => ({ ...row, value: Number(row[metric.key]), label: formatDate(row.measured_at) }))

  if (!chartRows.length) {
    return <div className="empty-chart">Noch keine Daten</div>
  }

  return (
    <ResponsiveContainer width="100%" height={large ? 340 : 88}>
      <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        {large && (
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
            labelStyle={{ color: 'var(--muted)' }}
            formatter={(value) => [
              `${formatValue(value, metric.decimals)} ${metric.unit}`,
              metric.label,
            ]}
            labelFormatter={(label) => label}
          />
        )}
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

function MeasurementModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm)
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
      const raw = form[metric.key]
      if (raw !== '') {
        payload[metric.key] = Number(String(raw).replace(',', '.'))
        count += 1
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
            <span className="eyebrow">Neue Messung</span>
            <h2>Fortschritt festhalten</h2>
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
                    onChange={(e) => update(metric.key, e.target.value)}
                  />
                  <span>{metric.unit}</span>
                </div>
              </label>
            ))}
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Abbrechen</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Speichern …' : 'Messung speichern'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function DetailModal({ metric, rows, onClose }) {
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
        <MetricChart rows={rows} metric={metric} large />
        <div className="history-list">
          {[...rows]
            .filter((row) => row[metric.key] !== null && row[metric.key] !== undefined)
            .sort((a, b) => `${b.measured_at}${b.created_at}`.localeCompare(`${a.measured_at}${a.created_at}`))
            .map((row) => (
              <div className="history-row" key={row.id}>
                <span>{formatDate(row.measured_at)}</span>
                <strong>{formatValue(row[metric.key], metric.decimals)} {metric.unit}</strong>
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
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [saving, setSaving] = useState(false)

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

  const latest = rows[0]
  const lastDate = latest?.measured_at
  const totalMeasurements = rows.length

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
          <div><strong>Messung hinzufügen</strong><small>Datum und aktuelle Werte</small></div>
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
          {METRICS.map((metric) => {
            const value = latest?.[metric.key]
            const delta = changeMap[metric.key]
            const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : ''
            return (
              <button className="metric-card" key={metric.key} onClick={() => setSelectedMetric(metric)}>
                <div className="metric-card-top">
                  <div className="metric-name"><span>{metric.icon}</span>{metric.label}</div>
                  <span className="open-chart">↗</span>
                </div>
                <div className="metric-value">{formatValue(value, metric.decimals)} <span>{metric.unit}</span></div>
                <div className="metric-chart"><MetricChart rows={[...rows].reverse()} metric={metric} /></div>
                <div className={`metric-delta ${direction}`}>
                  {delta === undefined ? 'Ein Messwert' : `${delta > 0 ? '+' : ''}${formatValue(delta, metric.decimals)} ${metric.unit} seit der letzten Messung`}
                </div>
              </button>
            )
          })}
        </section>
      )}

      {showAdd && <MeasurementModal onClose={() => !saving && setShowAdd(false)} onSave={addMeasurement} saving={saving} />}
      {selectedMetric && <DetailModal metric={selectedMetric} rows={rows} onClose={() => setSelectedMetric(null)} />}
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
