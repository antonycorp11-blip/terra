import type { ReactNode } from 'react'
import { dateFromDay } from '../engine/calendar'
import type { GameState } from '../engine/types'
import { HouseBadge } from './Heraldry'
import Crest from './Heraldry'
import styles from './Panels.module.css'

export type Act = (action: (game: GameState) => GameState, success?: string) => void
export const fmt = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value))
export const signed = (value: number) => value > 0 ? `+${fmt(value)}` : value < 0 ? `−${fmt(-value)}` : '0'
export const shortDate = (day: number) => { const d = dateFromDay(day); return `${d.dayOfSeason} ${d.season.slice(0, 3).toLowerCase()}. ${d.year}` }
export const longDate = (day: number) => { const d = dateFromDay(day); return `Dia ${d.dayOfSeason} da ${d.season}, ${d.year} AP` }

export function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' }) {
  return <div className={styles.row}><span>{label}</span><strong className={tone ? styles[tone] : undefined}>{value}</strong></div>
}
export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className={styles.section}><h2><span>{title}</span>{aside}</h2>{children}</section>
}
export function Progress({ value, label }: { value: number; label?: string }) {
  return <div className={styles.progress} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}><span style={{ width:`${Math.max(0, Math.min(1, value)) * 100}%` }}/></div>
}
/** −100…100 relation gauge with a centre mark. */
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = (value + 100) / 2
  return <div className={styles.meter}><span>{label}</span><div className={styles.meterTrack}><i style={{ left:`${Math.min(50, pct)}%`, width:`${Math.abs(pct - 50)}%`, background:value >= 0 ? '#5f9b54' : '#b24a3a' }}/><b/></div><strong>{value > 0 ? `+${value}` : value}</strong></div>
}
/** Action button that always explains its cost, time and — when blocked — the reason. */
export function ActionButton({ title, detail, disabled, reason, onClick, primary }: { title: string; detail?: ReactNode; disabled?: boolean; reason?: string | null; onClick: () => void; primary?: boolean }) {
  return <div className={styles.action}>
    <button className={primary ? styles.primary : styles.secondaryButton} disabled={disabled} onClick={onClick}><strong>{title}</strong>{detail && <small>{detail}</small>}</button>
    {disabled && reason && <p className={styles.reason}>{reason}</p>}
  </div>
}
export function HouseMark({ game, houseId, size = 30 }: { game: GameState; houseId: string; size?: number }) {
  const house = game.world.houses.find(h => h.id === houseId)!
  return houseId === game.playerHouseId ? <Crest heraldry={game.campaign.customization.heraldry} size={size}/> : <HouseBadge symbol={house.symbol} color={house.color} size={size}/>
}
export function Empty({ children }: { children: ReactNode }) { return <p className={styles.empty}>{children}</p> }
export { styles as panelStyles }
