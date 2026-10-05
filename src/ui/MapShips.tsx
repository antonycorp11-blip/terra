import { useEffect, useMemo, useRef, useState } from 'react'
import type { Point } from '../engine/types'
import styles from './MapView.module.css'
export default function MapShips({routes}:{routes:Point[][]}) {
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const ships=useRef<(SVGGElement|null)[]>([])
  const measured=useMemo(()=>routes.map(route=>{
    const lengths=[0]
    for(let i=1;i<route.length;i++)lengths.push(lengths[i-1]+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]))
    return {route,lengths,total:lengths[lengths.length-1]}
  }),[routes])
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
  useEffect(()=>{
    let frame=0
    const start=performance.now()
    function draw(now:number){
      measured.forEach(({route,lengths,total},i)=>{
        const progress=reduced?.5:(((now-start)/1000+i*19)/(80+i*13))%1
        const distance=(progress<.5?progress*2:(1-progress)*2)*total
        const end=Math.max(1,lengths.findIndex(length=>length>=distance))
        const t=(distance-lengths[end-1])/(lengths[end]-lengths[end-1]||1),a=route[end-1],b=route[end]
        ships.current[i]?.setAttribute('transform',`translate(${a[0]+(b[0]-a[0])*t} ${a[1]+(b[1]-a[1])*t})`)
      })
      if(!reduced)frame=requestAnimationFrame(draw)
    }
    draw(start)
    return()=>cancelAnimationFrame(frame)
  },[measured,reduced])
  return <g pointerEvents="none" aria-label="Embarcações nas rotas marítimas" data-sailing={reduced?'paused':'moving'}>{routes.map((route,i)=><g key={i} data-ship={i} ref={element=>{ships.current[i]=element}} transform={`translate(${route[0].join(' ')})`}><g className={styles.ship}><path d="M-14 7q-9 2-17 0m17 4q-8 2-12 0" stroke="#aee6dc" strokeWidth=".8" opacity=".55" fill="none"/><ellipse cy="9" rx="12" ry="3" fill="#062f45" opacity=".3"/><use href="#art-ship" x="-18" y="-21" width="36" height="36"/></g></g>)}</g>
}
