/** Single source of tuning values. Systems read these; nothing duplicates them. */
export const BALANCE = {
  month: 30,
  economy: { revenue: 120, administration: 40, food: 240, consumption: 150, wood: 45, iron: 15 },
  expedition: { gold: 60, food: 80, days: 10, max: 2 },
  terrainDays: { 'planície': 0, 'floresta': 3, 'montanha': 6, 'colina': 2, 'litoral': 0, 'várzea': 1 },
  investment: { farms: { name: 'Expandir Fazendas', gold: 150, wood: 80, days: 20, benefit: '+60 grãos/mês e população cresce mais' }, market: { name: 'Melhorar o Mercado', gold: 220, wood: 100, days: 25, benefit: '+45 ouro/mês' }, mine: { name: 'Desenvolver a Mina', gold: 180, wood: 80, days: 30, benefit: '+30 do minério da província/mês' }, barracks: { name: 'Erguer um Quartel', gold: 200, wood: 120, days: 30, benefit: '+3% da população pode servir' } },
  /** Each investment has three levels; every level costs more than the last. */
  investmentLevels: 3, levelCost: .6,
  /** Province administration: taxes trade gold for loyalty and growth. */
  tax: { baixo: { gold: .6, loyalty: 2, growth: .003 }, normal: { gold: 1, loyalty: 0, growth: 0 }, alto: { gold: 1.4, loyalty: -3, growth: -.003 } },
  population: { base: .004, fed: .003, starving: -.015, loyalHigh: .003, loyalLow: -.005, farms: .002, winter: -.002, plague: -.02 },
  absentee: -1, governorLoyalty: 1,
  diplomacy: { gold: 40, days: 8, rapprochementDays: 12, giftGold: 50, giftCooldown: 30, tradeIncome: 18, audienceDays: 6, audienceWindow: 30 },
  spy: { gold: 90, upkeep: 6, max: 3, days: 14, missionGold: 15, reportValidity: 60, claimDays: 30, secretDays: 21 },
  dialogue: { cooldown: 7, favorCooldown: 30 },
  /** Lord's personal travel: faster than scouts, establishes contact, but risky and leaves the seat without its lord. */
  travel: { speed: .6, gold: 20, ambushGold: 40, ambushRenown: 3, delay: 3, loyaltyPerTenDays: 1, trust: 10, risk: { 'planície': 9, 'várzea': 11, 'litoral': 10, 'colina': 14, 'floresta': 16, 'montanha': 26 } as Record<string, number>, foreignRealm: 10 },
  military: {
    recruitBatch: 50, recruitGold: 40, recruitRenown: 4, recruitIron: 15,
    /** Soldiers a province can sustain under arms, as a share of its population. */
    levyShare: .08, barracksShare: .03,
    /** Each day of siege, disease and desertion take a share of the besiegers; winter doubles it. */
    siegeAttrition: .006,
    upkeepFreeMen: 370, upkeepGoldPer10: 1, marchFoodPer10PerDay: 1,
    hopDays: 3, terrainHop: { 'planície': 0, 'várzea': 1, 'litoral': 0, 'colina': 1, 'floresta': 1, 'montanha': 3 } as Record<string, number>,
    siegeDaysPerWall: 4, siegeBaseDays: 4, wallBonus: .28, partySiegeMin: 40,
    tactics: { assalto: { power: 1, extraDays: 0, attackerLoss: .42, label: 'Assalto direto' }, amanhecer: { power: 1.14, extraDays: 0, attackerLoss: .34, renown: 4, label: 'Ataque ao amanhecer' }, cerco: { power: 1, defenderFactor: .68, extraDays: 8, attackerLoss: .22, foodPer10: 6, label: 'Cercar e esfomear' } },
    unjustRenown: 25, unjustThreat: 15, victoryRenown: 10, defeatRenown: 5,
    wallUpgrade: { stone: 120, gold: 80 },
  },
  influence: {
    banquet: { gold: 30, food: 60, gain: 6, cooldown: 30 },
    patronage: { silver: 40, gain: 10, cooldown: 45 },
    gift: { gain: 4 },
    marriage: { renown: 15, relation: 20 },
    oathThreshold: 60, oathRelation: 15, monthlyFriendly: 1, decayBelow: 10,
    /** Influence fades without care: −3 per month when nothing was done for 45 days. */
    neglectDays: 45, neglectDecay: 3,
  },
  negotiation: { thresholds: { 'comércio': 18, 'aliança': 45, 'vassalagem': 90 }, maxRounds: 3, failCooldown: 60 },
  vassal: { tribute: { generosos: .15, firmes: .3 }, loyalty: { militar: 35, diplomacia: 70, 'influência': 60, generosos: 15, firmes: -5 }, monthlyRenown: 1, rebelBelow: 15 },
  politics: { threatPerVassal: { militar: 30, diplomacia: 18, 'influência': 15 }, threatOccupation: 30, warned: 40, ultimatum: 60, war: 80, decay: 2, tributeDays: 90, tributeGold: 60, submitGold: 200, submitRelief: 30, kingPerVassal: 12, kingOffer: 30, kingPactGold: 200, levyDay: 25, levyMen: 100, levyDays: 20 },
  events: { minGap: 6, spread: 6 },
  /** A turn is a week. Orders pay for actions at a distance; what Irian does in person is free. */
  turn: { days: 7, orders: 3 },
  /** Irian's retinue grows with the land he rules. */
  party: { moves: 2, start: 45, capBase: 60, capPerProvince: 30, capPerVassal: 40, transfer: 25, npcShare: .2, npcBase: 25, defeatKeep: .15, defeatRenown: 5 },
  field: { investida: { power: 1.12, loss: .36, label: 'Carga' }, linha: { power: 1, loss: .24, label: 'Segurar a linha' }, emboscada: { power: 1.3, loss: .2, label: 'Emboscada', renown: 3 }, retreatLoss: .12 },
  bandits: { maxBase: 2, perTurns: 8, maxBands: 6, startMen: 18, growth: 3, cap: 140, raidGold: 20, raidLoyalty: 3, lootPerMan: 2, renown: 3, garrisonGuard: 2, flee: 1.3, rewardGold: 80, rewardInfluence: 10, rewardRelation: 10 },
  prisoner: { ransomBase: 100, ransomShare: .25, freeRelation: 20, freeInfluence: 10, freeRenown: 3, keepRelation: 2, keepThreat: 5, captureChance: 55, captiveDefense: .75 },
  world: { warEvery: 24, ardeshWarDay: 40, hadrinDeathDay: 170, peaceAfter: 90 },
  trade: { price: { 'grãos': 1, madeira: 1.5, pedra: 2.5, ferro: 3, sal: 2, prata: 6 } as Record<string, number>, batch: 50, hostileBelow: -10 },
} as const
