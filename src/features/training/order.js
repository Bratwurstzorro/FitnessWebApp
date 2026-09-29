export function moved(items,index,direction) {
  const next=[...items],destination=index+direction
  if(index<0||index>=items.length||destination<0||destination>=items.length)return next
  ;[next[index],next[destination]]=[next[destination],next[index]]
  return next
}

// Preserve row IDs, values and completion dates; only the ordering changes.
export function sessionOrder(sets,index,direction) {
  let groups=[...new Set(sets.map(set=>set.exercise_position))].sort((a,b)=>a-b)
    .map(position=>sets.filter(set=>set.exercise_position===position).sort((a,b)=>a.set_position-b.set_position))
  groups=moved(groups,index,direction)
  return groups.flatMap((group,exercise_position)=>group.map((set,set_position)=>({id:set.id,exercise_position,set_position})))
}
