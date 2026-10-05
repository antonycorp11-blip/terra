import { useEffect, useMemo, useRef, useState } from 'react'
import { hash } from '../engine/random'
import { MAP_HEIGHT, MAP_WIDTH } from '../engine/geography'
import type { Point, Province, World } from '../engine/types'
import { blendHex, createMapLayout, mapLabels, mergedOutline } from './mapArt'
import MapSprites from './MapSprites'
import MapShips from './MapShips'
import { useUI } from './store'
import styles from './MapView.module.css'

const polygonPath = (points: Point[]) => `M${points.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join('L')}Z`
const middle = (points: Point[]): Point => [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length]
const riverPath = (points: Point[]) => points.length < 3 ? `M${points.map(point => point.join(' ')).join('L')}` : `M${points[0].join(' ')}${points.slice(1,-1).map((point,index) => { const next=points[index+2];return `Q${point.join(' ')} ${(point[0]+next[0])/2} ${(point[1]+next[1])/2}` }).join('')}Q${points[points.length-2].join(' ')} ${points[points.length-1].join(' ')}`
function spreadLabels<T>(items: {item:T;center:Point}[],width=95,height=43): {item:T;center:Point;label:Point}[] {
  const result = items.map(entry => ({...entry,label:[...entry.center] as Point}))
  for (let pass=0;pass<18;pass++) for (let i=0;i<result.length;i++) for (let j=i+1;j<result.length;j++) {
    const dx=result[j].label[0]-result[i].label[0],dy=result[j].label[1]-result[i].label[1]
    if (Math.abs(dx)<width && Math.abs(dy)<height) {
      const side=dx===0 ? (i%2 ? 1 : -1) : Math.sign(dx)
      result[i].label[0]-=side*3; result[j].label[0]+=side*3
      const vertical=dy===0 ? (i%2 ? -1 : 1) : Math.sign(dy)
      result[i].label[1]-=vertical*1.5; result[j].label[1]+=vertical*1.5
    }
  }
  return result
}
function houseColor(id: string): string { const h = hash(id) % 360; return `hsl(${h} 36% 49%)` }
const terrainColor: Record<string,string> = { planície:'#a4935d', floresta:'#305e3f', colina:'#776f54', montanha:'#777a76', litoral:'#547d70', várzea:'#568660' }

