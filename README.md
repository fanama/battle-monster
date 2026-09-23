# Monster Battle

Jeu de combat au tour par tour entre monstres, façon Pokémon/Dragon Quest, avec un **moteur de combat fidèle aux règles D&D 5** (machine de combat `d20`) et un **mode roguelike** (runs, régions, boss, reliques). Frontend **Svelte 5 + TypeScript + Tailwind CSS 4**, construit avec **Vite (rolldown-vite)** et **Bun**.

## Fonctionnalités

- **Roguelike par runs** : choisissez votre monstre de départ, traversez des régions, remportez des combats sauvages, battez le **boss** de chaque région. Une défaite met fin au run (permadeath).
- **Régions & boss** : 4 régions (Plaines de Verdure, Rivages d'Abysse, Volcan de Braise, Citadelle Céleste) avec ennemis à niveaux croissants et un boss régional « gonflé » (PV ×1.4).
- **Reliques (objets passifs)** : après chaque combat sauvage, choisissez une relique parmi 3 (bonus de stats permanents, +CA, soin en début de combat, vol de vie, +10 % de dégâts) ou passez. Elles s'accumulent pour toute la run.
- **Score de run** : +15 × niveau de l'ennemi vaincu, bonus de boss/relique. Affiché en direct dans le HUD.
- Combat au tour par tour : chaque monstre dispose d'un set de mouvements dont il apprend de nouveaux en montant de niveau.
- **Moteur de combat D&D** (voir « Règles du jeu ») : jets `1d20`, Classe d'Armure, modificateurs d'attribut, critiques/fumbles.
- **Table de types** : `Feu > Plante > Eau > Feu` (`normal` est neutre). **Physique** ×2 / ×0.5 ; **magie** ×1.5 / ×0.67 (dampée pour éviter les one-shots).
- **Initiative** : à chaque tour, `1d20 + mod(Vitesse)` détermine qui frappe en premier (égalité → le joueur).
- **XP par rang** : monstres `normal` → ×1, **boss** → ×1.5.
- **Mécaniques** :
  - Cooldowns sur les mouvements puissants,
  - Moves de soin (`2d4 + mod(Constitution)`) et buffs de stats permanents,
  - Expérience, montée de niveau et croissance de stats selon le type.
- Génération procédurale des ennemis régionalisés (nom, type, stats, niveau).
- **Combats dynamiques** : sprites SVG procéduraux, lunge/shake/flash, nombres de dégâts flottants, traînée rouge sur la barre de vie, pulsation basse PV.
- **Persistance** : progression sauvegardée automatiquement (`localStorage`) après chaque combat → **écran titre** avec « Continuer la partie » / « Nouvelle partie » au rechargement.
- Interface responsive (mobile + desktop), esthétique « dark/fantasy », logs de combat scrollables, HUD de run (progression, reliques, score, CA & type affichés).

## Règles du jeu (moteur D&D)

Les règles ci-dessous sont portées depuis le moteur de combat du projet [`dnd`](../../dnd) (backend Go, `backend/internal/services/player_actions.go`) :

- **Modificateur d'attribut** : `floor((stat - 10) / 2)` — ex. 10 → +0, 12 → +1, 18 → +4.
- **CA (Classe d'Armure)** : `10 + mod(Vitesse)` (les monstres n'ont pas d'armure — un bonus d'armure s'y ajouterait).
- **PV max** : `max(Dé de Vie) + mod(Constitution)` (dé de vie par type : eau/plante d10, feu/normal d8), mis à l'échelle par le niveau (`× (1.8 + niveau × 0.85)`) pour que la progression reste significative.
- **Jet d'attaque (physique)** : `1d20 + mod(Force) + BonusDégâts` ≥ CA.
- **Jet d'attaque (magique)** : `1d20 + mod(Savoir/intelligence) + BonusSort` ≥ CA.
- **Initiative** : `1d20 + mod(Vitesse)` par camp pour l'ordre d'action (règle D&D).
- **Dégâts physiques** : dé selon la puissance du move (`1d6…1d20`) + `floor(puissance/10)` + `mod(Force)` + bonus, minimum 1.
- **Dégâts magiques** : `Savoir × 1.5` (critique → `Savoir × 3`).
- **Critique / fumble** : 20 naturel → toujours touché, dés dédoublés ; 1 naturel → fumble (raté).
- **Soin** : `2d4 + mod(Constitution)` PV, plafonnés au PV max.
- **Buff** : bonus additif permanent sur une stat (`StatBoost { stat, value }`) ; un buff de Constitution augmente aussi le PV max.
- **Expérience** : base 100 × progression de niveau × rang du vaincu (`normal` 1 / `boss` 1.5).

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
│   │   ├── Move.ts           # Types & contrat des mouvements
│   │   ├── Relic.ts          # Reliques + helpers (%) et offre injectable (random)
│   │   ├── Region.ts         # Définition des 4 régions
│   │   └── BattleState.ts    # État unifié du combat + run (BattleState / RunState)
│   └── services/
│       ├── BattleEngine.ts   # Résolution d20 (pure) → effets → logs/feedback (dés injectables)
│       ├── effectiveness.ts  # Table de types partagée (physique vs magie dampée) — moteur, IA, UI
│       ├── BattleController.ts # Orchestrateur de round/tour + run, IA ennemie, « résout » aussi l'initiative (DI, testable sans Svelte)
│       └── ports.ts          # Contrats DI : MoveProvider, EnemyFactory, SaveRepository/RunSave
├── infra/repositories/       # Implémentent les ports (« base de données » en mémoire / localStorage)
│   ├── MoveRepositories.ts   # Catalogue des mouvements (par type & niveau)
│   ├── StarterCatalog.ts     # Les 3 starters fixes (choix du run)
│   ├── RandomEnemyFactory.ts # Génération procédurale des ennemis + boss
│   ├── LocalStorageRunRepository.ts # Persistance de la run (menu « Continuer »)
│   └── monsterFactory.ts     # Instanciation commune (moves éligibles tirés)
├── lib/
│   ├── container.ts          # Composition root (injection de dépendance)
│   ├── stores/battleStore.ts # Store Svelte mince : état + timers d'animation, délègue au controller
│   ├── components/
│   │   ├── atoms/            # HealthBar, MoveDisplayer, SpriteDisplayer, MonsterSelector, RunHud, RelicChooser
│   │   └── molecules/        # MonsterDisplayer, Logs
│   └── styles/               # Classes Tailwind réutilisables (design system)
└── App.svelte                # Composition de l'écran de jeu
```

### Conventions

- **Domaine autonome** : `core/` ne doit pas importer Svelte ni Vite — testable en isolation.
- **Injection de dépendance** : le composition root câble `BattleEngine` (dés), `BattleController` (engine + ports), et le store (controller + `SaveRepository`). Rien d'autre n'instancie les concrètes.
- **Le store orchestre l'UI, le contrôleur orchestre le jeu** : `BattleController` gère les tours, l'IA ennemie et la progression de run ; `battleStore.ts` ne garde que les timers d'animation et la liaison avec les composants (vues passives).
- **Fiabilité** : `bun run check` doit rester à **0 erreur / 0 warning**.

## Gameplay détaillé

- **Starter** → démarre un run (région 1, combat sauvage).
- À chaque tour : sélectionnez un des mouvements (ceux en cooldown sont désactivés ; la jauge montre la recharge). L'**initiative** (`1d20 + mod(Vitesse)`) décide qui agit en premier — les deux camps jouent dans l'ordre, le tour du perdant étant annulé s'il tombe K.O. Le déroulé suit la résolution d20 (jet vs CA, critique/fumble, dégâts, soin, buff).
- Les moves affichent un badge **⚔ Super eff. / 🛡 Peu eff.** selon la table de types contre l'ennemi en face ; le monstre du joueur expose aussi un panneau de **stats détaillées** (repliable).
- Victoire sauvage → soin partiel + **choix de relique** (3 offres). En fin de région → combat de **boss** (rang `boss`, PV ×1.4, **XP ×1.5**) ; après un boss → plein soin + région suivante.
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

Voir [`TODO.md`](./TODO.md) pour la liste complète des améliorations (persistance, tests, audio, rebalance…).