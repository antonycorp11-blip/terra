import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { MAP_HEIGHT, MAP_WIDTH } from '../engine/geography'
import { buildMesh, isRiverCell } from '../engine/mesh'
import type { GameState, Id, Province, Resource } from '../engine/types'
import { RESOURCES } from '../engine/types'
import { armyPosition, defenders } from '../engine/military'
import { influenceOf } from '../engine/influence'
import { controlled, isVassal } from '../engine/stateUtils'
import { provinceProduction } from '../engine/economy'
import type { TerrainResult } from './map/terrainWorker'
import { bordersOf, labelSize, ringPath } from './map/geometry'
import { assetUrl, heraldryOf, houseOf, levelOf, mapColor, provinceOf, rulerFigure, type Level } from './view'
import type { Lens } from './store'
import Crest from './Heraldry'
import { ResourceGlyph } from './Icons'
import styles from './MapView.module.css'

const W = MAP_WIDTH, H = MAP_HEIGHT
interface Props { game: GameState; lens: Lens; selectedId: Id | null; resourceFilter: string | null; focus: { provinceId: Id; nonce: number } | null; onSelect: (id: Id | null) => void }

/* ---------- terrain raster (worker) ---------- */
const rasterCache = new Map<number, Promise<{ terrain: HTMLCanvasElement; mask: string }>>()
function terrainFor(game: GameState) {
  const seed = game.world.seed
  let p = rasterCache.get(seed)
  if (!p) {
    p = new Promise(resolve => {
      const worker = new Worker(new URL('./map/terrainWorker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<TerrainResult>) => { worker.terminate(); resolve(paintTerrain(game, event.data)) }
      worker.postMessage({ seed, scale: .85 })
    })
    rasterCache.set(seed, p)
  }
  return p
}
const RES = 2 // terrain canvas pixels per world unit
function paintTerrain(game: GameState, r: TerrainResult) {
  const raster = document.createElement('canvas'); raster.width = r.width; raster.height = r.height
  raster.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.color), r.width, r.height), 0, 0)
  const maskCanvas = document.createElement('canvas'); maskCanvas.width = r.width; maskCanvas.height = r.height
  maskCanvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.mask), r.width, r.height), 0, 0)
  const c = document.createElement('canvas'); c.width = W * RES; c.height = H * RES
  const x = c.getContext('2d')!
  x.imageSmoothingQuality = 'high'; x.drawImage(raster, 0, 0, c.width, c.height)
  x.setTransform(RES, 0, 0, RES, 0, 0)
  const mesh = buildMesh(game.world.seed)
  // Roads between neighbouring provinces.
  x.strokeStyle = 'rgba(112,82,44,.55)'; x.lineWidth = .7; x.setLineDash([2.4, 1.6])
  for (const [a, b] of game.world.roads) { const pa = provinceOf(game, a).center, pb = provinceOf(game, b).center; x.beginPath(); x.moveTo(pa[0], pa[1]); x.quadraticCurveTo((pa[0] + pb[0]) / 2 + (pa[1] - pb[1]) * .08, (pa[1] + pb[1]) / 2 + (pb[0] - pa[0]) * .08, pb[0], pb[1]); x.stroke() }
  x.setLineDash([])
  // Trees in wet lowlands, peaks on the ridges: painted glyphs on top of the relief.
  type G = { t: 'tree' | 'peak'; x: number; y: number; s: number; v: number }
  const glyphs: G[] = []
  for (let i = 0; i < mesh.points.length; i++) {
    if (!mesh.land[i]) continue
    const e = mesh.elevation[i], m = mesh.moisture[i], [px, py] = mesh.points[i], h = (n: number) => ((Math.imul(i + 1, 2654435761) >>> n) & 1023) / 1023
    if (m > .57 && e > .03 && e < .4) for (let k = 0; k < 3; k++) glyphs.push({ t: 'tree', x: px + (h(k * 3) - .5) * 9, y: py + (h(k * 3 + 11) - .5) * 9, s: 1.5 + h(k + 20), v: h(k + 4) })
    else if (e > .5 && e < .78 && h(2) < .45) glyphs.push({ t: 'peak', x: px, y: py + 3, s: 5 + e * 7 + h(5) * 3, v: h(9) })
  }
  glyphs.sort((a, b) => a.y - b.y)
  for (const g of glyphs) {
    if (g.t === 'tree') {
      x.fillStyle = 'rgba(15,25,10,.32)'; x.beginPath(); x.ellipse(g.x + .6, g.y + .3, g.s * .9, g.s * .4, 0, 0, 7); x.fill()
      x.fillStyle = g.v < .5 ? '#3a5628' : '#466631'; x.beginPath(); x.arc(g.x, g.y - g.s * .5, g.s * .85, 0, 7); x.fill()
      x.fillStyle = 'rgba(175,205,115,.35)'; x.beginPath(); x.arc(g.x - g.s * .3, g.y - g.s * .8, g.s * .35, 0, 7); x.fill()
    } else {
      const s = g.s
      x.fillStyle = '#b6ac98'; x.beginPath(); x.moveTo(g.x - s * .7, g.y); x.lineTo(g.x, g.y - s); x.lineTo(g.x + s * .05, g.y); x.fill()
      x.fillStyle = '#6a6357'; x.beginPath(); x.moveTo(g.x, g.y - s); x.lineTo(g.x + s * .7, g.y); x.lineTo(g.x + s * .05, g.y); x.fill()
      if (s > 9.5) { x.fillStyle = '#f4f1ea'; x.beginPath(); x.moveTo(g.x - s * .2, g.y - s * .72); x.lineTo(g.x, g.y - s); x.lineTo(g.x + s * .2, g.y - s * .72); x.fill() }
      x.strokeStyle = 'rgba(40,30,20,.4)'; x.lineWidth = .35; x.beginPath(); x.moveTo(g.x - s * .7, g.y); x.lineTo(g.x, g.y - s); x.lineTo(g.x + s * .7, g.y); x.stroke()
    }
  }
  // Rivers from the drainage network.
  x.lineCap = 'round'; x.lineJoin = 'round'
  for (let i = 0; i < mesh.points.length; i++) {
    if (!isRiverCell(mesh, i) || mesh.parent[i] < 0) continue
    const j = mesh.parent[i], w = Math.min(2.2, .35 + Math.sqrt(mesh.flow[i]) / 11)
    x.strokeStyle = '#3e7f8d'; x.lineWidth = w; x.beginPath(); x.moveTo(mesh.points[i][0], mesh.points[i][1]); x.lineTo(mesh.points[j][0], mesh.points[j][1]); x.stroke()
  }
  return { terrain: c, mask: maskCanvas.toDataURL('image/png') }
}

