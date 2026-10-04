const standing={head:[90,35],torso:[[90,52],[90,112]],legs:[[[90,112],[72,143],[68,177]],[[90,112],[108,143],[112,177]]]}
const seated={head:[62,43],torso:[[62,60],[66,120]],legs:[[[66,120],[110,122],[113,174]]]}
const frontSeat={head:[90,42],torso:[[90,60],[90,122]],legs:[[[90,122],[65,140],[65,177]],[[90,122],[115,140],[115,177]]]}
const line=(points)=>points.map(point=>point.join(',')).join(' ')

function pose(kind,end) {
  let base=standing,arms=[],equipment=[],cables=[],weights=[],curve=null
  switch(kind) {
    case 'bench':
      base={head:[34,94],torso:[[50,100],[108,105]],legs:[[[108,105],[142,133],[143,177]]]}
      arms=[end?[[58,100],[62,65],[66,30]]:[[58,100],[87,105],[76,78]]]
      equipment=[[[22,117],[121,117]],[[36,117],[36,177]],[[111,117],[111,177]]]
      weights=[end?[66,30]:[76,78]];break
    case 'legcurl':
      base={...seated,legs:[end?[[66,120],[111,122],[97,167]]:[[66,120],[111,122],[161,122]]]}
      arms=[[[62,66],[50,95],[70,120]]];equipment=[[[45,63],[45,131],[95,131]],[[64,131],[64,177]],[[100,112],[127,112]]]
      weights=[end?[97,167]:[161,122]];break
    case 'legpress':
      base={head:[29,66],torso:[[39,84],[68,137]],legs:[end?[[68,137],[109,101],[148,68]]:[[68,137],[111,146],[131,107]]]}
      arms=[[[40,89],[36,126],[69,143]]]
      equipment=[[[22,77],[57,150],[82,150]],end?[[135,47],[167,82]]:[[118,88],[150,122]],[[40,157],[157,50]]];break
    case 'biceps':
      base=seated;arms=[end?[[62,67],[103,103],[108, 60]]:[[62,67],[103,103],[147,134]]]
      equipment=[[[44,63],[44,132],[89,132]],[[84,107],[119,122]],[[65,132],[65,177]]];weights=[arms[0].at(-1)];break
    case 'row':
      base={...seated,head:[76,43],torso:[[76,61],[66,120]]}
      arms=[end?[[76,67],[54,91],[95,101]]:[[76,67],[109,89],[151,103]]]
      equipment=[[[44,132],[91,132]],[[65,132],[65,177]],[[88,79],[94,117]],[[92,117],[92,169]]];cables=[[[170,105],arms[0].at(-1)]];break
    case 'facepull':
      base=seated;arms=[end?[[62,67],[38,66],[77,53]]:[[62,67],[107,68],[150,67]]]
      equipment=[[[44,132],[95,132]],[[65,132],[65,177]],[[170,28],[170,177]]];cables=[[[170,57],arms[0].at(-1)]];break
    case 'lat':
      base=frontSeat;arms=end?[[[90,66],[48,86],[48,67]],[[90,66],[132,86],[132,67]]]:[[[90,66],[55,38],[42,17]],[[90,66],[125,38],[138,17]]]
      equipment=[[[58,131],[122,131]],[[90,131],[90,177]],[[50,127],[75,127]],[[105,127],[130,127]]]
      cables=[[[90,2],[90,end?64:17]]];equipment.push([[42,end?64:17],[138,end?64:17]]);break
    case 'shoulder':
      base=frontSeat;arms=end?[[[90,66],[59,42],[57,14]],[[90,66],[121,42],[123,14]]]:[[[90,66],[48,89],[44, 60]],[[90,66],[132,89],[136, 60]]]
      equipment=[[[63,71],[63,129],[118,129]],[[90,129],[90,177]]];weights=arms.map(a=>a.at(-1));break
    case 'lateral':
      arms=end?[[[90, 60],[48,63],[15,67]],[[90, 60],[132,63],[165,67]]]:[[[90, 60],[65,92],[60,123]],[[90, 60],[115,92],[120,123]]]
      weights=arms.map(a=>a.at(-1));break
    case 'hammer':
      arms=end?[[[90, 60],[64,95],[67, 60]],[[90, 60],[116,95],[113, 60]]]:[[[90, 60],[65,93],[ 60,127]],[[90, 60],[115,93],[120,127]]]
      weights=arms.map(a=>a.at(-1));break
    case 'pushdown':
      base={...standing,head:[72,35],torso:[[72,52],[76,112]],legs:[[[76,112],[ 60,145],[58,177]],[[76,112],[95,145],[100,177]]]}
      arms=[end?[[72, 60],[86,99],[96,137]]:[[72, 60],[86,99],[113,80]]]
      equipment=[[[157,12],[157,177]]];cables=[[[157,18],arms[0].at(-1)]];break
    case 'overhead':
      arms=end?[[[90, 60],[76,27],[81,9]],[[90, 60],[104,27],[99,9]]]:[[[90, 60],[76,27],[85,51]],[[90, 60],[104,27],[95,51]]]
      weights=[end?[90,9]:[90,51]];break
    case 'jefferson':
      base=end?{head:[126,120],torso:[[114,115],[112,84],[ 90,96],[82,112]],legs:[[[82,112],[75,145],[73,177]]]}:{...standing,head:[80,35],torso:[[80,52],[82,112]],legs:[[[82,112],[75,145],[73,177]]]}
      curve=end?'M 82 112 Q 76 82 96 84 Q 122 87 114 115':null
      arms=[end?[[114,115],[113,140],[113,163]]:[[80, 60],[88, 90],[91,123]]];weights=[arms[0].at(-1)];break
  }
  return {...base,arms,equipment,cables,weights,curve}
}

function Pose({kind,end}) {
  const p=pose(kind,end)
  return <svg viewBox="0 0 180 194" role="img" aria-label={end?'Zweite Bewegungsposition':'Ausgangsposition'}>
    <path d="M 12 184 H 168" stroke="#d7e2dd" strokeWidth="2"/>
    <g fill="none" stroke="#a8bcb5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">{p.equipment.map((points,i)=><polyline key={i} points={line(points)}/>)}</g>
    <g fill="none" stroke="#728e85" strokeWidth="2" strokeDasharray="4 3">{p.cables.map((points,i)=><polyline key={i} points={line(points)}/>)}</g>
    <g fill="none" stroke="#183b34" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
      {p.curve?<path d={p.curve}/>:<polyline points={line(p.torso)}/>}
      {p.legs.map((points,i)=><polyline key={i} points={line(points)}/>)}
    </g>
    <circle cx={p.head[0]} cy={p.head[1]} r="12" fill="#183b34"/>
    <g fill="none" stroke="#16806b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">{p.arms.map((points,i)=><polyline key={i} points={line(points)}/>)}</g>
    {p.weights.map(([x,y],i)=><g key={i} transform={`translate(${x},${y})`}><rect x="-12" y="-5" width="24" height="10" rx="3" fill="#d39446"/><path d="M -9 -7 V 7 M 9 -7 V 7" stroke="#855a28" strokeWidth="3"/></g>)}
  </svg>
}

export function ExerciseIllustration({guide}) {
  return <figure className="exercise-illustration">
    <div className="exercise-poses"><div><span>Start</span><Pose kind={guide.kind}/></div><span className="pose-arrow" aria-hidden="true">→</span><div><span>Bewegung</span><Pose kind={guide.kind} end/></div></div>
    <figcaption>{guide.variant} · Schematische Darstellung; Geräteformen und Griffvarianten können abweichen.</figcaption>
  </figure>
}
