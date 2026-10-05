import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hash } from '../engine/random'
import { MAP_HEIGHT, MAP_WIDTH } from '../engine/geography'
import { knowledge } from '../engine/knowledge'
import { canExplore } from '../engine/exploration'
import { disposition } from '../engine/relationships'
import type { GameState, Point, Province, Settlement, World } from '../engine/types'
import { blendHex, mapLabels, mergedOutline, unionPath } from './mapArt'
import MapSprites from './MapSprites'
import MapShips from './MapShips'
import { useUI, type GameMode } from './store'
import styles from './MapView.module.css'

const polygonPath = (points: Point[]) => `M${points.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join('L')}Z`
const riverPath = (points: Point[]) => points.length < 3 ? `M${points.map(point => point.join(' ')).join('L')}` : `M${points[0].join(' ')}${points.slice(1,-1).map((point,index) => { const next=points[index+2];return `Q${point.join(' ')} ${(point[0]+next[0])/2} ${(point[1]+next[1])/2}` }).join('')}Q${points[points.length-2].join(' ')} ${points[points.length-1].join(' ')}`
const terrainColor: Record<string,string> = { planície:'#a4935d', floresta:'#4f7350', colina:'#8a7f5c', montanha:'#8a8b84', litoral:'#6b8f80', várzea:'#6f9467' }
const houseColor = (id: string) => `hsl(${hash(id) % 360} 38% 52%)`
const relationColor = (relation: number) => relation >= 20 ? '#62a05a' : relation >= 0 ? '#c9b55a' : relation >= -25 ? '#c7834a' : '#b04637'
const MIN_SCALE = .7, MAX_SCALE = 10
type View = { scale:number; x:number; y:number }
export interface MapInset { right:number; bottom:number }

/** Static geometry, computed once per world seed. Daily simulation ticks never invalidate it. */
function useGeometry(world: World) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const provinces = world.provinces
    const fiefCenter = (ids: string[]): Point => {
      const members = ids.map(id => provinces.find(p => p.id === id)!).filter(p => p.landmass === 0)
      const list = members.length ? members : ids.map(id => provinces.find(p => p.id === id)!)
      const mean: Point = [list.reduce((s,p) => s + p.center[0], 0) / list.length, list.reduce((s,p) => s + p.center[1], 0) / list.length]
      return list.reduce((best, p) => Math.hypot(p.center[0]-mean[0], p.center[1]-mean[1]) < Math.hypot(best[0]-mean[0], best[1]-mean[1]) ? p.center : best, list[0].center)
    }
    return {
      provincePath: new Map(provinces.map(p => [p.id, p.polygons.map(polygonPath).join(' ')])),
      landPaths: world.landPolygons.map(polygonPath),
      realmOutlines: world.realms.map(realm => ({ realm, d:mergedOutline(provinces.filter(p => p.realmId === realm.id)).map(polygonPath).join(' ') })),
      fiefOutlines: world.fiefs.map(fief => ({ fief, d:mergedOutline(provinces.filter(p => p.fiefId === fief.id)).map(polygonPath).join(' ') })),
      realmLabels: mapLabels(world),
      fiefLabels: world.fiefs.map(fief => ({ fief, center:fiefCenter(fief.provinceIds) })),
      centers: new Map(provinces.map(p => [p.id, p.center])),
      provinces,
    }
  }, [world.seed])
}

const SETTLEMENT_ICON: Record<string,string> = { castelo:'#art-castle', fortaleza:'#art-castle', cidade:'#art-castle', porto:'#art-port', vila:'#art-village', aldeia:'#ico-hamlet', mina:'#ico-mine', serraria:'#ico-mill', fazenda:'#ico-farm', entreposto:'#ico-trade', mosteiro:'#ico-hamlet', torre:'#ico-hamlet' }

