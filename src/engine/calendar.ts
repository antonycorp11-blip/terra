import type { Season } from './types'
export function dateFromDay(day: number): { year: number; dayOfSeason: number; season: Season } {
  const seasons: Season[] = ['Primavera', 'Verão', 'Outono', 'Inverno']
  const year = 128 + Math.floor(day / 360)
  const withinYear = ((day % 360) + 360) % 360
  return { year, dayOfSeason: withinYear % 90 + 1, season: seasons[Math.floor(withinYear / 90)] }
}
export function advanceDay(day: number, amount = 1): number { return day + amount }
