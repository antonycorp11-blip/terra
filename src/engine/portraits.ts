import type { Race } from './mvpTypes'

/**
 * Full-body lord figures in public/assets/lords. The set is provisional (30 figures for a preview);
 * each figure is used by at most one character, and characters without one fall back to their crest.
 * `race` and `sex` describe the drawing so the character assigned to it stays consistent.
 */
export interface PortraitAsset { file: string; race: Race; sex: 'f' | 'm' }
const F = (n: number, race: Race, sex: 'f' | 'm'): PortraitAsset => ({ file: `assets/lords/lord-${String(n).padStart(2, '0')}.webp`, race, sex })
export const PORTRAITS: PortraitAsset[] = [
  F(0, 'náveo', 'f'), F(1, 'náveo', 'm'), F(2, 'náveo', 'f'), F(3, 'náveo', 'm'), F(4, 'náveo', 'f'),
  F(5, 'náveo', 'm'), F(6, 'náveo', 'f'), F(7, 'náveo', 'f'), F(8, 'náveo', 'f'), F(9, 'náveo', 'm'),
  F(10, 'humano', 'f'), F(11, 'vitrânio', 'm'), F(12, 'humano', 'f'), F(13, 'humano', 'm'), F(14, 'aureno', 'f'),
  F(15, 'vitrânio', 'm'), F(16, 'humano', 'f'), F(17, 'humano', 'm'), F(18, 'vitrânio', 'f'), F(19, 'humano', 'f'),
  F(20, 'salmário', 'f'), F(21, 'salmário', 'm'), F(22, 'salmário', 'm'), F(23, 'salmário', 'f'), F(24, 'salmário', 'f'),
  F(25, 'salmário', 'f'), F(26, 'humano', 'm'), F(27, 'salmário', 'm'), F(28, 'salmário', 'f'), F(29, 'náveo', 'f'),
  F(30, 'humano', 'm'), F(31, 'humano', 'm'), F(34, 'humano', 'f'), F(36, 'humano', 'f'), F(38, 'humano', 'f'),
  F(40, 'humano', 'm'), F(42, 'humano', 'f'), F(44, 'humano', 'm'), F(46, 'humano', 'm'), F(47, 'humano', 'm'),
  F(50, 'aureno', 'f'), F(51, 'aureno', 'm'), F(52, 'aureno', 'f'), F(53, 'aureno', 'm'), F(54, 'aureno', 'f'),
  F(55, 'aureno', 'f'), F(56, 'aureno', 'm'), F(57, 'aureno', 'f'), F(58, 'aureno', 'm'), F(59, 'aureno', 'f'),
  F(60, 'humano', 'f'), F(61, 'humano', 'm'), F(62, 'humano', 'f'), F(63, 'humano', 'f'), F(64, 'humano', 'm'),
  F(65, 'humano', 'm'), F(66, 'humano', 'm'), F(67, 'humano', 'f'), F(68, 'humano', 'm'), F(69, 'humano', 'f'),
]
/** Figures reserved for authored characters (index into PORTRAITS). */
export const AUTHORED_PORTRAITS: Record<string, number> = {
  irian: 13, hadrin: 38, morvane: 20, quellan: 26, ardesh: 11, vasterre: 14, trevis: 10,
}
