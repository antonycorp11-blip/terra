import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { MAP_HEIGHT, MAP_WIDTH } from '../engine/geography'
import type { GameState, Id, Province, Resource } from '../engine/types'
import { armyPosition, defenders } from '../engine/military'
import { influenceOf } from '../engine/influence'
import { controlled, isVassal } from '../engine/stateUtils'
import { knowledge } from '../engine/knowledge'
import type { TerrainResult } from './map/terrainWorker'
import { bordersOf, labelSize, smoothRings } from './map/geometry'
import { resourceImage } from './map/canvasIcons'
import { assetUrl, heraldryOf, houseOf, lordTokens, mapColor, provinceOf, rulerFigure } from './view'
import Icon from './Icons'
import type { Lens } from './store'
import Crest from './Heraldry'
import styles from './MapView.module.css'

const W = MAP_WIDTH, H = MAP_HEIGHT
interface Props {
  game: GameState; lens: Lens; selectedId: Id | null; resourceFilter: string | null; focus: { provinceId: Id; nonce: number } | null; onSelect: (id: Id | null) => void
  /** Provinces Irian's retinue can reach this turn (shown as gold markers), or null when the retinue is not selected. */
  reach: Map<Id, number> | null; onMove: (id: Id) => void; onParty: () => void; onBand: (partyId: Id, provinceId: Id) => void
}
/**
 * A token that walks: when its province changes, it glides from the old spot to the new one.
 * Panning the map moves it instantly (only a change of province animates).
 */
function Walker({ id, at, x, y, className, style, children, onClick, label }: { id: string; at: Id; x: number; y: number; className: string; style?: Record<string, string | number>; children: ReactNode; onClick?: () => void; label?: string }) {
  const el = useRef<HTMLButtonElement>(null), last = useRef<{ at: Id; x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const prev = last.current; last.current = { at, x, y }
    if (!prev || prev.at === at || !el.current?.animate) return
    el.current.animate([{ translate: `${prev.x - x}px ${prev.y - y}px` }, { translate: '0 0' }], { duration: 900, easing: 'cubic-bezier(.45,.05,.3,1)' })
  }, [at, x, y])
  return <button ref={el} type="button" data-ui data-token={id} className={className} style={{ left: x, top: y, ...style }} onClick={onClick} aria-label={label}>{children}</button>
}

/* ---------- terrain (worker, two passes: quick, then sharp) ---------- */
interface Terrain { raster: HTMLCanvasElement; mask: HTMLCanvasElement; trees: Float32Array; peaks: Float32Array; rivers: Float32Array; sharp: boolean }
const terrains = new Map<number, { data: Terrain | null; listeners: Set<() => void> }>()
function toCanvas(buffer: ArrayBuffer, w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(buffer), w, h), 0, 0); return c }
function useTerrain(seed: number) {
  const [, bump] = useState(0)
  useEffect(() => {
    let entry = terrains.get(seed)
    if (!entry) {
      entry = { data: null, listeners: new Set() }; terrains.set(seed, entry)
      const e = entry
      const run = (scale: number, details: boolean) => new Promise<TerrainResult>(resolve => {
        const worker = new Worker(new URL('./map/terrainWorker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (ev: MessageEvent<TerrainResult>) => { worker.terminate(); resolve(ev.data) }
        worker.postMessage({ seed, scale, details })
      })
      run(.9, true).then(r => {
        e.data = { raster: toCanvas(r.color, r.width, r.height), mask: toCanvas(r.mask, r.width, r.height), trees: r.trees!, peaks: r.peaks!, rivers: r.rivers!, sharp: false }
        e.listeners.forEach(f => f())
        return run(Math.min(2, (window.devicePixelRatio || 1) * .5 + .7), false)
      }).then(r => { if (!e.data) return; e.data = { ...e.data, raster: toCanvas(r.color, r.width, r.height), mask: toCanvas(r.mask, r.width, r.height), sharp: true }; e.listeners.forEach(f => f()) })
    }
    const f = () => bump(n => n + 1)
    entry.listeners.add(f)
    return () => { entry!.listeners.delete(f) }
  }, [seed])
  return terrains.get(seed)?.data ?? null
}

/* ---------- static geometry per world ---------- */
interface Geo { paths: Map<Id, Path2D>; bbox: Map<Id, [number, number, number, number]>; borders: { a: Id; b: Id; path: Path2D }[] }
const geos = new WeakMap<object, Geo>()
function geometry(game: GameState): Geo {
  const key = game.world.landPolygons
  let g = geos.get(key)
  if (g) return g
  const paths = new Map<Id, Path2D>(), bbox = new Map<Id, [number, number, number, number]>()
  for (const p of game.world.provinces) {
    const path = new Path2D(); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const ring of smoothRings(game.world, p)) { ring.forEach((q, i) => { if (i) path.lineTo(q[0], q[1]); else path.moveTo(q[0], q[1]); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]) }); path.closePath() }
    paths.set(p.id, path); bbox.set(p.id, [x0, y0, x1, y1])
  }
  g = { paths, bbox, borders: bordersOf(game.world).map(b => ({ a: b.a, b: b.b, path: new Path2D(b.d) })) }
  geos.set(key, g)
  return g
}
let probeCtx: CanvasRenderingContext2D | null = null
function provinceAt(game: GameState, geo: Geo, x: number, y: number): Province | null {
  if (!probeCtx) { const c = document.createElement('canvas'); c.width = c.height = 1; probeCtx = c.getContext('2d')! }
  for (const p of game.world.provinces) { const b = geo.bbox.get(p.id)!; if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue; if (probeCtx.isPointInPath(geo.paths.get(p.id)!, x, y, 'evenodd')) return p }
  return null
}
let fogTile: HTMLCanvasElement | null = null
function fogPattern(ctx: CanvasRenderingContext2D) {
  if (!fogTile) {
    // Terra incognita: bare parchment with an engraver's hatching, as on an unfinished atlas page.
    fogTile = document.createElement('canvas'); fogTile.width = fogTile.height = 16
    const x = fogTile.getContext('2d')!; x.fillStyle = '#cdbb95'; x.fillRect(0, 0, 16, 16)
    x.strokeStyle = 'rgba(122,96,58,.38)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-4, 20); x.lineTo(20, -4); x.moveTo(-4, 4); x.lineTo(4, -4); x.moveTo(12, 20); x.lineTo(20, 12); x.stroke()
    x.fillStyle = 'rgba(150,120,75,.18)'; x.fillRect(3, 9, 2, 2); x.fillRect(11, 3, 1, 1)
  }
  return ctx.createPattern(fogTile, 'repeat')!
}
/** Letter-spaced text for map names. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, stroke = false) {
  const chars = [...text], widths = chars.map(ch => ctx.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let cx = x - total / 2
  ctx.textAlign = 'left'
  chars.forEach((ch, i) => { if (stroke) ctx.strokeText(ch, cx, y); ctx.fillText(ch, cx, y); cx += widths[i] + spacing })
  ctx.textAlign = 'center'
}

/* ---------- camera ---------- */
interface Cam { k: number; x: number; y: number; base: number; w: number; h: number }
const scaleOf = (c: Cam) => c.base * c.k

