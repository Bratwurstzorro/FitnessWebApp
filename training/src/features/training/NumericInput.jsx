import { acceptsNumericDraft, parseNumeric } from './numeric'

// Text inputs avoid exponent/sign characters accepted by type="number".
// The allowlist also handles paste, autofill and mobile keyboards.

export function NumericInput({kind,value,onChange,...props}) {
  const weight=kind==='weight'
  const maximum=Number(props.max??(weight?9999:1000))
  return <input
    {...props}
    type="text"
    inputMode={weight?'decimal':'numeric'}
    pattern={weight?'[0-9]+([.,][0-9]{1,2})?':'(?:[1-9][0-9]{0,2}|1000)'}
    required
    value={value}
    onBeforeInput={event=>{
      if(event.data && !acceptsNumericDraft(event.data,kind)) event.preventDefault()
    }}
    onChange={event=>{
      const next=event.target.value
      if(acceptsNumericDraft(next,kind) && (next==='' || parseNumeric(next)<=maximum)) onChange(next)
    }}
  />
}
