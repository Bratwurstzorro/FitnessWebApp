import React, { lazy, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './lib/supabase'
import { TrainingArea } from './features/training/TrainingApp'
import './styles.css'
import './features/training/styles.css'

const BodyMeasurements=lazy(()=>import('./features/body/BodyMeasurements').then(module=>({default:module.BodyMeasurements})))

const pages=[
  {id:'plans',label:'Trainingsplan',short:'Plan'},
  {id:'workout',label:'Training',short:'Training'},
  {id:'history',label:'Historie',short:'Historie'},
  {id:'progress',label:'Fortschritt',short:'Fortschritt'},
  {id:'body',label:'Körpermaße',short:'Körper'},
]
function pageFromUrl(){
  const requested=new URLSearchParams(window.location.search).get('tab')
  return pages.some(page=>page.id===requested)?requested:'workout'
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
            <span>Training & Körpermaße</span>
          </div>
        </div>
        <div className="auth-copy">
          <h1>{mode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h1>
          <p>Plane dein Training, dokumentiere deine Sätze und verfolge deine Körpermaße.</p>
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

function App() {
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [page,setPage]=useState(pageFromUrl)
  const [profileOpen,setProfileOpen]=useState(false)

  useEffect(()=>{
    let mounted=true
    supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setLoading(false)}})
    const {data:subscription}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
      setSession(nextSession)
      setLoading(false)
    })
    return()=>{mounted=false;subscription.subscription.unsubscribe()}
  },[])
  useEffect(()=>{
    const back=()=>{setPage(pageFromUrl());setProfileOpen(false)}
    window.addEventListener('popstate',back)
    return()=>window.removeEventListener('popstate',back)
  },[])
  function navigate(next){
    setPage(next)
    setProfileOpen(false)
    const url=new URL(window.location.href)
    url.searchParams.set('tab',next)
    window.history.pushState(null,'',url)
    window.scrollTo(0,0)
  }
  if(loading)return <div className="app-loading">BodyTrack wird geladen …</div>
  if(!session)return <AuthScreen />
  return <div className="unified-app">
    <header className="unified-header">
      <div className="brand"><span className="brand-mark">BT</span><div><strong>BodyTrack</strong><span>Training & Körpermaße</span></div></div>
      <div className="unified-actions"><button className="secondary-button" onClick={()=>{navigate('body');setProfileOpen(true)}}>Profil</button><button className="secondary-button" onClick={()=>supabase.auth.signOut()}>Abmelden</button></div>
    </header>
    <nav className="unified-nav" aria-label="Hauptnavigation">
      {pages.map(item=><button type="button" key={item.id} className={page===item.id?'active':''} aria-current={page===item.id?'page':undefined} onClick={()=>navigate(item.id)}><span className="nav-long">{item.label}</span><span className="nav-short">{item.short}</span></button>)}
    </nav>
    <div className="unified-training" hidden={page==='body'}><TrainingArea key={session.user.id} user={session.user} page={page} onNavigate={navigate}/></div>
    {page==='body'&&<Suspense fallback={<div className="app-loading">Körpermaße werden geladen …</div>}><BodyMeasurements user={session.user} profileOpen={profileOpen} onProfileOpen={()=>setProfileOpen(true)} onProfileClose={()=>setProfileOpen(false)}/></Suspense>}
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