/**
 * The map is drawn on a canvas at the screen's native resolution (3× on recent phones). During a
 * pan or pinch the last frame is moved with a cheap CSS transform; once the gesture settles the
 * whole map is redrawn sharp. Lords, armies and the traveling lord stay as tappable elements.
 */
export default function MapView({ game, lens, selectedId, resourceFilter, focus, onSelect, reach, onMove, onParty, onBand }: Props) {
  const box = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), hover = useRef<HTMLCanvasElement>(null), overlay = useRef<HTMLDivElement>(null)
  const pol = useRef<HTMLCanvasElement | null>(null)
  const cam = useRef<Cam>({ k: 2.6, x: 0, y: 0, base: 1, w: 1, h: 1 })
  const drawn = useRef({ x: 0, y: 0, s: 1 })
  const [view, setView] = useState({ x: 0, y: 0, s: 1, k: 2.6, w: 1, h: 1 })
  const dragged = useRef(false)
  const terrain = useTerrain(game.world.seed)
  const geo = geometry(game)
  const props = useRef({ game, lens, selectedId, resourceFilter, terrain, onSelect }); props.current = { game, lens, selectedId, resourceFilter, terrain, onSelect }
  const frame = useRef(0), settle = useRef(0)

  const dpr = () => { const c = cam.current, d = Math.min(window.devicePixelRatio || 1, 3); return Math.min(d, Math.sqrt(6.5e6 / Math.max(1, c.w * c.h))) }
  const clamp = () => {
    const c = cam.current, s = scaleOf(c)
    c.x = W * s > c.w ? Math.min(0, Math.max(c.w - W * s, c.x)) : (c.w - W * s) / 2
    c.y = H * s > c.h ? Math.min(0, Math.max(c.h - H * s, c.y)) : (c.h - H * s) / 2
  }
  const preview = () => {
    const c = cam.current, d = drawn.current, s = scaleOf(c), r = s / d.s
    const t = `translate(${c.x - d.x * r}px,${c.y - d.y * r}px) scale(${r})`
    for (const el of [canvas.current, hover.current, overlay.current]) if (el) el.style.transform = t
  }
  const schedule = () => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(render) }
  const moved = () => { clamp(); preview(); window.clearTimeout(settle.current); settle.current = window.setTimeout(schedule, 120) }

  /* ---------- the renderer ---------- */
  function render() {
    const el = canvas.current, hv = hover.current
    if (!el || !hv) return
    const { game: g, lens: l, selectedId: sel, resourceFilter: filter, terrain: t } = props.current
    const c = cam.current, s = scaleOf(c), ratio = dpr()
    const pw = Math.round(c.w * ratio), ph = Math.round(c.h * ratio)
    for (const cv of [el, hv]) if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; cv.style.width = `${c.w}px`; cv.style.height = `${c.h}px` }
    if (!pol.current) pol.current = document.createElement('canvas')
    const P = pol.current; if (P.width !== pw || P.height !== ph) { P.width = pw; P.height = ph }
    const ctx = el.getContext('2d')!, pc = P.getContext('2d')!
    const world = (x: CanvasRenderingContext2D) => x.setTransform(ratio * s, 0, 0, ratio * s, ratio * c.x, ratio * c.y)
    const px = (n: number) => n / s
    const vx0 = -c.x / s - 20, vy0 = -c.y / s - 20, vx1 = (c.w - c.x) / s + 20, vy1 = (c.h - c.y) / s + 20
    const inView = (id: Id) => { const b = geo.bbox.get(id)!; return !(b[2] < vx0 || b[0] > vx1 || b[3] < vy0 || b[1] > vy1) }
    const level = (id: Id) => { const k = knowledge(g, id); return k >= 2 ? 2 : k }
    const mine = new Set(controlled(g).map(p => p.id))
    const realm = (p: Province) => mine.has(p.id) || (isVassal(g, p.governingHouseId) && !p.occupyingHouseId)
    const playerColor = g.campaign.customization.heraldry.primary
    // Sea and relief.
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#173b4f'; ctx.fillRect(0, 0, pw, ph)
    world(ctx); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
    if (t) {
      ctx.drawImage(t.raster, 0, 0, W, H)
      // Roads, rivers, forests and peaks are vectors: sharp at any zoom.
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(112,82,44,.6)'; ctx.lineWidth = px(1.1); ctx.setLineDash([px(4), px(3)])
      ctx.beginPath()
      for (const [a, b] of g.world.roads) { const pa = provinceOf(g, a).center, pb = provinceOf(g, b).center; ctx.moveTo(pa[0], pa[1]); ctx.quadraticCurveTo((pa[0] + pb[0]) / 2 + (pa[1] - pb[1]) * .08, (pa[1] + pb[1]) / 2 + (pb[0] - pa[0]) * .08, pb[0], pb[1]) }
      ctx.stroke(); ctx.setLineDash([])
      const R = t.rivers
      ctx.strokeStyle = '#3e7f8d'
      for (let i = 0; i < R.length; i += 5) { if (R[i] < vx0 || R[i] > vx1 || R[i + 1] < vy0 || R[i + 1] > vy1) continue; ctx.lineWidth = Math.max(R[i + 4], px(1)); ctx.beginPath(); ctx.moveTo(R[i], R[i + 1]); ctx.lineTo(R[i + 2], R[i + 3]); ctx.stroke() }
      const gs = Math.max(.55, Math.min(1, 3.2 / s)) // glyphs stop growing past a comfortable zoom
      const T = t.trees
      for (let i = 0; i < T.length; i += 4) {
        const x = T[i], y = T[i + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue
        const z = T[i + 2] * gs
        ctx.fillStyle = 'rgba(15,25,10,.3)'; ctx.beginPath(); ctx.ellipse(x + z * .4, y + z * .2, z * .9, z * .4, 0, 0, 7); ctx.fill()
        ctx.fillStyle = T[i + 3] < .5 ? '#3a5628' : '#466631'; ctx.beginPath(); ctx.arc(x, y - z * .5, z * .85, 0, 7); ctx.fill()
        ctx.fillStyle = 'rgba(175,205,115,.35)'; ctx.beginPath(); ctx.arc(x - z * .3, y - z * .8, z * .35, 0, 7); ctx.fill()
      }
      const K = t.peaks
      for (let i = 0; i < K.length; i += 4) {
        const x = K[i], y = K[i + 1]; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue
        const z = K[i + 2] * gs
        ctx.fillStyle = '#b6ac98'; ctx.beginPath(); ctx.moveTo(x - z * .7, y); ctx.lineTo(x, y - z); ctx.lineTo(x + z * .05, y); ctx.fill()
        ctx.fillStyle = '#6a6357'; ctx.beginPath(); ctx.moveTo(x, y - z); ctx.lineTo(x + z * .7, y); ctx.lineTo(x + z * .05, y); ctx.fill()
        if (K[i + 2] > 9.5) { ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(x - z * .2, y - z * .72); ctx.lineTo(x, y - z); ctx.lineTo(x + z * .2, y - z * .72); ctx.fill() }
        ctx.strokeStyle = 'rgba(40,30,20,.45)'; ctx.lineWidth = px(.8); ctx.beginPath(); ctx.moveTo(x - z * .7, y); ctx.lineTo(x, y - z); ctx.lineTo(x + z * .7, y); ctx.stroke()
      }
    }
    // Political layer, clipped to the painted coast.
    pc.setTransform(1, 0, 0, 1, 0, 0); pc.clearRect(0, 0, pw, ph); world(pc)
    const fog = fogPattern(pc); fog.setTransform(new DOMMatrix().scale(1.6 / (s * ratio) * ratio))
    for (const p of g.world.provinces) {
      if (!inView(p.id)) continue
      const path = geo.paths.get(p.id)!, lv = level(p.id)
      if (lv === 0) { pc.fillStyle = fog; pc.globalAlpha = .97; pc.fill(path, 'evenodd'); pc.globalAlpha = 1; continue }
      if (lv === 1) { pc.fillStyle = 'rgba(205,187,149,.5)'; pc.fill(path, 'evenodd'); continue }
      // Watercolour: a light wash of the house colour and a deeper band along the border.
      const col = realm(p) ? playerColor : mapColor(g, p.occupyingHouseId ?? p.governingHouseId)
      pc.save(); pc.clip(path, 'evenodd')
      pc.globalAlpha = realm(p) ? .3 : .16; pc.fillStyle = col; pc.fill(path, 'evenodd')
      pc.globalAlpha = realm(p) ? .42 : .5; pc.strokeStyle = col; pc.lineWidth = Math.min(7, px(11)); pc.stroke(path)
      pc.globalAlpha = realm(p) ? .5 : .65; pc.lineWidth = Math.min(2.5, px(3.5)); pc.stroke(path)
      if (isVassal(g, p.governingHouseId)) { pc.globalAlpha = .28; pc.strokeStyle = '#fff4d0'; pc.lineWidth = px(1); const b = geo.bbox.get(p.id)!, h = b[3] - b[1], step = px(7); pc.beginPath(); for (let x = b[0] - h; x < b[2]; x += step) { pc.moveTo(x, b[3]); pc.lineTo(x + h, b[1]) } pc.stroke() }
      pc.restore()
    }
    // Borders: realm > fief > province; inside the player's realm they fade away.
    const owner = (id: Id) => { const p = provinceOf(g, id); return realm(p) ? 'player' : (p.occupyingHouseId ?? p.governingHouseId) }
    const groups = { hidden: new Path2D(), province: new Path2D(), fief: new Path2D(), realm: new Path2D(), merged: new Path2D() }
    for (const b of geo.borders) {
      if (!inView(b.a) && !inView(b.b)) continue
      const pa = provinceOf(g, b.a), pb = provinceOf(g, b.b), la = level(b.a), lb = level(b.b)
      const cls = pa.realmId !== pb.realmId ? 'realm' : la === 0 && lb === 0 ? 'hidden' : owner(b.a) === 'player' && owner(b.b) === 'player' ? 'merged' : pa.fiefId !== pb.fiefId ? (la === 2 || lb === 2 ? 'fief' : 'province') : (la === 0 || lb === 0 ? 'hidden' : 'province')
      groups[cls].addPath(b.path)
    }
    pc.lineJoin = 'round'; pc.lineCap = 'round'
    pc.strokeStyle = 'rgba(122,96,58,.28)'; pc.lineWidth = px(.7); pc.stroke(groups.hidden)
    pc.strokeStyle = 'rgba(34,24,11,.6)'; pc.lineWidth = px(1); pc.stroke(groups.province)
    pc.strokeStyle = 'rgba(255,243,207,.2)'; pc.lineWidth = px(.8); pc.setLineDash([px(2), px(4)]); pc.stroke(groups.merged); pc.setLineDash([])
    pc.strokeStyle = 'rgba(20,13,6,.75)'; pc.lineWidth = px(3.2); pc.stroke(groups.fief); pc.strokeStyle = 'rgba(242,226,182,.8)'; pc.lineWidth = px(1); pc.stroke(groups.fief)
    pc.strokeStyle = 'rgba(13,8,5,.6)'; pc.lineWidth = px(5.5); pc.stroke(groups.realm); pc.strokeStyle = '#e8c25f'; pc.lineWidth = px(2); pc.setLineDash([px(8), px(4)]); pc.stroke(groups.realm); pc.setLineDash([])
    // Lenses recolour the whole continent.
    if (l !== 'territorio') {
      pc.fillStyle = 'rgba(11,16,18,.5)'; pc.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0)
      for (const p of g.world.provinces) {
        if (level(p.id) !== 2 || !inView(p.id)) continue
        let col: string | null = null, a = .6
        if (l === 'diplomacia') { if (filter) { if (p.resources.includes(filter as Resource)) { col = '#e0b44a'; a = .62 } else if (mine.has(p.id)) { col = '#c4553f'; a = .45 } } else { col = mapColor(g, p.governingHouseId); a = .32 } }
        if (l === 'militar') { const men = mine.has(p.id) ? g.campaign.garrisons[p.id] ?? 0 : defenders(g, p); col = realm(p) ? playerColor : mapColor(g, p.governingHouseId); a = Math.min(.82, .16 + men / 1400) }
        if (l === 'influencia') { if (realm(p)) { col = playerColor; a = .7 } else { const v = influenceOf(g, p.governingHouseId); col = v >= 60 ? '#f1c75b' : v >= 30 ? '#c99a3e' : v > 0 ? '#7a6a45' : '#3b4244'; a = .72 } }
        if (col) { pc.globalAlpha = a; pc.fillStyle = col; pc.fill(geo.paths.get(p.id)!, 'evenodd'); pc.globalAlpha = 1 }
      }
    }
    if (sel) { pc.fillStyle = 'rgba(255,232,170,.14)'; pc.fill(geo.paths.get(sel)!, 'evenodd') }
    if (t) { pc.globalCompositeOperation = 'destination-in'; pc.drawImage(t.mask, 0, 0, W, H); pc.globalCompositeOperation = 'source-over' }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(P, 0, 0)
    // Outlines above the coast clip.
    world(ctx)
    ctx.shadowColor = 'rgba(255,215,120,.8)'; ctx.shadowBlur = 6 * ratio
    ctx.strokeStyle = '#f1cf73'; ctx.lineWidth = px(2.2); for (const id of mine) ctx.stroke(geo.paths.get(id)!)
    ctx.shadowBlur = 0
    if (sel) { ctx.strokeStyle = '#ffe6a3'; ctx.lineWidth = px(2.6); ctx.stroke(geo.paths.get(sel)!) }
    // Names, in screen space at device resolution.
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
    const S = (x: number, y: number): [number, number] => [x * s + c.x, y * s + c.y]
    const zoom = c.k
    for (const r of g.world.realms) {
      const ps = g.world.provinces.filter(p => p.realmId === r.id), area = ps.reduce((a, p) => a + p.area, 0)
      const [x, y] = S(ps.reduce((a, p) => a + p.center[0] * p.area, 0) / area, ps.reduce((a, p) => a + p.center[1] * p.area, 0) / area)
      ctx.font = `${Math.round(20 + 12 / zoom)}px "IM Fell English SC", Georgia, serif`; ctx.fillStyle = `rgba(246,235,205,${zoom > 3.4 ? .14 : .28})`
      spaced(ctx, r.name.toUpperCase(), x, y, 9)
    }
    for (const f of g.world.fiefs) {
      if (f.provinceIds.filter(id => level(id) === 2).length < 3) continue
      const ps = f.provinceIds.map(id => provinceOf(g, id)), area = ps.reduce((a, p) => a + p.area, 0)
      const [x, y] = S(ps.reduce((a, p) => a + p.center[0] * p.area, 0) / area, ps.reduce((a, p) => a + p.center[1] * p.area, 0) / area - 14)
      ctx.font = `${Math.round(13 + zoom * 1.5)}px "IM Fell English SC", Georgia, serif`; ctx.fillStyle = 'rgba(34,23,10,.6)'
      spaced(ctx, f.name.toUpperCase(), x, y, 5)
    }
    for (const p of g.world.provinces) {
      if (level(p.id) !== 2 || !inView(p.id) || (zoom < 1.7 && !mine.has(p.id))) continue
      const [x, y] = S(p.center[0], p.center[1] + labelSize(p) * .9)
      const size = Math.max(9, Math.min(22, labelSize(p) * 1.05 * Math.pow(s, .45)))
      ctx.save(); ctx.translate(x, y); if (p.labelAngle) ctx.rotate(p.labelAngle * Math.PI / 180)
      ctx.font = `700 ${size.toFixed(1)}px "Alegreya Sans SC", "Gill Sans", sans-serif`
      ctx.strokeStyle = mine.has(p.id) ? 'rgba(255,240,195,.95)' : 'rgba(246,236,205,.85)'; ctx.lineWidth = Math.max(2.5, size * .28); ctx.fillStyle = mine.has(p.id) ? '#3a2605' : '#22170a'
      spaced(ctx, p.name.toUpperCase(), 0, 0, size * .12, true); ctx.restore()
    }
    // Lens data.
    const pill = (x: number, y: number, text: string, me = false) => {
      ctx.textAlign = 'center'; ctx.font = '700 11px "Alegreya Sans SC", sans-serif'; const w = ctx.measureText(text).width + 12
      ctx.fillStyle = me ? 'rgba(59,42,8,.95)' : 'rgba(21,29,30,.92)'; ctx.strokeStyle = me ? '#f1cf73' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - 9, w, 18, 9); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f4e8c8'; ctx.fillText(text, x, y + .5)
    }
    const known = g.world.provinces.filter(p => level(p.id) === 2 && inView(p.id))
    if (l === 'militar') {
      for (const p of known) { const [x, y] = S(p.center[0], p.center[1]); const men = mine.has(p.id) ? g.campaign.garrisons[p.id] ?? 0 : defenders(g, p); pill(x, y + labelSize(p) * .9 * s + 20, mine.has(p.id) ? `${men}` : `~${Math.round(men / 10) * 10}`, mine.has(p.id)) }
      for (const a of g.campaign.armies) { const [x0, y0] = S(...armyPosition(g, a)), [x1, y1] = S(...provinceOf(g, a.targetProvinceId).center); ctx.strokeStyle = a.houseId === g.playerHouseId ? '#f1cf73' : '#ff6a52'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]) }
    }
    if (l === 'influencia') for (const p of known) { if (houseOf(g, p.governingHouseId).seatProvinceId !== p.id || p.governingHouseId === g.playerHouseId) continue; const [x, y] = S(p.center[0], p.center[1]); const v = isVassal(g, p.governingHouseId) ? 100 : influenceOf(g, p.governingHouseId); pill(x, y + labelSize(p) * .9 * s + 20, `${v >= 100 ? 'vassalo' : v + '%'}${g.campaign.bonds.some(b => b.houseId === p.governingHouseId) ? ' ◆' : ''}`) }
    if (l === 'diplomacia') {
      const seat = provinceOf(g, houseOf(g, g.playerHouseId).seatProvinceId)
      const flows = [...g.campaign.contacts.filter(x => x.trade).map(x => houseOf(g, x.houseId)), ...g.campaign.vassals.map(v => houseOf(g, v.houseId))].map(h => provinceOf(g, h.seatProvinceId))
      ctx.strokeStyle = '#e0b44a'; ctx.lineWidth = 2; ctx.setLineDash([6, 5])
      for (const f of flows) { const [x0, y0] = S(...f.center), [x1, y1] = S(...seat.center); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + 20, (y0 + y1) / 2 - 20, x1, y1); ctx.stroke() }
      ctx.setLineDash([])
      for (const p of known) { const rs = p.resources.filter(r => !filter || r === filter), [x, y] = S(p.center[0], p.center[1]); rs.forEach((r, i) => { const img = resourceImage(r, schedule); if (img.complete) ctx.drawImage(img, x - (rs.length - 1) * 12 + i * 24 - 10, y - 32, 20, 20) }) }
    }

    drawn.current = { x: c.x, y: c.y, s }
    for (const e of [el, hv, overlay.current]) if (e) e.style.transform = ''
    hv.getContext('2d')!.clearRect(0, 0, pw, ph)
    setView({ x: c.x, y: c.y, s, k: c.k, w: c.w, h: c.h })
    box.current?.setAttribute('data-zoom', c.k < 1.7 ? 'far' : c.k < 3.4 ? 'mid' : 'near')
  }

  /* camera and gestures */
  const centerOn = (pt: [number, number], k?: number) => { const c = cam.current; if (k) c.k = k; const s = scaleOf(c); c.x = c.w / 2 - pt[0] * s; c.y = c.h / 2 - pt[1] * s; clamp(); schedule() }
  useLayoutEffect(() => {
    const el = box.current!
    const resize = () => {
      const c = cam.current, r = el.getBoundingClientRect(), first = c.w <= 1
      if (r.width < 2 || r.height < 2) return
      c.w = r.width; c.h = r.height; c.base = Math.max(r.width / W, r.height / H)
      if (first) { const g = props.current.game; c.k = r.width < 700 ? 2.2 : 2.6; centerOn(provinceOf(g, houseOf(g, g.playerHouseId).seatProvinceId).center) } else { clamp(); schedule() }
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)
    // Fonts arrive after the first frame on a cold load; redraw the names then.
    document.fonts?.ready.then(schedule)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Camera only moves on the player's command: never on calendar ticks.
  useEffect(() => { if (focus) centerOn(provinceOf(game, focus.provinceId).center, Math.max(cam.current.k, 3)) }, [focus?.nonce]) // eslint-disable-line react-hooks/exhaustive-deps
  // Redraw only when something visible changed, not on every tick.
  const signature = [lens, resourceFilter, selectedId, terrain?.sharp, Boolean(terrain), game.campaign.customization.heraldry.primary,
    game.world.provinces.map(p => knowledge(game, p.id)).join(''), game.campaign.vassals.map(v => v.houseId).join(), game.world.provinces.filter(p => p.occupyingHouseId).map(p => p.id + p.occupyingHouseId).join(), controlled(game).length,
    lens === 'militar' ? JSON.stringify(game.campaign.garrisons) + game.campaign.armies.map(a => a.id + a.step + a.status).join() : '',
    lens === 'influencia' ? JSON.stringify(game.campaign.influence) + game.campaign.bonds.length : '',
    lens === 'diplomacia' ? game.campaign.contacts.filter(x => x.trade).length + game.campaign.vassals.length : ''].join('|')
  useEffect(() => { schedule() }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = box.current!, pointers = new Map<number, [number, number]>()
    let start: { x: number; y: number; cx: number; cy: number } | null = null, pinch: { d: number; k: number; mx: number; my: number; cx: number; cy: number } | null = null
    const local = (e: PointerEvent | WheelEvent): [number, number] => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const zoomAt = (f: number, sx: number, sy: number) => { const c = cam.current, k0 = c.k; c.k = Math.max(1, Math.min(9, c.k * f)); const r = c.k / k0; c.x = sx - (sx - c.x) * r; c.y = sy - (sy - c.y) * r; moved() }
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-ui]')) return
      pointers.set(e.pointerId, local(e))
      if (pointers.size === 1) { dragged.current = false; start = { x: local(e)[0], y: local(e)[1], cx: cam.current.x, cy: cam.current.y } }
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: cam.current.k, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, cx: cam.current.x, cy: cam.current.y }; start = null; dragged.current = true }
    }
    let hoverFrame = 0
    const drawHover = ([sx, sy]: [number, number]) => {
      const h = hover.current; if (!h) return
      const c = cam.current, s = scaleOf(c), ratio = h.width / Math.max(1, c.w), x = h.getContext('2d')!
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, h.width, h.height)
      const hit = provinceAt(props.current.game, geo, (sx - c.x) / s, (sy - c.y) / s)
      if (!hit || knowledge(props.current.game, hit.id) === 0) return
      x.setTransform(ratio * s, 0, 0, ratio * s, ratio * c.x, ratio * c.y); x.strokeStyle = 'rgba(255,236,190,.85)'; x.lineWidth = 1.6 / s; x.fillStyle = 'rgba(255,240,205,.08)'; x.fill(geo.paths.get(hit.id)!, 'evenodd'); x.stroke(geo.paths.get(hit.id)!)
    }
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) { if (e.pointerType === 'mouse' && !e.buttons) { cancelAnimationFrame(hoverFrame); const p = local(e); hoverFrame = requestAnimationFrame(() => drawHover(p)) } return }
      pointers.set(e.pointerId, local(e))
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()], c = cam.current, k = Math.max(1, Math.min(9, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)), r = k / pinch.k; c.k = k; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; c.x = mx - (pinch.mx - pinch.cx) * r; c.y = my - (pinch.my - pinch.cy) * r; moved(); return }
      if (start) { const [x, y] = local(e); if (!dragged.current && Math.hypot(x - start.x, y - start.y) > 8) { dragged.current = true; el.classList.add(styles.dragging) } if (dragged.current) { cam.current.x = start.cx + x - start.x; cam.current.y = start.cy + y - start.y; moved() } }
    }
    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      const tap = pointers.size === 1 && !dragged.current && start, p = local(e)
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (!pointers.size) { start = null; el.classList.remove(styles.dragging) }
      if (tap) { const c = cam.current, s = scaleOf(c), hit = provinceAt(props.current.game, geo, (p[0] - c.x) / s, (p[1] - c.y) / s); props.current.onSelect(hit ? hit.id : null) }
    }
    const cancel = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = null; start = null; el.classList.remove(styles.dragging) }
    const wheel = (e: WheelEvent) => { e.preventDefault(); const [x, y] = local(e); zoomAt(Math.exp(-e.deltaY * .0015), x, y) }
    const leave = () => { const h = hover.current; h?.getContext('2d')!.clearRect(0, 0, h.width, h.height) }
    const zoomIn = () => zoomAt(1.4, cam.current.w / 2, cam.current.h / 2), zoomOut = () => zoomAt(1 / 1.4, cam.current.w / 2, cam.current.h / 2)
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel)
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('pointerleave', leave)
    el.addEventListener('map-zoom-in', zoomIn); el.addEventListener('map-zoom-out', zoomOut)
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); el.removeEventListener('wheel', wheel); el.removeEventListener('pointerleave', leave); el.removeEventListener('map-zoom-in', zoomIn); el.removeEventListener('map-zoom-out', zoomOut) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* tokens, positioned from the last full render */
  const S = (pt: [number, number]): [number, number] => [pt[0] * view.s + view.x, pt[1] * view.s + view.y]
  const onScreen = ([x, y]: [number, number]) => x > -90 && x < view.w + 90 && y > -40 && y < view.h + 180
  const castleAt = (p: Province) => game.world.settlements.find(s => s.provinceId === p.id && s.type === 'castelo')!.position
  const selected = selectedId ? provinceOf(game, selectedId) : null
  return <div ref={box} className={styles.map} role="application" aria-label="Mapa de Varedor" data-lens={lens}>
    <canvas ref={canvas} className={styles.canvas}/>
    <canvas ref={hover} className={styles.canvas}/>
    {!terrain && <div className={styles.loading}>desenhando o relevo…</div>}
    <div ref={overlay} className={styles.tokens}>
      {(() => {
        // Several figures can share a province: spread them side by side.
        const seen = new Map<Id, number>()
        return lordTokens(game).map(t => { const n = seen.get(t.provinceId) ?? 0; seen.set(t.provinceId, n + 1); return { t, pos: S(castleAt(provinceOf(game, t.provinceId))), n } })
          .filter(x => onScreen(x.pos)).sort((a, b) => a.pos[1] - b.pos[1]).map(({ t, pos, n }) => {
            const ruler = rulerFigure(game, t.houseId), house = houseOf(game, t.houseId)
            const active = !t.me && selected?.governingHouseId === t.houseId && selected.id === t.provinceId
            const x = pos[0] + (n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 30 : 0)
            return <Walker key={t.characterId} id={t.characterId} at={t.provinceId} x={x} y={pos[1]} className={`${styles.lord} ${active ? styles.active : ''} ${t.me ? styles.me : ''} ${t.me && reach ? styles.picked : ''}`} style={{ ['--hc']: mapColor(game, house.id) }} onClick={() => t.me ? onParty() : onSelect(t.provinceId)} label={t.me ? 'Irian e a comitiva' : `${ruler?.name ?? ''} ${house.name}`}>
              {ruler?.portraitAsset ? <img src={assetUrl(ruler.portraitAsset)} alt="" draggable={false} decoding="async"/> : <span className={styles.crestOnly}><Crest heraldry={heraldryOf(game, house)} size={30}/></span>}
              <span className={styles.base}/>
              {t.men !== null && <span className={`${styles.men} ${t.me ? styles.menMine : ''}`}><Crest heraldry={heraldryOf(game, house)} size={12}/>{t.men}</span>}
            </Walker>
          })
      })()}
      {game.campaign.parties.filter(b => b.kind === 'bandidos' && knowledge(game, b.provinceId) >= 1).map(b => { const c = S(provinceOf(game, b.provinceId).center), pos: [number, number] = [c[0], c[1] - 30]; if (!onScreen(pos)) return null
        const quest = game.campaign.quests.find(q => !q.done && q.partyId === b.id)
        return <Walker key={b.id} id={b.id} at={b.provinceId} x={pos[0]} y={pos[1]} className={styles.band} onClick={() => onBand(b.id, b.provinceId)} label={`${b.name}, ${b.men} salteadores`}>
          <Icon name="militar" size={14}/><b>{b.men}</b>{quest && <i title="recompensa">★</i>}
        </Walker> })}
      {reach && [...reach].map(([id, cost]) => { const c = S(provinceOf(game, id).center), k = S(castleAt(provinceOf(game, id)))
        // At the province's heart, kept clear of the lord standing on the castle.
        const pos: [number, number] = Math.hypot(c[0] - k[0], c[1] - k[1]) < 44 ? [k[0], k[1] + 30] : c; if (!onScreen(pos)) return null
        return <button key={`reach-${id}`} type="button" data-ui className={styles.reach} style={{ left: pos[0], top: pos[1] }} onClick={() => onMove(id)} aria-label={`Levar a comitiva para ${knowledge(game, id) >= 2 ? provinceOf(game, id).name : 'terra avistada'}`}>
          <span>{cost}</span>
        </button> })}
      {controlled(game).filter(p => p.id !== houseOf(game, game.playerHouseId).seatProvinceId).map(p => ({ p, pos: S(castleAt(p)) })).filter(x => onScreen(x.pos)).map(({ p, pos }) =>
        <button key={`banner-${p.id}`} type="button" data-ui className={styles.banner} style={{ left: pos[0], top: pos[1] }} onClick={() => onSelect(p.id)} aria-label={`${p.name}, sua província`}>
          <span className={styles.flag}><Crest heraldry={game.campaign.customization.heraldry} size={22}/></span><span className={styles.pole}/>
        </button>)}
      {game.campaign.armies.map(a => { const pos = S(armyPosition(game, a)), mineArmy = a.houseId === game.playerHouseId, house = houseOf(game, a.houseId); return <div key={a.id} className={`${styles.army} ${mineArmy ? styles.armyMine : styles.armyFoe}`} style={{ left: pos[0], top: pos[1] }}>
        <Crest heraldry={heraldryOf(game, house)} size={18}/><span>{a.men}{a.status === 'sitiando' ? ' · cerco' : a.status === 'pronto' ? ' · pronto' : ''}</span>
      </div> })}
    </div>
  </div>
}
export const mapZoom = (dir: 'in' | 'out') => document.querySelector(`.${styles.map}`)?.dispatchEvent(new Event(dir === 'in' ? 'map-zoom-in' : 'map-zoom-out'))
