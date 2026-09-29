export function moved(items,index,direction) {
  const next=[...items],destination=index+direction
  if(index<0||index>=items.length||destination<0||destination>=items.length)return next
  ;[next[index],next[destination]]=[next[destination],next[index]]
  return next
}

// Preserve row IDs, values and completion dates; only the ordering changes.
export function sessionOrder(sets,kind,index,direction,exercisePosition) {
  let groups=[...new Set(sets.map(set=>set.exercise_position))].sort((a,b)=>a-b)
    .map(position=>sets.filter(set=>set.exercise_position===position).sort((a,b)=>a.set_position-b.set_position))
  if(kind==='exercise')groups=moved(groups,index,direction)
  else groups=groups.map(group=>group[0].exercise_position===exercisePosition?moved(group,index,direction):group)
  return groups.flatMap((group,exercise_position)=>group.map((set,set_position)=>({id:set.id,exercise_position,set_position})))
}
