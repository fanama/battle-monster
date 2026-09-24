# TODO — Monster Battle D&D 5e Roguelike

Dernière mise à jour : Septembre 2026.
Légende : 🐛 Bug / 🧹 Hygiène / 🎮 Gameplay / ✨ Feature / 🧪 Tests / ♿ Accessibilité

---

## 📋 Backlog des tâches à réaliser

### 1. Fiabilité & Moteur de jeu (P0)
- [x] ✅ **Cap & apprentissage à 4 capacités** : limite stricte `MAX_MOVES = 4`, remplacement automatique et intelligent de la capacité la plus faible lors du level-up avec journalisation détaillée (`BattleController.ts`, `Monster.ts`).
- [x] ✅ **Re-spawn déterministe au chargement** : sauvegarde et restauration de l'état exact (`enemyMonster` snapshot, PV, buffs, cooldowns) dans `LocalStorageRunRepository.ts` et `battleStore.ts`.
- [x] ✅ **File d'animations centralisée & anti-race conditions** : verrous d'attaque `isAttacking`/`isEnemyAttacking`, désactivation des boutons en cours d'action, et gestionnaire `_clearTimers` sur toutes les transitions.

---

### 2. Équilibrage & Gameplay (P1)
- [ ] **Classe d'Armure des tanks lents** : revoir la formule de base `CA = 10 + mod(Vitesse)` qui pénalise les monstres Roche/Plante lents (ex. intégrer un bonus d'armure naturelle ou mod(Constitution)).
- [x] ✅ **Régulation du scaling des boss** : adoucissement du niveau des boss (`maxLevel + 1` au lieu de `maxLevel + 2`) dans `BattleController.ts` pour éviter les pics de difficulté excessifs en Citadelle Céleste.
- [x] ✅ **Rôle mécanique pour SAG (Sagesse/Instinct) & Savoir** :
  - *Instinct (SAG)* : perception martiale élargissant la plage de coups critiques (`effectiveCritRange`), échelle visuelle du regard SVG.
  - *Savoir (INT)* : bonus direct sur les soins (`(niveau + 1)d4 + mod(CON) + mod(Savoir)`), scaling des attaques magiques.
- [x] ✅ **Choix de relique post-Boss** : offrir une relique rare après la victoire sur un boss de région avant d'avancer vers la région suivante.
- [ ] **Effets de statut élémentaires (d20)** :
  - 🔥 Brûlure : dégâts à chaque tour.
  - 💧 Gel / Sommeil : tour sauté avec jet de sauvegarde d20.
  - ⚡ Paralysie : réduction d'initiative et risque d'échec d'action.
  - 🌿 Poison : affaiblissement progressif des PV.
- [x] ✅ **Panthéon des Champions & Export/Import JSON** :
  - Enregistrement automatique des créatures après chaque victoire de boss régional (`LocalStorageChampionRepository`).
  - Onglet Panthéon complet sur l'écran d'accueil avec rejouabilité directe.
  - Exportation / Téléchargement et Importation de fichiers `.json` standardisés.

---

### 3. UX, Polish & Accessibilité (P2)
- [ ] **Accessibilité lecteur d'écran & ARIA** : ajouter `aria-live="polite"` sur le journal de combat (`Logs.svelte`) et focus trap sur les modales.
- [ ] **Support `prefers-reduced-motion`** : désactiver ou atténuer les secousses de caméra (shake) et animations d'attaque pour les utilisateurs sensibles.
- [ ] **Unification de la langue (100 % FR)** : harmoniser les derniers termes anglophones résiduels.
- [ ] **Effets sonores (Web Audio API)** : synthétiser des sons rétro légers pour les jets de dés d20, coups critiques, coups portés, soins et victoires.
- [ ] **Détails cumulés des reliques** : infobulle ou panneau listant l'ensemble des passifs actifs dans le HUD (`RunHud.svelte`).

---

### 4. Hygiène de code & Infrastructure (P3)
- [ ] **Suppression des assets et code morts résiduels** :
  - Retirer les composants et fichiers de template inutilisés (`src/lib/Counter.svelte`, `src/assets/svelte.svg`, `public/vite.svg`, `bun.lockb`).
  - Nettoyer les fonctions non appelées dans `MoveRepositories.ts` (`getMoveById`, `getMoveByName`, `getAllMoves`, `getMovesByType`).
- [ ] **Suite de tests automatisés (Vitest / Bun test)** :
  - Tests unitaires de `BattleEngine` (jets d'attaque d20, calculs CA, critiques 20 nat, fumbles 1 nat, dégâts physiques et magiques, initiative).
  - Tests de persistance `LocalStorageRunRepository` et roundtrip `MonsterIO`.
  - Tests de génération de carte déterministe `RegionMap`.
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