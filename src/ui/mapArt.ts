import polygonClipping from 'polygon-clipping'
import { inPolygon } from '../engine/geography'
import type { Point, Province, Realm, World } from '../engine/types'
export interface RealmLabel {realm:Realm;center:Point;compact:boolean}
type Box={x:number;y:number;w:number;h:number}
const overlap=(a:Box,b:Box,pad=0)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.y-b.y)<(a.h+b.h)/2+pad
export function mapLabels(world:World):RealmLabel[] {
  const boxes:Box[]=[]
  return [...world.realms].sort((a,b)=>world.provinces.filter(p=>p.realmId===a.id).length-world.provinces.filter(p=>p.realmId===b.id).length).map(realm=>{
    const members=world.provinces.filter(p=>p.realmId===realm.id&&p.landmass===0)
    const compact=members.length<25
    const mean:Point=[members.reduce((s,p)=>s+p.center[0],0)/members.length,members.reduce((s,p)=>s+p.center[1],0)/members.length]
    const capitals=world.settlements.filter(s=>s.type==='cidade')
    const candidates=members.flatMap(p=>[p.center,[p.center[0],p.center[1]+15] as Point,[p.center[0],p.center[1]-15] as Point,[p.center[0]-15,p.center[1]] as Point,[p.center[0]+15,p.center[1]] as Point])
    const cost=(p:Point)=> {
      const box={x:p[0],y:p[1],w:compact?114:158,h:52}
      const outside=[[-box.w*.45,0],[box.w*.45,0],[0,-20],[0,20]].filter(([dx,dy])=>!members.some(m=>m.polygons.some(poly=>inPolygon([p[0]+dx,p[1]+dy],poly)))).length
      return Math.hypot(p[0]-mean[0],p[1]-mean[1])+outside*60+boxes.filter(b=>overlap(b,box,8)).length*1000+capitals.filter(c=>overlap(box,{x:c.position[0],y:c.position[1]-8,w:66,h:43},8)).length*10000
    }
    const center=candidates.map(point=>({point,score:cost(point)})).sort((a,b)=>a.score-b.score)[0].point
    boxes.push({x:center[0],y:center[1],w:compact?114:158,h:52})
    return {realm,center,compact}
  })
}
export function blendHex(a:string,b:string,strength:number):string {
  const channel=(c:string,i:number)=>parseInt(c.slice(i,i+2),16)
  return '#'+[1,3,5].map(i=>Math.round(channel(a,i)*(1-strength)+channel(b,i)*strength).toString(16).padStart(2,'0')).join('')
}
export function mergedOutline(provinces:Province[]):Point[][] {
  if(!provinces.length)return []
  const polygons=provinces.flatMap(p=>p.polygons.map(poly=>[[...poly,poly[0]]]))
  return polygonClipping.union(polygons[0],...polygons.slice(1)).map(p=>p[0].map(p=>[p[0],p[1]] as Point))
}
/** Union of provinces as one SVG path, keeping holes (render with fill-rule evenodd). */
export function unionPath(provinces:Province[]):string {
  if(!provinces.length)return ''
  const polygons=provinces.flatMap(p=>p.polygons.map(poly=>[[...poly,poly[0]]] as [number,number][][]))
  return polygonClipping.union(polygons[0],...polygons.slice(1)).flatMap(polygon=>polygon.map(ring=>`M${ring.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`)).join(' ')
}
