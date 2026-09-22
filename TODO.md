# TODO — Améliorations Monster Battle

Analyse du code existant (Svelte 5 + TS + Tailwind, architecture "clean-ish").
Légende : 🐛 bug / 🧹 technique / 🎮 gameplay / ✨ feature / 🧪 tests / 📋 divers

---

## 0. Moteur de combat migré vers les règles D&D — ✅ FAIT (2026-09)

Le moteur de combat a été réécrit pour suivre les règles de l'app `dnd` (`backend/` Go) :
- **Modificateur d'attribut** : `floor((stat - 10) / 2)` (`Monster.abilityModifier`).
- **CA (Classe d'Armure)** : `10 + mod(Vitesse)` (`Monster.getAC()`) — **l'esquive homebrew est supprimée**.
- **Jet d'attaque** : `1d20 + mod(stat) + Bonus` ≥ CA ; **20 naturel = critique toujours touché, 1 naturel = fumble** (`BattleEngine.resolveAttack`).
- **Dégâts** : physique `1dX(power) + mod(Force) + Bonus` (min 1) ; magique `Savoir(i) × 1.5` (crit → ×3) (`BattleEngine.rollDamage`).
- **PV max** : `Dé de Vie (par type) + mod(Constitution)`, mis à l'échelle par niveau (`Monster.calculateMaxHp`).
- **Soin** : règle potion `2d4 + mod(Constitution)`, plafonné au PV max (`isHeal`).
- **Buff** : bonus **additif et permanent** sur une stat (`StatBoost { stat, value }`), les PV max suivent une constitution buffée (`Monster.boostStat`).
- Multiplicateurs temporaires `attackMultiplier`/`defenseMultiplier`/`speedMultiplier` et `resetModifiers()` supprimés.

Vérifié : `bun run check` → 0 erreurs / 0 warning, `bun run build` OK.

---

## 1. Bugs à corriger — ✅ CORRIGÉS

### 1.1 ✅ Esquive homebrew supprimée (remplacée par la CA d20)
La formule d'esquive cassée (`0.3 + Math.max(0.1, …)` → 40 % constant) est retirée. Désormais la défense passe par la **CA = 10 + mod(Vitesse)** et le jet `1d20` classique (règle D&D).

### 1.2 ✅ Multiplicateurs temporaires supprimés
`resetModifiers()`/`applyBoosts()` (multiplicateurs) remplacés par des **buffs additifs permanents** (`boostStat`) conformes à la règle de buff D&D. Entre deux combats, seuls les cooldowns sont réinitialisés.

### 1.3 ✅ Cooldowns réinitialisés entre combats
`battleStore.ts` — `_resetBattleModifiers()` remet tous les `coolDown` à 0 avant chaque combat.

### 1.4 ✅ L'IA ennemie n'attaque plus avec un move en recharge
`battleStore.ts:_selectRandomMove` — filtre les moves `coolDown === 0` avant le tirage (fallback sur la liste complète si tout est en recharge).

### 1.5 ✅ `lastMove` désormais transmis — animation utilitaire fonctionnelle
Le store expose `playerLastMove` / `enemyLastMove` (définis à chaque tour, reset entre combats) et `App.svelte` les passe à `MonsterDisplayer`. Soins/buffs déclenchent le saut (`jump-animation`), les dégâts la ruée.

### 1.6 ✅ `console.log` de debug supprimé
`BattleEngine.ts` — retiré.

### 1.7 ✅ Warning svelte-check corrigé
`MoveDisplayer.svelte` — self-closing `<div />` remplacé par `<div></div>`.

---

## 2. Hygiène & fiabilité du code

- [x] ✅ Supprimer les `import ... from "...Move.ts"` / `"...Monster.ts"` (extension `.ts` superflue) dans `MoveRepositories.ts:1-2`.
- [x] ✅ Remplacer le cast `as any` de `MonsterRepositories.ts:68` (on attend un `Monster` partiel) par un type dédié `{ type, level }` — désormais `Pick<Monster, 'type' | 'level'>`.
- [x] ✅ Supprimer l'interface `BattleState` dupliquée et divergente dans `core/entities/BattleState.ts` ; la version du store (`battleStore.ts:10`) est la seule utilisée. Unifier dans `core/entities` — fait via la refactor §3 (`RunState` + `BattleState` unifiés).
- [x] ✅ Tableau de type-effectiveness extrait en constante module (`TYPE_MULTIPLIER` dans `BattleEngine.ts`).
- [x] ✅ Remplacer les magic numbers `2000`/`500` ms (`battleStore.ts`) par des constantes nommées — désormais `ENEMY_TURN_DELAY = 1200`, `ANIMATION_END_DELAY = 550`, `FEEDBACK_CLEAR_DELAY = 1250`.
- [ ] Les `setTimeout` du store ne sont ni annulés ni nettoyés : risque de course si `reset()`/`nextBattle()` survient pendant une animation ou après unmount. Utiliser un gestionnaire annulable (`clearTimeout` sur reset) ou une file d'animation. *(cf. §5 — les timers de feedback sont désormais annulés par camp, mais pas les replays `_enemyLater`/`_playerLater`.)*
- [ ] Le `Monster.levelUp()` remplace la liste de moves complète du joueur (`battleStore.ts:133-135`) : perd l'état des cooldowns et re-mélange les attaques au hasard. Remplacer par « apprentissage d'un move » choisi, en conservant les moves existants. *(hors périmètre §5 — UI d'apprentissage toujours à faire.)*
- [x] ✅ Le store mute `state.isAttacking`/`isEnemyAttacking` dans `store.update` — résolu par la refactor §5 : les replays de round (`_enemyLater` / `_playerLater`) construisent des états immuables, seules les mutations de monstres restent côté controller.
- [ ] Retirer clean-up `Counter.svelte` et `src/assets/svelte.svg` (restes du template).

---

## 3. Architecture (Clean Architecture) — ✅ FAIT (2026-09)

Refactor Clean Architecture avec injection de dépendance (composition root + ports) :

- [x] ✅ **`BattleEngine` séparé en 3 étages** (`core/services/BattleEngine.ts`) :
  1. **résolution pure** — `resolveAttack` (d20/CA/critique/fumble), `rollDamage`, `typeMultiplier`, `computeFinalDamage`, `calculateDamage`, `calculateExperienceGained` ;
  2. **application d'effets** (mutation des monstres) — `applyHeal`, `applyBuff`, `manageCooldowns`, `applyDefeatRewards` ; `Monster` gagne `heal()` / `resetCooldowns()` ;
  3. **orchestration** — `executeTurn` → `{ logs, feedback }`.
  Le générateur de dés (`Dice`) est **injectable** pour des tests déterministes.
- [x] ✅ **`BattleController` extrait** (`core/services/BattleController.ts`) : IA ennemie (`selectEnemyMove`), tour (`playTurn`), spawn des ennemis (`spawnNextEnemy`), progression de run (`handlePlayerVictory`, `applyRelic`, `grantRelic`). **Testable sans Svelte** — ses dépendances (engine, ports, `random`) sont injectées.
- [x] ✅ **Store allégé** (`battleStore.ts`) : ne garde que l'état (`Writable`), les timers d'animation et la liaison UI ; il délègue toute la logique au contrôleur.
- [x] ✅ **`BattleState` / `RunState` unifiés** dans `core/entities/BattleState.ts` (doublon store/entities éliminé, cf. §2).
- [x] ✅ **Séparation `MonsterRepositories` → `StarterCatalog` + `RandomEnemyFactory`** : starters fixes vs génération procédurale (+ boss) ; instanciation commune dans `monsterFactory.ts` ; cast `as any` supprimé (signature `Pick<Monster, 'type' | 'level'>`).
- [x] ✅ **Code mort supprimé** : `getStarter()` / `getMonsterById()`. `getAllMonsters()` (3 monstres aléatoires, sémantique trompeuse) remplacé par `StarterCatalog.getAll()` qui renvoie bien **les 3 starters définis**.
- [x] ✅ **Injection de dépendance** : composition root `src/lib/container.ts` (seul endroit qui instancie/câble les concrètes), ports `core/services/ports.ts` (`MoveProvider`, `EnemyFactory`) ; store et contrôleur reçoivent leurs dépendances par constructeur.
- [x] ✅ Helpers de reliques extraits (`relicDamagePercent` / `relicLifestealPercent` / `relicHealStartPercent`, `rollRelicOffers(count, random)`).
- ✅ Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK.

---

## 4. Tests (manque total)

- [ ] Ajouter un framework de test (Vitest) + config dans les scripts.
- [ ] Tests unitaires `BattleEngine` : `resolveAttack` (d20/CA, 20 = critique, 1 = fumble), `rollDamage` (physique/magique, min 1), multiplicateur de type, `calculateDamage`, cooldown, heal `2d4 + mod(CON)`, buff additif, exp/level-up multiple.
- [ ] Tests `Monster` : `abilityModifier`, `getAC`, `calculateMaxHp`, `gainExperience`, `levelUp`, `takeDamage`, `boostStat` (dont constitution → PV max).
- [ ] Tests forfaits `MonsterRepository` / `MoveRepository` : moves éligibles par type/niveau, génération bornée, unicité des IDs.
- [ ] Tests du store : `attack`, `nextBattle`, `selectMonster`, `reset`, détermination du winner. (Mock des timers.)

---

## 5. Gameplay & balance — post-migration d20 — ✅ SLOT BALANCE+IA+INIT+XP+UI FAIT (2026-09)

Périmètre validé : **rebalance moteur + IA + initiative + XP par rang + indicateurs UI**.
Les items « grosse feature » (armure/loot, apprentissage de moves, potions/banque, revanche, variété visuelle) restent **hors périmètre actuel** (voir cases non cochées).

- [x] ✅ **Rebalance du moteur d20** (cf. §0) :
  - **PV** : facteur `1.8 + level × 0.85` (`Monster.calculateMaxHp`). Les 3 starters ~48–72 PV au niveau 5.
  - **Physique** : `powerToDie` recalibré vers le haut (`<40→6, <60→8, <80→10, <110→12, sinon 20`) + **bonus plat `floor(power/10)`** ajouté aux dégâts ; desc des logs `NdS+flat` (`BattleEngine.powerToDie` / `movePowerFlat` / `rollDamage`).
  - **Magie** : multiplicateur de type **dampé** — physique ×2/×0.5, magie ×1.5/×0.67 (`effectiveiveness.ts`, `typeEffectiveness(moveType, defenderType, isPhysical)`). `BattleEngine.typeMultiplier(moveType, defenderType, isPhysical = true)` délègue à cette table, **partagée avec l'IA et l'UI** (source unique).
- [x] ✅ **Initiative** : règle D&D `1d20 + mod(Vitesse)` par camp (égalité → le joueur). `BattleController.resolveRound({ player, enemy, move, … })` résout le round COMPLET dans l'ordre (`{ playerFirst, playerInitiative, enemyInitiative, playerTurn, enemyTurn, winner, logs }`) ; le tour du perdant est annulé s'il est déjà K.O. Un même `Dice` est partagé entre engine et controller (`container.ts`).
- [ ] **Armure / objets** : règle D&D CA = `10 + mod(Vitesse) + BonusArmure` — introduire un slot armure et des loots (`BonusArmure`), et des armes avec `BonusDégâts` / `DesDégâts`. *(hors périmètre actuel — le champ `Monster.armorBonus` et les reliques AC existent déjà.)*
- [x] ✅ **Affichage CA et types** : CA affichée (`MonsterDisplayer`), badges de types sur les moves, **indicateur « ⚔ Super eff. / 🛡 Peu eff. »** sur chaque move en combat (`MoveDisplayer` reçoit `targetType` = type de l'ennemi, `App.svelte`).
- [x] ✅ **IA ennemie** : `BattleController.selectEnemyMove(moves, actor, target)` — respecte les cooldowns, **évite les soins à PV pleins**, **privilégie les moves super-efficaces** (table de types).
- [ ] **Apprentissage de moves** : UI de choix (« apprendre X / oublier Y ») plutôt que remplacement aléatoire. *(hors périmètre actuel.)*
- [ ] **Objets / soins en combat** : potions limitées (règle potion `2d4 + mod CON`), changement de monstre en combat (banque de 2-3 monstres). *(hors périmètre actuel.)*
- [ ] **Variété visuelle** : sprites placeholder dupliqués — `grass` et `normal` utilisent l'image fire (`RandomEnemyFactory.ts` IMAGE_MAP). 1 sprite original par type minimum. *(hors périmètre actuel.)*
- [ ] **Mort du monstre joueur** : reset complet (= perte de progression) ; prévoir éventuellement un « centre de soins / revanche » moins frustrant. *(hors périmètre actuel — permadeath immédiat conservé.)*
- [x] ✅ **XP par rang** : `Monster.rank: 'normal' | 'boss'` ; `createBoss` pose `rank='boss'` ; `calculateExperienceGained` × `RANK_XP_MULTIPLIER { normal: 1, boss: 1.5 }` (niveau d20 : 10/20/50). Affiche le bonus quand l'ennemi est rangé.
- [x] ✅ **Stats du monstre** : panneau **repliable** dans `MonsterDisplayer` (les 6 stats + modificateurs + CA), libellés centralisés dans `STAT_LABELS` (`core/entities/Move.ts`, partagé avec l'UI).
- [x] ✅ Bonus : le store refactoré autour des **rounds** (`battleStore.attack` rejoue les deux actions dans l'ordre d'initiative avec timers ; feedbacks nettoyés **par camp**, plus de course de `_clearFeedback`).
- ✅ Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test déterministe des règles (HP, d10+flat, magie dampée, initiative/KO, IA, XP boss) OK.

---

## 6. Feature : persistance

- [ ] Sauvegarde de progression -- localStorage (monstre joueur, level, exp, numéro de combat). Le store est déjà sérialisable.
- [ ] Écran titre / menu (nouvelle partie, continuer).
- [ ] Mélange d'ambiance : musique (Web Audio simple), bruitages attaque/soin/KO. (Le **feedback visuel** — flash, shake, nombres flottants — est ✅ fait, voir §7.0.)

---

## 7. UI/UX & accessibilité

### 7.0 ✅ Combats plus dynamiques — FAIT (2026-09)
- `BattleEngine.executeTurn` renvoie désormais un `TurnResult { logs, feedback }` avec un `CombatFeedback` structuré (`damage` / `heal` / `buff` / `fumble` / `miss` / `none`, `damage`, `isCrit`).
- Le store (`battleStore.ts`) expose `playerFeedback` / `enemyFeedback` (auto-effacés après `FEEDBACK_CLEAR_DELAY`) et les transmet à `MonsterDisplayer`.
- `MonsterDisplayer.svelte` (SVG conservés) : **shake** (+ variante critique), **flash rouge** sur le défaut touché (flash blanc-rouge en critique), **nombres flottants** (-N dégâts, +N soin/buff, FUMBLE, RATÉ, critique en or), lunge d'attaque avec léger overshoot (`cubic-bezier(0.34, 1.3, 0.64, 1)`).
- `HealthBar.svelte` : **traînée de dégâts rouge** retardée (réaction ~250 ms, rattrapage 700 ms après 550 ms), **pulsation rouge** quand PV ≤ 25 %, transition réactive sur la barre principale.
- `MoveDisplayer.svelte` : pastille + badge de type, hover `translateY` + `active:scale-95`, halo « ⚡ PRÊT » pulsant, libellé Dégâts/Soin/Buff, barre de cooldown intégrée.
- Rythme accéléré : délai de tour ennemi `2000 → 1200 ms`.
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK.

### À faire
- [ ] Langue mixte FR/EN (logs en français, boutons « Summon Champion », « Engage », « Select Entity »…) → définir une locale unique.
- [ ] `MonsterSelector` : `<option value={monster}>` avec objets (les starters sont désormais stables via `StarterCatalog`, mais instables en identité à chaque instanciation). Sélectionner par `id` (string) et garder les monstres en mémoire.
- [ ] `option value={undefined} selected` peut se comporter bizarrement (placeholder jamais désélectionné) → gérer un état null explicite.
- [ ] Accessibilité : `aria-disabled`/`aria-live` pour le journal de combat, focus sur le premier move actif, contrastes.
- [ ] Layout : le sélecteur de monstre en overlay `absolute -bottom-24` (`App.svelte:81`) est fragile selon l'écran. Intégrer dans le flux au lieu du positionnement absolu.
- [ ] Index.html : `lang="fr"`, titre explicite, favicon de l'app (au lieu de vite.svg).

---

## 8. DX & repo

- [x] ✅ `README.md` documenté (archi, scripts, gameplay, règles D&D).
- [ ] Ajouter ESLint + Prettier (config + scripts `lint`/`format`).
- [ ] Ajouter `bun.lockb` (binaire, obsolète à côté de `bun.lock`) à la suppression ou au `.gitignore`.
- [ ] Nettoyer `src/.DS_Store` (sur disque) — déjà ignoré par `.gitignore`.
- [ ] Vérifier l'avertissement experimental `rolldown-vite` (`bun run check`) et documenter le choix de la toolchain.

---

## 9. Mode roguelike (inspiré de https://pokelike.xyz/) — 🎮 FAIT (2026-09)

### ✅ Réalisé
- **[Run + permadeath]** : choix du starter → run ; défaite = fin du run (`runover`) et résumé (région, niveau, score, reliques). Un seul monstre, comme demandé.
- **[Cartes & boss]** : `core/entities/Region.ts` — 4 régions (Verdure → Abysse → Braise → Céleste). `N` combats sauvages puis un **boss de région** (`MonsterRepository.createBoss`, PV ×1.4). Victoire sur la 4ᵉ région → titre de Champion (`victory`).
- **[Objets passifs]** : `core/entities/Relic.ts` — reliques (stats permanentes, +CA, soin au début de combat, vol de vie, +10 % dégâts). `RELICS` choisie parmi 3 offres après chaque combat sauvage (ou « Passer »).
- **[Score]** : `+15 × niveau ennemi vaincu`, `+150` boss, `+15` relique (constantes nommées). Affiche dans le HUD.
- **[HUD de run]** : `RunHud.svelte` (région, jalons sauvage/boss, reliques, score) + overlay relique (`RelicChooser.svelte`) + overlay « région conquise ».
- **[Bonus existants réutilisés]** : combat dynamique (§7.0), type & CA affichés sur la carte monstre.
- `BattleEngine.executeTurn` accepte `BattleModifiers` (`damagePercent` — reliques), `Monster.armorBonus` + `getAC()`.
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK.

### Prochaines itérations (idées)
- [ ] **Récompense de boss** : after boss win, give a relic choice too (Pokelike gives badge → maybe a bonus).
- [ ] **Hall of fame** : persister les meilleurs scores par run (localStorage) et les afficher sur l'écran de fin.
- [ ] **Équipe & capture** : banque de monstres, swap au KO, chance de capture après combat sauvage (Pokelike).
- [ ] **Événements roguelike** : rencontres « objet trouvé » non garanties, offres d'échange, énigmes.
- [ ] **Initiative d20 par tour** (TODO §5) — conservé volontairement pour le rythme actuel.
- [ ] **Curiosités régionales** : boss à ré-apparition (farm d'exp), types de régions plus variés, difficulté adaptative (lower si score faible).