/* ---------- static province layer: paths never change, only their styling ---------- */
const ProvincePaths = memo(function ProvincePaths({ provinces, onPick }: { provinces: Province[]; onPick: (id: Id) => void }) {
  return <g className={styles.hits}>{provinces.map(p => <path key={p.id} d={ringPath(p)} data-province={p.id} fillRule="evenodd" onClick={() => onPick(p.id)}/>)}</g>
})

export default function MapView({ game, lens, selectedId, resourceFilter, focus, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null), layer = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null)
  const [mask, setMask] = useState<string | null>(null)
  const cam = useRef({ k: 2.6, x: 0, y: 0, base: 1, w: 1, h: 1, ready: false })
  const dragged = useRef(false)
  const world = game.world
  const paths = useMemo(() => new Map(world.provinces.map(p => [p.id, ringPath(p)])), [world.landPolygons])
  const borders = useMemo(() => bordersOf(world), [world.landPolygons])

  /* camera */
  const apply = () => {
    const c = cam.current, el = layer.current
    if (!el) return
    const s = c.base * c.k
    // Never show beyond the edge of the continent's chart; centre it when it is smaller than the screen.
    c.x = W * s > c.w ? Math.min(0, Math.max(c.w - W * s, c.x)) : (c.w - W * s) / 2
    c.y = H * s > c.h ? Math.min(0, Math.max(c.h - H * s, c.y)) : (c.h - H * s) / 2
    el.style.transform = `translate(${c.x}px,${c.y}px) scale(${s})`
    el.style.setProperty('--k', String(c.k))
    el.style.setProperty('--inv', String(1 / s))
    el.style.setProperty('--lk', String(1 / Math.pow(c.k, .72)))
    box.current?.setAttribute('data-zoom', c.k < 1.7 ? 'far' : c.k < 3.4 ? 'mid' : 'near')
  }
  const centerOn = (pt: [number, number], k?: number) => { const c = cam.current; if (k) c.k = k; const s = c.base * c.k; c.x = c.w / 2 - pt[0] * s; c.y = c.h / 2 - pt[1] * s; apply() }
  useEffect(() => {
    const el = box.current!
    const resize = () => { const c = cam.current, r = el.getBoundingClientRect(); const first = !c.ready; c.w = r.width; c.h = r.height; c.base = Math.max(r.width / W, r.height / H); c.ready = true; if (first) centerOn(provinceOf(game, houseOf(game, game.playerHouseId).seatProvinceId).center); else apply() }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)
    return () => ro.disconnect()
    // Camera only moves on the player's command: never on calendar ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (focus) centerOn(provinceOf(game, focus.provinceId).center, Math.max(cam.current.k, 3)) }, [focus?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = box.current!, pointers = new Map<number, [number, number]>()
    let start: { x: number; y: number; cx: number; cy: number } | null = null, pinch: { d: number; k: number; mx: number; my: number; cx: number; cy: number } | null = null
    const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const zoomAt = (f: number, sx: number, sy: number) => { const c = cam.current, k0 = c.k; c.k = Math.max(1, Math.min(9, c.k * f)); const r = c.k / k0; c.x = sx - (sx - c.x) * r; c.y = sy - (sy - c.y) * r; apply() }
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-ui]')) return
      pointers.set(e.pointerId, local(e)); dragged.current = false
      if (pointers.size === 1) start = { x: local(e)[0], y: local(e)[1], cx: cam.current.x, cy: cam.current.y }
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: cam.current.k, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, cx: cam.current.x, cy: cam.current.y }; start = null }
    }
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, local(e))
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()], c = cam.current, k = Math.max(1, Math.min(9, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)), r = k / pinch.k; c.k = k; c.x = pinch.mx - (pinch.mx - pinch.cx) * r; c.y = pinch.my - (pinch.my - pinch.cy) * r; apply(); dragged.current = true; return }
      if (start) { const [x, y] = local(e); if (Math.hypot(x - start.x, y - start.y) > 6) { dragged.current = true; el.classList.add(styles.dragging) } if (dragged.current) { cam.current.x = start.cx + x - start.x; cam.current.y = start.cy + y - start.y; apply() } }
    }
    const up = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { start = null; el.classList.remove(styles.dragging) } }
    const wheel = (e: WheelEvent) => { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * .0015), x, y) }
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); el.addEventListener('wheel', wheel, { passive: false })
    const zoomIn = () => zoomAt(1.4, cam.current.w / 2, cam.current.h / 2), zoomOut = () => zoomAt(1 / 1.4, cam.current.w / 2, cam.current.h / 2)
    el.addEventListener('map-zoom-in', zoomIn); el.addEventListener('map-zoom-out', zoomOut)
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); el.removeEventListener('map-zoom-in', zoomIn); el.removeEventListener('map-zoom-out', zoomOut) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* terrain */
  useEffect(() => {
    let alive = true
    terrainFor(game).then(({ terrain, mask }) => {
      if (!alive || !canvas.current) return
      const c = canvas.current; c.width = terrain.width; c.height = terrain.height; c.getContext('2d')!.drawImage(terrain, 0, 0); setMask(mask)
    })
    return () => { alive = false }
  }, [world.seed]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: Id) => { if (!dragged.current) onSelect(id) }

  /* derived per tick */
  const level = new Map(world.provinces.map(p => [p.id, levelOf(game, p.id)] as [Id, Level]))
  const mine = new Set(controlled(game).map(p => p.id))
  const realmOf = (p: Province) => mine.has(p.id) || (isVassal(game, p.governingHouseId) && !p.occupyingHouseId)
  const known = world.provinces.filter(p => level.get(p.id) === 'known')
  const playerColor = game.campaign.customization.heraldry.primary
  const fiefOf = new Map(world.provinces.map(p => [p.id, p.fiefId])), realmIdOf = new Map(world.provinces.map(p => [p.id, p.realmId]))
  const ownerKey = (id: Id) => { const p = provinceOf(game, id); return realmOf(p) ? 'player' : (p.occupyingHouseId ?? p.governingHouseId) }
  const borderClass = (a: Id, b: Id) => {
    const la = level.get(a)!, lb = level.get(b)!
    if (realmIdOf.get(a) !== realmIdOf.get(b)) return 'realm'
    if (la === 'hidden' && lb === 'hidden') return 'hidden'
    // Inside the player's realm, conquered land merges: the border all but disappears.
    if (ownerKey(a) === 'player' && ownerKey(b) === 'player') return 'merged'
    if (fiefOf.get(a) !== fiefOf.get(b)) return la === 'known' || lb === 'known' ? 'fief' : 'province'
    return la === 'hidden' || lb === 'hidden' ? 'hidden' : 'province'
  }
  const groups: Record<string, string> = { hidden: '', province: '', fief: '', realm: '', merged: '' }
  for (const b of borders) groups[borderClass(b.a, b.b)] += b.d
  const selected = selectedId ? provinceOf(game, selectedId) : null

  const fiefLabels = world.fiefs.filter(f => f.provinceIds.some(id => level.get(id) === 'known') && f.provinceIds.filter(id => level.get(id) === 'known').length >= 3).map(f => {
    const ps = f.provinceIds.map(id => provinceOf(game, id)), area = ps.reduce((s, p) => s + p.area, 0)
    return { id: f.id, name: f.name, x: ps.reduce((s, p) => s + p.center[0] * p.area, 0) / area, y: ps.reduce((s, p) => s + p.center[1] * p.area, 0) / area }
  })
  const realmLabels = world.realms.map(r => { const ps = world.provinces.filter(p => p.realmId === r.id), area = ps.reduce((s, p) => s + p.area, 0); return { id: r.id, name: r.name, x: ps.reduce((s, p) => s + p.center[0] * p.area, 0) / area, y: ps.reduce((s, p) => s + p.center[1] * p.area, 0) / area } })

  /* lens fills */
  const lensFill = (p: Province): [string, number] | null => {
    if (level.get(p.id) !== 'known') return null
    if (lens === 'diplomacia') {
      if (resourceFilter) { if (p.resources.includes(resourceFilter as Resource)) return ['#e0b44a', .62]; if (mine.has(p.id)) return ['#c4553f', .45]; return null }
      return [mapColor(game, p.governingHouseId), .32]
    }
    if (lens === 'militar') { const men = mine.has(p.id) ? game.campaign.garrisons[p.id] ?? 0 : defenders(game, p); return [realmOf(p) ? playerColor : mapColor(game, p.governingHouseId), Math.min(.82, .16 + men / 1400)] }
    if (lens === 'influencia') { if (realmOf(p)) return [playerColor, .7]; const v = influenceOf(game, p.governingHouseId); return [v >= 60 ? '#f1c75b' : v >= 30 ? '#c99a3e' : v > 0 ? '#7a6a45' : '#3b4244', .72] }
    return null
  }
  const seats = known.filter(p => houseOf(game, p.governingHouseId).seatProvinceId === p.id)
  const castleAt = (p: Province) => world.settlements.find(s => s.provinceId === p.id && s.type === 'castelo')!.position

  return <div ref={box} className={styles.map} role="application" aria-label="Mapa de Varedor" data-lens={lens}>
    <div ref={layer} className={styles.world}>
      <canvas ref={canvas} className={styles.terrain} width={4} height={4}/>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <defs>
          <pattern id="fog" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#36414a"/><path d="M0 0v6" stroke="#4b5862" strokeWidth="1.2"/></pattern>
          {mask && <mask id="land" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}><image href={mask} x="0" y="0" width={W} height={H} preserveAspectRatio="none"/></mask>}
          <pattern id="vassal" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0v5" stroke="#fff4d0" strokeWidth="1"/></pattern>
          <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          {known.map(p => <clipPath key={p.id} id={`clip-${p.id}`}><path d={paths.get(p.id)} fillRule="evenodd"/></clipPath>)}
        </defs>
        <g mask={mask ? 'url(#land)' : undefined}>
          {/* political wash: house colours over the relief; vassals take the player's colour */}
          {known.map(p => { const col = realmOf(p) ? playerColor : mapColor(game, p.occupyingHouseId ?? p.governingHouseId); return <g key={p.id} clipPath={`url(#clip-${p.id})`}>
            <path d={paths.get(p.id)} fill={col} fillOpacity={realmOf(p) ? .4 : .28} fillRule="evenodd"/>
            <path d={paths.get(p.id)} fill="none" stroke={col} strokeOpacity={realmOf(p) ? .55 : .75} strokeWidth={realmOf(p) ? 3 : 4.5}/>
            {isVassal(game, p.governingHouseId) && <path d={paths.get(p.id)} fill="url(#vassal)" fillRule="evenodd" opacity=".35"/>}
          </g> })}
          {world.provinces.filter(p => level.get(p.id) === 'sighted').map(p => <path key={p.id} d={paths.get(p.id)} fill="#26302f" fillOpacity=".24" fillRule="evenodd"/>)}
          {world.provinces.filter(p => level.get(p.id) === 'hidden').map(p => <path key={p.id} d={paths.get(p.id)} fill="url(#fog)" fillOpacity=".88" fillRule="evenodd"/>)}
          <path d={groups.hidden} className={styles.bHidden}/>
          <path d={groups.province} className={styles.bProvince}/>
          <path d={groups.merged} className={styles.bMerged}/>
          <path d={groups.fief} className={styles.bFiefShadow}/><path d={groups.fief} className={styles.bFief}/>
          <path d={groups.realm} className={styles.bRealmShadow}/><path d={groups.realm} className={styles.bRealm}/>
          {/* lens: the whole map changes */}
          <g className={styles.lens} data-on={lens !== 'territorio'}>
            <rect width={W} height={H} fill="#0b1012" fillOpacity=".5"/>
            {known.map(p => { const f = lensFill(p); return f ? <path key={p.id} d={paths.get(p.id)} fill={f[0]} fillOpacity={f[1]} fillRule="evenodd"/> : null })}
          </g>
          {selected && <path d={paths.get(selected.id)} className={styles.selected} fillRule="evenodd"/>}
        </g>
        {[...mine].map(id => <path key={id} d={paths.get(id)} className={styles.mineOutline} filter="url(#glow)" fillRule="evenodd"/>)}
        <ProvincePaths provinces={world.provinces} onPick={pick}/>
        {/* names */}
        <g className={styles.labels}>
          {realmLabels.map(r => <text key={r.id} x={r.x} y={r.y} className={styles.realmName}>{r.name.toUpperCase()}</text>)}
          {fiefLabels.map(f => <text key={f.id} x={f.x} y={f.y - 14} className={styles.fiefName}>{f.name.toUpperCase()}</text>)}
          {known.map(p => <text key={p.id} x={p.center[0]} y={p.center[1] + labelSize(p) * .9} transform={p.labelAngle ? `rotate(${p.labelAngle} ${p.center[0]} ${p.center[1]})` : undefined} className={`${styles.provName} ${mine.has(p.id) ? styles.mineName : ''}`} style={{ ['--fs' as string]: `${labelSize(p)}px` }}>{p.name.toUpperCase()}</text>)}
        </g>
        {/* lens annotations */}
        {lens === 'diplomacia' && <LensTrade game={game} known={known} filter={resourceFilter}/>}
        {lens === 'militar' && <LensMilitary game={game} known={known}/>}
        {lens === 'influencia' && <LensInfluence game={game} known={known}/>}
      </svg>
      {/* lords standing on their seats, full body */}
      <div className={styles.tokens}>
        {seats.slice().sort((a, b) => castleAt(a)[1] - castleAt(b)[1]).map(p => {
          const ruler = rulerFigure(game, p.governingHouseId), pos = castleAt(p), house = houseOf(game, p.governingHouseId)
          const active = selected?.id === p.id || (selected && selected.governingHouseId === p.governingHouseId)
          return <button key={p.id} type="button" data-ui className={`${styles.lord} ${active ? styles.active : ''} ${house.id === game.playerHouseId ? styles.me : ''}`} style={{ left: pos[0], top: pos[1] }} onClick={() => onSelect(p.id)} aria-label={`${ruler?.name ?? ''} ${house.name}`}>
            {ruler?.portraitAsset ? <img src={assetUrl(ruler.portraitAsset)} alt="" draggable={false}/> : <span className={styles.crestOnly}><Crest heraldry={heraldryOf(game, house)} size={30}/></span>}
            <span className={styles.base} style={{ ['--hc' as string]: mapColor(game, house.id) }}/>
          </button>
        })}
        {game.campaign.armies.map(a => { const pos = armyPosition(game, a), mineArmy = a.houseId === game.playerHouseId, house = houseOf(game, a.houseId); return <div key={a.id} className={`${styles.army} ${mineArmy ? styles.armyMine : styles.armyFoe}`} style={{ left: pos[0], top: pos[1] }}>
          <Crest heraldry={heraldryOf(game, house)} size={18}/><span>{a.men}{a.status === 'sitiando' ? ' · cerco' : a.status === 'pronto' ? ' · pronto' : ''}</span>
        </div> })}
        {game.campaign.travel && (() => { const t = game.campaign.travel!, from = provinceOf(game, t.route[0]).center, to = provinceOf(game, t.provinceId).center; const span = Math.max(1, t.arriveDay - t.startDay); const f = t.arrived ? Math.max(0, 1 - (game.day - t.arriveDay) / Math.max(1, t.returnDay - t.arriveDay)) : Math.min(1, (game.day - t.startDay) / span); const ruler = rulerFigure(game, game.playerHouseId)!
          return <div className={`${styles.lord} ${styles.traveling}`} style={{ left: from[0] + (to[0] - from[0]) * f, top: from[1] + (to[1] - from[1]) * f }}>{ruler.portraitAsset && <img src={assetUrl(ruler.portraitAsset)} alt="" draggable={false}/>}<span className={styles.tag}>Irian em viagem</span></div> })()}
      </div>
    </div>
  </div>
}

