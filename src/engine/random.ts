export function rng(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hash(value: string): number {
  let result = 2166136261
  for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619) }
  return result >>> 0
}
