export function RirInput({value,onChange,...props}) {
  return <select {...props} value={value??''} onChange={event=>onChange(event.target.value)} title="Wie viele weitere saubere Wiederholungen wären möglich gewesen? Leer = nicht angegeben.">
    <option value="">–</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option>
  </select>
}