export default function MapView({ world }: { world: World }) {
  const { level, mode, selectedRealmId, selectedFiefId, selectedProvinceId, selectedSettlementId, selectRealm, selectFief, selectProvince, selectSettlement } = useUI()
  const [view, setView] = useState({ scale:1, x:0, y:0 })
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)
  const [size,setSize] = useState(() => ({width:window.innerWidth,height:window.innerHeight}))
  const drag = useRef<{ x:number; y:number; startX:number; startY:number; moved:boolean } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const update = () => { setMobile(window.innerWidth <= 760);setSize({width:window.innerWidth,height:window.innerHeight}) }
    window.addEventListener('resize',update)
    return () => window.removeEventListener('resize',update)
  }, [])
  const viewportWidth = mobile ? Math.max(295,Math.min(590,MAP_HEIGHT*size.width/size.height)) : Math.max(MAP_WIDTH,MAP_HEIGHT*size.width/size.height)
  const viewport = { x:(MAP_WIDTH-viewportWidth)/2, width:viewportWidth }
  const provinceById = useMemo(() => new Map(world.provinces.map(item => [item.id,item])), [world])
  const visible = useMemo(() => world.provinces.filter(province => level === 'reinos' || (level === 'feudos' ? province.realmId === selectedRealmId : level === 'provincias' ? province.fiefId === selectedFiefId : province.id === selectedProvinceId)), [world, level, selectedRealmId, selectedFiefId, selectedProvinceId])
  useEffect(() => {
    if (level === 'reinos' || visible.length === 0) { setView({ scale:1, x:0, y:0 }); return }
    const mainland=visible.filter(province=>province.landmass===0)
    const points=(mainland.length?mainland:visible).flatMap(province=>province.polygons.flat())
    const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]))
    const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]))
    const availableWidth=mobile?viewport.width:viewport.width*(1-380/size.width)
    const availableHeight=MAP_HEIGHT*(mobile?.43:.9)
    const scale=Math.min(level==='assentamentos'?5.4:4.5,availableWidth/((maxX-minX)*1.18+(level==='assentamentos'?150:0)),availableHeight/((maxY-minY)*1.18+(level==='assentamentos'?35:0)))
    setView({scale,x:viewport.x+availableWidth/2-(minX+maxX)/2*scale,y:(mobile?availableHeight/2+12:MAP_HEIGHT/2)-(minY+maxY)/2*scale})
  },[level,selectedRealmId,selectedFiefId,selectedProvinceId,visible,viewport.width,viewport.x,size.width,mobile])


  const labelRealms = useMemo(() => mapLabels(world),[world.provinces,world.realms])
  const {markers} = useMemo(() => createMapLayout(world,labelRealms),[world.provinces,world.settlements,labelRealms])
  const realmOutlines = useMemo(() => world.realms.map(realm => ({realm,paths:mergedOutline(world.provinces.filter(province => province.realmId === realm.id))})), [world])
  const fiefOutlines = useMemo(() => world.fiefs.filter(fief => fief.realmId === selectedRealmId).map(fief => ({fief,paths:mergedOutline(world.provinces.filter(province => province.fiefId === fief.id))})), [world,selectedRealmId])
  const visibleIds = useMemo(() => new Set(visible.map(province => province.id)), [visible])

  function onProvinceClick(province: Province) {
    if (drag.current?.moved) return
    if (level === 'reinos') selectRealm(province.realmId)
    else if (level === 'feudos') selectFief(province.fiefId, province.realmId)
    else selectProvince(province.id, province.fiefId, province.realmId)
  }
  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
    const px = point.x, py = point.y
    setView(previous => {
      const scale = Math.max(.85, Math.min(8, previous.scale * (event.deltaY < 0 ? 1.12 : .89)))
      return { scale, x:px - (px - previous.x) / previous.scale * scale, y:py - (py - previous.y) / previous.scale * scale }
    })
  }
  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!drag.current) return
    const travel = Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY)
    if (!drag.current.moved && travel <= 4) return
    if (!drag.current.moved) { drag.current.moved = true; event.currentTarget.setPointerCapture(event.pointerId) }
    const inverse = svg.current!.getScreenCTM()!.inverse()
    const previousPoint = new DOMPoint(drag.current.x, drag.current.y).matrixTransform(inverse)
    const currentPoint = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse)
    const dx = currentPoint.x - previousPoint.x
    const dy = currentPoint.y - previousPoint.y
    drag.current.x = event.clientX; drag.current.y = event.clientY
    setView(previous => ({ ...previous, x:previous.x + dx, y:previous.y + dy }))
  }
  function zoom(factor: number) { setView(previous => { const scale = Math.max(.85,Math.min(8,previous.scale * factor)); return { scale, x:550 - (550-previous.x)/previous.scale*scale, y:360-(360-previous.y)/previous.scale*scale } }) }

  const labelFiefs = level === 'feudos' ? spreadLabels(world.fiefs.filter(fief => fief.realmId === selectedRealmId).map(fief => ({ item:fief, center:middle(fief.provinceIds.map(id => provinceById.get(id)!.center)) }))) : []
  const labelProvinces = level === 'provincias' ? spreadLabels(world.provinces.filter(province => province.fiefId === selectedFiefId).map(province=>({item:province,center:province.center})),63,26) : []
  const focusedProvince = provinceById.get(selectedProvinceId || '')
  const settlementLabels=level==='assentamentos'&&focusedProvince ? world.settlements.filter(s=>s.provinceId===focusedProvince.id).sort((a,b)=>a.position[1]-b.position[1]).map((settlement,index,all)=>{
    const minX=Math.min(...focusedProvince.polygon.map(p=>p[0])),maxX=Math.max(...focusedProvince.polygon.map(p=>p[0]))
    const minY=Math.min(...focusedProvince.polygon.map(p=>p[1])),maxY=Math.max(...focusedProvince.polygon.map(p=>p[1]))
    const side=index%2===0?-1:1
    return {settlement,side,x:side===-1?minX-8:maxX+8,y:minY+5+(maxY-minY-10)*index/Math.max(1,all.length-1)}
  }):[]
  const activeLabels = level==='feudos' ? labelFiefs.map(({label})=>({x:label[0],y:label[1]+13,w:104,h:45})) : level==='provincias' ? labelProvinces.map(({label})=>({x:label[0],y:label[1]+10,w:74,h:30})) : level==='assentamentos' ? settlementLabels.map(({x,y,side})=>({x:x+side*28,y,w:60,h:13})) : []
  const clearOfLabel=(x:number,y:number,size:number)=>(level!=='assentamentos'||!settlementLabels.some(({settlement})=>Math.hypot(x-settlement.position[0],y-settlement.position[1])<size*.65+11))&&!activeLabels.some(b=>Math.abs(x-b.x)<(b.w+size)/2&&Math.abs(y-b.y)<(b.h+size)/2)



  return <div className={styles.mapShell}>
    <svg ref={svg} className={styles.map} viewBox={`${viewport.x} 0 ${viewport.width} ${MAP_HEIGHT}`} onWheel={onWheel} onPointerDown={event => { drag.current = { x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false } }} onPointerMove={onPointerMove} onPointerUp={() => { setTimeout(() => { drag.current = null }, 0) }} onPointerCancel={() => { drag.current = null }} aria-label="Mapa político interativo de Varedor">
      <defs>
        <radialGradient id="sea" cx="58%" cy="55%" r="75%"><stop stopColor="#2d7783"/><stop offset=".52" stopColor="#205467"/><stop offset="1" stopColor="#142f43"/></radialGradient>
        <pattern id="waves" width="126" height="87" patternUnits="userSpaceOnUse"><path d="M3 22q30-4 60 0m-24 44q28-3 54 0M96 44h17" fill="none" stroke="#b4d9dc" strokeOpacity=".055" strokeWidth=".6"/></pattern>
        <MapSprites/>
        <clipPath id="landClip">{world.landPolygons.map((land,i)=><path key={i} d={polygonPath(land)}/>)}</clipPath>
        <filter id="relief"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".8"/></feComponentTransfer></filter>
        <filter id="coastGlow"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="labelShadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#08141c" floodOpacity=".9"/></filter>
      </defs>
      <rect x={viewport.x} width={viewport.width} height={MAP_HEIGHT} fill="url(#sea)"/><rect x={viewport.x} width={viewport.width} height={MAP_HEIGHT} fill="url(#waves)"/>
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {world.landPolygons.map((land,i)=><g key={i} pointerEvents="none"><path d={polygonPath(land)} fill="#638858" stroke="#3b9ca2" strokeWidth="14" strokeOpacity=".2" filter="url(#coastGlow)"/><path d={polygonPath(land)} fill="#81a061" stroke="#8ac6af" strokeWidth="4" strokeOpacity=".3"/><path d={polygonPath(land)} fill="#9bb16c" stroke="#173e42" strokeWidth="1.7"/></g>)}
        {world.provinces.map(province => {
          const isVisible = visibleIds.has(province.id)
          const fill = mode === 'terreno' ? terrainColor[province.terrain] : mode === 'casas' ? houseColor(province.legalHouseId) : blendHex(province.color,'#b7ab87',.2)
          const sameBoundary = level === 'reinos' ? province.realmId : level === 'feudos' ? province.fiefId : province.id
          return <path key={province.id} d={province.polygons.map(polygonPath).join(' ')} fill={isVisible||mode==='casas'?fill:blendHex(province.color,'#657575',.68)} fillOpacity={1} stroke="#293225" strokeOpacity={level === 'reinos' ? .19 : level === 'feudos' ? .24 : .5} strokeWidth={level === 'assentamentos'&&isVisible ? 2 : .65} vectorEffect="non-scaling-stroke" className={styles.province} onClick={() => onProvinceClick(province)} data-territory={sameBoundary}/>
        })}
        <g clipPath="url(#landClip)" pointerEvents="none"><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#fff" opacity=".15" filter="url(#relief)" style={{mixBlendMode:'multiply'}}/></g>
        <g pointerEvents="none" opacity={level === 'reinos' ? 0 : .24} clipPath="url(#landClip)">{world.roads.map(([from,to],index) => { const a=provinceById.get(from)!.center,b=provinceById.get(to)!.center; return <path key={index} d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} stroke="#f8e4ad" strokeWidth="1" strokeDasharray="3 3" fill="none"/> })}</g>
        <g pointerEvents="none">{world.rivers.map((river,index) => <g key={index}><path d={riverPath(river)} stroke="#244c5e" strokeWidth="2.4" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d={riverPath(river)} stroke="#78b9c2" strokeWidth="1.2" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>)}</g>
        {realmOutlines.map(({realm,paths}) => paths.map((points,index) => <g key={`${realm.id}-${index}`} pointerEvents="none"><path d={polygonPath(points)} fill="none" stroke="#122630" strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity=".95"/><path d={polygonPath(points)} fill="none" stroke={realm.accent} strokeWidth=".85" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity={level === 'assentamentos' ? .65 : .98}/></g>))}
        {(level === 'feudos' || level === 'provincias') && fiefOutlines.map(({fief,paths}) => paths.map((points,index) => <path key={`${fief.id}-${index}`} d={polygonPath(points)} fill="none" stroke="#f3d59b" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" opacity=".87" pointerEvents="none"/>))}
        {world.landPolygons.map((land,i)=><path key={i} d={polygonPath(land)} fill="none" stroke="#efcf8e" strokeWidth=".8" vectorEffect="non-scaling-stroke" pointerEvents="none"/>)}
        <g pointerEvents="none">{markers.filter(({settlement,size})=>level!=='assentamentos'&&(level==='reinos'?(settlement.type==='cidade'||settlement.type==='porto'):visibleIds.has(settlement.provinceId))&&clearOfLabel(settlement.position[0],settlement.position[1]-size*.3,size)).map(({settlement,kind,size})=><g key={settlement.id} data-map-building={settlement.id}><ellipse cx={settlement.position[0]} cy={settlement.position[1]+1} rx={size*.3} ry={size*.08} fill="#172c21" opacity=".22"/><use href={`#art-${kind}`} x={settlement.position[0]-size/2} y={settlement.position[1]-size*.78} width={size} height={size}/>{settlement.type==='cidade'&&<text x={settlement.position[0]} y={settlement.position[1]+10} textAnchor="middle" fill="#fff3d3" fontSize="7.5" className={styles.cityLabel}>{settlement.name}</text>}</g>)}</g>
        <MapShips routes={world.seaRoutes}/>
        {level==='reinos'&&<g pointerEvents="none"><text x="177" y="82" className={styles.seaName}>MAR DAS BRUMAS</text><text x="638" y="494" className={styles.innerSeaName}>Mar de</text><text x="638" y="516" className={styles.innerSeaName}>Safira</text><text x="545" y="700" className={styles.seaName}>OCEANO DE VAREDOR</text><text x="77" y="590" className={styles.islandName} transform="rotate(-62 77 590)">ILHAS DAS MARÉS</text></g>}
        {level==='reinos'&&labelRealms.map(({realm,center,compact})=>{const royal=world.houses.find(house=>house.id===realm.royalHouseId)!;const width=compact?114:158;return <g key={realm.id} data-map-label={realm.id} className={styles.realmLabel} transform={`translate(${center[0]} ${center[1]})`} onClick={()=>selectRealm(realm.id)}><rect x={-width/2} y="-28" width={width} height="52" fill="transparent" pointerEvents="all"/><path id={`title-${realm.id}`} d={`M${-width/2} -2Q0 -13 ${width/2} -2`} fill="none" stroke="none"/><text className={styles.realmName} fontSize={compact?17:21}><textPath href={`#title-${realm.id}`} startOffset="50%" textAnchor="middle">{realm.name.toLocaleUpperCase('pt-BR')}</textPath></text><text className={styles.houseName} y="15" textAnchor="middle" fontSize="6.5">{royal.name.toLocaleUpperCase('pt-BR')}</text></g>})}
        {labelFiefs.map(({item:fief,center,label}) => <g key={fief.id} className={styles.fiefLabel} onClick={() => selectFief(fief.id,fief.realmId)}>{Math.hypot(label[0]-center[0],label[1]-center[1])>8 && <path d={`M${center[0]} ${center[1]}L${label[0]} ${label[1]}`} stroke="#f2dbb3" strokeOpacity=".6" strokeWidth="1" strokeDasharray="2 2"/>}<g transform={`translate(${label[0]} ${label[1]})`}><circle r="11" fill="#172633" stroke="#e6c78d" strokeWidth="1"/><text y="4" textAnchor="middle" fill="#e6c78d" fontSize="12">✦</text><text y="28" textAnchor="middle" fill="#fff2d5" fontSize="15" filter="url(#labelShadow)">{fief.name}</text></g></g>)}
        {labelProvinces.map(({item:province,center,label})=><g key={province.id} className={styles.fiefLabel} onClick={()=>selectProvince(province.id,province.fiefId,province.realmId)}><path d={`M${center.join(' ')}L${label[0]} ${label[1]+10}`} stroke="#efdbad" strokeWidth=".6" strokeDasharray="2 2"/><circle cx={center[0]} cy={center[1]} r="4" fill="#122932" stroke="#e6c78d" strokeWidth="1"/><rect x={label[0]-35} y={label[1]+4} width="70" height="15" fill="transparent" pointerEvents="all"/><text x={label[0]} y={label[1]+15} textAnchor="middle" fill="#fff4d9" fontSize="8.5" filter="url(#labelShadow)">{province.name}</text></g>)}
        {settlementLabels.map(({settlement,side,x,y})=><g key={settlement.id} className={styles.settlement} onClick={()=>selectSettlement(settlement.id)} role="button" tabIndex={0} aria-label={`Selecionar ${settlement.name}`} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')selectSettlement(settlement.id)}}><path d={`M${settlement.position.join(' ')}L${x} ${y}`} stroke="#f7e2a3" strokeWidth=".5" strokeDasharray="1.3 1"/><use href={settlement.type==='castelo'?'#art-castle':settlement.type==='porto'?'#art-port':'#art-village'} x={settlement.position[0]-5} y={settlement.position[1]-8} width="10" height="10"/><circle cx={settlement.position[0]} cy={settlement.position[1]+2} r="1.1" fill={settlement.id===selectedSettlementId?'#f1cc6c':'#153843'} stroke="#f0d69b" strokeWidth=".3"/><rect x={side===-1?x-56:x} y={y-4} width="56" height="9" fill="#123440" fillOpacity=".86" rx="1" pointerEvents="all"/><text x={x+side*2} y={y+1.2} textAnchor={side===-1?'end':'start'} fontSize="3.2" fill="#fff3d9" style={{strokeWidth:'.35px'}}>{settlement.name}</text></g>)}

      </g>
    </svg>
    {(level !== 'reinos' || mobile) && <div className={styles.minimap}><div>VAREDOR</div><svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-label="Mini-mapa: clique para centralizar" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); const px = (event.clientX-bounds.left)/bounds.width*MAP_WIDTH; const py = (event.clientY-bounds.top)/bounds.height*MAP_HEIGHT; setView(previous => ({...previous,x:viewport.x+viewport.width/2-px*previous.scale,y:MAP_HEIGHT/2-py*previous.scale})) }}><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0e4456"/>{world.landPolygons.map((land,i)=><path key={i} d={polygonPath(land)} fill="#927d59"/>)}{world.provinces.map(province => <path key={province.id} d={province.polygons.map(polygonPath).join(' ')} fill={province.color} fillOpacity=".9"/>)}<rect x={(viewport.x-view.x)/view.scale} y={-view.y/view.scale} width={viewport.width/view.scale} height={MAP_HEIGHT/view.scale} fill="none" stroke="#fff4c8" strokeWidth={8/view.scale}/></svg></div>}
    <div className={styles.compass}><span>N</span><strong>✥</strong><span>S</span></div>
    <div className={styles.controls}><button onClick={() => zoom(1.25)} title="Aproximar">＋</button><button onClick={() => zoom(.8)} title="Afastar">−</button><button onClick={() => setView({scale:1,x:0,y:0})} title="Mostrar continente">⌖</button></div>
  </div>
}
