# TODO — Améliorations Monster Battle

Analyse du code existant (Svelte 5 + TS + Tailwind, architecture "clean-ish").
Légende : 🐛 bug / 🧹 technique / 🎮 gameplay / ✨ feature / 🧪 tests / 📋 divers

---

## 16. Revue complète de l'app (2ᵉ passe) — améliorations proposées (2026-09)

Analyse entière du projet (entités, services, infra, store, composants, configs). Importances : **P0 fiabilité**, **P1 équilibrage & gameplay**, **P2 UX/accessibilité**, **P2 hygiène & infra**. Propositions à trier — aucune implémentée.

### Fiabilité & corrections (P0)
- [ ] **Potion achetée à PV pleins = or perdu** : `buyShopItem` débite l'or même si `healed <= 0` (pas de log, `item.bought = true`) — `battleStore.ts:331-344`. → désactiver/empêcher l'achat si PV max.
- [ ] **Moves partagés → mutation globale au level-up** : `BattleController.ts:253` réaffecte `attacker.moves = getMovesForMonster(...)` avec les **références** des objets statiques du catalogue (`MoveRepositories.ts:110-114`) ; les cooldowns mutés polluent **toutes** les instances (le commentaire « clone par instance » de `monsterFactory.ts:22-24` est faux). → cloner chaque move (`{ ...move }`) à l'instanciation.
- [ ] **Plus de cap à 4 moves après un level-up** : le set est remplacé par **tous** les moves éligibles (4+ en cumulant type+niveaux), sans UI de choix, et la barre d'action explose en rangées — `BattleController.ts:250-256`, `App.svelte:189-197`. → conserver 4 max + apprentissage choisi (§5/§10).
- [ ] **Re-spawn non déterministe au chargement** : `loadSaved` relance **niveau & stats** de l'ennemi sauvage (le type est préservé, pas le reste) → save-scum, partie non reproductible — `battleStore.ts:151-160`. → sauvegarder l'ennemi (snapshot) ou un seed de génération.
- [ ] **Critique ≠ auto-touché quand `critRange > 1`** : `crit = roll ≥ 21−critRange` est calculé indépendamment du jet de touche ; un « critique » peut donc **rater silencieusement** — `BattleEngine.ts:142-153`. → auto-touché sur une tranche étendue ET ≥ AC.
- [ ] **L'IA peut « jouer » un move en recharge** : dans le fallback (tout en cooldown), `pool = moves` non filtré → tour gaspillé sur l'erreur « en recharge » — `BattleController.ts:133-148`, `BattleEngine.ts:274-279`.
- [ ] **Boutons de moves cliquables pendant le tour ennemi** : `disabled` seulement si cooldown, alors que `attack()` est no-op quand `!isPlayerTurn` → double-clic sans retour — `MoveDisplayer.svelte:53`, `battleStore.ts:201`.
- [ ] **`crypto.randomUUID()` non garanti** (contexte non sécurisé hors localhost) → crash au spawn — `RandomEnemyFactory.ts:78`. → fallback compteur.
- [ ] **Validation de sauvegarde superficielle** : un save v3 corrompu (ex. `moves` absent) passe le filtre et plante `MonsterIO.fromSnapshot` (`initialMoves.map`) — `LocalStorageRunRepository.ts:24-28`, `Monster.ts:281-302`.
- [ ] **Heal nœud à PV pleins** : log mensonger « +42 PV » alors que `heal()` rend 0 — `battleStore.ts:298-307`.
- [ ] **Shuffle biaisé** dans `monsterFactory.ts:33` (`sort(() => 0.5 − random())`) → Fisher–Yates (uniforme, comme `RegionMap.ts`).
- [ ] **`progressPercent` → NaN** si un move a `coolDown > 0` sans `maxCoolDown` (impossible aujourd'hui, aucune défense) — `MoveDisplayer.svelte:14-16`.
- [ ] **`trailTimer` jamais nettoyé** à l'unmount de `HealthBar.svelte` (mémoire, mineur).

### Équilibrage & gameplay (P1)
- [ ] **CA = `10 + mod(Vitesse)` uniquement** : les tanks lents (LeafGuardian/Cairnox, speed 7-8 → AC 9) sont touchés quasi systématiquement alors que Voltis (speed 16 → AC 13) esquive — `Monster.ts:121-123`. → tester une pondération (Con ou niveau).
- [x] ✅ **Courbe d'XP très raide en début de run** : requise passe à `80 × niveau − 40` (360 XP au niv. 5, 760 au niv. 10) et gain à `40 + 16 × niveau`, écart borné ×0.4…×2.5 (`1.5^écart`) — niv. 5 → 7 en < 25 combats région 0, vérifié par smoke test — `Monster.ts:156-162`, `BattleEngine.ts:201-218`.
- [x] ✅ **Garde-fou « minimum 50 XP » mort** : supprimé — le nouveau gain reste ≥ ×0.4 par construction (`BattleEngine.ts`) ; le garde-fou tombait jamais dans le scénario normal de jeu.
- [ ] **Boss = `maxLevel + 2` (lvl 15 en Céleste)** vs joueur ~8-9 → multiplieur XP 47-89× et mur de stats — `BattleController.ts:303`. → plafonner ou introduire des `elite` intermédiaires.
- [ ] **Inflation linéaire des stats ennemies** `1 + (level−1)×0.15` → AC 17-26, boss 300-500 PV ×1.4 — `RandomEnemyFactory.ts:84-108`. → scaling sous-linéaire / mods plafonnés.
- [ ] **Boss Céleste `normal`** : aucune faiblesse de type exploitable sur le mur final — `Region.ts:61-62`.
- [ ] **Économie d'or déséquilibrée** : `rollShopStock(3)` + prix 50-85 (potion 30) vs revenus `8 + niveau`/`60` boss → ≤ 1 article par région, boutique quasi décorative face aux reliques gratuites post-combat — `battleStore.ts:309`, `Relic.ts:50-179`. → aligner stock (2 ?) ou enrichir l'or, diversifier les articles.
- [ ] **Aucune relique après boss** (seul plein soin) — `BattleController.ts:341-354` (cf. §9/§10).
- [ ] **Dominance `relic-heart` (+3 Con → PV max + soins)** et empilement des soins de début de combat — `Relic.ts:68-97,172-178`.
- [ ] **Sagesse & Charisme toujours sans rôle mécanique** (cf. §10) — croissance focalisée (fait §12), stats encore affichées sans effet.

### UX & accessibilité (P2)
- [ ] **Logs sans `aria-live`** : rien n'annonce les tours aux lecteurs d'écran — `Logs.svelte`.
- [ ] **Overlays sans modal** : `RelicChooser` et « région conquise » sans `role="dialog"`/`aria-modal`, pas de focus trap ni fermeture Échap — `RelicChooser.svelte:35-45`, `App.svelte:157-173`.
- [ ] **`prefers-reduced-motion` ignoré** : shake/lunge/float/pulse/wing-flap/crown inconditionnels — `SpriteDisplayer.svelte`, `MonsterDisplayer.svelte`, `HealthBar.svelte`.
- [ ] **Langue mixte FR/EN** : « Game Over », « Waiting for combatant... », « HP », « READY » contre des logs FR — `App.svelte:47`, `MonsterDisplayer.svelte:204`, `MoveDisplayer.svelte` (cf. §7).
- [ ] **Textes 9-10 px** (badges, cartes, canvas) & contrastes limites sur mobile — `MonsterSelector.svelte`, `MoveDisplayer.svelte`.
- [ ] **`MonsterSelector` compare les monstres par référence** → désélection à chaque remount de `Home` → sélectionner par `id` (cf. §7).
- [ ] **`Home.svelte` textes obsolètes** : « Trois créatures de départ » (5 starters) et « Feu, Eau, Plante » (6 types) — `Home.svelte:23,30`.
- [ ] **`aria-disabled` absent** sur nœuds futurs/verrouillés de la carte — `MapView.svelte`.
- [ ] **`bind:logs={$battleStore.logs}`** : two-way binding vers un store sans écriture, fragile — `App.svelte:179`.
- [ ] **Inventaire de reliques trop sommaire** (icônes + `title`) : pas d'effets cumulés visibles — `RunHud.svelte`.

### Hygiène, dette & infra (P2)
- [ ] **Méthodes mortes `MoveRepository`** : `getMoveById` / `getMoveByName` / `getAllMoves` / `getMovesByType` — `MoveRepositories.ts:71-103` (cf. §10).
- [ ] **`lastLayerIndex` / `reachableCols` jamais appelés** (utiles aux tests) — `RegionMap.ts:92,114`.
- [ ] **PNG morts bundlés (~320-470 Ko)** : `monster_1.png`/`monster_2.png` + champ `image` jamais lu (rendu 100 % SVG procédural) — `StarterCatalog.ts:6-7`, `RandomEnemyFactory.ts:42-49`, `monsterFactory.ts:10` (cf. §10).
- [ ] **`styles.winner` / `UI_COLORS` inutilisés** — `style.ts:44-56`, `typeColors.ts:116-122`.
- [ ] **Restes de template** : `src/lib/Counter.svelte`, `src/assets/svelte.svg`, `public/vite.svg` (cf. §2/§8).
- [ ] **`bun.lockb` obsolète** à côté de `bun.lock` (cf. §8).
- [ ] **`tsconfig.app.json` sans `noUnusedLocals`/`noUncheckedIndexedAccess`** → le code mort compile et les accès `!` foisonnent — activer pour attraper ce qui précède.
- [ ] **Migration Svelte 5 non faite** (syntaxe `on:click`/`$:`/`writable`) → runes (`onclick`/`$derived`) pour ne pas accumuler la dette.
- [ ] **`MonsterSelector` importe le container directement** au lieu de recevoir les starters en props — contourne la règle « composition root seul endroit qui câble » (README).
- [ ] **Tests Vitest** (cf. §4) : prioriser `resolveRound`/initiative, `selectEnemyMove` (IA), `MonsterIO` roundtrip, mutations des moves.

---

## 15. Nouveaux types : Électricité & Roche — ✅ FAIT (2026-09)

- [x] ✅ **6 types** (`Move.ts`) : `MonsterType = 'fire' | 'water' | 'grass' | 'normal' | 'electric' | 'rock'`, `TYPE_LABELS` (Électricité, Roche) — tous les `Record<MonsterType, …>` exhaustifs mis à jour.
- [x] ✅ **Table de types étendue** (`effectiveness.ts`) : triangle `Feu > Plante > Eau` inchangé, **Électricité** bat Eau & Roche (faiblit vs Plante), **Roche** bat Feu (faiblit vs Eau & Plante ; Plante résiste à l'Électricité) ; `normal` neutre. Physique ×2/×0.5, magie ×1.5/×0.67.
- [x] ✅ **Stats & croissance** (`Monster.ts`) : `HIT_DICE` electric 8 / rock 10 ; archetypes electric `+3 Vit +3 Int +1 For +1 Con`, rock `+3 Con +3 For +1 Vit +1 Int`.
- [x] ✅ **Moves** (`MoveRepositories.ts`) : élec — Éclair p60 magie / Tonnerre p80 magie / Orage p120 magie cd2 ; roche — Écrasement p45 phys / Bloc Roc p75 phys / Tremblement p120 phys cd2.
- [x] ✅ **Régions & ennemis** (`Region.ts`, `RandomEnemyFactory.ts`) : Abysse + electric, Braise + rock, Céleste = 6 types ; pools de noms (Volt/Sparc…, Gran/Crag…), sprites placeholders.
- [x] ✅ **Starters** (`StarterCatalog.ts`) : **Voltis** (electric : 10/16/8/15/10/9) et **Cairnox** (rock : 16/7/15/8/10/9) → 5 cartes dans `MonsterSelector`.
- [x] ✅ **Sprites SVG** (`SpriteDisplayer.svelte`) : palettes, silhouettes et détails distincts (crête d'ions + queue-éclair ; cristaux + poings rocheux).
- [x] ✅ **UI** (`typeColors.ts`) : couleurs/ombres/ambiances + icônes ⚡🪨 (badges de la carte et des moves).
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test (chart physique/magie, symétrie des paires, moves, 5 starters, spawn élec/roche, 4 moves/starters) → 39 assertions OK.

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
- [x] ✅ **`BattleController` extrait** (`core/services/BattleController.ts`) : IA ennemie (`selectEnemyMove`), tour (`playTurn`), spawn des ennemis (`enterWildCombat` / `enterBossCombat`), progression de run (`handlePlayerVictory`, `applyRelic`, `grantRelic`). **Testable sans Svelte** — ses dépendances (engine, ports, `random`) sont injectées.
- [x] ✅ **Store allégé** (`battleStore.ts`) : ne garde que l'état (`Writable`), les timers d'animation et la liaison UI ; il délègue toute la logique au contrôleur.
- [x] ✅ **`BattleState` / `RunState` unifiés** dans `core/entities/BattleState.ts` (doublon store/entities éliminé, cf. §2).
- [x] ✅ **Séparation `MonsterRepositories` → `StarterCatalog` + `RandomEnemyFactory`** : starters fixes vs génération procédurale (+ boss) ; instanciation commune dans `monsterFactory.ts` ; cast `as any` supprimé (signature `Pick<Monster, 'type' | 'level'>`).
- [x] ✅ **Code mort supprimé** : `getStarter()` / `getMonsterById()`. `getAllMonsters()` (3 monstres aléatoires, sémantique trompeuse) remplacé par `StarterCatalog.getAll()` qui renvoie bien **les 5 starters définis**.
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
  - **PV** : facteur `1.8 + level × 0.85` (`Monster.calculateMaxHp`). Les starters ~48–72 PV au niveau 5.
  - **Physique** : `powerToDie` recalibré vers le haut (`<40→6, <60→8, <80→10, <110→12, sinon 20`) + **bonus plat `floor(power/10)`** ajouté aux dégâts ; desc des logs `NdS+flat` (`BattleEngine.powerToDie` / `movePowerFlat` / `rollDamage`).
  - **Magie** : multiplicateur de type **dampé** — physique ×2/×0.5, magie ×1.5/×0.67 (`effectiveiveness.ts`, `typeEffectiveness(moveType, defenderType, isPhysical)`). `BattleEngine.typeMultiplier(moveType, defenderType, isPhysical = true)` délègue à cette table, **partagée avec l'IA et l'UI** (source unique).
- [x] ✅ **Initiative** : règle D&D `1d20 + mod(Vitesse)` par camp (égalité → le joueur). `BattleController.resolveRound({ player, enemy, move, … })` résout le round COMPLET dans l'ordre (`{ playerFirst, playerInitiative, enemyInitiative, playerTurn, enemyTurn, winner, logs }`) ; le tour du perdant est annulé s'il est déjà K.O. Un même `Dice` est partagé entre engine et controller (`container.ts`).
- [ ] **Armure / objets** : règle D&D CA = `10 + mod(Vitesse) + BonusArmure` — introduire un slot armure et des loots (`BonusArmure`), et des armes avec `BonusDégâts` / `DesDégâts`. *(hors périmètre actuel — le champ `Monster.armorBonus` et les reliques AC existent déjà.)*
- [x] ✅ **Affichage CA et types** : CA affichée (`MonsterDisplayer`), badges de types sur les moves, **indicateur « ⚔ Super eff. / 🛡 Peu eff. »** sur chaque move en combat (`MoveDisplayer` reçoit `targetType` = type de l'ennemi, `App.svelte`).
- [x] ✅ **IA ennemie** : `BattleController.selectEnemyMove(moves, actor, target)` — respecte les cooldowns, **évite les soins à PV pleins**, **privilégie les moves super-efficaces** (table de types).
- [ ] **Apprentissage de moves** : UI de choix (« apprendre X / oublier Y ») plutôt que remplacement aléatoire. *(hors périmètre actuel.)*
- [ ] **Objets / soins en combat** : potions limitées (règle potion `2d4 + mod CON`), changement de monstre en combat (banque de 2-3 monstres). *(hors périmètre actuel.)*
- [x] ✅ **Variété visuelle (étape 1)** : `SpriteDisplayer.svelte` redessiné en **SVG procédural distinct par type** — dragonnet feu (ailes/cornes/queue à flamme), nageur eau (nageoires/queue à double lobe/branchies), sprout plante (oreilles-feuilles/crête), boule de poils normal — + expressions pilotées par les stats (colère/joie/fatigue) + **couronne + aura pour le rang `boss`** (2026-09). Reste : les PNG `monster_1.png`/`monster_2.png` ne sont plus jamais rendus (inutilisés) → retrait prévu §10.
- [ ] **Mort du monstre joueur** : reset complet (= perte de progression) ; prévoir éventuellement un « centre de soins / revanche » moins frustrant. *(hors périmètre actuel — permadeath immédiat conservé.)*
- [x] ✅ **XP par rang** : `Monster.rank: 'normal' | 'boss'` ; `createBoss` pose `rank='boss'` ; `calculateExperienceGained` × `RANK_XP_MULTIPLIER { normal: 1, boss: 1.5 }` (niveau d20 : 10/20/50). Affiche le bonus quand l'ennemi est rangé.
- [x] ✅ **Stats du monstre** : panneau **repliable** dans `MonsterDisplayer` (les 6 stats + modificateurs + CA), libellés centralisés dans `STAT_LABELS` (`core/entities/Move.ts`, partagé avec l'UI).
- [x] ✅ Bonus : le store refactoré autour des **rounds** (`battleStore.attack` rejoue les deux actions dans l'ordre d'initiative avec timers ; feedbacks nettoyés **par camp**, plus de course de `_clearFeedback`).
- ✅ Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test déterministe des règles (HP, d10+flat, magie dampée, initiative/KO, IA, XP boss) OK.

---

## 6. Feature : persistance

- [x] ✅ **Sauvegarde auto de progression (localStorage)** — DTO JSON-safe `MonsterSnapshot` + `MonsterIO.toSnapshot/fromSnapshot` (`core/entities/Monster.ts`) ; port `SaveRepository` + `RunSave` (`core/services/ports.ts`), impl. `LocalStorageRunRepository` (`infra/repositories/`) ; le store (`battleStore.ts`) persiste après `startRun` / `pickRelic` / `skipRelic` / `advanceRegion` / victoire (relique, région ou Champion) ;
- [x] ✅ **Écran titre / menu** (`App.svelte`, phase `starter`) : si une sauvegarde existe → « Une partie en cours… » (région, monstre, niveau, score) avec **▶ Continuer la partie** (`loadSaved`, re-spawn de l'ennemi / overlay relique-région RESTAURÉ) et **Nouvelle partie** (`deleteSave`) ; sinon sélecteur de starter direct. `newRun` (permadeath / Champion) vide la sauvegarde.
- [x] ✅ **Sécurité timers** : `_clearTimers()` (file annulable `pendingTimers` + feedback) appelé à `startRun` / `newRun` / `loadSaved` / `deleteSave` — supprime la course des `_enemyLater`/`_playerLater` sur un nouveau run (cf. §10 P0).
- [ ] **Mélange d'ambiance** : musique (Web Audio simple), bruitages attaque/soin/KO. (Le **feedback visuel** — flash, shake, nombres flottants — est ✅ fait, voir §7.0.)
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test headless (startRun → save ; roundtrip JSON du snapshot ; loadSaved restaure ; deleteSave/newRun purgent) OK.

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
- [ ] Langue mixte FR/EN (logs FR, « Game Over », « Waiting for combatant... », « HP », « READY ») → définir une locale unique.
- [ ] `MonsterSelector` (désormais en cartes `<button>`) : la sélection compare les monstres **par référence** → instable à chaque remount de `Home`. Sélectionner par `id` (string) et conserver les monstres en mémoire.
- [ ] Accessibilité : `aria-disabled`/`aria-live` pour le journal de combat, focus sur le premier move actif, contrastes.
- [x] ✅ **Layout mobile** : le sélecteur de monstre (`MonsterSelector`) est désormais intégré dans le flux centré de l'écran starter (plus d'overlay `absolute -bottom-24` fragile).
- [x] ✅ **Index.html** : `lang="fr"`, titre « Battle Monster », favicon inline (l'ancien `/vite.svg` → erreur 404), `viewport-fit=cover` + `theme-color`.
- [x] ✅ **Passage mobile (2026-09)** : `min-h-dvh` (barre d'adresse iOS), action bar **au-dessus des logs** + **sticky bottom** avec safe-area (`pb-[env(safe-area-inset-bottom)]`), cartes monstres proportionnelles (`w-1/2 max-w-[160px]`, plus d'overflow à 320 px), `MoveDisplayer` compact (textes `sm`, `truncate`, badges en `flex-wrap`), `Logs` réduit (`h-40` mobile), `RelicChooser` échelle responsive, `touch-action: manipulation` + suppression du tap-highlight global. Vérifié : `bun run check` 0/0, `bun run build` OK.

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
- [x] ✅ **Initiative d20 par tour** — implémenté dans §5 (`BattleController.resolveRound` : `1d20 + mod(Vitesse)`, égalité → joueur, tour sauté si K.O.).
- [ ] **Curiosités régionales** : boss à ré-apparition (farm d'exp), types de régions plus variés, difficulté adaptative (lower si score faible).

---

## 10. Analyse complète de l'app — améliorations proposées (2026-09)

Synthèse issue de la revue de l'app entière (Svelte 5 / TS / Tailwind 4, clean archi §3, gameplay balancé §5, SVG procédural). Importances : **P0 fiabilité**, **P1 gameplay**, **P2 UX/hygiène**. Rien d'implémenté — ce sont les propositions à trier.

### Fiabilité & corrections (P0)
- [x] ✅ **Annuler les timers de round du store** : `battleStore._enemyLater` / `_playerLater` / `_endAnimLater` passent par `_later()` (file annulable `pendingTimers`), plus un `_clearTimers()` (replays + feedback) appelé à `startRun`/`newRun`/`loadSaved`/`deleteSave` — plus de pollution d'un nouveau run par un timer en vol. *(Réglé avec la persistance §6.)*
- [ ] **Supprimer le code mort** : `MoveRepository.getMoveById/getMoveByName/getAllMoves/getMovesByType` (`MoveRepositories.ts:59-90`) jamais appelés ; `styles.winner` (`style.ts:44-56`) inutilisé (la victoire passe par les phases `relic`/`regionClear`/`victory`).
- [x] ✅ **Textures distantes supprimées** : les URLs `transparenttextures.com` ne sont plus chargées (motif inline `sel-pattern` dans `MonsterSelector`, pointillé SVG dans `MapView`) — plus de dépendance réseau pour le rendu.
- [ ] **Disposer `trailTimer`** dans `HealthBar.svelte` (jamais nettoyé, mineur).
- [ ] **Shuffle uniforme** : `monsterFactory.ts` `sort(() => 0.5 - random())` est biaisé → Fisher–Yates.

### Gameplay & profondeur (P1)
- [ ] **Donner un rôle mécanique à SAG (Instinct)** : stats sans effet de jeu (croissance + expression uniquement). Proposer : modificateur aux soins (`2d4 + mod(Constitution) + mod(Instinct)`), et/ou résistance aux effets de statut.
- [ ] **Donner un rôle à CHA (Charisme)** : idem inutilisé. Proposer : qualité/quantité des offres de reliques (re-roll selon CHA), bonus de score, ou critère d'appoint à l'initiative.
- [ ] **Effets de statut d20** : Brûlure / Poison / Paralysie (sauvegarde pour agir) + nouveaux moves par type + tick de fin de round (`BattleEngine` reste pur).
- [ ] **Relique après boss** : pas seulement plein soin — proposer un choix de relique (comme §9).
- [ ] **Difficulté adaptative / élites** : rang intermédiaire `elite` (XP ×1.25) ou scaling si mauvaise série (réutilise `deck` de `BattleState`).
- [ ] **Hall of fame** : persister les meilleurs scores de run (`localStorage`) et les afficher à l'écran de fin (en lien §9).

### UX & polish (P2)
- [ ] **Tooltips des moves** : puissance, recharge (`maxCoolDown`), type, « super-eff./peu eff. » + afficher l'efficacité de type aussi côté ennemi (`MoveDisplayer` ne montre que le joueur).
- [ ] **VFX par type** : remplacer le lunge générique (`isAttacking`) par des animations selon le type du move (onde/éclaboussure/feuilles/roc) — tirer parti du `typeEffectiveness` partagé.
- [ ] **Sons Web Audio** : attaque/soin/critique/boss (en lien §6).
- [ ] **Accessibilité** : `aria-live` sur `Logs`, états `aria-pressed`/`disabled` sur les moves, focus trap sur les overlays (`RelicChooser`), respect `prefers-reduced-motion`.
- [x] ✅ **Écran titre / menu + persistance** — fait dans §6 (menu « Continuer », sauvegarde auto `localStorage`).

### Hygiène & infra (P2)
- [ ] **Retirer les PNG inutilisés** : `src/assets/monster_1.png` et `monster_2.png` + champ `image`/`spriteUrl` (`Monster.ts` ctor, `monsterFactory`, `IMAGE_MAP` de `StarterCatalog`/`RandomEnemyFactory`) — le rendu est 100 % SVG procédural (SpriteDisplayer).
- [ ] **index.html** : `lang="fr"`, titre explicite, favicon inline — le `<link href="/vite.svg">` pointé n'existe pas (404).
- [ ] **Restes template** : `src/lib/Counter.svelte`, `src/assets/svelte.svg` (déjà §2).
- [ ] **Tests Vitest** (déjà §4) — prioriser `resolveRound`/initiative, `selectEnemyMove` (IA), `battleStore` avec timers mockés.
- [ ] **ESLint + Prettier** (déjà §8).

---

## 14. Types de monstres sur la carte — ✅ FAIT (2026-09)

- [x] ✅ **`MapNode.enemyType`** (`RegionMap.ts`) : chaque nœud **combat** porte le type de son monstre gardien, tiré parmi `RegionDef.types` de la région (`rollEnemyType` dans `generateRegionMap`) — les nœuds soin/boutique n'en ont pas.
- [x] ✅ **Spawn cohérent** : `BattleController.enterWildCombat(player, run, { type })` accepte un type forcé ; `battleStore.chooseNode` le transmet depuis le nœud, et `loadSaved` **re-spawn le même type** que le nœud choisi.
- [x] ✅ **UI** (`MapView.svelte`) : les nœuds combat affichent l'**icône du type** (🔥💧🌿✊) + libellé « ⚔️ Feu » ; les couches passées restent en ✓ vert.
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test (tous les combats typés parmi les types région, soins/boutiques sans type, 1er nœud combat typé, spawn + re-spawn fidèles au type du nœud) OK.

---

## 13. Précision inversée à la puissance — ✅ FAIT (2026-09)

- [x] ✅ **Les attaques faibles touchent plus que les fortes** : `moveAccuracyBonus(move) = max(0, floor((120 − power)/15))` (`core/entities/Move.ts`, partagé moteur/UI) → p. 30 = **+6**, p. 120+ = **+0**. La précision s'ajoute au jet `1d20` (`resolveAttack`) ; les **dégâts** restent tirés de la puissance (`moveDamageBonus = floor(power/20)`, réservé au physique).
- [x] ✅ **Magie compensée** : les sorts montent en dégâts avec la puissance — `Savoir × (1 + power/120)` (p. 60 → ×1.5, p. 120 → ×2) au lieu du `×1.5` plat — sinon un sort fort serait **strictement pire** (même dégâts, précision moindre).
- [x] ✅ **UI** : badge **🎯 +N** sur les cartes de moves (`MoveDisplayer`), logs de jet annotés `précision`.
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test (précision par power, toucher faible > fort sur 20 jets, magie ×1.5/×2, physique puissance) OK.

---

## 12. Rebalance des gains de stats — ✅ FAIT (2026-09)

- [x] ✅ **Croissance par archétype** (`Monster.getStatGrowth`) : seul les 4 stats **à effet de combat** progressent — **Force / Vitesse / Constitution / Intelligence**. **Sagesse & Charisme (sans rôle mécanique) ne montent plus** (−5 à −7 points gaspillés par niveau).
- [x] ✅ **Profils distincts** : **fire** frappeur rapide `+3 Force, +3 Vit, +2 Int, +1 Con` ; **water** tank `+3 Con, +2 Force, +2 Int, +1 Vit` ; **grass** mage-tank `+3 Int, +2 Con, +2 Vit, +1 Force` ; **normal** polyvalent `+2 ×4`. Budget 8-9 pts/niveau (au lieu de 12-14 dont ~40 % perdu en stats mortes).
- Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test (croissance par type sur 3 niveaux, sagesse/charisme figés, plein soin au level-up, lecture `getStatGrowth` par les ennemis inchangée) OK.

---

## 11. Carte de région & économie d'or — ✅ FAIT (2026-09)

Progression roguelike revue façon **Slay the Spire** : la carte remplace l'enchaînement fixe des combats sauvages.

- [x] ✅ **Carte de région** (`core/entities/RegionMap.ts`) : `generateRegionMap(layers, random)` déterministe (injectable) — **`RegionDef.mapLayers`** (4 → 5 → 6 → 7 couches, cartes plus grandes en avançant), colonnes `1 → 2 → 3 → 4`, nœuds **combat (60 %) / soin (20 %) / boutique (20 %)** — **la première couche est toujours un combat** — ; **connectivité « ±1 colonne »** (`areLinked`/`reachableCols`) : chaque nœud ne relie que les colonnes voisines de la couche suivante ; la dernière couche traversée déclenche le **boss**.
- [x] ✅ **`RunState` restructuré** (`core/entities/BattleState.ts`) : `encounterIndex` remplacé par `map` / `mapLayer` / `gold` / `shopStock` / `bossBattle` ; phases **`map`** et **`shop`** ajoutées.
- [x] ✅ **Économie** : combat sauvage → `8 + niveau` 💰, boss → `60` 💰 (`BattleController.handlePlayerVictory` + logs « 💰 ») ; or cumulé entre les régions.
- [x] ✅ **Boutique** (`Relic.rollShopStock` : **3** reliques prixées 50-85 💰 + potion soin 30 💰) — chaque relique du catalogue a son `price` (50 à 85) ; achat déduit l'or, `grantRelic` conserve la phase `shop` ; « Poursuivre → » avance sur la carte. *(Le stock à 3 vs « 2 » annoncé plus tôt et la tension avec l'économie d'or sont à re-trancher — cf. §16 P1.)*
- [x] ✅ **Store** (`battleStore.ts`) : `chooseNode` (combat/soin/+50 % PV/boutique), `buyShopItem`, `leaveShop`, `_advanceMap` (couche suivante ou boss), `pickRelic`/`skipRelic`/`advanceRegion` avancent désormais via la carte ; `loadSaved` re-spawn sauvage/boss selon `run.bossBattle`.
- [x] ✅ **UI** : **`MapView.svelte` refait en SVG** (fond dégradé + points, dégradés radiaux par type, **liens du graphe réel** : vert **gras = passage pris**, ambre = **options atteignables** depuis votre position, gris fin = liens futurs), nœuds **verrouillés si trop loin** (grisés, non cliquables) et **halo pulsant** sur les seuls nœuds accessibles, couches passées en ✓ vert (le **nœud pris** marqué plus fort), 👑 **BOSS DE RÉGION** en bout avec pulsation quand il devient accessible), `ShopView.svelte` (cartouches Acheter/Acheté, prix, Poursuivre →), `RunHud` (jalons couche + 💰 or malgré le ⭐ score), `App.svelte` (phases `map`/`shop` à la place de l'arène) + `RunState.path` (colonnes réellement choisies, **SAVE_VERSION 3**).
- [x] ✅ **Persistance v2** : `SAVE_VERSION` 1 → 2 ; `LocalStorageRunRepository.load()` **purge** une sauvegarde d'ancien format.
- ✅ Vérifié : `bun run check` → 0 erreur / 0 warning, `bun run build` OK, smoke test headless (42 assertions : carte déterministe, stock boutique, startRun→map, spawn wild/boss, soin +50 %, achat potion/relique, re-achat bloqué, fin de carte→boss, re-spawn `loadSaved`, invalidation v1) OK.