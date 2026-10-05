import type { Character } from '../engine/mvpTypes'

const SKIN = ['#f1c9a5', '#e2b48c', '#c98f63', '#a86f4a', '#7f4f33', '#f4d6bb']
const HAIR = ['#2b1d14', '#5a3a22', '#8d5a2b', '#c99a4f', '#b9b2a6', '#1d1d24', '#7a2f1f']
const FEMININE = new Set(['Maera','Yselle','Alena','Seris','Elara','Neris','Lívia','Ilsa','Corina','Amaris','Delia','Renna','Talia','Vessa','Maelis','Sabela','Nara','Velis','Miriel'])
const FEMININE_ROLES = /Conselheira|Capitã|Mercadora|Mensageira|Mãe|Irmã/
// Modular portrait: deterministic layers picked from the character's persistent portrait seed.
export default function Portrait({ character, color, size = 52 }: { character: Character; color: string; size?: number }) {
  const n = character.portrait >>> 0
  const feminine = FEMININE.has(character.name) || FEMININE_ROLES.test(character.role)
  const skin = SKIN[n % SKIN.length]
  const hair = character.age > 52 ? '#c9c4bb' : HAIR[(n >>> 3) % HAIR.length]
  const style = (n >>> 6) % 4
  const beard = !feminine && (n >>> 9) % 3 !== 0
  const crowned = character.role === 'Soberano' || character.role === 'Grão-lorde'
  const hooded = character.id.startsWith('candidate-')
  const eyeY = 37 + ((n >>> 12) % 3)
  return <svg className="portrait" width={size} height={size * 1.15} viewBox="0 0 64 74" aria-hidden>
    <rect x="1" y="1" width="62" height="72" rx="3" fill="#18303d" stroke="#c9a15e" strokeWidth="2"/>
    <rect x="4" y="4" width="56" height="66" rx="2" fill={color} opacity=".35"/>
    <path d="M10 74C11 58 21 52 32 52S53 58 54 74Z" fill={hooded ? '#3b3a35' : color} stroke="#0d1a22" strokeOpacity=".5"/>
    <path d="M25 52L32 60L39 52" fill="none" stroke="#e8d3a6" strokeWidth="1.6" opacity=".8"/>
    {feminine && style !== 3 && !hooded && <path d="M16 36C15 56 20 62 26 60L24 34ZM48 36C49 56 44 62 38 60L40 34Z" fill={hair}/>}
    <rect x="28" y="44" width="8" height="10" fill={skin}/>
    <ellipse cx="32" cy="37" rx="12.5" ry="15" fill={skin}/>
    {hooded ? <path d="M15 42C13 22 22 15 32 15S51 22 49 42L45 30C41 24 23 24 19 30Z" fill="#3b3a35"/>
      : style === 0 ? <path d="M19 33C18 20 26 17 32 17S47 20 45 33C42 26 36 24 32 24S22 26 19 33Z" fill={hair}/>
      : style === 1 ? <path d="M18 38C16 19 27 15 33 16S48 21 46 38C45 29 41 23 32 23S20 28 18 38Z" fill={hair}/>
      : style === 2 ? <path d="M20 30C20 21 26 18 32 18S44 21 44 30C40 25 24 25 20 30Z" fill={hair}/>
      : <path d="M18 34C17 22 24 16 32 16S47 21 46 34L44 28C38 22 26 22 20 28Z M42 22C50 24 50 34 46 36Z" fill={hair}/>}
    <path d={`M24 ${eyeY - 3.5}h5M35 ${eyeY - 3.5}h5`} stroke={hair} strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="26.5" cy={eyeY} r="1.3" fill="#1d1a17"/><circle cx="37.5" cy={eyeY} r="1.3" fill="#1d1a17"/>
    <path d="M32 39v4" stroke="#00000033" strokeWidth="1.2"/>
    <path d={character.traits.includes('desconfiado') || character.traits.includes('orgulhoso') ? 'M28 47h8' : 'M28 46.5Q32 49 36 46.5'} stroke="#6b3b2a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    {beard && <path d={(n >>> 15) % 2 ? 'M21 40C22 52 28 55 32 55S42 52 43 40C40 47 36 49 32 49S24 47 21 40Z' : 'M27 47C28 53 31 54 32 54S36 53 37 47C35 49 29 49 27 47Z'} fill={hair}/>}
    {crowned && <path d="M21 20L23 12L27 17L32 10L37 17L41 12L43 20Z" fill="#e2b85c" stroke="#7a5524" strokeWidth=".8"/>}
  </svg>
}
