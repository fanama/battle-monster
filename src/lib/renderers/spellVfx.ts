/**
 * Effets de sort 3D — module **pur** (aucune dépendance WebGL, aucune
 * dépendance DOM : exécutable tel quel sous Bun pour les tests).
 *
 * Il porte tout ce qui décide de l'allure d'une attaque à distance :
 *  1. la **palette élémentaire** des effets (cœur, lueur, éclats) et les
 *     réglages de trajectoire propres à chaque type — un seul projectile,
 *     décliné par élément ;
 *  2. le **routage d'une capacité** vers l'une des trois familles d'animation
 *     (`attackFamily`), partagé avec `MonsterDisplayer` : l'effet 3D et la pose
 *     articulée ne peuvent plus diverger ;
 *  3. les **ancrages écran** (départ sur la main avant, impact sur le buste)
 *     calculés depuis les rectangles DOM des combattants ;
 *  4. les **échantillonneurs d'animation** (vol, gerbe d'impact, canalisation) ;
 *  5. les **maillages** basse définition et la **matrice orthographique**.
 *
 * `SpellVfxLayer.ts` ne fait ensuite que téléverser ces maillages et jouer ces
 * échantillons : géométrie et cadencement restent testables sans GPU.
 */

import {
  addSphere,
  mat4Perspective,
  type BodyPartMesh,
  type MonsterType,
} from './monsterRig';

// ---------------------------------------------------------------------------
// Palette élémentaire des effets
// ---------------------------------------------------------------------------

/**
 * Réglages visuels d'un élément. Les couleurs sont **plus lumineuses** que
 * celles du bestiaire (`ELEMENT_COLORS`) : la couche d'effets est additive, un
 * sort doit rayonner comme une source de lumière, pas comme une surface.
 */
export interface ElementVfx {
  /** Couleur du cœur du projectile. */
  core: [number, number, number];
  /** Lueur additive (halo, teinte d'impact). */
  glow: [number, number, number];
  /** Éclats : traînée et gerbe d'impact. */
  spark: [number, number, number];
  /** Bosse verticale de la trajectoire, en fraction de la base d'arc. */
  arc: number;
  /** Serpentement latéral (0 = trajectoire propre). */
  wobble: number;
  /** Tours effectués sur soi pendant le vol. */
  spin: number;
  /** Nombre d'éclats de traînée. */
  trail: number;
  /** Échelle relative du projectile (roche lourde, éclair fin). */
  size: number;
}

