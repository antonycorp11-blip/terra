import { Delaunay } from 'd3-delaunay'
import polygonClipping from 'polygon-clipping'
import { rng } from './random'
import type { Point } from './types'

export const MAP_WIDTH = 1100
export const MAP_HEIGHT = 720
export function inPolygon(point: Point, polygon: Point[]): boolean {
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j]
    if((a[1]>point[1])!==(b[1]>point[1]) && point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside
  }
  return inside
}
export const onLand=(point:Point,lands:Point[][])=>lands.some(land=>inPolygon(point,land))
export function polygonArea(polygon:Point[]):number {
  return Math.abs(polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2)
}
function coastDetail(points:Point[],seed:number):Point[] {
  const random=rng(seed)
  // Correlated displacement at three scales makes coves and rock outcrops.
  let result=points
  for(let pass=0;pass<3;pass++) {
    const next:Point[]=[]
    for(let i=0;i<result.length;i++) {
      const a=result[i],b=result[(i+1)%result.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
      const shift=(random()-.5)*Math.min(15,length*.38)
      next.push(a,[(a[0]+b[0])/2-dy/length*shift,(a[1]+b[1])/2+dx/length*shift])
    }
    result=next
  }
  return result
}
export function createLand(seed:number):Point[] {
  return coastDetail([
    [155,203],[179,163],[237,146],[272,111],[310,113],[329,64],[370,49],[397,82],
    [452,102],[475,77],[509,94],[530,143],[555,129],[568,80],[617,68],[653,100],
    [701,87],[756,106],[793,66],[838,76],[865,121],[916,119],[946,154],[981,179],
    [969,219],[1011,244],[1023,289],[991,324],[1019,362],[980,396],[1006,437],
    [969,465],[981,510],[950,534],[942,570],[899,592],[885,628],[837,665],[810,641],
    [831,601],[802,566],[818,526],[781,494],[752,476],[767,441],[799,413],
    [782,376],[741,365],[718,330],[675,316],[631,334],[598,331],[565,368],[572,407],
    [605,441],[577,471],[542,479],[531,523],[502,543],[474,592],[451,607],[432,572],
    [412,548],[389,573],[363,616],[325,638],[300,624],[285,660],[253,647],[239,608],
    [202,606],[179,572],[195,538],[236,514],[218,481],[181,470],[164,442],[120,434],
    [109,401],[144,379],[158,344],[135,307],[150,276],[123,245]
  ],seed^0xa24b)
}
export function createLandmasses(seed:number):Point[][] {
  const random=rng(seed^0x6471)
  const islands:[number,number,number,number][]=[
    [84,184,19,31],[95,256,14,18],[60,333,25,19],[67,404,17,26],[92,484,21,24],
    [134,537,16,22],[140,610,28,15],[206,664,14,20],[330,680,18,11],
    [649,423,25,37],[705,493,20,26],[651,554,31,20],[725,613,18,32],
    [1036,479,15,27],[1014,566,21,15],[955,640,27,21]
  ]
  return [createLand(seed),...islands.map(([x,y,rx,ry],i)=>coastDetail(Array.from({length:12},(_,j)=> {
    const angle=j/12*Math.PI*2,r=.72+random()*.32
    return [x+Math.cos(angle)*rx*r,y+Math.sin(angle)*ry*r] as Point
  }),seed+i*171))]
}
export interface GeoCell { center:Point; polygon:Point[]; polygons:Point[][]; landmass:number; neighborIndexes:number[] }
export function createCells(seed:number,lands:Point[][],count=252):GeoCell[] {
  const random=rng(seed^0x3179),points:Point[]=[]
  const mainlandCount=count-lands.length+1
  for(let attempts=0;points.length<mainlandCount && attempts<200000;attempts++) {
    const point:Point=[80+random()*960,45+random()*630]
    if(inPolygon(point,lands[0]) && !points.some(p=>Math.hypot(point[0]-p[0],point[1]-p[1])<17)) points.push(point)
  }
  if(points.length!==mainlandCount) throw new Error('Falha ao distribuir províncias')
  const delaunay=Delaunay.from(points),voronoi=delaunay.voronoi([0,0,MAP_WIDTH,MAP_HEIGHT])
  const cells:GeoCell[]=points.map((center,index)=>{
    const cell=voronoi.cellPolygon(index)!
    const clipped=polygonClipping.intersection([[...lands[0],lands[0][0]]],[Array.from(cell,p=>[p[0],p[1]] as Point)])
    const polygons=clipped.map(p=>p[0].slice(0,-1).map(p=>[p[0],p[1]] as Point)).sort((a,b)=>polygonArea(b)-polygonArea(a))
    return {center,polygon:polygons.find(p=>inPolygon(center,p))||polygons[0],polygons,landmass:0,neighborIndexes:[...delaunay.neighbors(index)]}
  })
  lands.slice(1).forEach((polygon,i)=> {
    const average:Point=[polygon.reduce((s,p)=>s+p[0],0)/polygon.length,polygon.reduce((s,p)=>s+p[1],0)/polygon.length]
    cells.push({center:average,polygon,polygons:[polygon],landmass:i+1,neighborIndexes:[]})
  })
  return cells
}
export function pointInProvince(center:Point,polygon:Point[]):Point{return inPolygon(center,polygon)?center:polygon[0]}