interface ProvinceLayerProps { provinces: Province[]; paths: Map<string,string>; levelKey: string; mode: GameMode; seatId: string; playerHouseId: string; relationKey: string; onPick: (province: Province) => void }
const ProvinceLayer = memo(function ProvinceLayer({ provinces, paths, levelKey, mode, seatId, playerHouseId, relationKey, onPick }: ProvinceLayerProps) {
  const relations = new Map(relationKey ? relationKey.split('|').map(entry => { const [id, value] = entry.split(':'); return [id, Number(value)] }) : [])
  return <g>{provinces.map((province, index) => {
    const level = Number(levelKey[index])
    const own = province.governingHouseId === playerHouseId
    let fill = '#56645c'
    if (level === 1) fill = blendHex(terrainColor[province.terrain], '#7d8676', .35)
    else if (level >= 2) {
      if (mode === 'influenciar') fill = own ? '#d6b35c' : relations.has(province.governingHouseId) ? blendHex(relationColor(relations.get(province.governingHouseId)!), '#b9ad8a', .35) : blendHex(houseColor(province.governingHouseId), '#b7ab87', .45)
      else if (mode === 'conquistar') fill = own ? '#c79d4c' : blendHex(province.color, '#7f8378', .55)
      else fill = blendHex(province.color, '#b7ab87', .22)
    }
    return <path key={province.id} d={paths.get(province.id)} fill={fill} className={styles.province} data-province={province.id} data-knowledge={level} data-territory={province.realmId} data-own={province.id === seatId || undefined} stroke="#1f2a20" strokeOpacity={level >= 1 ? .6 : .25} strokeWidth=".8" vectorEffect="non-scaling-stroke" onClick={() => onPick(province)}/>
  })}</g>
})

