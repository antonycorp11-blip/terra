import { dateFromDay } from '../engine/calendar'
import type { GameState } from '../engine/types'

export type Act = (action: (game: GameState) => GameState, success?: string) => void
export const fmt = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.round(value))
export const signed = (value: number) => value > 0 ? `+${fmt(value)}` : value < 0 ? `−${fmt(-value)}` : '0'
export const shortDate = (day: number) => { const d = dateFromDay(day); return `${d.dayOfSeason} ${d.season.slice(0, 3).toLowerCase()}. ${d.year}` }
export const longDate = (day: number) => { const d = dateFromDay(day); return `${d.dayOfSeason} de ${d.season}, ${d.year} AP` }
export const daysLabel = (n: number) => n <= 0 ? 'hoje' : n === 1 ? '1 dia' : `${n} dias`
