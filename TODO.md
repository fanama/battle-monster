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
  7. **Difficulté** : `threat` et `wildLevelOffsets` par région (ramp croisante 0.82→0.92), panneau d'ennemis composé des 4 plus fortes capacités, IA qui ne gaspille plus de tour, boss à PV ×1.2.
  8. **Capacités signature — archétypes de sauvages** : l'ennemi tire 8-12 par stat (+ croissance du type) et l'Instinct du champion est figé à 12 à la forge ; capacité 130 débloquée au niveau 9 (au lieu de 11) pour accélérer les duels du creux. Sauvages instancient un archétype (signature / brute / statuteur / tank, quotas de panel dans `monsterFactory`), l'IA déduit l'identité du panel et joue son gimmick (`BattleController.selectEnemyMove`), boss toujours en signature.
  Résultat mesuré : victoire en miroir **48-79 %** (creux n7 roche 48 % = le plus dur du run), boss régionaux **57-76 %**, sauvages plus accessibles (ADN Dragon Quest), duels 4-8 rounds. Test dédié `tests/EnemyArchetypes.test.ts`.
  9. **Plafonds des reliques (choix joueur : sévères, reliques seules, anti-doublon)** : cumulés bornés (vol de vie ≤ 10 %, dégâts ≤ +10 %, soin de début ≤ +20 %, EXP ≤ +25 %) via `RELIC_EFFECT_CAPS` ; plage de critiques unique (max, jamais somme) ; une même relique ne se possède qu'une fois (`ownsRelic` + tirages post-combat filtrés). L'équipement porté garde son échelle indépendante (hors plafond). Test dédié `tests/RelicCaps.test.ts`.
  Résultat mesuré : victoire en miroir passée de **3-35 % à 44-72 %**, combats ramenés à 3.5-10 rounds quel que soit le niveau, difficulté croissante de région en région.
  10. **Correctif — aucune armure dans la boutique (filtre « Toutes »)** : le filtre d'affinité par défaut tombait dans la branche équipement et se comparait à `effect.stat.all` (toujours absent) — **tout le rayon Forge était masqué**, armures comprises. Les prédicats sont extraits dans `src/lib/styles/shopFilters.ts` (testables), `'all'` court-circuite en premier et l'équipement gagne aussi la classe « Combat » (vol de vie / % de dégâts / critiques). Test dédié `tests/ShopFilters.test.ts` (7 cas : stock réel des 4 régions passé par les mêmes prédicats que `ShopView`).
  11. **Rayon Forge : armes, armures et accessoires garantis (choix joueur)** : `SHOP_SLOT_PRIORITY` (`weapon`, `armor`, `accessory`) — `buildEquipmentShopItems` sert **une pièce de chaque famille** avant de compléter au hasard dans le poly entier (casques/boucliers en bonus), budget régional et anti-doublon respectés ; le rayon standard passe de **2 à 4 pièces** (`rollShopStock(…, 4, …)` dans `battleStore`). Le catalogue d'équipements passe de **21 à 30 pièces** (8 armes, 7 armures, 8 accessoires) pour que chaque famille ait du choix à tous les budgets (≤ 65 / ≤ 80 / ≤ 95 / ∞ 💰). Tests dédiés dans `tests/Equipment.test.ts`.

---

### 2bis. Déblocage des éléments par les boss (P1 — 2026-10)
- [x] ✅ **Un nouveau run ne choisit plus son type** : le champion naît **Normal** (`DEFAULT_CHAMPION_TYPE`), seul type toujours disponible ; le choix de type à la création ne propose que les éléments **débloqués** (les autres sont verrouillés dans `MonsterCreator`).
- [x] ✅ **Un boss battu révèle son élément** (`RegionDef.unlocks`) : Verdure → Plante, Abysse → Eau, Braise → Feu, Citadelle (boss neutre) → Électricité + Roche. Persisté hors run (`LocalStorageProgressionRepository` + port `ProgressionRepository`) : les éléments débloqués reviennent aux runs suivantes.
- [x] ✅ **Adoption mi-run** : à l'écran de fin de région, le champion en cours peut adopter l'élément révélé (`BattleController.retypeChampion`) — mêmes stats, PV, expérience et équipement, panel **reconstruit** sur le nouveau type, `run.unlockedThisRegion` portant l'offre.

---

