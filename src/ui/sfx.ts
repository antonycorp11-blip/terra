/**
 * Small synthesized sounds (no audio files): a horn for a new turn, drums for battle, coins for gold,
 * a soft tap for moves. Muted state is a per-device preference.
 */
let ctx: AudioContext | null = null
const KEY = 'terra:mute'
export const isMuted = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
export const setMuted = (m: boolean) => { try { localStorage.setItem(KEY, m ? '1' : '0') } catch { /* private mode */ } }
function audio() {
  if (isMuted()) return null
  try { ctx ??= new AudioContext(); if (ctx.state === 'suspended') void ctx.resume(); return ctx } catch { return null }
}
function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const a = audio(); if (!a) return
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + start
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur)
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur)
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05)
}
function noise(start: number, dur: number, gain: number, freq: number) {
  const a = audio(); if (!a) return
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + start
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = gain
  src.connect(f).connect(g).connect(a.destination); src.start(t)
}
export const sfx = {
  horn: () => { tone(196, 0, .55, 'sawtooth', .05); tone(262, .32, .7, 'sawtooth', .05); tone(392, .32, .7, 'triangle', .03) },
  drums: () => { for (let i = 0; i < 6; i++) { tone(70, i * .28, .22, 'sine', .25, .5); noise(i * .28, .12, .12, 900) } },
  clash: () => { for (let i = 0; i < 5; i++) { noise(i * .09, .1, .1, 4000); tone(1800 + i * 140, i * .09, .08, 'square', .015) } },
  coins: () => { tone(1320, 0, .12, 'triangle', .05); tone(1760, .07, .14, 'triangle', .04) },
  step: () => tone(520, 0, .09, 'triangle', .03, .8),
  fanfare: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, i * .14, .45, 'triangle', .05)) },
}