export default function MapView({ game, inset }: { game: GameState; inset: MapInset }) {
  const world = game.world
  const { mode, selectedProvinceId, selectedSettlementId, focus, selectProvince, selectSettlement } = useUI()
  const geometry = useGeometry(world)
  const seat = world.provinces.find(p => p.id === world.houses.find(h => h.id === game.playerHouseId)!.seatProvinceId)!
  const [size, setSize] = useState(() => ({ width:window.innerWidth, height:window.innerHeight }))
  const vbWidth = MAP_HEIGHT * size.width / Math.max(1, size.height)
  const vb = { x:(MAP_WIDTH - vbWidth) / 2, width:vbWidth }
  const unit = MAP_HEIGHT / Math.max(1, size.height) // viewBox units per screen pixel
  const focusPoint = (): Point => [vb.x + (size.width - inset.right) / 2 * unit, (size.height - inset.bottom) / 2 * unit + 20 * unit]
  const [view, setView] = useState<View>(() => { const s = 3; const fx = vb.x + (size.width - inset.right) / 2 * unit, fy = (size.height - inset.bottom) / 2 * unit; return { scale:s, x:fx - seat.center[0] * s, y:fy - seat.center[1] * s } })
  const svg = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x:number; y:number }>())
  const gesture = useRef<{ moved:boolean; startX:number; startY:number; pinch?:number } | null>(null)
  const tween = useRef(0)

  useEffect(() => { const update = () => setSize({ width:window.innerWidth, height:window.innerHeight }); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update) }, [])
  const toSvg = (clientX: number, clientY: number) => new DOMPoint(clientX, clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse())
  const zoomAt = (px: number, py: number, factor: number) => setView(previous => { const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, previous.scale * factor)); return { scale, x:px - (px - previous.x) / previous.scale * scale, y:py - (py - previous.y) / previous.scale * scale } })
  // Native, non-passive wheel listener so the page never scrolls or browser-zooms while zooming the map.
  useEffect(() => {
    const element = svg.current!
    const onWheel = (event: WheelEvent) => { event.preventDefault(); const p = toSvg(event.clientX, event.clientY); zoomAt(p.x, p.y, Math.exp(-event.deltaY * (event.ctrlKey ? .01 : .0018))) }
    element.addEventListener('wheel', onWheel, { passive:false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])
  function flyTo(target: Point, minScale: number) {
    cancelAnimationFrame(tween.current)
    const start = performance.now(), from = view, [fx, fy] = focusPoint()
    const scale = Math.max(from.scale, minScale)
    const to = { scale, x:fx - target[0] * scale, y:fy - target[1] * scale }
    const step = (now: number) => { const t = Math.min(1, (now - start) / 420), e = 1 - Math.pow(1 - t, 3); setView({ scale:from.scale + (to.scale - from.scale) * e, x:from.x + (to.x - from.x) * e, y:from.y + (to.y - from.y) * e }); if (t < 1) tween.current = requestAnimationFrame(step) }
    tween.current = requestAnimationFrame(step)
  }
  // Camera moves only on explicit focus requests (notifications, panel links), never on calendar ticks.
  useEffect(() => { const target = focus && geometry.centers.get(focus.provinceId); if (target) flyTo(target, 3); return () => cancelAnimationFrame(tween.current) }, [focus?.nonce])
  // When the panel opens over the selected province (phones), slide the map just enough to keep it visible.
  useEffect(() => {
    const target = selectedProvinceId && geometry.centers.get(selectedProvinceId); if (!target) return
    const screenX = (view.x + target[0] * view.scale - vb.x) / unit, screenY = (view.y + target[1] * view.scale) / unit
    if (screenX > size.width - inset.right - 24 || screenY > size.height - inset.bottom - 24 || screenX < 0 || screenY < 40) flyTo(target, view.scale)
  }, [selectedProvinceId, inset.right, inset.bottom])

  const levelKey = world.provinces.map(p => knowledge(game, p.id)).join('')
  const levels = useMemo(() => new Map(world.provinces.map((p, i) => [p.id, Number(levelKey[i])])), [levelKey])
  // Fog is one merged shape per knowledge level, so no internal province borders leak through it.
  const fog = useMemo(() => ({ unknown:unionPath(geometry.provinces.filter(p => levels.get(p.id) === 0)), sighted:unionPath(geometry.provinces.filter(p => levels.get(p.id) === 1)) }), [levels, geometry])
  const explorable = useMemo(() => mode === 'descobrir' ? world.provinces.filter(p => levels.get(p.id) === 1 && canExplore(game, p.id)).map(p => p.id) : [], [levels, mode, game.campaign.expeditions.length, game.campaign.expeditions.filter(e => e.completed).length])
  const relationKey = game.campaign.contacts.filter(c => c.establishedDay !== null).map(c => `${c.houseId}:${c.relation}`).join('|')
  // Brief reveal animation whenever a province becomes explored.
  const previousLevels = useRef(levelKey)
  const [revealing, setRevealing] = useState<string[]>([])
  useEffect(() => {
    const before = previousLevels.current; previousLevels.current = levelKey
    if (before === levelKey || before.length !== levelKey.length) return
    const revealed = world.provinces.filter((_, i) => Number(before[i]) < 2 && Number(levelKey[i]) >= 2).map(p => p.id)
    if (!revealed.length) return
    setRevealing(revealed); const timer = window.setTimeout(() => setRevealing([]), 2600); return () => window.clearTimeout(timer)
  }, [levelKey])

  const stablePick = useCallback((province: Province) => { if (gesture.current?.moved) return; useUI.getState().selectProvince(province.id) }, [])
  function pickSettlement(settlement: Settlement) { if (gesture.current?.moved) return; selectProvince(settlement.provinceId); selectSettlement(settlement.id) }
  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    cancelAnimationFrame(tween.current)
    pointers.current.set(event.pointerId, { x:event.clientX, y:event.clientY })
    if (pointers.current.size === 1) gesture.current = { moved:false, startX:event.clientX, startY:event.clientY }
    else if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current = { moved:true, startX:0, startY:0, pinch:Math.hypot(a.x - b.x, a.y - b.y) } }
  }
  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const last = pointers.current.get(event.pointerId); if (!last || !gesture.current) return
    if (pointers.current.size === 2 && gesture.current.pinch) {
      pointers.current.set(event.pointerId, { x:event.clientX, y:event.clientY })
      const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2); zoomAt(mid.x, mid.y, distance / gesture.current.pinch); gesture.current.pinch = distance; return
    }
    if (!gesture.current.moved && Math.hypot(event.clientX - gesture.current.startX, event.clientY - gesture.current.startY) <= 5) return
    if (!gesture.current.moved) { gesture.current.moved = true; event.currentTarget.setPointerCapture(event.pointerId) }
    const dx = (event.clientX - last.x) * unit, dy = (event.clientY - last.y) * unit
    pointers.current.set(event.pointerId, { x:event.clientX, y:event.clientY })
    setView(previous => ({ ...previous, x:previous.x + dx, y:previous.y + dy }))
  }
  function onPointerUp(event: React.PointerEvent<SVGSVGElement>) { pointers.current.delete(event.pointerId); if (pointers.current.size === 0) setTimeout(() => { gesture.current = null }, 0) }
  function zoomButton(factor: number) { const [fx, fy] = focusPoint(); zoomAt(fx, fy, factor) }
  function recenter() { const [fx, fy] = focusPoint(); const scale = 3; setView({ scale, x:fx - seat.center[0] * scale, y:fy - seat.center[1] * scale }) }

  const s = view.scale, k = 1 / s
  const knownRealms = new Set(world.provinces.filter(p => (levels.get(p.id) ?? 0) >= 2).map(p => p.realmId))
  const knownFiefs = new Set(world.provinces.filter(p => (levels.get(p.id) ?? 0) >= 2).map(p => p.fiefId))
  const exploredProvinces = world.provinces.filter(p => (levels.get(p.id) ?? 0) >= 2)
  const showSettlements = s >= 2.3, showSettlementNames = s >= 4.6, showProvinceNames = s >= 2.5, showFiefNames = s >= 1.5 && s < 4.2, showRealmNames = s < 2.4
  const selected = world.provinces.find(p => p.id === selectedProvinceId)
  const activeExpeditions = game.campaign.expeditions.filter(e => !e.completed)
  const pendingEnvoys = game.campaign.diplomacy.filter(d => !d.completed)
  const activeSpies = game.campaign.spyMissions.filter(m => !m.completed)
  const routeAt = (route: string[], t: number): Point => { const pts = route.map(id => geometry.centers.get(id)!); if (pts.length < 2) return pts[0]; const f = Math.min(.999, Math.max(0, t)) * (pts.length - 1), i = Math.floor(f), r = f - i; return [pts[i][0] + (pts[i+1][0] - pts[i][0]) * r, pts[i][1] + (pts[i+1][1] - pts[i][1]) * r] }
  const routeD = (route: string[]) => `M${route.map(id => geometry.centers.get(id)!.join(' ')).join('L')}`
  const latestReport = (provinceId: string) => game.campaign.reports.filter(r => r.provinceId === provinceId && r.garrison !== undefined && r.expiresDay >= game.day).at(-1)

  return <div className={styles.mapShell}>
    <svg ref={svg} className={styles.map} viewBox={`${vb.x} 0 ${vb.width} ${MAP_HEIGHT}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} role="img" aria-label="Mapa político interativo de Varedor" data-scale={s.toFixed(2)}>
      <defs>
        <radialGradient id="sea" cx="58%" cy="55%" r="75%"><stop stopColor="#2d7783"/><stop offset=".52" stopColor="#205467"/><stop offset="1" stopColor="#142f43"/></radialGradient>
        <pattern id="waves" width="126" height="87" patternUnits="userSpaceOnUse"><path d="M3 22q30-4 60 0m-24 44q28-3 54 0M96 44h17" fill="none" stroke="#b4d9dc" strokeOpacity=".055" strokeWidth=".6"/></pattern>
        <radialGradient id="cloud"><stop stopColor="#a9b8b2" stopOpacity=".5"/><stop offset="1" stopColor="#a9b8b2" stopOpacity="0"/></radialGradient>
        <pattern id="fogTexture" width="120" height="96" patternUnits="userSpaceOnUse"><rect width="120" height="96" fill="#3a4b4c"/><ellipse cx="32" cy="24" rx="28" ry="12" fill="url(#cloud)"/><ellipse cx="86" cy="62" rx="30" ry="13" fill="url(#cloud)"/><ellipse cx="36" cy="78" rx="22" ry="9" fill="url(#cloud)" opacity=".7"/><ellipse cx="96" cy="16" rx="18" ry="8" fill="url(#cloud)" opacity=".6"/></pattern>
        <pattern id="hazeTexture" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="#e3e8df" opacity=".2"/><path d="M0 3h6" stroke="#f3f6ef" strokeOpacity=".14" strokeWidth="1"/></pattern>
        <MapSprites/>
        <symbol id="ico-mine" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#33424a" stroke="#e8cf95" strokeWidth="1.6"/><path d="M7 17l7-7m-3-3c3-1 6 0 7 3l-2 0c-1-1-3-2-5-1Z" stroke="#f3e2b8" strokeWidth="1.8" fill="#f3e2b8"/></symbol>
        <symbol id="ico-mill" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4f3a24" stroke="#e8cf95" strokeWidth="1.6"/><path d="M6 14h12v3H6Zm2-5h8v3H8Z" fill="#e9c98d"/></symbol>
        <symbol id="ico-farm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#6b7a2e" stroke="#e8cf95" strokeWidth="1.6"/><path d="M12 5c-1 3-1 5 0 7 1-2 1-4 0-7Zm-3 5c0 3 1 4 3 5m3-5c0 3-1 4-3 5m0-3v6" stroke="#f6e4a8" strokeWidth="1.4" fill="#f6e4a8"/></symbol>
        <symbol id="ico-trade" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#7a3f2c" stroke="#e8cf95" strokeWidth="1.6"/><path d="M6 11l6-5 6 5Zm1 1h10v6H7Z" fill="#f2dcae"/></symbol>
        <symbol id="ico-hamlet" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#5b4a36" stroke="#e8cf95" strokeWidth="1.6"/><path d="M6 13l6-6 6 6v5H6Z" fill="#f2dcae"/></symbol>
        <clipPath id="landClip">{geometry.landPaths.map((d,i) => <path key={i} d={d}/>)}</clipPath>
        <filter id="relief"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".8"/></feComponentTransfer></filter>
        <filter id="coastGlow"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <rect x={vb.x} width={vb.width} height={MAP_HEIGHT} fill="url(#sea)"/><rect x={vb.x} width={vb.width} height={MAP_HEIGHT} fill="url(#waves)"/>
      <g transform={`translate(${view.x} ${view.y}) scale(${s})`}>
        {geometry.landPaths.map((d,i) => <g key={i} pointerEvents="none"><path d={d} fill="#638858" stroke="#3b9ca2" strokeWidth="14" strokeOpacity=".2" filter="url(#coastGlow)"/><path d={d} fill="#81a061" stroke="#173e42" strokeWidth="1.7"/></g>)}
        <ProvinceLayer provinces={geometry.provinces} paths={geometry.provincePath} levelKey={levelKey} mode={mode} seatId={seat.id} playerHouseId={game.playerHouseId} relationKey={relationKey} onPick={stablePick}/>
        <g clipPath="url(#landClip)" pointerEvents="none"><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#fff" opacity=".13" filter="url(#relief)" style={{ mixBlendMode:'multiply' }}/></g>
        <g pointerEvents="none" opacity=".45">{world.roads.filter(([a, b]) => (levels.get(a) ?? 0) >= 2 && (levels.get(b) ?? 0) >= 1).map(([from, to]) => { const a = geometry.centers.get(from)!, b = geometry.centers.get(to)!; return <path key={`${from}-${to}`} d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} stroke="#f8e4ad" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" fill="none"/> })}</g>
        <g pointerEvents="none">{world.rivers.map((river,index) => <g key={index}><path d={riverPath(river)} stroke="#244c5e" strokeWidth="2.4" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round"/><path d={riverPath(river)} stroke="#78b9c2" strokeWidth="1.2" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round"/></g>)}</g>
        <g pointerEvents="none" data-layer="fief-borders">{geometry.fiefOutlines.map(({ fief, d }) => <g key={fief.id}><path d={d} fill="none" stroke="#2b2418" strokeOpacity=".5" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/><path d={d} fill="none" stroke="#f3d59b" strokeWidth="1.1" strokeDasharray="6 3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" opacity=".9"/></g>)}</g>
        <g pointerEvents="none" data-layer="realm-borders">{geometry.realmOutlines.map(({ realm, d }) => <g key={realm.id}><path d={d} fill="none" stroke="#0f1d24" strokeWidth="4.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/><path d={d} fill="none" stroke={realm.accent} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/></g>)}</g>
        {geometry.landPaths.map((d,i) => <path key={i} d={d} fill="none" stroke="#efcf8e" strokeWidth=".8" vectorEffect="non-scaling-stroke" pointerEvents="none"/>)}

        <g pointerEvents="none" data-layer="fog" className={styles.fog}>
          {fog.sighted && <path d={fog.sighted} fill="url(#hazeTexture)" fillRule="evenodd"/>}
          {fog.unknown && <><path d={fog.unknown} fill="none" stroke="#3a4b4c" strokeOpacity=".22" strokeWidth="14" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/><path d={fog.unknown} fill="none" stroke="#3a4b4c" strokeOpacity=".4" strokeWidth="6" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/><path d={fog.unknown} fill="url(#fogTexture)" fillRule="evenodd" opacity=".97"/></>}
          {revealing.map(id => <g key={id} className={styles.reveal}><path d={geometry.provincePath.get(id)} fill="url(#fogTexture)" className={styles.revealFog}/><path d={geometry.provincePath.get(id)} fill="none" stroke="#ffe39a" strokeWidth="4" vectorEffect="non-scaling-stroke" className={styles.revealGlow}/></g>)}
        </g>

        <g pointerEvents="none">
          {explorable.map(id => <path key={id} d={geometry.provincePath.get(id)} fill="#ffe08a" fillOpacity=".08" stroke="#ffe08a" strokeWidth="2" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" className={styles.explorable} data-explorable={id}/>)}
          <path d={geometry.provincePath.get(seat.id)} fill="none" stroke="#ffd76e" strokeOpacity=".35" strokeWidth="9" vectorEffect="non-scaling-stroke"/>
          <path d={geometry.provincePath.get(seat.id)} fill="none" stroke="#ffd76e" strokeWidth="2.6" vectorEffect="non-scaling-stroke" data-player-seat/>
          {selected && <g data-selected={selected.id}><path d={geometry.provincePath.get(selected.id)} fill="#fff6d8" fillOpacity=".13" stroke="#0c1820" strokeOpacity=".6" strokeWidth="6" vectorEffect="non-scaling-stroke"/><path d={geometry.provincePath.get(selected.id)} fill="none" stroke="#fff6d8" strokeWidth="2.8" vectorEffect="non-scaling-stroke" className={styles.selectedOutline}/></g>}
        </g>

        {showSettlements && <g data-layer="settlements">{exploredProvinces.flatMap(p => p.settlementIds).map(id => world.settlements.find(s => s.id === id)!).map(settlement => {
          const big = settlement.type === 'cidade' || settlement.type === 'castelo' || settlement.type === 'fortaleza'
          const sprite = SETTLEMENT_ICON[settlement.type] ?? '#ico-hamlet', vector = sprite.startsWith('#ico'), size = (vector ? 13 : big ? 26 : 20) * k * Math.min(1.6, Math.sqrt(s / 2.3))
          return <g key={settlement.id} className={styles.settlement} data-map-building={settlement.id} data-type={settlement.type} onClick={() => pickSettlement(settlement)} role="button" aria-label={`Selecionar ${settlement.name}`}>
            <use href={sprite} x={settlement.position[0] - size / 2} y={settlement.position[1] - size * (vector ? .5 : .78)} width={size} height={size}/>
            {settlement.id === selectedSettlementId && <circle cx={settlement.position[0]} cy={settlement.position[1]} r={size * .62} fill="none" stroke="#ffe8a8" strokeWidth={1.6 * k}/>}
            {showSettlementNames && <text x={settlement.position[0]} y={settlement.position[1] + size * .55 + 8 * k} fontSize={9 * k} textAnchor="middle" className={styles.settlementName}>{settlement.name}</text>}
          </g>
        })}</g>}

        <MapShips routes={world.seaRoutes}/>

        <g pointerEvents="none" data-layer="labels">
          {showRealmNames && geometry.realmLabels.filter(({ realm }) => knownRealms.has(realm.id)).map(({ realm, center, compact }) => <text key={realm.id} data-map-label={realm.id} x={center[0]} y={center[1]} fontSize={(compact ? 15 : 19) * Math.min(1.4, Math.max(.75, 1 / Math.sqrt(s)))} className={styles.realmName} style={{ opacity:Math.min(1, (2.4 - s) * 1.6) }}>{realm.name.toLocaleUpperCase('pt-BR')}</text>)}
          {showFiefNames && geometry.fiefLabels.filter(({ fief }) => knownFiefs.has(fief.id)).map(({ fief, center }) => <text key={fief.id} data-fief-label={fief.id} x={center[0]} y={center[1] - 10 * k} fontSize={12 * k} className={styles.fiefName}>{fief.name}</text>)}
          {showProvinceNames && exploredProvinces.map(p => <text key={p.id} data-province-label={p.id} x={p.center[0]} y={p.center[1] + (showSettlements ? 16 : 3) * k} fontSize={(p.id === seat.id ? 11 : 9.5) * k} className={p.id === seat.id ? `${styles.provinceName} ${styles.seatName}` : styles.provinceName}>{p.name}</text>)}
        </g>

        <g pointerEvents="none" data-layer="markers">
          {(mode === 'descobrir' || mode === 'influenciar') && game.campaign.contacts.map(contact => { const c = geometry.centers.get(contact.provinceId)!; const established = contact.establishedDay !== null; return <g key={contact.houseId} data-diplomatic-marker={contact.houseId} transform={`translate(${c[0] + 9 * k} ${c[1] - 9 * k}) scale(${k})`}><circle r="6.5" fill={established ? relationColor(contact.relation) : '#6b6f73'} stroke="#fff1c9" strokeWidth="1.4"/><text y="3" fontSize="8" textAnchor="middle" fill="#14232b" fontWeight="700">{established ? (contact.trade ? '⚖' : '✉') : '…'}</text><title>{established ? disposition(contact.relation) : 'Emissário a caminho'}</title></g> })}
          {mode === 'descobrir' && pendingEnvoys.filter(d => d.kind === 'emissary').map(d => { const route = [seat.id, d.provinceId], t = (game.day - d.startDay) / Math.max(1, d.endDay - d.startDay), p = routeAt(route, t); return <g key={d.id}><path d={routeD(route)} stroke="#e7d9b5" strokeWidth="1.4" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" fill="none"/><circle cx={p[0]} cy={p[1]} r={3.5 * k} fill="#f3e6c4" stroke="#20313b" strokeWidth={k}/></g> })}
          {mode === 'descobrir' && activeExpeditions.map(e => { const t = (game.day - e.startDay) / Math.max(1, e.endDay - e.startDay), p = routeAt(e.route, t), target = geometry.centers.get(e.provinceId)!; return <g key={e.id} data-expedition-marker={e.provinceId}>
            <path d={routeD(e.route)} stroke="#ffd36e" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" fill="none"/>
            <g transform={`translate(${target[0]} ${target[1]}) scale(${k})`}><circle r="11" fill="#13232c" fillOpacity=".75" stroke="#ffd36e" strokeWidth="1"/><circle r="11" fill="none" stroke="#ffd36e" strokeWidth="3" strokeDasharray={`${Math.min(1, t) * 69.1} 69.1`} transform="rotate(-90)"/><text y="4" fontSize="10" textAnchor="middle" fill="#ffe8b0">{Math.max(0, e.endDay - game.day)}d</text></g>
            <g transform={`translate(${p[0]} ${p[1]}) scale(${k})`} className={styles.walker}><path d="M0 -12V4M0 -12l9 3-9 3" stroke="#ffd36e" strokeWidth="1.6" fill="#c0392b"/><circle r="3" cy="5" fill="#ffd36e"/></g>
          </g> })}
          {mode === 'influenciar' && activeSpies.map(m => { const c = geometry.centers.get(m.provinceId)!; return <g key={m.id} data-spy-marker={m.provinceId}><path d={routeD(m.route)} stroke="#b8a6d9" strokeWidth="1.4" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" fill="none"/><g transform={`translate(${c[0] - 10 * k} ${c[1] - 10 * k}) scale(${k})`}><circle r="8" fill="#2a2140" stroke="#d3c3f2"/><path d="M-5 0Q0 -5 5 0Q0 5 -5 0Z" fill="#e9defa"/><circle r="1.8" fill="#2a2140"/></g></g> })}
          {mode === 'conquistar' && world.provinces.filter(p => p.governingHouseId === game.playerHouseId || latestReport(p.id)).map(p => { const own = p.governingHouseId === game.playerHouseId; const value = own ? world.settlements.filter(s => s.provinceId === p.id).reduce((n, s) => n + s.garrison, 0) : latestReport(p.id)!.garrison!; return <g key={p.id} data-garrison={p.id} transform={`translate(${p.center[0]} ${p.center[1] - 14 * k}) scale(${k})`}><path d="M-11 -9h22v8c0 7-5 11-11 13-6-2-11-6-11-13Z" fill={own ? '#2f4f63' : '#5b2b28'} stroke="#f0d08e" strokeWidth="1.2"/><text y="3" fontSize="8.5" textAnchor="middle" fill="#fff0cf" fontWeight="700">{own ? value : `~${value}`}</text></g> })}
        </g>
      </g>
    </svg>
    <Minimap world={world} levelKey={levelKey} paths={geometry.provincePath} land={geometry.landPaths} view={view} vb={vb} onJump={(px, py) => { const [fx, fy] = focusPoint(); setView(previous => ({ ...previous, x:fx - px * previous.scale, y:fy - py * previous.scale })) }}/>
    <div className={styles.controls}><button onClick={() => zoomButton(1.3)} title="Aproximar" aria-label="Aproximar">＋</button><button onClick={() => zoomButton(1 / 1.3)} title="Afastar" aria-label="Afastar">−</button><button onClick={recenter} title="Centralizar em Pontevela" aria-label="Centralizar no domínio">⌖</button></div>
  </div>
}

const Minimap = memo(function Minimap({ world, levelKey, paths, land, view, vb, onJump }: { world: World; levelKey: string; paths: Map<string,string>; land: string[]; view: View; vb: { x:number; width:number }; onJump: (x: number, y: number) => void }) {
  const base = useMemo(() => <>{land.map((d, i) => <path key={i} d={d} fill="#2e4a4f"/>)}{world.provinces.map((p, i) => Number(levelKey[i]) >= 1 && <path key={p.id} d={paths.get(p.id)} fill={Number(levelKey[i]) >= 2 ? p.color : '#7d8a80'} fillOpacity={Number(levelKey[i]) >= 2 ? .95 : .6}/>)}</>, [levelKey, paths, land])
  return <div className={styles.minimap}><div>VAREDOR</div><svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-label="Mini-mapa: toque para centralizar" onClick={event => { const bounds = event.currentTarget.getBoundingClientRect(); onJump((event.clientX - bounds.left) / bounds.width * MAP_WIDTH, (event.clientY - bounds.top) / bounds.height * MAP_HEIGHT) }}><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0e4456"/>{base}<rect x={(vb.x - view.x) / view.scale} y={-view.y / view.scale} width={vb.width / view.scale} height={MAP_HEIGHT / view.scale} fill="none" stroke="#fff4c8" strokeWidth={Math.max(4, 10 / view.scale)}/></svg></div>
})