### 3. UX, Polish & Accessibilité (P2)
- [x] ✅ **Effets affichés sur les surfaces de sélection d'attaques** (`CommandWindow.svelte` — fenêtre de détail, et `MoveManagerModal.svelte`) : nature du move, puissance `P.N`, précision `🎯 +N`, soin `💚 +N PV`, buff `⬆ +N Stat`, efficacité `⚔ Super eff. / 🛡 Peu eff.` et statut élémentaire (icône, nom, chance %) — ce dernier avec le **DD** et la description de l'effet. (Surface d'origine : les cartes `MoveDisplayer.svelte`, remplacées par le menu deux temps — voir §3bis.)
- [x] ✅ **Arène en vue Street Fighter** : la carte du monstre a quitté le champ de bataille (`styles.layout.arena` n'est plus utilisée qu'à un seul endroit). HUD de combattant (`FighterHud.svelte`) ancré aux deux coins opposés en haut de l'arène, horizon et lignes de sol, ombre portée et alignement au sol. La hauteur du sprite est verrouillée par un test pour empêcher un rognage des pieds (`overflow-hidden`).
- [x] ✅ **Monstres 3D humanoïdes en garde de combat** (`MonsterWebGLRenderer.ts`) : maillage procédural en **cylindres** pour les membres et en sphères pour les articulations, avec épaules, torse, crâne et visage. Posture de boxeur : poings remontés devant la face, coudes écartés du buste, jambes à l'assise élargie. Les bornes du maillage sont testées pour ne jamais déborder du cadre.
- [x] ✅ **Trois animations d'attaque distinctes + animations de fin de combat** (`MonsterDisplayer.svelte`) :
  - *Physique* : armement en arrière puis charge franche vers l'adversaire.
  - *À distance* : recul de préparation puis projection modérée (le coup part sans contact).
  - *Soin / Buff* : **aucun déplacement horizontal** — élévation et illumination, monstre ancré au sol.
  - Chaque famille existe en version joueur et ennemi, strictement miroir. L'ordre des règles CSS est significatif : les animations d'attaque sont déclarées **après** `.shake` pour ne pas être masquées par la réaction aux dégâts sur un coup réussi.
  - *Victoire* : rebond avec amplification et illumination progressive. *Défaite* : affaissement, rotation, désaturation et effacement. Bandeau VICTOIRE / DÉFAITE en surimpression.
- [x] ✅ **Attente avant l'écran suivant** : `ROUND_END_DELAY` (1400 ms, `battleStore.ts`) — le vainqueur est écrit dans l'état immédiatement pour que l'animation se joue, mais les récompenses, la relique, la fin de run et la permadeath sont appliquées après le délai, via `_scheduleRoundEnd` (idempotent, annulé par `_clearTimers`). Les quatre chemins de coup fatal y passent, verrouillé par un test de garde.
- [x] ✅ **Sorts à distance en 3D (calque élémentaire de l'arène)** : le projectile d'une attaque magique quitte la boîte du lanceur — un canvas WebGL couvre désormais **toute l'arène** (`ArenaSpellLayer.svelte` + `SpellVfxLayer.ts`). Le sort part de la **main avant** du lanceur, décrit un arc bombé qui avance vers la caméra (perspective douce calée sur les pixels de l'arène : il grossit et passe devant la scène) et explose sur le buste de la cible en gerbe d'impact (éclair, anneau de choc, éclats). Rendu additif sans test de profondeur, boucle rAF arrêtée dès qu'aucun effet n'est actif. Les **six éléments** portent leur palette et leur physique, un coup manqué dissipe le sort avant la cible, un critique élargit la gerbe, et un soin / buff joue un cordon élémentaire sur le lanceur. `spellVfx.ts` reste **pur** (palette, cadencement, trajectoire, projection, maillages) donc testable sans GPU ; `SpellVfxLayer.ts` ne téléverse et ne joue que des échantillons. Le routage `attackFamily` est **partagé** avec `MonsterDisplayer` : l'effet 3D et la pose articulée ne peuvent plus diverger. L'orbe CSS devient le **repli** (piloté par `vfxStore.spellVfxReady`) si le contexte WebGL manque. Vérifié sur **pixels réels** en Chrome headless avec WebGL (gerbe visible par élément, raté sombre sans cœur lumineux, canvas vidé au repos), en plus de `tests/SpellVfx.test.ts`.
- [ ] **Accessibilité lecteur d'écran & ARIA** : ajouter `aria-live="polite"` sur le journal de combat (`Logs.svelte`) et focus trap sur les modales.
- [ ] **Support `prefers-reduced-motion`** : désactiver ou atténuer les secousses de caméra (shake) et animations d'attaque pour les utilisateurs sensibles.
- [ ] **Unification de la langue (100 % FR)** : harmoniser les derniers termes anglophones résiduels.
- [ ] **Effets sonores (Web Audio API)** : synthétiser des sons rétro légers pour les jets de dés d20, coups critiques, coups portés, soins et victoires.
- [x] **Détails cumulés des reliques** : onglet « Reliques » listant l'ensemble des passifs actifs et leurs bonus cumulés (`RelicList.svelte`).

---

### 3bis. Refonte d'interface « Dragon Quest » (P1 — 2026-10)

**Constat de départ (analyse complète du code)** : 92 fichiers, 23 467 lignes, architecture en couches respectée — mais **aucun langage visuel commun**. Le fichier censé porter le design system (`src/lib/styles/style.ts`) était référencé **8 fois dans 2 fichiers sur 92** ; tout le reste écrivait ses classes à la main (100 `font-serif`, 134 `font-mono`, 65 `rounded-xl`, 50 `text-amber-200`…). L'ambre de l'arène, le violet du Grimoire, l'émeraude de l'Équipement et les couleurs de type des cartes se disputaient l'écran. L'écran de combat empilait à lui seul : barre de région, 6 onglets, 2 HUD de combattant, bandeau boss, bandeau de fin, calque de sorts 3D et décor — puis 4 cartes de capacité portant chacune jusqu'à 6 pastilles, plus 2 boutons.

- [x] ✅ **Design system DQ unique** (`src/lib/styles/style.ts`, export `dq`) : fenêtre, fenêtre encastrée, barre de titre, ligne de menu, curseur `▸`, pastilles neutre / favorable / défavorable. Esthétique DQ XI — panneau bleu-nuit translucide, filet clair d'un pixel, coins doux, **aucune lueur ni dégradé**. Seules les couleurs qui portent une information restent vives : région, type élémentaire, or, PV.
- [x] ✅ **Menu de combat en deux temps** (`CommandWindow.svelte`, nouveau) : ① `Attaquer / Sacoche / Grimoire / Faiblesses`, ② la liste des capacités (nom, type, état de recharge) et une **fenêtre de détail** pour la capacité survolée ou sélectionnée. Souris, tactile et **clavier** (↑ ↓, Entrée, Échap) — un menu à curseur doit répondre au clavier. Une capacité en recharge reste **inspectable** : `aria-disabled` plutôt que `disabled`, donc le focus l'atteint et ses chiffres s'affichent, mais l'activation est inerte.
- [x] ✅ **Aucune commande morte** : le moteur n'a pas de fuite, donc pas de bouton « Fuir » — le gabarit DQ en comporte un, il n'a pas été recopié. La 4ᵉ entrée (`Faiblesses`) ouvre le Codex élémentaire, exactement comme l'ancien bouton qu'elle remplace.
- [x] ✅ **`MoveDisplayer.svelte` supprimé** (185 lignes) : la grille de cartes n'existait plus que comme code mort dès la fenêtre de commande en place. `MoveButtonEffects.test.ts` a été **retargé** sur la fenêtre de détail et le Grimoire **sans perdre une seule garantie** (puissance, précision, soin, buff, efficacité, statut, DD) et gagne les garde-fous du menu (deux temps, clavier, absence de commande morte).
- [x] ✅ **Toutes les surfaces passées au chrome DQ** : arène et bandeaux de fin, HUD des combattants, barre d'onglets, ligne d'état du run, carte de région, boutique, écran titre et création du champion, modales (Sacoche, Équipement, Grimoire, Codex), fiches (Champion, Reliques, Journal), en-tête et pied de page.
- [x] ✅ **Code mort du design supprimé** : `styles.actionBar` (et son `textureOverlay`) ainsi que l'utilitaire global `.pattern-dots`, vestiges du thème ambre, ne sont plus référencés nulle part.
- [x] ✅ **Vérifié sur l'application réelle** : `bun run dev` + Chrome headless. Le DOM rendu de la fenêtre de commande est inspecté sur ses trois états (menu racine avec son aide contextuelle, liste des capacités avec « prêt » / « ⏳ 2 tours », détail « P.85 / 🎯 +2 / 🛡 Peu efficace / 🔥 Brûlure 35% DD 12 ») et l'écran titre est capturé. Le maillage du bestiaire 3D, lui, reste à regarder à l'œil.

---

### 4. Hygiène de code & Infrastructure (P3)
- [ ] **Découper `App.svelte` (876 lignes)** : le fichier porte à lui seul **9 écrans** (titre, fin de run, victoire, arène, carte, boutique, champion, reliques, journal), **5 modales** et l'overlay de célébration, plus le décor DQ de l'arène et ses keyframes. Chaque écran devrait devenir un composant d'`screens/`, l'orchestrateur ne gardant que le routage d'onglets — c'est le principal frein à toute évolution d'interface.
- [ ] **Découper les gros modules** : `monsterRig.ts` (1410), `battleStore.ts` (1349), `Relic.ts` (1032) et `BattleController.ts` (948) dépassent le seuil où un fichier cesse d'être relisible. Les découpages naturels : squelette / parties du corps / équipement pour le rig, catalogue / effets / offre de boutique pour les reliques.
- [ ] **Retirer la dépendance `three`** : déclarée dans `package.json`, **importée nulle part** (0 occurrence) — le rendu est du WebGL brut, sans librairie 3D. La ligne du README a été corrigée ; il reste à retirer le paquet.
- [ ] **`docs/index.md` est périmé** : il documente un « Relic Shopping Guide » alors que **les reliques ne s'achètent plus** depuis la refonte (elles se gagnent en combat), et son pied de page contient un `$(date +%Y-%m-%d)` non expansé, copié d'une commande shell.
- [x] **Suppression des assets et code morts résiduels** :
  - Composants et fichiers de template retirés (`src/lib/Counter.svelte`, `src/assets/svelte.svg`, `public/vite.svg`, `bun.lockb`).
  - Fonctions non appelées retirées de `MoveRepositories.ts` (`getMoveById`, `getMoveByName`, `getAllMoves`, `getMovesByType`).
  - Imports, helpers et clés de style morts éliminés (`UI_COLORS`, `lastLayerIndex`, `reachableCols`, `createLocalStorageRunRepository`, `styles.layout.title`, `styles.actionBar.moveWrapper`, `styles.winner`).
- [x] ✅ **Suite de tests automatisés (`bun test`, runner natif Bun)** — 303 tests sur 27 fichiers, ~900 ms :
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
  - `HumanRig.test.ts` — champion chibi anime : 10 articulations partagées, tête ~moitié de la figure (plus large que le torse), sommet hérissé de cheveux, grands yeux (sclère + iris), casque cohabitant avec les pointes, équipement 3D visible emplacement par emplacement, tenue dans le cadre caméra.
  - `MonsterPowerRelics.test.ts` — les reliques de combat sont le pouvoir du monstre vaincu (`powerOf`), effets et `id` du catalogue conservés, offres de victoire rattachées à l'ennemi.
  - `TypeUnlock.test.ts` — déblocage des éléments : chaque type non-Normal révélé par une seule région, Normal toujours disponible, persistance localStorage (défaut / doublons / données corrompues), reforge `retypeChampion` (stats/PV/équipement conservés, panel du nouveau type) et déblocage/adoption côté store.
  - `SpellVfx.test.ts` — calque 3D des sorts : palette et cadencement par élément, trajectoire (arc, profondeur, dissipation d'un raté, robustesse à un `t`/une force aberrants), gerbe d'impact et effet du critique, projection calée sur les pixels de l'arène, maillages (orb, lueur, éclat, anneau), et câblage UI (couche montée au-dessus des combattants, ancrages sur les silhouettes, repli CSS piloté par le store).
  - *Restant* : roundtrip `MonsterIO`, persistance `LocalStorageRunRepository`, génération de carte `RegionMap`.
- [ ] **Typage strict TypeScript** : activer `noUnusedLocals` et `noUncheckedIndexedAccess` dans `tsconfig.app.json`.

---

## ✅ Historique des réalisations

### 🧹 Optimisations & Assets (2026-09)
- [x] ✅ **Filtres et tris de la Boutique d'Aventurier** : filtres dédiés par statistique (Force, Vitesse, Constitution, Savoir, Instinct, Armure CA, Soins/PV, Combat spécial) et tris dynamiques (Rayon, Achetables, Prix ↗/↘, Type) dans `ShopView.svelte` — appliqués aux **potions** et **équipements** (les reliques ne sont plus vendues).
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
- [x] ✅ **Sécurisation des actions en tour ennemi** : les commandes de combat sont éteintes quand ce n'est pas le tour du joueur (`MoveDisplayer.svelte` hier, la fenêtre de commande aujourd'hui).
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
- [x] ✅ **Boutique — potions et équipements uniquement** : le rayon reliques est supprimé (`rollShopStock` ne renvoie plus de `kind: 'relic'`, `ShopView.svelte` perd son onglet et sa section) ; l'or n'achète plus que des **potions** (tout le catalogue de consommables + soin total) et un rayon **Forge & Équipements** par région. Les reliques restent le **pouvoir des monstres vaincus** (offres post-combat).
- [x] ✅ **Relique rare post-Boss & transition inter-régions** : octroi d'une relique majeure à la mort du boss et passage fluide vers la région suivante ou la victoire finale.
- [x] ✅ **Panthéon des Champions & Export/Import JSON** : enregistrement automatique des monstres victorieux de boss, stockage LocalStorage, téléchargement `.json` depuis le Panthéon et import direct de monstres.
- [x] ✅ **Sauvegarde automatique LocalStorage** : persistance de l'état de la run après chaque nœud ou combat.
- [x] ✅ **Rendu visuel procédural SVG** : sprites personnalisés par élément avec expressions réactives (dégâts, fatigue, joie) et ornements de boss.
  - *Remplacé en octobre 2026* par le maillage 3D WebGL (voir section « 3D, Arène & Animations » ci-dessous) : `SpriteDisplayer.svelte` héberge désormais un `<canvas>` et est monté partout où le monstre est affiché (arène, fiche du champion, Panthéon de l'accueil). Le SVG procédural des monstres n'est plus utilisé nulle part.

---

### 🎮 3D, Arène & Animations (2026-10)
- [x] ✅ **Monstres en 3D (WebGL brut)** (`src/lib/renderers/MonsterWebGLRenderer.ts`, monté par `SpriteDisplayer.svelte`) : maillage procédural construit par primitives — **cylindres** pour tous les membres (bras, avant-bras, cuisses, tibias, cou, épaules), **sphères** pour les articulations et le crâne. `three` / `@types/three` figurent encore dans `package.json` mais **ne sont importés nulle part** : le rendu passe par les shaders et les matrices de `monsterRig.ts`.
- [x] ✅ **Apparence humanoïde** : épaule → coude → poignet en chaîne, torse, pelvis, cou, tête avec yeux / sourcils / iris.
- [x] ✅ **Garde de combat** : poings remontés à hauteur du menton, coudes écartés du torse, avant-bras remontant vers l'intérieur, jambes à l'assise élargie.
- [x] ✅ **Arène Street Fighter** : carte retirée du champ de bataille, HUD de combattant (`FighterHud.svelte`), décor de sol (horizon, lignes de sol, ombre portée), alignement au sol des deux camps.
- [x] ✅ **Trois familles d'animation d'attaque** + **victoire / défaite**, et report de fin de round (détails en section 3).
- [x] ✅ **Champion chibi anime (façon Dragon Ball) & équipement visible** (`buildHumanRig` dans `monsterRig.ts`) : le camp joueur devient un **humain chibi** — grosse tête (~44 % de la figure), **cheveux en pointes** (calotte + 11 cones), **grands yeux d'anime** (sclère, iris élémentaire, pupille, double reflet, sourcil), membres courts et trapus — au squelette identique au monstre (10 articulations) : les poses d'action restent partagées. La tunique/cape/bottes sont conservées, teintées par le type. Le casque cohabite avec les pointes (tous deux visibles). Les pièces **portées** se greffent au maillage : arme (main droite), bouclier (bras gauche), plastron, casque, amulette. `SpriteDisplayer` transmet l'espèce (`isPlayer` → humain, `species="human"` sur la fiche et le Panthéon) et un `gearProvider` relu à chaque frame : l'armure 3D apparaît/disparaît à l'équipement, sans remontage. Tests dédiés `tests/HumanRig.test.ts`.
- [x] ✅ **Reliques = pouvoir des monstres vaincus** : `Relic.powerOf` (nom + type) rattache chaque relique de combat à la créature terrassée, et `rollMonsterPowerOffers` / `rollRareMonsterPowerOffers` partent du monstre vaincu (effets, prix et `id` du catalogue conservés — équilibrage inchangé). L'écran de butin et la liste des reliques affichent « ⚡ Pouvoir de X ». Test dédié `tests/MonsterPowerRelics.test.ts`.
- [x] ✅ **Bestiaire & champion chibi fantasy, contour encré et toon 2 tons** (`monsterRig.ts`, `MonsterWebGLRenderer.ts`) : monstres **et** champion passent au langage visuel chibi — grosse tête (~45 % de la figure, ratio vérifié pour les 6 types), buste court et rond, membres courts, pieds ronds, épaules resserrées pour que la tête reste la partie la plus large. **Visage expressif partagé** par une fabrique d'œil unique (`addAnimeEye` : sclère, iris, pupille, double reflet, sourcil) + museau, truffe et bouche souriante (nuances sombres de la palette du corps via `shade`). Le renderer gagne une **passe de contour encré** (coque gonflée le long des normales, `cullFace(FRONT)`, aplat d'encre, dessinée **avant** le corps, épaisseur adaptée au maillage mobile) et abandonne le cel-shading 3 paliers pour un **aplat 2 tons** ; l'aura de bordure est réservée aux boss. L'équipement du champion devient plus lisible (gorgerin, épaulières détachées, tassettes, casque à garde-joues + nasal + cimier). La couronne de boss est abaissée (bandeau large + trois pointes basses) pour tenir dans le cadre chibi. Tests dédiés `tests/ChibiStyle.test.ts` (12 cas). **Vérifié hors tests** : la sonde headless-Chrome (SwiftShader) instancie le vrai renderer — shaders compilés/liés (`glError = 0`), ~31 k pixels de corps coloré et ~6 k pixels d'encre par vignette, et une planche de 4 vignettes rendue sans erreur.

---

## ⚠️ Limites connues (à traiter)

- **Rendu Svelte jamais exécuté.** L'environnement de développement ne peut pas exécuter le rendu Svelte (`svelte/compiler` indisponible) : les tests valident la **géométrie construite**, le **markup** et les **règles CSS**. Le canvas WebGL, lui, est désormais vérifiable hors tests : une sonde headless-Chrome (SwiftShader) instancie `MonsterWebGLRenderer` et relit les pixels du framebuffer, ce qui atteste de la compilation des shaders, du dessin des deux passes (corps + contour) et du rendu des actions — mais **pas** de l'intégration dans l'arène (tailles CSS, cadrage réel, enchaînement des animations). Durées, amplitudes, courbes d'accélération, angles de garde, épaisseur du trait et cadrage restent à ajuster avec `bun run dev`.
- **Animations CSS pures, sans `prefers-reduced-motion`.** Tant que l'item d'accessibilité n'est pas traité, aucune réduction de mouvement n'est proposée.
- **Conflit attaque / réaction aux dégâts.** Le `feedback` du store est celui de l'**action**, pas des dégâts subis : le monstre qui frappe reçoit aussi `shake`. L'ordre CSS arbitre en faveur de l'animation d'attaque ; le comportement alternatif n'est pas tranché.
- **Aucune migration des données existantes.** Les champions enregistrés avant la fusion des objets conservent une fiche sans objet persistant, et les runs sauvegardées gardent l'ancienne échelle de PV. Les reliques sauvegardées avant `powerOf` s'affichent simplement sans provenance.
- **Armure du champion générique.** Le rig humain dessine **une pièce par emplacement** (formes types : épée, écu, plastron, casque, amulette) et non un maillage dédié par objet du catalogue : la silhouette est correcte, les variantes visuelles fines restent à faire.
- **Rééquilibrage outillé, mais encore partiel.** `scripts/balanceSim.ts` est revenu dans le dépôt (duels montés avec le vrai moteur et les vraies fabriques). Il ignore encore les reliques, les objets et les consommables, et suppose un champion qui joue de son mieux : les taux de victoire réels en run sont donc **meilleurs** que ceux affichés. Le boss de Rivages d'Abysse (type Eau) tombe aussi à ~58 % de victoire, contre ~80 % pour les trois autres : le contre-type punit fort.
- **Creux de tension entre les niveaux 7 et 9.** Le taux de victoire en miroir y redescend à 23-38 % contre 56-67 % au niveau 5 et 50-63 % au niveau 13. Cause identifiée : sur ces deux paliers, aucune des 4 capacités du panel ne dépasse la puissance 100. Le levier est de décaler un palier de puissance (ou d'en ajouter un entre les niveaux 7 et 9).
- **Rejeu d'un champion : réserve de PV réduite.** Le niveau repart à 1 mais les caractéristiques de fin de run sont conservées, donc les PV max (dépendants du niveau) chutent. Rebaser les stats n'est pas techniquement reconstituable : les buffs sont permanents et l'allocation initiale des points de destin n'est pas stockée.