export const ELEMENT_VFX: Record<MonsterType, ElementVfx> = {
  fire: {
    core: [1.0, 0.72, 0.25],
    glow: [1.0, 0.34, 0.06],
    spark: [1.0, 0.86, 0.45],
    arc: 0.3,
    wobble: 0.02,
    spin: 2.0,
    trail: 7,
    size: 1.05,
  },
  water: {
    core: [0.45, 0.85, 1.0],
    glow: [0.05, 0.5, 1.0],
    spark: [0.75, 0.95, 1.0],
    arc: 0.24,
    wobble: 0.05,
    spin: 1.4,
    trail: 6,
    size: 1.0,
  },
  grass: {
    core: [0.7, 1.0, 0.45],
    glow: [0.15, 0.75, 0.25],
    spark: [0.9, 1.0, 0.7],
    arc: 0.34,
    wobble: 0.1,
    spin: 3.2,
    trail: 8,
    size: 0.95,
  },
  electric: {
    core: [1.0, 0.95, 0.5],
    glow: [1.0, 0.85, 0.1],
    spark: [1.0, 1.0, 0.85],
    arc: 0.16,
    wobble: 0.16,
    spin: 0.8,
    trail: 9,
    size: 0.85,
  },
  rock: {
    core: [0.85, 0.78, 0.68],
    glow: [0.55, 0.42, 0.3],
    spark: [0.95, 0.88, 0.72],
    arc: 0.42,
    wobble: 0.01,
    spin: 1.0,
    trail: 5,
    size: 1.35,
  },
  normal: {
    core: [0.95, 0.95, 1.0],
    glow: [0.75, 0.8, 0.95],
    spark: [1.0, 1.0, 1.0],
    arc: 0.22,
    wobble: 0.03,
    spin: 1.6,
    trail: 6,
    size: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Cadencement
// ---------------------------------------------------------------------------

/**
 * Cadence d'un sort à distance, calée sur l'action articulée `ranged`
 * (720 ms) et sur `ANIMATION_END_DELAY` du store (950 ms : la durée pendant
 * laquelle `isAttacking` reste vrai). La somme doit **tenir dans** ce délai.
 */
export const CAST_LEAD_MS = 240;
export const FLIGHT_MS = 400;
export const IMPACT_MS = 300;
/** Durée affichée d'une canalisation (soin / buff) — action `channel` = 900 ms. */
export const CHANNEL_MS = 900;

/** Base de la bosse de trajectoire (px) — un lancer de 0,3 fait ~57 px. */
export const ARC_BASE_PX = 190;
/** Décalage en profondeur (px) au sommet du vol : le sort passe devant la scène. */
export const FLIGHT_DEPTH_PX = 72;
/** Rayon du cœur du projectile (px). */
export const ORB_BASE_PX = 11;
/** Étalement de la gerbe d'impact (px) pour un rayon unitaire. */
export const IMPACT_BASE_PX = 46;
/** Rayon du cordon de canalisation (px). */
export const COLUMN_BASE_PX = 26;
/** Hauteur de la colonne de canalisation (px). */
export const COLUMN_HEIGHT_PX = 96;

// ---------------------------------------------------------------------------
// Routage d'une capacité
// ---------------------------------------------------------------------------

/** Les trois familles d'animation d'un coup (mêmes clés que `MonsterDisplayer`). */
export type AttackFamily = 'melee' | 'ranged' | 'utility';

/**
 * Famille d'animation d'une capacité — **source de vérité unique**, partagée
 * par la pose articulée (`MonsterDisplayer`) et par la couche d'effets 3D :
 *  - `utility` : soin ou amplification (aucune attaque, `power === 0`) ;
 *  - `melee`   : attaque physique, charge au corps à corps ;
 *  - `ranged`  : attaque magique, le sort part du lanceur (projectile 3D).
 *
 * Le paramètre est structurel (`power` + `isPhysical`) pour que le module reste
 * indépendant du domaine : un `Move` y satisfait sans import.
 */
export function attackFamily(move: {
  power: number;
  isPhysical: boolean;
}): AttackFamily {
  if (move.power === 0) return 'utility';
  return move.isPhysical ? 'melee' : 'ranged';
}

// ---------------------------------------------------------------------------
// Ancrages écran
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

/** Rectangle en **repère arène**, origine en bas à gauche (comme WebGL). */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Convertit un rectangle DOM (origine **haut-gauche**, comme
 * `getBoundingClientRect`) en repère arène (origine **bas-gauche**, y vers le
 * haut). Le rectangle fourni doit déjà être relatif à l'arène.
 */
export function toArenaRect(
  dom: Rect,
  arena: { width: number; height: number },
): Rect {
  return {
    left: dom.left,
    top: arena.height - (dom.top + dom.height),
    width: dom.width,
    height: dom.height,
  };
}

/**
 * Point de départ du sort : la **main avant** du lanceur (côté adversaire),
 * à hauteur de garde. Le rig n'expose pas la position des articulations : on se
 * cale sur le rectangle écran du combattant, ce qui reste stable entre les
 * tailles d'arène et les points de rupture.
 */
export function casterMuzzle(rect: Rect, isPlayer: boolean): Vec2 {
  return {
    x: rect.left + rect.width * (isPlayer ? 0.72 : 0.28),
    y: rect.top + rect.height * 0.52,
  };
}

/** Point d'arrivée : le **buste** de la cible, très légèrement sous le centre. */
export function targetChest(rect: Rect): Vec2 {
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.47,
  };
}

// ---------------------------------------------------------------------------
// Échantillonneurs d'animation
// ---------------------------------------------------------------------------

export function clamp01(t: number): number {
  // `!(t > 0)` est vrai pour un négatif **et pour NaN** : une valeur aberrante
  // retombe sur 0 au lieu de contaminer toute la géométrie du sort.
  if (!(t > 0)) return 0;
  return t < 1 ? t : 1;
}

/** Interpolation douce (smoothstep) — départ mou, arrivée franche. */
export function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

export interface FlightSample {
  x: number;
  y: number;
  z: number;
  scale: number;
  spin: number;
  /** Opacité du projectile (fondu d'entrée, dissipation sur un raté). */
  alpha: number;
}

/**
 * Position du projectile le long de sa trajectoire, `t ∈ [0..1]` étant la
 * fraction du **vol** (le temps d'armement est géré par le renderer).
 *
 * La trajectoire est une **courbe bombée** qui s'éloigne du sol, avance vers la
 * caméra (`z`) et grossit au passage : c'est ce qui donne la profondeur, la
 * projection de la couche restant orthographique (donc parfaitement calée sur
 * les positions écran des combattants).
 *
 * `dissipate` : le coup est manqué — le sort se résout avant la cible (fondu
 * et rétraction) au lieu d'exploser dessus.
 */
export function sampleFlight(
  from: Vec2,
  to: Vec2,
  t: number,
  vfx: ElementVfx,
  dissipate = false,
): FlightSample {
  const tc = clamp01(t);
  const eased = smoothstep(tc);
  const swell = Math.sin(Math.PI * tc);

  const x =
    from.x +
    (to.x - from.x) * eased +
    Math.sin(tc * Math.PI * 4) * vfx.wobble * 60 * swell;
  const y = from.y + (to.y - from.y) * eased + swell * vfx.arc * ARC_BASE_PX;
  const z = swell * FLIGHT_DEPTH_PX;

  const fadeIn = smoothstep(tc / 0.12);
  const fadeOut = dissipate
    ? 1 - smoothstep((tc - 0.68) / 0.32)
    : 1;
  const shrink = dissipate ? 1 - 0.45 * smoothstep((tc - 0.68) / 0.32) : 1;

  return {
    x,
    y,
    z,
    scale: vfx.size * (1 + swell * 0.28) * shrink,
    spin: vfx.spin * Math.PI * 2 * tc,
    alpha: fadeIn * fadeOut,
  };
}

export interface ImpactSample {
  /** Éclair bref au point d'impact (0 → 1 → 0). */
  flash: number;
  /** Rayon de l'anneau de choc, en unités de `IMPACT_BASE_PX`. */
  ringRadius: number;
  ringAlpha: number;
  /** Étalement des éclats, en unités de `IMPACT_BASE_PX`. */
  sparkSpread: number;
  sparkAlpha: number;
  /** Nombre d'éclats projetés. */
  sparkCount: number;
}

/**
 * Gerbe d'impact : anneau de choc qui s'ouvre, éclats qui fusent et éclair
 * central. `strength` suit le critique (1 = normal, > 1 = critique).
 */
export function sampleImpact(t: number, strength = 1): ImpactSample {
  const tc = clamp01(t);
  // Force éc rêtée **et** bornée aux valeurs finies : un critique absent ou
  // aberrant doit produire une gerbe normale, jamais une gerbe NaN.
  const safe = Number.isFinite(strength) ? strength : 1;
  const s = Math.max(0.5, Math.min(1.6, safe));
  return {
    flash: Math.max(0, 1 - tc * 2.8),
    ringRadius: (0.2 + tc * 1.6) * s,
    ringAlpha: Math.pow(Math.max(0, 1 - tc), 1.4),
    sparkSpread: tc * 2.6 * s,
    sparkAlpha: Math.max(0, 1 - tc * tc),
    sparkCount: Math.round(8 + 6 * s),
  };
}

export interface ChannelSample {
  /** Montée du cordon le long du corps (0 → 1). */
  rise: number;
  alpha: number;
  /** Rayon du cordon, en unités de `COLUMN_BASE_PX`. */
  radius: number;
  spin: number;
}

/** Canalisation (soin / buff) : un cordon élémentaire qui monte sur le corps. */
export function sampleChannel(t: number): ChannelSample {
  const tc = clamp01(t);
  const swell = Math.sin(Math.PI * tc);
  return {
    rise: tc,
    alpha: Math.pow(swell, 0.7),
    radius: 0.5 + 0.45 * swell,
    spin: tc * Math.PI * 2,
  };
}

// ---------------------------------------------------------------------------
// Caméra : perspective douce calée sur les pixels de l'arène
// ---------------------------------------------------------------------------

/**
 * Distance de la caméra au **plan écran** (px).
 *
 * La couche est un overlay : un sort doit partir exactement de la main du
 * lanceur et frapper exactement le buste de la cible. On garde donc un repère
 * où **le plan `z = 0` se projette pixel pour pixel** sur l'arène : un point du
 * monde vaut `(x, y)` en pixels CSS. La perspective — volontairement douce, la
 * caméra recule de 560 px — ne sert qu'à donner du relief : un objet qui
 * s'approche (`z` positif) grossit et s'écarte du centre, comme il le ferait
 * dans une vraie scène 3D.
 */
export const SCREEN_DISTANCE_PX = 560;

/**
 * Projection de la couche pour une arène de `width` × `height` pixels CSS.
 * Le champ de vision est dérivé de la hauteur pour que le plan écran couvre
 * exactement l'arène : au bord de l'arène, `z = 0` tombe pile sur NDC ±1.
 */
export function vfxProjection(width: number, height: number): Float32Array {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const fov = 2 * Math.atan(h / 2 / SCREEN_DISTANCE_PX);
  return mat4Perspective(fov, w / h, 1, SCREEN_DISTANCE_PX * 3);
}

/**
 * Place un point du repère arène (origine bas-gauche, y vers le haut) dans la
 * scène : le centre de l'arène devient l'axe optique, `z = 0` reste le plan
 * écran, `z` positif avance vers la caméra.
 */
export function vfxAnchor(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): { x: number; y: number; z: number } {
  return {
    x: x - width / 2,
    y: y - height / 2,
    z: z - SCREEN_DISTANCE_PX,
  };
}

// ---------------------------------------------------------------------------
// Maillages
// ---------------------------------------------------------------------------

/** Densité de maillage des effets (allégée sur mobile, comme le bestiaire). */
export type VfxQuality = 'high' | 'low';

const WHITE: [number, number, number] = [1, 1, 1];

/**
 * Note : `addSphere` du rig est réutilisé volontairement — l'enroulement des
 * faces et l'orientation des normales y sont déjà verrouillés par les tests.
 * Les couleurs ne servent pas ici (la teinte vient d'un uniforme du shader).
 */
function sphereMesh(bands: number): BodyPartMesh {
  const mesh: BodyPartMesh = { positions: [], normals: [], colors: [] };
  addSphere(mesh, 0, 0, 0, 1, 1, 1, WHITE, bands, bands);
  return mesh;
}

/** Cœur du projectile : sphère unitaire (le renderer la met à l'échelle). */
export function buildOrbMesh(quality: VfxQuality = 'high'): BodyPartMesh {
  return sphereMesh(quality === 'low' ? 8 : 12);
}

/** Coque de lueur : sphère plus grossière, jouée en halo additif. */
export function buildGlowMesh(quality: VfxQuality = 'high'): BodyPartMesh {
  return sphereMesh(quality === 'low' ? 6 : 9);
}

/**
 * Éclat : octaèdre de rayon 1 — six sommets, huit faces. Les facettes nettes
 * lisent comme des débris élémentaires, pour un coût minime.
 */
export function buildShardMesh(): BodyPartMesh {
  const mesh: BodyPartMesh = { positions: [], normals: [], colors: [] };
  const v: Array<[number, number, number]> = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ];
  const faces: Array<[number, number, number]> = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [5, 2, 1],
    [5, 3, 2],
    [5, 4, 3],
    [5, 1, 4],
  ];
  for (const face of faces) {
    for (const index of face) {
      const p = v[index]!;
      mesh.positions.push(p[0], p[1], p[2]);
      mesh.normals.push(p[0], p[1], p[2]);
      mesh.colors.push(1, 1, 1);
    }
  }
  return mesh;
}

/**
 * Anneau de choc : couronne dans le plan XY, donc **toujours face caméra** (la
 * projection est orthographique) — c'est le comportement voulu d'une onde de
 * choc à l'écran.
 */
export function buildRingMesh(segments = 28): BodyPartMesh {
  const mesh: BodyPartMesh = { positions: [], normals: [], colors: [] };
  const inner = 0.72;
  const push = (radius: number, angle: number) => {
    mesh.positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    mesh.normals.push(0, 0, 1);
    mesh.colors.push(1, 1, 1);
  };
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    push(inner, a1);
    push(1, a1);
    push(1, a2);
    push(inner, a1);
    push(1, a2);
    push(inner, a2);
  }
  return mesh;
}
