import { useId, useState } from 'react'

export function ExercisePicker({catalog,onChoose,onCancel,busy,title='Übung hinzufügen',excludeIds=[]}) {
  const listId=useId()
  const [search,setSearch]=useState('')
  const [selectedId,setSelectedId]=useState(null)
  const [open,setOpen]=useState(false)
  const [active,setActive]=useState(-1)
  const [rest,setRest]=useState(120)
  const name=search.trim()
  const options=name ? catalog.filter(ex=>!excludeIds.includes(ex.id) && ex.name.toLocaleLowerCase('de').includes(name.toLocaleLowerCase('de'))) : []

  function choose(exercise) {
    setSearch(exercise.name)
    setSelectedId(exercise.id)
    setOpen(false)
    setActive(-1)
  }

  function submit(event) {
    event.preventDefault()
    if(!name || busy)return
    const existing=catalog.find(ex=>ex.id===selectedId && ex.name===name)
      ?? catalog.find(ex=>ex.name===name)
    if(existing)onChoose({...existing,rest_seconds:Number(rest)})
    else if(window.confirm(`„${name}“ als neue Übung anlegen? Sie ist danach für alle angemeldeten Benutzer im Übungspool sichtbar.`)) {
      onChoose({name,rest_seconds:Number(rest)})
    }
  }

  function handleKeyDown(event) {
    if(event.key==='Escape'){setOpen(false);setActive(-1);return}
    if(!open || !options.length)return
    if(event.key==='ArrowDown' || event.key==='ArrowUp'){
      event.preventDefault()
      setActive(index=>event.key==='ArrowDown' ? (index+1)%options.length : (index+options.length-1)%options.length)
    } else if(event.key==='Enter' && active>=0){
      event.preventDefault()
      choose(options[active])
    }
  }

  return <form className="card stack" onSubmit={submit}>
    <h3>{title}</h3>
    <div className="exercise-search">
      <label htmlFor={`${listId}-input`}>Übung suchen oder neu eingeben</label>
      <input id={`${listId}-input`} type="text" autoComplete="off" required maxLength={100} value={search}
        role="combobox" aria-autocomplete="list" aria-expanded={open && !!name} aria-controls={listId}
        aria-activedescendant={open && active>=0 ? `${listId}-${active}` : undefined}
        onChange={event=>{setSearch(event.target.value);setSelectedId(null);setActive(-1);setOpen(true)}}
        onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onKeyDown={handleKeyDown}
        placeholder="z. B. Bankdrücken"/>
      {open && !!name && <div className="exercise-suggestions" id={listId} role="listbox" aria-label="Übungsvorschläge">
        {options.length ? options.map((ex,index)=><div key={ex.id} id={`${listId}-${index}`} role="option"
          aria-selected={index===active} className={index===active?'active':''}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(ex)}>{ex.name}</div>)
          : <div className="exercise-no-match">Kein Treffer. Mit „Hinzufügen“ als neue Übung anlegen.</div>}
      </div>}
    </div>
    <label>Pause je Satz<select value={rest} onChange={event=>setRest(event.target.value)}>{[60,90,120,180].map(n=><option key={n} value={n}>{n} Sekunden</option>)}</select></label>
    <div className="actions"><button type="button" onClick={onCancel}>Abbrechen</button><button className="primary" disabled={busy || !name}>Hinzufügen</button></div>
  </form>
}