function badge(r: Resource, x: number, y: number, key: string) { return <g key={key} transform={`translate(${x} ${y})`}><g className={styles.counter}><ResourceGlyph resource={r} size={9}/></g></g> }
function LensTrade({ game, known, filter }: { game: GameState; known: Province[]; filter: string | null }) {
  const seat = provinceOf(game, houseOf(game, game.playerHouseId).seatProvinceId)
  const flows: { from: Province; to: Province; r: Resource; label: string }[] = []
  for (const c of game.campaign.contacts) if (c.trade) { const p = provinceOf(game, houseOf(game, c.houseId).seatProvinceId); const r = p.resources[0]; flows.push({ from: p, to: seat, r, label: 'comércio' }) }
  for (const v of game.campaign.vassals) { const p = provinceOf(game, houseOf(game, v.houseId).seatProvinceId); flows.push({ from: p, to: seat, r: p.resources[0], label: 'tributo' }) }
  for (const b of game.campaign.purchases.filter(b => game.day - b.day < 90)) { const p = provinceOf(game, houseOf(game, b.houseId).seatProvinceId); flows.push({ from: p, to: seat, r: b.resource, label: 'compra' }) }
  return <g>
    {flows.filter(f => !filter || f.r === filter).map((f, i) => { const d = `M${f.from.center[0]} ${f.from.center[1]}Q${(f.from.center[0] + f.to.center[0]) / 2 + 12} ${(f.from.center[1] + f.to.center[1]) / 2 - 12} ${f.to.center[0]} ${f.to.center[1]}`
      return <g key={i}><path d={d} className={styles.routeShadow}/><path d={d} className={styles.route}/><g><g className={styles.counter}><ResourceGlyph resource={f.r} size={7}/></g><animateMotion dur={`${4 + i % 3}s`} repeatCount="indefinite" path={d}/></g></g> })}
    {known.map(p => p.resources.filter(r => !filter || r === filter).map((r, i) => badge(r, p.center[0] - (p.resources.length - 1) * 5 + i * 10, p.center[1] - labelSize(p) - 4, p.id + r)))}
    {controlled(game).map(p => { const out = provinceProduction(game, p); const lacks = RESOURCES.filter(r => !p.resources.includes(r) && r !== 'prata' && (r === 'pedra' ? out.stone === 0 : r === 'ferro' ? out.iron < 20 : r === 'sal' ? out.salt === 0 : false)); return lacks.filter(r => !filter || r === filter).map((r, i) => <g key={p.id + r} transform={`translate(${p.center[0] - (lacks.length - 1) * 6 + i * 12} ${p.center[1] + labelSize(p) + 9})`}><g className={styles.counter}><ResourceGlyph resource={r} size={8}/><path d="M-7 7L7 -7" stroke="#ff6a52" strokeWidth="2.2"/></g></g>) })}
  </g>
}
function LensMilitary({ game, known }: { game: GameState; known: Province[] }) {
  const mine = new Set(controlled(game).map(p => p.id))
  return <g>
    {known.map(p => { const men = mine.has(p.id) ? game.campaign.garrisons[p.id] ?? 0 : defenders(game, p); return <g key={p.id} transform={`translate(${p.center[0]} ${p.center[1] + labelSize(p) + 7})`}><g className={styles.counter}><rect x="-13" y="-6" width="26" height="12" rx="6" className={mine.has(p.id) ? styles.pillMine : styles.pill}/><text className={styles.pillText}>{mine.has(p.id) ? men : `~${Math.round(men / 10) * 10}`}</text></g></g> })}
    {game.campaign.armies.map(a => { const target = provinceOf(game, a.targetProvinceId).center, pos = armyPosition(game, a); return <path key={a.id} d={`M${pos[0]} ${pos[1]}L${target[0]} ${target[1]}`} className={a.houseId === game.playerHouseId ? styles.marchMine : styles.marchFoe}/> })}
  </g>
}
function LensInfluence({ game, known }: { game: GameState; known: Province[] }) {
  return <g>
    {known.filter(p => houseOf(game, p.governingHouseId).seatProvinceId === p.id && p.governingHouseId !== game.playerHouseId).map(p => { const v = isVassal(game, p.governingHouseId) ? 100 : influenceOf(game, p.governingHouseId); const bond = game.campaign.bonds.find(b => b.houseId === p.governingHouseId)
      return <g key={p.id} transform={`translate(${p.center[0]} ${p.center[1] + labelSize(p) + 7})`}><g className={styles.counter}><rect x="-16" y="-6" width="32" height="12" rx="6" className={styles.pill}/><text className={styles.pillText}>{v >= 100 ? 'vassalo' : `${v}%`}{bond ? ' ◆' : ''}</text></g></g> })}
  </g>
}
export const mapZoom = (dir: 'in' | 'out') => document.querySelector(`.${styles.map}`)?.dispatchEvent(new Event(dir === 'in' ? 'map-zoom-in' : 'map-zoom-out'))
