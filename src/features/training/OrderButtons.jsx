export function OrderButtons({index,count,busy,label,onMove}) {
  return <span className="order-buttons" role="group" aria-label={`${label} verschieben`}>
    <button type="button" disabled={busy||index===0} aria-label={`${label} nach oben`} onClick={()=>onMove(-1)}>↑</button>
    <button type="button" disabled={busy||index===count-1} aria-label={`${label} nach unten`} onClick={()=>onMove(1)}>↓</button>
  </span>
}
