# TODO — Monster Battle D&D 5e Roguelike

Dernière mise à jour : Octobre 2026.
Légende : 🐛 Bug / 🧹 Hygiène / 🎮 Gameplay / ✨ Feature / 🧪 Tests / ♿ Accessibilité

---

## 📋 Backlog des tâches à réaliser

### 1. Fiabilité & Moteur de jeu (P0)
- [x] ✅ **Cap & apprentissage à 4 capacités** : limite stricte `MAX_MOVES = 4`, remplacement automatique et intelligent de la capacité la plus faible lors du level-up avec journalisation détaillée (`BattleController.ts`, `Monster.ts`).
- [x] ✅ **Re-spawn déterministe au chargement** : sauvegarde et restauration de l'état exact (`enemyMonster` snapshot, PV, buffs, cooldowns) dans `LocalStorageRunRepository.ts` et `battleStore.ts`.
- [x] ✅ **File d'animations centralisée & anti-race conditions** : verrous d'attaque `isAttacking`/`isEnemyAttacking`, désactivation des boutons en cours d'action, et gestionnaire `_clearTimers` sur toutes les transitions.

---

### 2. Équilibrage & Gameplay (P1)
- [x] ✅ **Plafonnement de la CA effective** : Vitesse plafonnée à +5 (`AC_SPEED_MOD_CAP`), bonus d'armure avec soft cap à +6 (`effectiveArmorBonus`), et hard cap absolu à 24 (`AC_HARD_CAP`) pour éviter l'intouchabilité (`Monster.ts`).
- [x] ✅ **Rôle mécanique pour le Charisme** :
  - *Dégâts magiques* : canalisation et amplification magique en pourcentage (`charismaMagicFactor()`, +2 % par point au-delà de 10).
  - *Soins* : bonus direct sur les capacités curatives (`charismaHealBonus()`).
  - *Visuel SVG* : expression du sprite (sourire à 14+, éclat à 16+).
- [x] ✅ **Scaling adaptatif des ennemis sur le joueur** :
  - *Sauvages* : niveau calé sur celui du joueur ±1 (`WILD_LEVEL_OFFSETS`), borné par la région (`BattleController.ts`).
  - *Boss* : niveau calé sur `joueur + 1`, borné par `maxLevel + 1`.
  - *Stats* : scaling dynamique sur le niveau (`RandomEnemyFactory.ts`).
- [x] ✅ **Régulation du scaling des boss** : adoucissement du niveau des boss (`maxLevel + 1` au lieu de `maxLevel + 2`) dans `BattleController.ts` pour éviter les pics de difficulté excessifs en Citadelle Céleste.
- [x] ✅ **Rôle mécanique pour SAG (Sagesse/Instinct) & Savoir** :
  - *Instinct (SAG)* : perception martiale élargissant la plage de coups critiques (`effectiveCritRange`), échelle visuelle du regard SVG.
  - *Savoir (INT)* : bonus direct sur les soins (cf. section 2 — graduation `healPower`), scaling des attaques magiques.
- [x] ✅ **Choix de relique post-Boss** : offrir une relique rare après la victoire sur un boss de région avant d'avancer vers la région suivante.
- [x] ✅ **Effets de statut élémentaires (d20)** :
  - 🔥 Brûlure : dégâts à chaque tour (8 % PV max), jet de sauvegarde CON (DD 12).
  - 💧 Gel / Sommeil : tour sauté avec jet de sauvegarde d20 CON (DD 12).
  - ⚡ Paralysie : réduction d'initiative (-4) et risque d'échec d'action sur jet de sauvegarde d20 CON (DD 11).
  - 🌿 Poison : affaiblissement progressif des PV (+5 % par tour cumulé), jet de sauvegarde CON (DD 13).
- [x] ✅ **Objets consommables & Sacoche d'aventurier** :
  - Catalogue d'objets à usage unique (`Consumable.ts`) : Panacée universelle, Baume anti-brûlure, Potion de dégel, Antidote végétal, Élixir d'adrénaline, Pierre de recharge, Potion de pierre.
  - Modale interactive de sacoche (`InventoryModal.svelte`) utilisable instantanément en combat ou pendant l'exploration.
  - Intégration en boutique d'aventurier (`ShopView.svelte`) et pack de départ (`STARTER_INVENTORY`).
