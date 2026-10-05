export const BALANCE = {
  month:30,
  economy:{revenue:120,administration:40,food:240,consumption:150,wood:45,iron:15},
  expedition:{gold:60,food:80,days:10,max:2},
  terrainDays:{'planície':0,'floresta':3,'montanha':6,'colina':2,'litoral':0,'várzea':1},
  investment:{farms:{name:'Expandir Fazendas',gold:150,wood:80,days:20,benefit:'+60 alimentos/mês'},market:{name:'Melhorar o Mercado',gold:220,wood:100,days:25,benefit:'+45 ouro/mês'},mine:{name:'Desenvolver a Mina',gold:180,wood:80,days:30,benefit:'+30 ferro/mês'}},
  diplomacy:{gold:40,days:8,rapprochementDays:12,giftGold:50,giftCooldown:30,tradeIncome:18,audienceDays:6,audienceWindow:30},
  spy:{gold:90,upkeep:6,max:3,days:14,missionGold:15,reportValidity:60},
  dialogue:{cooldown:7,favorCooldown:30},
} as const
