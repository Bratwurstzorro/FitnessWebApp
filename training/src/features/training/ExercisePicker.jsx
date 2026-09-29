import { useState } from 'react'

export function ExercisePicker({catalog,onChoose,onCancel,busy,title='Übung hinzufügen',excludeIds=[]}) {
  const [search,setSearch]=useState('')
  const [selected,setSelected]=useState('')
  const [name,setName]=useState('')
  const [rest,setRest]=useState(120)
  const options=catalog.filter(ex=>!excludeIds.includes(ex.id) && ex.name.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de')))

  function submit(event) {
    event.preventDefault()
    if(selected==='new')onChoose({name:name.trim(),rest_seconds:Number(rest)})
    else {
      const exercise=catalog.find(ex=>ex.id===selected)
      if(exercise)onChoose({...exercise,rest_seconds:Number(rest)})
    }
  }

  return <form className="card stack" onSubmit={submit}>
    <h3>{title}</h3>
    <label>Übung suchen<input type="search" value={search} onChange={event=>{setSearch(event.target.value);setSelected('')}} placeholder="Name eingeben"/></label>
    <label>Aus dem Übungspool auswählen
      <select value={selected} required onChange={event=>setSelected(event.target.value)}>
        <option value="">Bitte auswählen</option>
        {options.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}
        <option value="new">Neue Übung frei eingeben</option>
      </select>
    </label>
    {selected==='new'&&<label>Name der neuen Übung<input required maxLength={100} value={name} onChange={event=>setName(event.target.value)} placeholder="z. B. Seitheben"/></label>}
    <label>Pause je Satz<select value={rest} onChange={event=>setRest(event.target.value)}>{[60,90,120,180].map(n=><option key={n} value={n}>{n} Sekunden</option>)}</select></label>
    <div className="actions"><button type="button" onClick={onCancel}>Abbrechen</button><button className="primary" disabled={busy}>Hinzufügen</button></div>
  </form>
}
