/**
 * Curated name pools. Names may be English or Portuguese for sound; the game will be translated,
 * so place and house names are treated as proper nouns. Every list is deduplicated at generation.
 */
export const PROVINCE_NAMES = [
  'Torrealva','Ravenmoor','Saltmere','Ironhold','Brightwater','Ashcombe','Greywater','Valdoro','Lumebrook','Highmarch',
  'Duskvale','Marvenne','Calderon','Westreach','Thornwall','Aurelmont','Fenwick','Silvanor','Coldharbor','Mirevale',
  'Belmora','Solmere','Wintermere','Hollowmere','Castamar','Embervale','Rookwood','Pellmore','Amberfield','Vellicor',
  'Oakhaven','Redfen','Stonehallow','Elderglen','Montserra','Corvalis','Kestrel Point','Lorncastle','Brumefort','Valcinza',
  'Northwatch','Gildmoor','Sablemere','Harrowdale','Cindral','Morrowick','Larkspur','Dunmarrow','Varlow','Glimmerholt',
  'Serravento','Aldmere','Brackenreach','Caer Vell','Fairhollow','Grimwater','Ivoryhall','Lowmarch','Mistral','Nettlecombe',
  'Pyrewood','Quarrystone','Rivenhal','Saltspire','Tidewell','Umberlane','Vexmoor','Wolfden','Yarrow','Alderley',
  'Blackmere','Copperwell','Drakesford','Eastwyn','Foxmoor','Galewatch','Heronsgate','Isenford','Jadecliff','Kingsbarrow',
  'Lindenmoor','Marrowind','Oldcastle','Pinehold','Ravensgate','Sunderby','Thistlewick','Valebright','Whitecliff','Ashen Ford',
  'Cloudrest','Deepwell','Elmstead','Frostford','Glenmora','Hawkridge','Ironmere','Lakeshire','Moonhollow','Oxbow',
  'Pebblebrook','Rimecliff','Stormhold','Tallowmere','Underhill','Wyvernmoor','Altamira','Bellacorte','Casterra','Dorvalle',
  'Esmeralda','Fontalba','Granvela','Lunaverde','Marcastel','Nevada Alta','Orvalho','Penafiel','Quintamar','Rocabruna',
  'Sanvela','Terranegra','Valflor','Ventania','Alvorada','Boavista','Cerrado Alto','Douravale','Encosta Fria','Ferrocampo',
  'Lagoalta','Montanegra','Pedralva','Ribeirada','Solaris','Torrebranca','Vilaclara','Aguasanta','Brasalva','Cimafria',
]
const PREFIX = ['Ash','Raven','Salt','Iron','Bright','Grey','Wolf','Stone','Red','Black','White','High','North','Storm','Frost','Gold','Silver','Elder','Oak','Thorn','Mist','Dusk','Ember','Moon','Sun','Cold','Deep','Fair','Glen','Hart','Wind','Cinder','Hollow','Marsh','Pine','Rook','Swan','Ivy','Copper','Amber']
const SUFFIX = ['moor','mere','hold','water','ford','vale','fell','wick','gate','haven','march','field','crest','reach','wood','combe','brook','stead','watch','hollow']
/** Deterministic pool with at least `count` unique names: curated first, compounds after. */
export function provinceNamePool(count: number, pick: (n: number) => number): string[] {
  const out = new Set(PROVINCE_NAMES)
  for (let i = 0; out.size < count + 40 && i < PREFIX.length * SUFFIX.length * 2; i++) {
    const n = pick(i)
    out.add(PREFIX[n % PREFIX.length] + SUFFIX[Math.floor(n / PREFIX.length) % SUFFIX.length])
  }
  return [...out]
}
/** Provincial house names (84 needed). Três Pontes keeps its authored houses. */
export const PROVINCIAL_HOUSES = [
  'Morvane','Quellan','Ardesh','Vasterre','Corvane','Isembard','Marlowe','Thessaly','Valcourt','Rookwell',
  'Ostrin','Varrel','Lamber','Durel','Tessaly','Aldane','Brannoc','Caelmor','Everhart','Faelan',
  'Greymane','Halloran','Ivers','Jessamine','Kestrelle','Lothmere','Maddox','Norwyn','Orrin','Pembrook',
  'Ravensworth','Sable','Ulric','Vane','Wexley','Yarrowind','Zorvane','Albrecht','Belisar','Corrigan',
  'Dunmore','Elric','Fenmoor','Galloway','Harrowgate','Ilvane','Jaskar','Kaelor','Lysander','Marrok',
  'Nestor','Oakes','Penhallow','Rivane','Selwyn','Talbot','Umber','Varga','Wren','Arvane',
  'Bellamy','Castellan','Ebrard','Florian','Garrow','Hale','Ingram','Jory','Kell','Lorne',
  'Mercer','Osric','Pryce','Quint','Rourke','Stroud','Tavish','Vesper','Wolcott','Aubrel',
  'Cendris','Delmare','Estrand','Ferrant','Galvis','Montrel','Nevarre','Soldane',
]
export const MALE_NAMES = ['Aldric','Bertram','Varo','Corvin','Hugo','Oren','Tomas','Pell','Ivo','Gregor','Brann','Ulric','Sten','Kael','Edmund','Alden','Berian','Cedran','Darian','Edrin','Falor','Gavren','Halen','Jorvan','Kaelen','Lorian','Merian','Nerian','Orven','Parel','Raviel','Saren','Tavian','Valen','Weren','Ysaren','Roderic','Lucan','Matthias','Osmund']
export const FEMALE_NAMES = ['Isolde','Mirela','Ysane','Lysa','Alys','Maud','Edra','Hilde','Maera','Yselle','Alena','Seris','Elara','Neris','Lívia','Ilsa','Corina','Amaris','Delia','Renna','Talia','Vessa','Catalina','Odette','Rowena','Sabela','Theda','Ursula','Wilhelmina']
