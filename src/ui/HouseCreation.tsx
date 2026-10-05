import { useState } from 'react'
import { COLORS, DIVISIONS, SYMBOLS, SYMBOL_PATHS, validHeraldry } from '../engine/heraldry'
import { houseNameError, normalizeHouseName } from '../engine/houseCustomization'
import type { Heraldry } from '../engine/mvpTypes'
import type { GameState } from '../engine/types'
import Crest from './Heraldry'
import styles from './HouseCreation.module.css'

const COLOR_NAMES = ['Verde-mar','Azul real','Rubro','Púrpura','Ouro','Marfim','Negro','Verde-musgo','Azul-petróleo','Cobre','Prata','Castanho']
const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

export default function HouseCreation({ base, onFound, onCancel }: { base: GameState; onFound: (name: string, heraldry: Heraldry) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('Serraval')
  const [heraldry, setHeraldry] = useState<Heraldry>(base.campaign.customization.heraldry)
  const [touched, setTouched] = useState(false)
  const error = houseNameError(base, name)
  const heraldryOk = validHeraldry(heraldry)
  const world = base.world
  const house = world.houses.find(h => h.id === base.playerHouseId)!
  const seat = world.provinces.find(p => p.id === house.seatProvinceId)!
  const fief = world.fiefs.find(f => f.id === seat.fiefId)!
  const realm = world.realms.find(r => r.id === seat.realmId)!
  const castle = world.settlements.find(s => s.provinceId === seat.id && s.type === 'castelo')
  const display = `Casa ${normalizeHouseName(name) || '…'}`
  const set = (patch: Partial<Heraldry>) => setHeraldry(previous => ({ ...previous, ...patch }))
  const canAdvance = step === 0 ? !error : step === 1 ? heraldryOk : true
  const steps = ['Sua Casa', 'Seu Brasão', 'Iniciar']

  return <div className={styles.backdrop}>
    <section className={styles.card} aria-label="Fundação da casa">
      <header className={styles.header}>
        <span className={styles.eyebrow}>NOVA CAMPANHA · VAREDOR, 128 AP</span>
        <ol className={styles.steps}>{steps.map((label, index) => <li key={label} className={index === step ? styles.current : index < step ? styles.done : ''}><span>{index + 1}</span>{label}</li>)}</ol>
      </header>
      <div className={styles.body}>
        <div className={styles.preview}>
          <Crest heraldry={heraldry} size={step === 1 ? 150 : 120} title={`Brasão da ${display}`}/>
          <strong>{display}</strong>
          <small>{DIVISIONS[heraldry.division]} · {SYMBOLS[heraldry.symbol]}</small>
        </div>
        <div className={styles.form}>
          {step === 0 && <>
            <h1>Sua Casa</h1>
            <p>Escolha o nome que seus vassalos, rivais e cronistas lembrarão. A linhagem humana de Irian governa Pontevela.</p>
            <label className={styles.field}>Nome da casa
              <div className={styles.prefixed}><span>Casa</span><input value={name} maxLength={30} autoFocus onChange={event => { setName(event.target.value); setTouched(true) }} aria-label="Nome da casa" aria-invalid={!!error}/></div>
            </label>
            <p className={error && touched ? styles.error : styles.hint} role={error ? 'alert' : undefined}>{error ?? `Prévia: ${display}`}</p>
          </>}
          {step === 1 && <>
            <h1>Seu Brasão</h1>
            <h2>Divisão</h2>
            <div className={styles.grid8}>{DIVISIONS.map((label, index) => <button key={label} className={heraldry.division === index ? styles.picked : ''} onClick={() => set({ division:index })} aria-pressed={heraldry.division === index} title={label}><Crest heraldry={{ ...heraldry, division:index }} size={30}/><small>{label}</small></button>)}</div>
            <h2>Símbolo</h2>
            <div className={styles.symbols}>{SYMBOLS.map((label, index) => <button key={label} className={heraldry.symbol === index ? styles.picked : ''} onClick={() => set({ symbol:index })} aria-pressed={heraldry.symbol === index} title={label} aria-label={label}><svg viewBox="15 15 70 75" width="26" height="28"><path d={SYMBOL_PATHS[index]} fill="currentColor" fillRule="evenodd"/></svg></button>)}</div>
            <div className={styles.colorRows}>
              {(['primary', 'secondary'] as const).map(slot => <div key={slot}><h2>{slot === 'primary' ? 'Cor principal' : 'Cor secundária'}</h2>
                <div className={styles.colors}>{COLORS.map((color, index) => <button key={color} style={{ background:color }} className={heraldry[slot] === color ? styles.pickedColor : ''} onClick={() => set({ [slot]:color })} aria-pressed={heraldry[slot] === color} aria-label={`${slot === 'primary' ? 'Principal' : 'Secundária'}: ${COLOR_NAMES[index]}`} title={COLOR_NAMES[index]}/>)}</div></div>)}
            </div>
            {!heraldryOk && <p className={styles.error} role="alert">As cores principal e secundária precisam ser diferentes.</p>}
          </>}
          {step === 2 && <>
            <h1>Iniciar</h1>
            <p>{display} jura fidelidade à {world.houses.find(h => h.id === seat.liegeHouseId)?.name} e governa o vale de Pontevela a partir do {castle?.name}.</p>
            <dl className={styles.summary}>
              <div><dt>Reino</dt><dd>{realm.name}</dd></div><div><dt>Feudo</dt><dd>{fief.name}</dd></div>
              <div><dt>Província inicial</dt><dd>{seat.name}</dd></div><div><dt>Castelo</dt><dd>{castle?.name}</dd></div>
              <div><dt>População</dt><dd>{fmt(seat.population)}</dd></div><div><dt>Lealdade</dt><dd>{seat.loyalty}%</dd></div>
            </dl>
            <h2>Recursos iniciais</h2>
            <dl className={styles.resources}><div><dt>Ouro</dt><dd>{fmt(house.gold)}</dd></div><div><dt>Alimentos</dt><dd>{fmt(house.stock.food)}</dd></div><div><dt>Madeira</dt><dd>{fmt(house.stock.wood)}</dd></div><div><dt>Ferro</dt><dd>{fmt(house.stock.iron)}</dd></div><div><dt>Cavalos</dt><dd>{fmt(house.stock.horses)}</dd></div></dl>
          </>}
        </div>
      </div>
      <footer className={styles.footer}>
        <button className={styles.secondary} onClick={() => step === 0 ? onCancel() : setStep(step - 1)}>{step === 0 ? 'Cancelar' : '‹ Voltar'}</button>
        {step < 2 ? <button className={styles.primary} disabled={!canAdvance} onClick={() => { setTouched(true); if (canAdvance) setStep(step + 1) }}>Continuar ›</button>
          : <button className={styles.primary} onClick={() => onFound(name, heraldry)}>Fundar Minha Casa</button>}
      </footer>
    </section>
  </div>
}
