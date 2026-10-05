// Small hand-drawn glyphs for resources and modes; inline SVG keeps them crisp at any size.
const PATHS: Record<string, string> = {
  gold: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-1 2v8h2V8Z',
  food: 'M12 2c-1 3-1 5 0 7 1-2 1-4 0-7Zm-4 5c0 3 1 4 3 5-1-2-1-4-3-5Zm8 0c-2 1-2 3-3 5 2-1 3-2 3-5Zm-8 5c0 3 1 4 3 5-1-2-1-4-3-5Zm8 0c-2 1-2 3-3 5 2-1 3-2 3-5Zm-5 0h2v10h-2Z',
  wood: 'M3 9h14l4 3-4 3H3Zm2 2v2h2v-2Zm10 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  iron: 'M5 15l3-6h8l3 6Zm-2 2h18v3H3Z',
  influence: 'M4 18h16v2H4Zm0-2L3 7l5 4 4-6 4 6 5-4-1 9Z',
  discover: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm4 4-6 2-2 6 6-2Zm-4 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
  influenceMode: 'M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM2 18c0-4 2-6 5-6s5 2 5 6Zm10 0c0-4 2-6 5-6s5 2 5 6Z',
  conquer: 'M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5Zm0 3 5 2v4c0 3-2 6-5 8-3-2-5-5-5-8V7Z',
  bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0Z',
  menu: 'M4 6h16v2H4Zm0 5h16v2H4Zm0 5h16v2H4Z',
  pause: 'M7 5h3v14H7Zm7 0h3v14h-3Z',
  play: 'M8 5v14l11-7Z',
  eye: 'M12 6C6 6 2 12 2 12s4 6 10 6 10-6 10-6-4-6-10-6Zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
}
export type IconName = keyof typeof PATHS
export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor" style={{ flex:'none' }}><path d={PATHS[name]} fillRule="evenodd"/></svg>
}
