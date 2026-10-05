import { MAP_HEIGHT, MAP_WIDTH, onLand } from './geography'
import type { Point } from './types'

// Maritime ambience follows navigable water. It does not represent simulated cargo.
export function buildSeaRoutes(lands:Point[][]):Point[][] {
  const step=10,cols=Math.floor(MAP_WIDTH/step),rows=Math.floor(MAP_HEIGHT/step)
  const point=(id:number):Point=>[(id%cols)*step+step/2,Math.floor(id/cols)*step+step/2]
  const water=new Set<number>()
  for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++) {
    const id=y*cols+x,p=point(id)
    if(![[0,0],[12,0],[-12,0],[0,12],[0,-12]].some(([dx,dy])=>onLand([p[0]+dx,p[1]+dy],lands)))water.add(id)
  }
  function nearest(target:Point){let best=-1,distance=Infinity;for(const id of water){const p=point(id),d=Math.hypot(p[0]-target[0],p[1]-target[1]);if(d<distance){best=id;distance=d}}return best}
  function route(from:Point,to:Point):Point[] {
    const start=nearest(from),end=nearest(to),queue=[start],previous=new Map<number,number>([[start,start]])
    for(let i=0;i<queue.length && !previous.has(end);i++)for(const next of [queue[i]-1,queue[i]+1,queue[i]-cols,queue[i]+cols])if(water.has(next)&&!previous.has(next)){previous.set(next,queue[i]);queue.push(next)}
    if(!previous.has(end))return []
    const ids=[end];while(ids[0]!==start)ids.unshift(previous.get(ids[0])!)
    const points=ids.map(point)
    return points.filter((_,i)=>i===0||i===points.length-1|| (points[i-1][0]!==points[i+1][0] && points[i-1][1]!==points[i+1][1]))
  }
  const routes:[Point,Point][]=[[[52,120],[44,548]],[[52,552],[399,686]],[[393,680],[563,646]],[[544,638],[652,373]],[[624,490],[729,393]],[[746,548],[774,676]],[[927,683],[1064,537]],[[1061,560],[1062,272]]]
  return routes.map(([from,to])=>route(from,to)).filter(path=>path.length>1)
}
