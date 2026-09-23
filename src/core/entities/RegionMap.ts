/**
 * Carte de région (roguelike) : le joueur avance couche par couche en
 * choisissant un nœud (combat / soin / boutique) parmi ceux disponibles.
 * Le boss de région n'est pas un nœud : il attend la fin de la dernière couche.
 */

import type { MonsterType } from './Move';

export type MapNodeType = 'combat' | 'heal' | 'shop';

export interface MapNode {
  id: string;
  site: MapNodeType;
  /** Index de la couche (rangée). */
  row: number;
  /** Index du nœud dans sa couche. */
  col: number;
  /** Type du monstre gardien du nœud (renseigné sur les nœuds combat). */
  enemyType?: MonsterType;
}

export interface RegionMap {
  /** Couches de nœuds, de la première (index 0) à la dernière. */
  layers: MapNode[][];
}

/** Nombre de colonnes d'une couche (plus de choix en progressant). */
function layerColCount(layer: number): number {
  return Math.min(4, 1 + layer);
}

/** Tire le type d'un nœud selon les proportions (combat fréquent, soin rare). */
function rollNodeType(random: () => number, row: number): MapNodeType {
  // Première couche : toujours un combat (introduction de la région).
  if (row === 0) return 'combat';
  const r = random();
  if (r < 0.6) return 'combat';
  if (r < 0.8) return 'heal';
  return 'shop';
}

/** Tire le type de monstre gardien parmi ceux de la région. */
function rollEnemyType(random: () => number, types: MonsterType[]): MonsterType {
  return types[Math.floor(random() * types.length)] ?? 'normal';
}

/** Mélange une copie du tableau (Fisher-Yates). */
function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Génère une carte aléatoire de `layers` couches (Slay-the-Spire-like).
 * `random` est injectable pour des tests déterministes (défaut : Math.random) ;
 * `types` liste les monstres possibles de la région (chaque nœud combat en
 * reçoit un au tirage — affiché sur la carte).
 * La première couche est toujours un combat ; les suivantes offrent combats,
 * soins et boutiques.
 */
export function generateRegionMap(
  layers: number,
  random: () => number = Math.random,
  types: MonsterType[] = ['normal']
): RegionMap {
  const result: RegionMap = { layers: [] };
  for (let row = 0; row < layers; row++) {
    const count = layerColCount(row);
    const nodes: MapNode[] = shuffle(
      Array.from({ length: count }, (_, c) => {
        const site = rollNodeType(random, row);
        return {
          id: `${row}-${c}`,
          site,
          enemyType: site === 'combat' ? rollEnemyType(random, types) : undefined,
          row,
          col: c,
        };
      }),
      random
    );
    result.layers.push(nodes);
  }
  return result;
}

/** Index de la dernière couche (ou -1 si la carte est vide). */
export function lastLayerIndex(map: RegionMap): number {
  return map.layers.length - 1;
}

/**
 * Nœud de la couche `layer` portant la colonne `col`.
 * Les couches sont **mélangées** (shuffle) : l'ordre du tableau ne correspond
 * PAS à l'identifiant `col` des nœuds, il faut donc chercher par `col`.
 */
export function nodeAtCol(map: RegionMap, layer: number, col: number): MapNode | undefined {
  return map.layers[layer]?.find(n => n.col === col);
}

/**
 * Deux nœuds de couches consécutives sont-ils reliés ?
 * Connectivité « ±1 colonne » (Slay the Spire) : pas de raccourci trop loin.
 */
export function areLinked(fromCol: number, toCol: number): boolean {
  return Math.abs(fromCol - toCol) <= 1;
}

/** Colonnes accessibles depuis `col` sur une couche suivante de `colCount` colonnes. */
export function reachableCols(col: number, colCount: number): number[] {
  return [col - 1, col, col + 1].filter(c => c >= 0 && c < colCount);
}