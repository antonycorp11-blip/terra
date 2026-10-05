import type { Heraldry } from './mvpTypes'
export const COLORS=['#21645d','#254b82','#a83540','#704080','#ca9c39','#ece0b8','#1d2937','#598047','#397b8c','#b86636','#7f8795','#693d37']
export const DIVISIONS=['Inteiro','Partido','Cortado','Esquartelado','Banda','Chevron','Cruz','Bordadura']
export const SYMBOLS=['Árvore','Torre','Montanha','Estrela','Coroa','Espada','Sol','Lua','Ponte','Chama','Serpente','Lança','Rosa','Escudo','Asa','Chave']
// Original reusable silhouettes in a 100 × 110 shield coordinate system.
export const SYMBOL_PATHS=[
'M50 25L31 46h10L26 61h18v19h12V61h18L59 46h10Z',
'M31 80V38h9V28h8v10h7V28h8v10h7v42H55V65H45v15Zm8-34v8h6v-8m11 0v8h6v-8',
'M24 78l26-49 28 49Zm14-18 12-10 13 11-13-25Z',
'M50 25l8 20 23 2-18 14 5 23-18-13-18 13 5-23-18-14 23-2Z',
'M29 74l-6-34 18 15 9-28 10 28 18-15-7 34Zm0 5h42v6H29Z',
'M47 24h6l3 38h13v7H54v13h-8V69H31v-7h13Z',
'M50 34a18 18 0 1 0 0 36 18 18 0 1 0 0-36Zm-3-16h6v12h-6m0 45h6v12h-6M16 49h12v6H16m56 0h12v6H72M24 28l9 9-4 4-9-9m51 38 9 9-4 4-9-9m4-42 4 4-9 9-4-4M24 72l4 4 9-9-4-4',
'M65 24a31 31 0 1 0 8 57 29 29 0 0 1-8-57Z',
'M23 79V49h8V37h9v12h20V37h9v12h8v30H62V67a12 12 0 0 0-24 0v12Zm8-23h38v6H31Z',
'M50 23c7 22 28 25 23 45-5 24-40 23-46 1-4-13 7-22 9-32 3 15 10 12 14-14Zm1 32c-19 19-8 29 3 21 7-6-2-13-3-21Z',
'M66 30c-28-14-43 12-22 24 22 10 16 27-2 23l-15-9 5 15c35 14 57-19 21-37-11-7-3-13 8-8l9 5 8-8Z',
'M50 20l11 23-7 4v40h-8V47l-7-4Z',
'M50 35c-18-23-39 7-19 20-23 15 1 40 19 20 18 20 42-5 19-20 20-13-1-43-19-20Zm0 11a9 9 0 1 0 0 18 9 9 0 1 0 0-18Z',
'M29 31h42v32c-2 13-12 21-21 27-9-6-19-14-21-27Zm8 8v23c0 8 6 14 13 19 7-5 13-11 13-19V39Z',
'M27 81c4-29 26-50 49-55l-7 19-18 9 15 1-8 12-15 1 9 5-8 12Z',
'M45 25a17 17 0 1 0 0 34v25h23V73H54V59a17 17 0 0 0-9-34Zm0 10a7 7 0 1 1 0 14 7 7 0 1 1 0-14Z',
]
export const DEFAULT_HERALDRY:Heraldry={division:0,symbol:8,primary:COLORS[0],secondary:COLORS[5]}
export function validHeraldry(h:Heraldry){return Number.isInteger(h.division)&&h.division>=0&&h.division<DIVISIONS.length&&Number.isInteger(h.symbol)&&h.symbol>=0&&h.symbol<SYMBOLS.length&&COLORS.includes(h.primary)&&COLORS.includes(h.secondary)&&h.primary!==h.secondary}