- [x] ✅ **Panthéon des Champions & Export/Import JSON** :
  - Enregistrement automatique des créatures après chaque victoire de boss régional (`LocalStorageChampionRepository`).
  - Onglet Panthéon complet sur l'écran d'accueil avec rejouabilité directe.
  - Exportation / Téléchargement et Importation de fichiers `.json` standardisés.
- [x] ✅ **Le soin passe toujours avant l'attaque** (ordre de résolution du round, `BattleController.beginRound`) : si exactement un des deux camps soigne, son tour est joué en premier, quel que soit le jet d'initiative. L'initiative ne départage que les cas homogènes (les deux soignent, ou aucun). Un camp gelé/paralysé perd son tour quand il vient, sans bloquer l'autre.
  - *Cohérence de la règle* : l'IA ennemie choisit son move **après** avoir subi les dégâts. `hasUsableHeal` sonde donc sa **capacité** à soigner *sans consommer d'aléa* (l'ordre est donc connu avant que l'IA ne choisisse), et `selectEnemyMove(…, preferHeal)` force le soin lorsque c'est précisément cette capacité qui lui a valu la priorité — sinon la règle n'aurait accordé que le bonus d'initiative.
  - *Journal* : le jet d'initiative et l'ordre effectif retenu sont désormais deux lignes distinctes (« X en tête à l'initiative » puis « ➜ Y agit en premier »), avec une ligne explicite quand le soin prime.
- [x] ✅ **Graduation des sorts de soin (`healPower`)** : les capacités curatives portent un champ `healPower` dédié (0 / 10 / 15) au lieu de surcharger `power`. Elles gardent `power: 0` et ne passent donc jamais par le jet d'attaque. La formule D&D est `(niveau + 1)d4 + mod(CON) + max(0, mod(Savoir)) + max(0, mod(Charisme)) + healPower` (`BattleEngine.applyHeal`).
- [x] ✅ **Butin de boss & persistance des objets** :
  - `InventorySlot.origin` distingue la provenance `'shop'` / `'boss'`.
  - Un boss de région lâche **2 objets distincts** tirés au sort dans le catalogue (`BOSS_LOOT_COUNT`, `BattleController._rollBossLoot`).
  - `fuseDurableItemsIntoMonster` ne retient que les lots `origin === 'boss'` porteurs d'un bonus durable (`statBoost` / `acBonus`) et les fige dans la fiche du champion. **Un objet acheté en boutique n'est jamais persistant.** La fusion se fait sur une *copie* : le monstre du run et l'inventaire restent intacts (pas de double cumul).
- [x] ✅ **Rejeu d'un champion enregistré au niveau 1** : `Monster.resetLevelTo(1)` (niveau, XP à zéro, seuil recalculé, PV réétendus) appelé depuis `Home.svelte` au lancement d'une nouvelle run avec un champion du Panthéon. Les autres usages de `fromSnapshot` (affichage, reprise de run sauvegardée, import) conservent leur niveau.
- [x] ✅ **Rééquilibrage global (mesuré avec `scripts/balanceSim.ts`)** — sept leviers, chacun validé par `BalanceInvariants.test.ts` :
  1. **Échelle des ennemis** : la croissance `1 + 0.15·(niv−1)` (multiplicative, plate sur les six stats) est remplacée par la **courbe de croissance du champion du même type**. L'ennemi n'emporte plus du Charisme (amplification magique) ni de l'Instinct (plage de critique) que le joueur ne peut pas obtenir.
  2. **Cadence des dégâts** : `levelPaceFactor` met les dégâts sur la même courbe que les PV — un écart de niveau est redevenu lisible au lieu d'être un mur.
  3. **Table de types** : passer à un tournoi régulier (2 avantages / 2 faiblesses par type, relations réciproques) ; le triangle Feu > Plante > Eau > Feu est conservé.
  4. **Catalogue** : même échelle de puissance, un soin, un buff et quatre statuts pour chaque type (les trois types sans soin et la Roche sans statut sont corrigés).
  5. **Magie vs physique** : le sort passe sur `mod(Savoir)` au lieu de `Savoir × (1 + power/120)`, qui écartait la magie du physique de 60 %.
  6. **Constitution** : d10 pour tous les types, +2 minimum d'affinité, croissance de stats normalisée (9 points/niveau pour chaque type) et points de destin répartis en tour de rôle.
  7. **Difficulté** : `threat` et `wildLevelOffsets` par région (ramp croisante), panneau d'ennemis composé des 4 plus fortes capacités, IA qui ne gaspille plus de tour, boss à PV ×1.2.
  Résultat mesuré : victoire en miroir passée de **3-35 % à 44-72 %**, combats ramenés à 3.5-10 rounds quel que soit le niveau, difficulté croissante de région en région.

---

### 3. UX, Polish & Accessibilité (P2)
- [x] ✅ **Effets affichés sur les boutons de sélection d'attaques** (`MoveDisplayer.svelte`, `MoveManagerModal.svelte`) : nature du move, puissance `P.N`, précision `🎯 +N`, soin `💚 +N PV`, buff `⬆ +N Stat`, efficacité `⚔ Super eff. / 🛡 Peu eff.` et statut élémentaire (icône, nom, chance %) — ce dernier avec une infobulle décrivant l'effet et le DD de sauvegarde.
- [x] ✅ **Arène en vue Street Fighter** : la carte du monstre a quitté le champ de bataille (`styles.layout.arena` n'est plus utilisée qu'à un seul endroit). HUD de combattant (`FighterHud.svelte`) ancré aux deux coins opposés en haut de l'arène, horizon et lignes de sol, ombre portée et alignement au sol. La hauteur du sprite est verrouillée par un test pour empêcher un rognage des pieds (`overflow-hidden`).
- [x] ✅ **Monstres 3D humanoïdes en garde de combat** (`MonsterWebGLRenderer.ts`) : maillage procédural en **cylindres** pour les membres et en sphères pour les articulations, avec épaules, torse, crâne et visage. Posture de boxeur : poings remontés devant la face, coudes écartés du buste, jambes à l'assise élargie. Les bornes du maillage sont testées pour ne jamais déborder du cadre.
- [x] ✅ **Trois animations d'attaque distinctes + animations de fin de combat** (`MonsterDisplayer.svelte`) :
  - *Physique* : armement en arrière puis charge franche vers l'adversaire.
  - *À distance* : recul de préparation puis projection modérée (le coup part sans contact).
  - *Soin / Buff* : **aucun déplacement horizontal** — élévation et illumination, monstre ancré au sol.
  - Chaque famille existe en version joueur et ennemi, strictement miroir. L'ordre des règles CSS est significatif : les animations d'attaque sont déclarées **après** `.shake` pour ne pas être masquées par la réaction aux dégâts sur un coup réussi.
  - *Victoire* : rebond avec amplification et illumination progressive. *Défaite* : affaissement, rotation, désaturation et effacement. Bandeau VICTOIRE / DÉFAITE en surimpression.
- [x] ✅ **Attente avant l'écran suivant** : `ROUND_END_DELAY` (1400 ms, `battleStore.ts`) — le vainqueur est écrit dans l'état immédiatement pour que l'animation se joue, mais les récompenses, la relique, la fin de run et la permadeath sont appliquées après le délai, via `_scheduleRoundEnd` (idempotent, annulé par `_clearTimers`). Les quatre chemins de coup fatal y passent, verrouillé par un test de garde.
- [ ] **Accessibilité lecteur d'écran & ARIA** : ajouter `aria-live="polite"` sur le journal de combat (`Logs.svelte`) et focus trap sur les modales.
- [ ] **Support `prefers-reduced-motion`** : désactiver ou atténuer les secousses de caméra (shake) et animations d'attaque pour les utilisateurs sensibles.
- [ ] **Unification de la langue (100 % FR)** : harmoniser les derniers termes anglophones résiduels.
- [ ] **Effets sonores (Web Audio API)** : synthétiser des sons rétro légers pour les jets de dés d20, coups critiques, coups portés, soins et victoires.
- [x] **Détails cumulés des reliques** : onglet « Reliques » listant l'ensemble des passifs actifs et leurs bonus cumulés (`RelicList.svelte`).

---

### 4. Hygiène de code & Infrastructure (P3)
- [x] **Suppression des assets et code morts résiduels** :
  - Composants et fichiers de template retirés (`src/lib/Counter.svelte`, `src/assets/svelte.svg`, `public/vite.svg`, `bun.lockb`).
  - Fonctions non appelées retirées de `MoveRepositories.ts` (`getMoveById`, `getMoveByName`, `getAllMoves`, `getMovesByType`).
  - Imports, helpers et clés de style morts éliminés (`UI_COLORS`, `lastLayerIndex`, `reachableCols`, `createLocalStorageRunRepository`, `styles.layout.title`, `styles.actionBar.moveWrapper`, `styles.winner`).
- [x] ✅ **Suite de tests automatisés (`bun test`, runner natif Bun)** — 138 tests sur 15 fichiers, ~250 ms :
  - `BattleEngine.test.ts` — jets d'attaque d20, CA, critique 20 naturel, fumble 1 naturel, dégâts physiques et magiques, absorption par la Constitution de la victime.
  - `RoundInitiative.test.ts` — ordre d'attaque du round (initiative, non-régression après l'introduction de la priorité du soin).
  - `HealPriorityOrder.test.ts` — la règle d'ordre (soin joueur, soin ennemi, les deux, aucun), la sonde de soin sans aléa, et le journal.
  - `HealPriorityStore.test.ts` — la règle est **réellement appliquée par le store** : le soin du joueur se résout dans la frame du clic ; l'ennemi placé en priorité pour soigner le fait ; un ennemi gelé désigné premier ne bloque pas le round.
  - `EnemyScaling.test.ts` — scaling des ennemis sur le joueur (sauvages et boss).
  - `MonsterACAndCharisma.test.ts` — plafonnement de la CA, rôle mécanique du Charisme.
  - `HealMoves.test.ts` — graduation des sorts de soin (`healPower`) et non-régression (un soin n'inflige pas de dégâts).
  - `MoveButtonEffects.test.ts` — effets affichés dans les deux surfaces de sélection + présence réelle des effets dans le catalogue.
  - `ArenaStageLayout.test.ts` — mise en scène Street Fighter (variantes, encadrement, hauteur du sprite, ombre, alignement, HUD, horizon).
  - `AttackAnimations.test.ts` — routage des trois familles, miroir joueur/ennemi, animations de victoire/défaite, ordre CSS attaque > shake.
  - `RoundEndDelay.test.ts` — report de la fin de round et des quatre chemins de coup fatal (assertions déterministes sur la programmation, pas d'attente sur l'horloge murale).
  - `ChampionReplayLevel.test.ts` — rejouer un champion le remet au niveau 1.
  - `ChampionItemFusion.test.ts` — fusion des objets durables du boss, isolation du monstre du run, non-persistance des objets de boutique.
  - `MonsterSilhouette.test.ts` — silhouette humanoïde réellement construite, épaules et membres cylindriques, posture de garde.
  - *Restant* : roundtrip `MonsterIO`, persistance `LocalStorageRunRepository`, génération de carte `RegionMap`.
- [ ] **Typage strict TypeScript** : activer `noUnusedLocals` et `noUncheckedIndexedAccess` dans `tsconfig.app.json`.

---

## ✅ Historique des réalisations

### 🧹 Optimisations & Assets (2026-09)
- [x] ✅ **Filtres et tris de la Boutique d'Aventurier** : filtres dédiés par statistique (Force, Vitesse, Constitution, Savoir, Instinct, Armure CA, Soins/PV, Combat spécial) et tris dynamiques (Rayon, Achetables, Prix ↗/↘, Type) dans `ShopView.svelte`.
- [x] ✅ **Suppression des images PNG inutilisées** (`monster_1.png`, `monster_2.png`) : suppression des imports et allègement du bundle de ~320 Ko au profit du rendu 100 % SVG procédural.

### 🎨 Design & Navigation Globale (2026-09)
- [x] ✅ **Header & Navigation persistants** (`Header.svelte`) : barre supérieure affichée sur tous les écrans (Accueil, Carte, Arène, Boutique, Victoire, Défaite) avec indicateurs en direct (Région, Champion, Niveau, Or, Score), raccourci Codex et bouton Menu.
- [x] ✅ **Footer persistant** (`Footer.svelte`) : pied de page 4 colonnes (Branding & Stack, Liens rapides, Rappel des formules mathématiques D&D 5e, Statut de session LocalStorage).
- [x] ✅ **Codex & Guide de Jeu interactif** (`CodexModal.svelte`) : modale accessible d'un clic partout avec onglets *Règles D&D 5e*, *Table des 6 éléments* et *Régions & Boss*.
- [x] ✅ **Page d'accueil complète** (`Home.svelte`) : Hero banner, métriques du jeu, détection de partie active, création de champion, fiches de fonctionnalités et vitrine des régions.
- [x] ✅ **Création de champion personnalisé** (`MonsterCreation.ts` + `MonsterForge.ts` + `MonsterCreator.svelte`) : assistant en 3 étapes (type élémentaire → répartition de 10 points de destin avec aperçu PV/CA → nom libre ou tiré au sort), en remplacement des 5 starters figés.

### 🛡️ Fiabilité & Résolution des Bugs (2026-09)
- [x] ✅ **Protection achat de potion à PV max** : `buyShopItem` empêche l'achat si les PV sont pleins et désactive le bouton dans `ShopView.svelte`.
- [x] ✅ **Clonage sans mutation des capacités** : `MoveRepositories.ts` clone chaque move par valeur pour éviter les pollutions d'état partagé.
- [x] ✅ **Résolution des coups critiques** : `BattleEngine.ts` garantit le succès d'un coup critique naturel (20) et fumbles (1).
- [x] ✅ **IA tactique et gestion des cooldowns** : `BattleController.ts` filtre les capacités en recharge, évite les soins inutiles et privilégie les types efficaces.
- [x] ✅ **Sécurisation des actions en tour ennemi** : `MoveDisplayer.svelte` désactivé quand ce n'est pas le tour du joueur.
- [x] ✅ **Génération d'identifiants robuste** : fallback compteur dans `RandomEnemyFactory.ts`.
- [x] ✅ **Validation stricte de la sauvegarde** : vérification complète des snapshots dans `LocalStorageRunRepository.ts`.
- [x] ✅ **Correction des fuites mémoire** : destruction des timers dans `HealthBar.svelte` et `battleStore.ts`.
- [x] ✅ **Tirage aléatoire équitable** : algorithme Fisher-Yates dans `monsterFactory.ts`.

### 🎲 Moteur D&D 5e & Gameplay (2026-09)
- [x] ✅ **Moteur d20 conforme aux règles** : jets d'attaque `1d20 + mod(stat) + précision vs CA`, Classe d'Armure `10 + mod(Vitesse) + reliques`, dégâts par dés d'arme physiques et scaling magique sur le Savoir.
- [x] ✅ **Rôle de l'Instinct & du Savoir** : Instinct étendant la plage critique (`effectiveCritRange`) et modulant le regard SVG ; Savoir augmentant les soins `(niveau + 1)d4 + mod(CON) + mod(Savoir)`.
- [x] ✅ **Système d'Initiative au tour par tour** : jet `1d20 + mod(Vitesse)` à chaque round avec annulation de riposte en cas de K.O.
- [x] ✅ **6 Types élémentaires équilibrés** : Feu, Eau, Plante, Électricité, Roche, Normal avec multiplicateurs physiques (×2 / ×0.5) et magiques amortis (×1.5 / ×0.67).
- [x] ✅ **Courbe de progression & gains de stats ciblés** : progression par niveau sur Force, Vitesse, Constitution, Savoir et Instinct selon l'archétype du monstre.
- [x] ✅ **Sélection des capacités au Level-up & Grimoire dédié** (`MoveManagerModal.svelte`) : choix interactif des 1 à 4 attaques parmi l'ensemble des capacités débloquées à chaque montée de niveau, et menu d'accès permanent via le bouton « 📜 Attaques » dans la barre supérieure.
- [x] ✅ **Précision inversement proportionnelle à la puissance** : bonus `🎯 +N` sur les attaques faibles pour valoriser la diversité des choix.

### 🗺️ Mode Roguelike & Économie (2026-09)
- [x] ✅ **Carte procédurale de région** : génération par couches (combats sauvages typés, feux de camp +50 % PV, boutiques, boss régional).
- [x] ✅ **Boutique & 30+ Reliques passives** : achat de reliques à effets permanents (dégâts, armure, vol de vie, soins au départ, boost de caractéristiques).
- [x] ✅ **Relique rare post-Boss & transition inter-régions** : octroi d'une relique majeure à la mort du boss et passage fluide vers la région suivante ou la victoire finale.
- [x] ✅ **Panthéon des Champions & Export/Import JSON** : enregistrement automatique des monstres victorieux de boss, stockage LocalStorage, téléchargement `.json` depuis le Panthéon et import direct de monstres.
- [x] ✅ **Sauvegarde automatique LocalStorage** : persistance de l'état de la run après chaque nœud ou combat.
- [x] ✅ **Rendu visuel procédural SVG** : sprites personnalisés par élément avec expressions réactives (dégâts, fatigue, joie) et ornements de boss.
  - *Remplacé en octobre 2026* par le maillage 3D WebGL (voir section « 3D, Arène & Animations » ci-dessous) : `SpriteDisplayer.svelte` héberge désormais un `<canvas>` et est monté partout où le monstre est affiché (arène, fiche du champion, Panthéon de l'accueil). Le SVG procédural des monstres n'est plus utilisé nulle part.

---

### 🎮 3D, Arène & Animations (2026-10)
- [x] ✅ **Monstres en 3D (WebGL / three.js)** (`src/lib/renderers/MonsterWebGLRenderer.ts`, monté par `SpriteDisplayer.svelte`) : maillage procédural construit par primitives — **cylindres** pour tous les membres (bras, avant-bras, cuisses, tibias, cou, épaules), **sphères** pour les articulations et le crâne. Dépendance ajoutée : `three` + `@types/three`.
- [x] ✅ **Apparence humanoïde** : épaule → coude → poignet en chaîne, torse, pelvis, cou, tête avec yeux / sourcils / iris.
- [x] ✅ **Garde de combat** : poings remontés à hauteur du menton, coudes écartés du torse, avant-bras remontant vers l'intérieur, jambes à l'assise élargie.
- [x] ✅ **Arène Street Fighter** : carte retirée du champ de bataille, HUD de combattant (`FighterHud.svelte`), décor de sol (horizon, lignes de sol, ombre portée), alignement au sol des deux camps.
- [x] ✅ **Trois familles d'animation d'attaque** + **victoire / défaite**, et report de fin de round (détails en section 3).

---

## ⚠️ Limites connues (à traiter)

- **Rendu jamais validé à l'écran.** L'environnement de développement ne peut pas exécuter le rendu Svelte (`svelte/compiler` indisponible) ni contrôler visuellement le canvas WebGL. Les tests valident la **géométrie construite**, le **markup** et les **règles CSS**, pas l'image. Durées, amplitudes, courbes d'accélération et angles de garde restent des choix de conception à ajuster avec `bun run dev`.
- **Animations CSS pures, sans `prefers-reduced-motion`.** Tant que l'item d'accessibilité n'est pas traité, aucune réduction de mouvement n'est proposée.
- **Conflit attaque / réaction aux dégâts.** Le `feedback` du store est celui de l'**action**, pas des dégâts subis : le monstre qui frappe reçoit aussi `shake`. L'ordre CSS arbitre en faveur de l'animation d'attaque ; le comportement alternatif n'est pas tranché.
- **Aucune migration des données existantes.** Les champions enregistrés avant la fusion des objets conservent une fiche sans objet persistant, et les runs sauvegardées gardent l'ancienne échelle de PV.
- **Rééquilibrage outillé, mais encore partiel.** `scripts/balanceSim.ts` est revenu dans le dépôt (duels montés avec le vrai moteur et les vraies fabriques). Il ignore encore les reliques, les objets et les consommables, et suppose un champion qui joue de son mieux : les taux de victoire réels en run sont donc **meilleurs** que ceux affichés. Le boss de Rivages d'Abysse (type Eau) tombe aussi à ~58 % de victoire, contre ~80 % pour les trois autres : le contre-type punit fort.
- **Creux de tension entre les niveaux 7 et 9.** Le taux de victoire en miroir y redescend à 23-38 % contre 56-67 % au niveau 5 et 50-63 % au niveau 13. Cause identifiée : sur ces deux paliers, aucune des 4 capacités du panel ne dépasse la puissance 100. Le levier est de décaler un palier de puissance (ou d'en ajouter un entre les niveaux 7 et 9).
- **Rejeu d'un champion : réserve de PV réduite.** Le niveau repart à 1 mais les caractéristiques de fin de run sont conservées, donc les PV max (dépendants du niveau) chutent. Rebaser les stats n'est pas techniquement reconstituable : les buffs sont permanents et l'allocation initiale des points de destin n'est pas stockée.