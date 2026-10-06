import type { ReactElement } from 'react'
import type { Resource } from '../engine/types'

// Hand-drawn glyphs; inline SVG keeps them crisp at any size.
const PATHS: Record<string, string> = {
  gold: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1 2v8h2V8Z',
  renown: 'M12 2l2.6 6.1 6.4.5-4.9 4.2 1.5 6.4L12 15.8 6.4 19.2l1.5-6.4L3 8.6l6.4-.5Z',
  territorio: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Zm6-2v14m6-12v14',
  diplomacia: 'M3 15c3 0 4-8 9-8s6 8 9 8M3 13a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm18 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
  militar: 'M5 19L17 7m-2-2 4 4M6 14l4 4M19 19L7 7m2-2-4 4m13 5-4 4',
  influencia: 'M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0-3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0-3.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Z',
  houses: 'M4 4h7v8c0 3-2 5-3.5 6C6 17 4 15 4 12Zm9 0h7v8c0 3-2 5-3.5 6-1.5-1-3.5-3-3.5-6Z',
  bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0Z',
  menu: 'M4 6h16v2H4Zm0 5h16v2H4Zm0 5h16v2H4Z',
  pause: 'M7 5h3v14H7Zm7 0h3v14h-3Z',
  play: 'M8 5v14l11-7Z',
  fast: 'M4 5v14l8-7Zm8 0v14l8-7Z',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  speech: 'M4 5h16v10H9l-5 4Z',
  book: 'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5Zm14 0h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z',
}
const STROKED = new Set(['territorio', 'diplomacia', 'militar', 'influencia', 'close', 'plus', 'minus'])
export type IconName = keyof typeof PATHS
export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const stroked = STROKED.has(name)
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill={stroked ? 'none' : 'currentColor'} stroke={stroked ? 'currentColor' : undefined} strokeWidth={stroked ? 1.8 : undefined} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d={PATHS[name]} fillRule="evenodd"/></svg>
}

export const RESOURCE_COLOR: Record<Resource, string> = { 'grãos': '#e2bf4f', madeira: '#a0703a', pedra: '#a7a59c', ferro: '#6d7884', sal: '#dfe3ea', prata: '#b9c3cf' }
const GLYPH: Record<Resource, ReactElement> = {
  'grãos': <path d="M0 6V-6M0 0c-2.5-1-3.5-3.5-3.5-6 2.5 0 3.5 2.5 3.5 4.5M0 0c2.5-1 3.5-3.5 3.5-6-2.5 0-3.5 2.5-3.5 4.5M0 4c-2.5-1-3.5-3-3.5-5.5M0 4c2.5-1 3.5-3 3.5-5.5" stroke="#3a2a08" strokeWidth="1.3" fill="none"/>,
  madeira: <><rect x="-6" y="-3" width="12" height="6" rx="3" fill="#e9c995" stroke="#3a2410"/><circle cx="-6" cy="0" r="3" fill="#f3dcb0" stroke="#3a2410"/><circle cx="-6" cy="0" r="1" fill="#3a2410"/></>,
  pedra: <><rect x="-6" y="-1" width="7" height="6" fill="#e6e3da" stroke="#2e2c28"/><rect x="0" y="-1" width="6" height="6" fill="#cfccc2" stroke="#2e2c28"/><rect x="-3" y="-6" width="7" height="5" fill="#f2f0ea" stroke="#2e2c28"/></>,
  ferro: <><path d="M-6 3l2-6h8l2 6z" fill="#cfd6dd" stroke="#1f252b"/><path d="M-4-3h8" stroke="#fff" strokeWidth=".8"/></>,
  sal: <><path d="M0-6l5 6-5 6-5-6z" fill="#fff" stroke="#5a6070"/><path d="M0-6v12M-5 0h10" stroke="#9aa0b0" strokeWidth=".7"/></>,
  prata: <><ellipse cx="-1.5" cy="1.5" rx="5" ry="3.2" fill="#eef2f6" stroke="#4a5562"/><ellipse cx="1.5" cy="-1.8" rx="5" ry="3.2" fill="#fff" stroke="#4a5562"/></>,
}
/** Resource glyph centred on the origin, for use inside an SVG. `size` is the radius. */
export function ResourceGlyph({ resource, size = 9 }: { resource: Resource; size?: number }) {
  return <g transform={`scale(${size / 9})`}><circle r="9" fill={RESOURCE_COLOR[resource]} stroke="#141010" strokeWidth="1.4"/>{GLYPH[resource]}</g>
}
export function ResourceIcon({ resource, size = 16 }: { resource: Resource; size?: number }) {
  return <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden style={{ flex: 'none' }}><ResourceGlyph resource={resource}/></svg>
}
