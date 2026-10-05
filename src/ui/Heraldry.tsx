import { useId } from 'react'
import { SYMBOL_PATHS } from '../engine/heraldry'
import type { Heraldry } from '../engine/mvpTypes'

export const SHIELD = 'M6 6H94V58C94 83 73 99 50 106C27 99 6 83 6 58Z'
// Secondary-tincture regions for each division, in the same 100 × 110 shield space.
const DIVISION_SHAPES: (string | null)[] = [
  null,
  'M50 0H100V110H50Z',
  'M0 55H100V110H0Z',
  'M50 0H100V55H50ZM0 55H50V110H0Z',
  'M0 0H24L100 76V110H76L0 34Z',
  'M0 74L50 34L100 74V100L50 60L0 100Z',
  'M41 0H59V110H41ZM0 37H100V55H0Z',
  'M0 0H100V110H0ZM14 14V57C14 77 31 90 50 96C69 90 86 77 86 57V14Z',
]

/** Dynamic SVG coat of arms: the symbol is counterchanged so it stays legible on every division. */
export default function Crest({ heraldry, size = 48, title }: { heraldry: Heraldry; size?: number; title?: string }) {
  const id = useId().replace(/:/g, '')
  const division = DIVISION_SHAPES[heraldry.division]
  return <svg className="heraldry" width={size} height={size * 1.1} viewBox="0 0 100 110" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <defs>
      <clipPath id={`shield-${id}`}><path d={SHIELD}/></clipPath>
      {division && <clipPath id={`div-${id}`}><path d={division} clipRule="evenodd" fillRule="evenodd"/></clipPath>}
      {division && <mask id={`field-${id}`}><rect width="100" height="110" fill="#fff"/><path d={division} fill="#000" fillRule="evenodd"/></mask>}
      <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#fff" stopOpacity=".32"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".28"/></linearGradient>
    </defs>
    <path d={SHIELD} fill="#0d1a22" transform="translate(0 2.5)" opacity=".45"/>
    <g clipPath={`url(#shield-${id})`}>
      <rect width="100" height="110" fill={heraldry.primary}/>
      {division && <path d={division} fill={heraldry.secondary} fillRule="evenodd"/>}
      <g transform="translate(0 4)">
        <path d={SYMBOL_PATHS[heraldry.symbol]} fill={heraldry.secondary} fillRule="evenodd" mask={division ? `url(#field-${id})` : undefined} stroke="#0d1a22" strokeOpacity=".35" strokeWidth="1"/>
        {division && <path d={SYMBOL_PATHS[heraldry.symbol]} fill={heraldry.primary} fillRule="evenodd" clipPath={`url(#div-${id})`} stroke="#0d1a22" strokeOpacity=".35" strokeWidth="1"/>}
      </g>
      <rect width="100" height="110" fill={`url(#gloss-${id})`}/>
    </g>
    <path d={SHIELD} fill="none" stroke="#e4c27a" strokeWidth="4"/>
    <path d={SHIELD} fill="none" stroke="#5f421f" strokeWidth="1.2"/>
  </svg>
}

/** Crest for non-player houses, which keep their generated glyph and colour. */
export function HouseBadge({ symbol, color, size = 34 }: { symbol: string; color: string; size?: number }) {
  return <svg width={size} height={size * 1.1} viewBox="0 0 100 110" aria-hidden>
    <path d={SHIELD} fill={color}/>
    <text x="50" y="66" textAnchor="middle" fontSize="44" fill="#fff6df" fontFamily="Georgia,serif" style={{ paintOrder:'stroke', stroke:'#10202a', strokeWidth:3 }}>{symbol}</text>
    <path d={SHIELD} fill="none" stroke="#e4c27a" strokeWidth="4"/>
  </svg>
}
