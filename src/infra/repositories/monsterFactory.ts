import { MAX_MOVES, Monster } from '../../core/entities/Monster';
import type { MoveProvider } from '../../core/services/ports';
import type { MonsterType, Move } from '../../core/entities/Move';

export interface MonsterDefinition {
  id: string;
  name: string;
  type: MonsterType;
  level: number;
  image?: string;
  stats: {
    strength: number;
    speed: number;
    constitution: number;
    charisma: number;
    wisdom: number;
    instinct: number;
  };
}

/**
 * Archétypes de sauvages (réglage Dragon Quest) : chaque tirage instancie un
 * panel « signature », ou un panel portant une **identité** de combat —
 * la brute frappe fort, le statuteur contamine, le tank tient le coup.
 * Les boss restent toujours en panel signature (top-4).
 */
export type EnemyArchetype = 'signature' | 'brute' | 'statuteur' | 'tank';

/**
 * Score de valeur d'un move (miroir de `moveScore` dans `BattleController`) :
 * le niveau de déblocage pèse ×100, puis la puissance. Un sort de soin compte
 * via `healPower` (il a `power: 0`).
 */
function moveScore(move: Move): number {
  return move.level * 100 + move.power + (move.healPower ?? 0);
}

/**
 * Bonus de pondération : → **sélection par quotas**. Une simple pondération du
 * score est noyée par l'écart de palier (niveau×100, ~900+ à n9) : +90 ne
 * déloge jamais une frappe lourde, tous les panels venaient identiques. Ici,
 * chaque archétype **réserve des emplacements** de panel à son identité, le
 * reste se remplit au score (« signature » historique). La déduction côté IA
 * (`BattleController.archetypeOf`) lit exactement ces signatures :
 *  - brute : les 2 frappes physiques lourdes (power ≥ 85) ;
 *  - statuteur : les 3 meilleures capacités à statut ;
 *  - tank : le meilleur soin + le meilleur buff de stat.
 */
function selectPanel(
  eligibleMoves: Move[],
  archetype: EnemyArchetype,
  random: () => number,
): Move[] {
  const scored = eligibleMoves
    .map((move) => ({ move, score: moveScore(move), tie: random() }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie)
    .map((entry) => entry.move);

  const taken = new Set<string>();
  const panel: Move[] = [];
  const add = (move: Move) => {
    if (panel.length < MAX_MOVES && !taken.has(move.id)) {
      taken.add(move.id);
      panel.push(move);
    }
  };
  const reserve = (pool: Move[], count: number) => {
    scored.filter((move) => pool.includes(move)).slice(0, count).forEach(add);
  };

  switch (archetype) {
    case 'brute':
      reserve(
        scored.filter((move) => move.isPhysical && move.power >= 85),
        2,
      );
      break;
    case 'statuteur':
      reserve(scored.filter((move) => move.statusEffect), 3);
      break;
    case 'tank':
      reserve(scored.filter((move) => move.isHeal), 1);
      reserve(scored.filter((move) => move.statBoosts), 1);
      break;
    case 'signature':
    default:
      break;
  }
  for (const move of scored) add(move);
  return panel;
}

/**
 * Instancie un Monster à partir d'une définition : récupère les moves éligibles
 * (porte `MoveProvider` injecté), en garde `MAX_MOVES` selon l'archétype
 * (quotas d'identité, puis remplissage au score — cf. `selectPanel`), et
 * clone l'état de cooldown par instance.
 *
 * **Pourquoi « les plus forts » et non « 4 tirés au hasard »** : le tirage
 * aléatoire rendait la force d'un ennemi entièrement dépendante de sa chance.
 * Un ennemi ayant tiré les quatre meilleures capacités gagnait son duel, un
 * autre ayant tiré deux soins perdait contre le même champion — mesuré, cela
 * faisait osciller le taux de victoire de 5 % à 95 % à niveau égal. La
 * difficulté devenait du RNG non advertised. Les égalités de score sont
 * départagées au hasard (`random` injecté), donc deux monstres de même profil
 * restent malgré tout légèrement différents.
 */
export function createMonsterFromDefinition(
  def: MonsterDefinition,
  moveProvider: MoveProvider,
  random: () => number,
  opts: { archetype?: EnemyArchetype } = {},
): Monster {
  const eligibleMoves = moveProvider.getMovesForMonster({ type: def.type, level: def.level });
  const selectedMoves = selectPanel(eligibleMoves, opts.archetype ?? 'signature', random);

  return new Monster(
    def.id,
    def.name,
    def.type,
    def.level,
    def.stats.strength,
    def.stats.speed,
    def.stats.constitution,
    def.stats.charisma,
    def.stats.wisdom,
    def.stats.instinct,
    selectedMoves,
    def.image ?? ''
  );
}
