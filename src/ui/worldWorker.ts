/// <reference lib="webworker" />
import { createGame } from '../engine/world'
// World generation (terrain, mesh, 252 provinces) runs here so the screen never freezes.
self.onmessage = () => { (self as unknown as Worker).postMessage(createGame()) }
