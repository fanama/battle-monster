# Monster Battle

Jeu de combat au tour par tour entre monstres, façon Pokémon/Dragon Quest, avec un **moteur de combat fidèle aux règles D&D 5** (machine de combat `d20`) et un **mode roguelike** (runs, régions, boss, reliques). Frontend **Svelte 5 + TypeScript + Tailwind CSS 4**, construit avec **Vite (rolldown-vite)** et **Bun**.

## Fonctionnalités

- **Roguelike par runs** : créez votre champion, progressez à travers une **carte de région**, battez le **boss** de chaque région. Une défaite met fin au run (permadeath).
- **Panthéon des Vétérans & Export / Import JSON** : chaque victoire contre un Boss de région immortalise votre monstre dans le Panthéon local (`LocalStorageChampionRepository`). Vous pouvez rejouer avec lui lors de futures runs, **télécharger sa fiche en fichier `.json` standardisé**, ou **importer un monstre** depuis vos fichiers directement dans l'onglet Panthéon de l'accueil.
- **Création de champion (3 étapes)** : ① choisissez un **type élémentaire** (qui confère +6 points d'affinité innée et détermine les attaques accessibles), ② répartissez **10 points de destin** sur Force / Vitesse / Constitution / Savoir / Instinct (plancher 8, plafond 18, aperçu live des PV, de la CA et des critiques), ③ **nommez** votre créature (tirage aléatoire cohérent avec le type disponible). Plus de starters figés : chaque run part d'un monstre unique.
- **Carte de région (Slay-the-Spire-like)** : chaque région présente une **carte SVG** aléatoire de nœuds (4 à 7 couches, jusqu'à 4 colonnes) — ⚔️ **Combat** (le premier est toujours un combat), 🩹 **Soin** (+50 % PV), 🛒 **Boutique** — chaque nœud de combat affiche le **type du monstre gardien** (🔥💧🌿✊⚡🪨, tiré parmi les types de la région, l'ennemi spawné correspond toujours) ; le **boss** attend en bout de carte.
- **Or & boutiques** : chaque combat sauvage rapporte de l'or (`8 + niveau`), les boss en rapportent `60`. Dépensez-le dans les boutiques (3 reliques au choix : 50-85 💰, potion de soin : 30 💰).
- **Régions & boss** : 4 régions (Plaines de Verdure, Rivages d'Abysse, Volcan de Braise, Citadelle Céleste) avec ennemis à niveaux croissants, un boss régional « gonflé » (PV ×1.4) et un choix de relique rare de boss après chaque victoire de région.
- **Reliques (objets passifs)** : après chaque combat sauvage et chaque boss, choisissez une relique parmi 3 (bonus de stats permanents, +CA, soin en début de combat, vol de vie, +10 % de dégâts, bonus de critiques) ou passez. Elles s'accumulent pour toute la run.
- **Score de run** : +15 × niveau de l'ennemi vaincu, bonus de boss/relique. Affiché en direct dans le HUD.
- **Gestion des attaques & Grimoire (`MoveManagerModal`)** : à chaque montée de niveau, une interface dédiée vous invite à configurer votre ensemble de 1 à 4 capacités parmi toutes celles débloquées. Vous pouvez également ouvrir ce Grimoire à tout moment hors combat via le bouton **« 📜 Attaques »** du bandeau supérieur pour modifier votre stratégie ou réordonner vos attaques.
- **Combat au tour par tour** : chaque monstre dispose d'un set de mouvements dont il apprend de nouveaux en montant de niveau.
- **Moteur de combat D&D** (voir « Règles du jeu ») : jets `1d20`, Classe d'Armure, modificateurs d'attribut, critiques/fumbles avec plage critique étendue par l'Instinct.
- **Table de types** (6 types) : le triangle `Feu > Plante > Eau > Feu` s'étend avec **Électricité** (bat Eau & Roche, faiblit vs Plante) et **Roche** (bat Feu, faiblit vs Eau, Plante, Électricité) — `normal` est neutre. **Physique** ×2 / ×0.5 ; **magie** ×1.5 / ×0.67 (dampée pour éviter les one-shots).
- **Initiative** : à chaque tour, `1d20 + mod(Vitesse)` détermine qui frappe en premier (égalité → le joueur).
- **XP par rang** : monstres `normal` → ×1, **boss** → ×1.5.
- **Mécaniques** :
  - Cooldowns sur les mouvements puissants,
  - Moves de soin (`(niveau + 1)d4 + mod(Constitution) + mod(Savoir)`) et buffs de stats permanents,
  - Expérience, montée de niveau et **croissance de stats selon le type** (Force, Vitesse, Constitution, Savoir, Instinct).
- Génération procédurale des ennemis régionalisés (nom, type, stats, niveau).
- **Combats dynamiques** : sprites SVG procéduraux avec regard réactif à l'Instinct, lunge/shake/flash, nombres de dégâts flottants, traînée rouge sur la barre de vie, pulsation basse PV.
- **Persistance** : progression sauvegardée automatiquement (`localStorage`) après chaque combat → **écran titre** avec « Continuer la partie », forge de champion ou sélection depuis le Panthéon.
- Interface responsive (mobile + desktop), esthétique « dark/fantasy », logs de combat scrollables, HUD de run, Codex D&D / table élémentaire interactif.

## Règles du jeu (moteur D&D)

Les règles ci-dessous sont portées depuis le moteur de combat du projet [`dnd`](../../dnd) (backend Go, `backend/internal/services/player_actions.go`) :

- **Modificateur d'attribut** : `floor((stat - 10) / 2)` — ex. 10 → +0, 12 → +1, 18 → +4.
- **CA (Classe d'Armure)** : `10 + mod(Vitesse)` (les monstres n'ont pas d'armure — un bonus d'armure s'y ajouterait).
- **PV max** : `max(Dé de Vie) + mod(Constitution)` (dé de vie par type : eau/plante/roche d10, feu/normal/électricité d8), mis à l'échelle par le niveau (`× (1.8 + niveau × 0.85)`) pour que la progression reste significative.
- **Jet d'attaque (physique)** : `1d20 + mod(Force) + Précision` ≥ CA.
- **Jet d'attaque (magique)** : `1d20 + mod(Savoir) + Précision` ≥ CA.
- **Précision vs puissance** : les attaques **faibles touchent plus souvent** que les puissantes — bonus de précision `max(0, floor((120 − power)/15))` (p. 30 → +6, p. ≥ 120 → +0). Les gros moves sont des coups risqués mais dévastateurs.
- **Initiative** : `1d20 + mod(Vitesse)` par camp pour l'ordre d'action (règle D&D).
- **Dégâts physiques** : dé selon la puissance du move (`1d6…1d20`) + `floor(puissance/10)` + `mod(Force)` + bonus, minimum 1.
- **Dégâts magiques** : `Savoir × (1 + power/120)` (critique → ×2) — les sorts puissants frappent plus fort pour compenser leur précision réduite.
- **Critique / fumble & Instinct** : 20 naturel (ou seuil critique étendu par `floor(mod(Instinct)/2)`) → toujours touché, dés dédoublés ; 1 naturel → fumble (raté).
- **Soin** : `(niveau + 1)d4 + mod(Constitution) + mod(Savoir)` PV, plafonnés au PV max.
- **Buff** : bonus additif permanent sur une stat (`StatBoost { stat, value }`) ; un buff de Constitution augmente aussi le PV max.
- **Expérience** : requise `80 × niveau − 40` (courbe linéaire douce) ; gagnée `40 + 16 × votre niveau`, modulée par l'écart de niveau (`1.5^écart`, bornée ×0.4…×2.5) et le rang du vaincu (`normal` 1 / `boss` 1.5).

## Démarrage

```bash
bun install        # installer les dépendances
bun run dev        # serveur de dev (Vite) 
bun run build      # build de production
bun run preview    # prévisualiser le build
```

Qualité :

```bash
bun run check      # svelte-check + tsc (0 erreur attendue)
```

## Architecture

Approche « Clean Architecture » simplifiée, le domaine est dépendant de rien (sans Svelte ni framework). L'injection de dépendance est **manuelle** : un composition root (`src/lib/container.ts`) est le seul endroit où les classes concrètes sont instanciées et câblées ; le domaine consomme des abstractions (ports, dés) injectées par constructeur — testable en isolation.

```
src/
├── core/                     # Domaine pur — aucune dépendance externe
│   ├── entities/
│   │   ├── Monster.ts        # Monster : stats, abilityModifier, CA, PV, exp, level-up, buffs, heal, cooldowns (+ DTO de sauvegarde MonsterIO)
│   │   ├── MonsterCreation.ts # Création de champion : affinités de type, points de destin, validation du brouillon
│   │   ├── Move.ts           # Types & contrat des mouvements
│   │   ├── Relic.ts          # Reliques + helpers (%) + offre/stock de boutique injectables (random)
│   │   ├── Region.ts         # Définition des 4 régions
│   │   ├── RegionMap.ts      # Carte de région (generateRegionMap injectable, nœuds combat/soin/boutique)
│   │   └── BattleState.ts    # État unifié du combat + run (BattleState / RunState)
│   └── services/
│       ├── BattleEngine.ts   # Résolution d20 (pure) → effets → logs/feedback (dés injectables, critiques avec Instinct)
│       ├── effectiveness.ts  # Table de types partagée (physique vs magie dampée) — moteur, IA, UI
│       ├── BattleController.ts # Orchestrateur de round/tour + run, IA ennemie, « résout » aussi l'initiative (DI, testable sans Svelte)
│       ├── MonsterExporter.ts # Export et import de fichiers JSON de monstres
│       └── ports.ts          # Contrats DI : MoveProvider, EnemyFactory, SaveRepository, ChampionRepository
├── infra/repositories/       # Implémentent les ports (« base de données » en mémoire / localStorage)
│   ├── MoveRepositories.ts   # Catalogue des mouvements (par type & niveau)
│   ├── MonsterForge.ts       # Forge le champion du joueur depuis son brouillon de création
│   ├── RandomEnemyFactory.ts # Génération procédurale des ennemis + boss
│   ├── LocalStorageRunRepository.ts # Persistance de la run active (menu « Continuer »)
│   ├── LocalStorageChampionRepository.ts # Persistance du Panthéon des champions victorieux
│   └── monsterFactory.ts     # Instanciation commune (moves éligibles tirés)
├── lib/
│   ├── container.ts          # Composition root (injection de dépendance)
│   ├── stores/battleStore.ts # Store Svelte mince : état + timers d'animation, délègue au controller
│   ├── components/
│   │   ├── atoms/            # HealthBar, MoveDisplayer, SpriteDisplayer, MonsterCreator, RunHud, RelicChooser, MapView, ShopView
│   │   └── molecules/        # MonsterDisplayer, Logs, Home, Header, Footer, CodexModal, ChampionCard, MoveManagerModal
│   └── styles/               # Classes Tailwind réutilisables (design system)
└── App.svelte                # Composition de l'écran de jeu
```

### Conventions

- **Domaine autonome** : `core/` ne doit pas importer Svelte ni Vite — testable en isolation.
- **Injection de dépendance** : le composition root câble `BattleEngine` (dés), `BattleController` (engine + ports), et le store (controller + `SaveRepository`). Rien d'autre n'instancie les concrètes.
- **Le store orchestre l'UI, le contrôleur orchestre le jeu** : `BattleController` gère les tours, l'IA ennemie et la progression de run ; `battleStore.ts` ne garde que les timers d'animation et la liaison avec les composants (vues passives).
- **Fiabilité** : `bun run check` doit rester à **0 erreur / 0 warning**.

## Gameplay détaillé

- **Création du champion** (type → 10 points de destin → nom) → démarre un run : une **carte de région** est tracée en SVG — couches de nœuds (4 à 7 selon la région, colonnes 1 → 2 → 3 → 4), reliées par un **vrai graphe** (chaque nœud ne connecte que les colonnes ±1 de la couche suivante). Choisissez un nœud à chaque couche : ⚔️ Combat (spawn sauvage — **le premier nœud est toujours un combat**), 🩹 Soin (+50 % PV max) ou 🛒 Boutique. **Seuls les nœuds reliés à votre position sont accessibles** (les plus éloignés restent grisés/verrouillés), et le **chemin réellement pris** est mis en évidence en vert.
- **Or** : gagnez `8 + niveau` 💰 en vainquant un sauvage (log « 💰 +… or »), `60` 💰 en battant un boss. Les boutiques proposent **3 reliques** (50-85 💰) et une **potion de soin total** (30 💰) ; un article acheté ne peut plus l'être, « Poursuivre → » avance sur la carte. L'or **persiste d'une région à l'autre**.
- Quand la **dernière couche** est traversée, le **boss de région** vous attend (`rank` boss, PV ×1.4, **XP ×1.5**) ; après un boss → plein soin + carte de la région suivante.
- À chaque tour : sélectionnez un des mouvements (ceux en cooldown sont désactivés ; la jauge montre la recharge). L'**initiative** (`1d20 + mod(Vitesse)`) décide qui agit en premier — les deux camps jouent dans l'ordre, le tour du perdant étant annulé s'il tombe K.O. Le déroulé suit la résolution d20 (jet vs CA, critique/fumble, dégâts, soin, buff).
- Les moves affichent un badge **⚔ Super eff. / 🛡 Peu eff.** selon la table de types contre l'ennemi en face ; le monstre du joueur expose aussi un panneau de **stats détaillées** (repliable).
- Victoire sauvage → soin partiel + or + **choix de relique** (3 offres).
- Le monstre joueur gagne de l'expérience et monte de niveau (nouveaux mouvements débloqués selon type/niveau). Les buffs de stats et reliques sont permanents (règle D&D).
- Défaite → fin du run (permadeath) : résumé du score et « Nouveau run ».

## Stack technique

| Outil | Rôle |
| --- | --- |
| Svelte 5 | UI (runes / stores) |
| TypeScript | Typage strict |
| Tailwind CSS 4 | Styling utilitaire |
| Rolldown Vite | Bundler / dev server |
| Bun | Runtime & package manager |

## Idées d'évolution

Les pistes d'amélioration — **bugs connus (P0)**, **équilibrage** (CA, courbe d'XP, économie d'or, boss), **accessibilité** (aria-live, modales, `prefers-reduced-motion`), **hygiène** (code mort, PNG inutilisés, tests Vitest, migration Svelte 5) — sont détaillées dans [`TODO.md`](./TODO.md) (priorités : [§16 — revue complète](./TODO.md), puis persistance, tests, audio, rebalance…).

### Limites connues (résumé)
- Le **Charisme** n'a (encore) aucun rôle mécanique (réservé aux négociations marchandes futures).
- Le **set de moves** est remplacé au level-up (pas d'apprentissage choisi) et peut dépasser 4 moves.
- L'**ennemi sauvage n'est pas sauvegardé** : son niveau/stats sont relancés à la reprise d'un combat.
- Aucun **test automatisé** pour l'instant (le `bun run check` couvre le typage, pas le comportement).