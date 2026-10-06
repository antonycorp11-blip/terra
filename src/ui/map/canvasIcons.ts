import type { Resource } from '../../engine/types'

/** Resource glyphs as images for the canvas renderer (same drawings as Icons.tsx). */
const GLYPH: Record<Resource, string> = {
  'grãos': '<path d="M0 6V-6M0 0c-2.5-1-3.5-3.5-3.5-6 2.5 0 3.5 2.5 3.5 4.5M0 0c2.5-1 3.5-3.5 3.5-6-2.5 0-3.5 2.5-3.5 4.5M0 4c-2.5-1-3.5-3-3.5-5.5M0 4c2.5-1 3.5-3 3.5-5.5" stroke="#3a2a08" stroke-width="1.3" fill="none"/>',
  madeira: '<rect x="-6" y="-3" width="12" height="6" rx="3" fill="#e9c995" stroke="#3a2410"/><circle cx="-6" cy="0" r="3" fill="#f3dcb0" stroke="#3a2410"/><circle cx="-6" cy="0" r="1" fill="#3a2410"/>',
  pedra: '<rect x="-6" y="-1" width="7" height="6" fill="#e6e3da" stroke="#2e2c28"/><rect x="0" y="-1" width="6" height="6" fill="#cfccc2" stroke="#2e2c28"/><rect x="-3" y="-6" width="7" height="5" fill="#f2f0ea" stroke="#2e2c28"/>',
  ferro: '<path d="M-6 3l2-6h8l2 6z" fill="#cfd6dd" stroke="#1f252b"/><path d="M-4-3h8" stroke="#fff" stroke-width=".8"/>',
  sal: '<path d="M0-6l5 6-5 6-5-6z" fill="#fff" stroke="#5a6070"/><path d="M0-6v12M-5 0h10" stroke="#9aa0b0" stroke-width=".7"/>',
  prata: '<ellipse cx="-1.5" cy="1.5" rx="5" ry="3.2" fill="#eef2f6" stroke="#4a5562"/><ellipse cx="1.5" cy="-1.8" rx="5" ry="3.2" fill="#fff" stroke="#4a5562"/>',
}
const COLOR: Record<Resource, string> = { 'grãos': '#e2bf4f', madeira: '#a0703a', pedra: '#a7a59c', ferro: '#6d7884', sal: '#dfe3ea', prata: '#b9c3cf' }
const images = new Map<Resource, HTMLImageElement>()
export function resourceImage(r: Resource, onLoad: () => void): HTMLImageElement {
  let img = images.get(r)
  if (!img) {
    img = new Image()
    img.onload = onLoad
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="-10 -10 20 20"><circle r="9" fill="${COLOR[r]}" stroke="#141010" stroke-width="1.4"/>${GLYPH[r]}</svg>`)
    images.set(r, img)
  }
  return img
}
