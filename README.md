# Monster Battle

Jeu de combat au tour par tour entre monstres, façon Pokémon/Dragon Quest, avec un **moteur de combat fidèle aux règles D&D 5** (machine de combat `d20`) et un **mode roguelike** (runs, régions, boss, reliques). Frontend **Svelte 5 + TypeScript + Tailwind CSS 4**, construit avec **Vite (rolldown-vite)** et **Bun**.

## Fonctionnalités

- **Roguelike par runs** : créez votre champion, progressez à travers une **carte de région**, battez le **boss** de chaque région. Une défaite met fin au run (permadeath).
- **Monstres 3D (WebGL)** : les créatures ne sont plus des sprites plats mais un **maillage procédural en three.js** (`MonsterWebGLRenderer.ts`), construit en **cylindres** pour les membres et en sphères pour les articulations — silhouette **humanoïde** avec épaules, torse, cou, crâne et visage, en **garde de combat** (poings remontés, coudes écartés, assise élargie). Le monstre réagit à son état : PV bas, Force ou Savoir élevés, rang de boss.
- **Arène façon Street Fighter** : la carte du monstre a quitté le champ de bataille. Les deux combattants sont posés sur un sol en perspective (horizon, lignes de sol, ombre portée), avec un **HUD de combattant** ancré aux deux coins opposés du haut de l'arène (nom, niveau, barre de vie, type, statuts).
- **Panthéon des Vétérans & Export / Import JSON** : chaque victoire contre un Boss de région immortalise votre monstre dans le Panthéon local (`LocalStorageChampionRepository`). Vous pouvez rejouer avec lui lors de futures runs, **télécharger sa fiche en fichier `.json` standardisé**, ou **importer un monstre** depuis vos fichiers directement dans l'onglet Panthéon de l'accueil. **Un champion rejoué repart au niveau 1** (niveau, XP et PV recalculés) ; la reprise d'une run sauvegardée et l'import, eux, conservent le niveau d'origine.
- **Création de champion (3 étapes)** : ① choisissez un **type élémentaire** (qui confère +6 points d'affinité innée et détermine les attaques accessibles), ② répartissez **10 points de destin** sur Force / Vitesse / Constitution / Savoir / Instinct (plancher 8, plafond 18, aperçu live des PV, de la CA et des critiques), ③ **nommez** votre créature (tirage aléatoire cohérent avec le type disponible). Plus de starters figés : chaque run part d'un monstre unique.
- **Carte de région (Slay-the-Spire-like)** : chaque région présente une **carte SVG** aléatoire de nœuds (4 à 7 couches, jusqu'à 4 colonnes) — ⚔️ **Combat** (le premier est toujours un combat), 🩹 **Soin** (+50 % PV), 🛒 **Boutique** — chaque nœud de combat affiche le **type du monstre gardien** (🔥💧🌿✊⚡🪨, tiré parmi les types de la région, l'ennemi spawné correspond toujours) ; le **boss** attend en bout de carte.
- **Or & boutiques** : chaque combat sauvage rapporte de l'or (`8 + niveau`), les boss en rapportent `60`. Dépensez-le dans les boutiques (3 reliques au choix : 50-85 💰, potion de soin : 30 💰).
- **Régions & boss** : 4 régions (Plaines de Verdure, Rivages d'Abysse, Volcan de Braise, Citadelle Céleste), une **difficulté croissante** — chaque région porte une **menace** (`threat`, multiplicateur du budget de caractéristiques ennemis) qui monte de 0.65 à 0.85, et des **écarts de niveau** de plus en plus affirmés : les sauvages des deux premières régions apparaissent **en dessous** du niveau du joueur, ceux des deux dernières à son niveau ou au-dessus. Un boss régional est « gonflé » (PV ×1.2) et un **niveau au-dessus** du joueur ; il lâche 2 objets du catalogue et laisse le choix d'une relique rare.
- **Catalogue de moves parité** : chaque type expose **exactement 8 capacités** sur la même échelle (puissances 35 / 55 / 65 / 85 / 100 / 130), **un soin**, **une amplification** et **quatre statuts**. L'identité d'un type vient de la nature de ses coups (physique ou magique, en alternance), de son statut et de sa courbe de caractéristiques — plus jamais d'un multiplicateur caché dans le catalogue.
- **Objets persistants d'une partie à l'autre** : les seuls objets **laissés par un boss** survivent. En fin de région, leurs bonus durables (`statBoost`, `acBonus`) sont **fusionnés dans la fiche du champion** — la fusion se fait sur une copie, l'inventaire du run et le monstre en cours restent intacts (pas de double cumul). Un objet acheté en boutique n'est jamais figé dans la fiche.
- **Reliques (objets passifs)** : après chaque combat sauvage et chaque boss, choisissez une relique parmi 3 (bonus de stats permanents, +CA, soin en début de combat, vol de vie, +10 % de dégâts, bonus de critiques) ou passez. Elles s'accumulent pour toute la run.
- **Score de run** : +15 × niveau de l'ennemi vaincu, bonus de boss/relique. Affiché en direct dans le HUD.
- **Gestion des attaques & Grimoire (`MoveManagerModal`)** : à chaque montée de niveau, une interface dédiée vous invite à configurer votre ensemble de 1 à 4 capacités parmi toutes celles débloquées. Vous pouvez également ouvrir ce Grimoire à tout moment hors combat via le bouton **« 📜 Attaques »** du bandeau supérieur pour modifier votre stratégie ou réordonner vos attaques.
- **Effets affichés sur les boutons d'attaque** : chaque capacité montre sa nature, sa puissance (`P.N`), son bonus de précision (`🎯 +N`), son soin (`💚 +N PV`), son buff (`⬆ +N Stat`), son efficacité contre la cible (`⚔ Super eff.` / `🛡 Peu eff.`) et son statut élémentaire (icône, nom, chance %) avec une infobulle décrivant l'effet et le DD de sauvegarde.
- **Combat au tour par tour** : chaque monstre dispose d'un set de mouvements dont il apprend de nouveaux en montant de niveau.
- **Moteur de combat D&D** (voir « Règles du jeu ») : jets `1d20`, Classe d'Armure, modificateurs d'attribut, critiques/fumbles avec plage critique étendue par l'Instinct.
- **Table de types** (6 types) : tournoi régulier — **chaque type élémentaire en bat exactement deux et en perd deux**, et toute relation est réciproque (si A est faible devant B, B est forcément fort devant A). Le triangle historique `Feu > Plante > Eau > Feu` est conservé ; `normal` est neutre. **Physique** ×2 / ×0.5 ; **magie** ×1.5 / ×0.67 (dampée : multiplicateur moyen ×1.07 en magie contre ×1.20 en physique).
- **Ordre de résolution dans le round** : **un soin passe toujours avant une attaque**, même si le jet d'initiative est adverse. L'initiative `1d20 + mod(Vitesse)` ne départage que les cas où les deux camps se ressemblent — les deux soignent, ou aucun ne soigne. Un camp gelé ou paralysé perd simplement son tour quand il vient ; le round continue pour l'autre. Le journal indique quand le soin a primé sur l'initiative.
- **XP par rang** : monstres `normal` → ×1, **boss** → ×1.5.
- **Mécaniques** :
  - Cooldowns sur les mouvements puissants ; l'IA ennemie ne gaspille jamais un tour sur un move faible (elle retient le meilleur du lot, super-efficace s'il en existe un) et le panneau d'un ennemi est composé des **4 plus fortes** capacités éligibles, jamais d'un tirage aléatoire,
  - Moves de soin (`(niveau + 1)d4 + mod(CON) + max(0, mod(Savoir)) + max(0, mod(Charisme)) + healPower`) et buffs de stats permanents,
  - Expérience, montée de niveau et **croissance de stats selon le type** (Force, Vitesse, Constitution, Savoir, Instinct).
- Génération procédurale des ennemis régionalisés (nom, type, stats, niveau).
- **Combats dynamiques** : monstres 3D WebGL animés, **trois familles d'animation d'attaque** — *physique* (armement puis charge vers l'adversaire), *à distance* (recul de préparation puis projection, sans contact), *soin / buff* (élévation et illumination, **sans déplacement**) — chacune en version joueur et ennemi strictement miroir ; **animations de victoire** (rebond, amplification, illumination) et **défaite** (affaissement, désaturation, effacement) avec bandeau VICTOIRE / DÉFAITE. S'y ajoutent secousses, flashes, nombres de dégâts flottants, traînée rouge sur la barre de vie et pulsation basse PV.
- **Rythme du combat** : après un coup fatal, le vainqueur est écrit immédiatement (l'animation a le temps de se jouer) mais l'écran suivant — récompense, relique, run terminé — n'apparaît qu'après un délai de `ROUND_END_DELAY` (1,4 s).
- **Persistance** : progression sauvegardée automatiquement (`localStorage`) après chaque combat → **écran titre** avec « Continuer la partie », forge de champion ou sélection depuis le Panthéon.
- Interface responsive (mobile + desktop), esthétique « dark/fantasy », logs de combat scrollables, HUD de run, Codex D&D / table élémentaire interactif.

## Règles du jeu (moteur D&D)

Les règles ci-dessous sont portées depuis le moteur de combat du projet [`dnd`](../../dnd) (backend Go, `backend/internal/services/player_actions.go`) :

- **Modificateur d'attribut** : `floor((stat - 10) / 2)` — ex. 10 → +0, 12 → +1, 18 → +4.
- **CA (Classe d'Armure)** : `10 + mod(Vitesse)` (les monstres n'ont pas d'armure — un bonus d'armure s'y ajouterait).
- **PV max** : `max(Dé de Vie) + mod(Constitution)` — **d10 pour tous les types**, mis à l'échelle par le niveau (`× (5 + niveau × 0.50)`). Le dé de vie était le multiplicateur caché du désavantage Constitution : Feu / Électricité / Normal tombaient à Constitution 8 *et* d8, soit 44 PV max au niveau 7 contre 65 pour l'Eau, et se faisaient démouler avant d'aligner un coup.
- **Cadence des dégâts** : les dégâts sont multipliés par `levelPaceFactor(niveau)` = la **même courbe que les PV**. La réserve doublait presque entre le niveau 5 et le 13 alors que les dégâts ne gagnaient que 1.23× : un ennemi d'un seul niveau au-dessus absorbait ~70 % de PV en plus pour ~3 dégâts de plus, et les boss étaient mesurés à 0-10 % de victoire. Les deux grandeurs progressant ensemble, un écart de niveau est un handicap lisible, et un combat dure le même nombre de tours du niveau 1 au 13 (mesuré : 3.5 à 10 rounds).
- **Jet d'attaque (physique)** : `1d20 + mod(Force) + Précision` ≥ CA.
- **Jet d'attaque (magique)** : `1d20 + mod(Savoir) + Précision` ≥ CA.
- **Précision vs puissance** : les attaques **faibles touchent plus souvent** que les puissantes — bonus de précision `max(0, floor((120 − power)/15))` (p. 30 → +6, p. ≥ 120 → +0). Les gros moves sont des coups risqués mais dévastateurs.
- **Initiative** : `1d20 + mod(Vitesse)` par camp (règle D&D, −4 si paralysie), journalisée à chaque round. **Exception à la règle D&D** : elle ne départage pas le soin, qui passe toujours avant l'attaque — c'est une règle de maison du jeu, assumée et testée.
- **Dégâts physiques** : dé selon la puissance du move (`1d6…1d20`) + `floor(puissance/10)` + `floor(puissance/20)` + `mod(Force)`, le tout multiplié par la cadence de niveau, minimum 1.
- **Dégâts magiques** : **même squelette que l'arme**, `1d(X+4) + floor(puissance/10) + mod(Savoir)`, multiplié par la cadence de niveau puis par le Charisme. Le sort a un **dé plus gros** pour compenser sa puissance de type dampée. L'ancienne formule `Savoir × (1 + power/120)` faisait des dégâts magiques une fonction *linéaire de la caractéristique brute* : mesuré au niveau 7, un monstre Plante (Savoir 24) faisait 32 de dégâts moyens avec son meilleur sort contre 18-21 pour tous les types physiques (Force 22-24). La magie ignorait l'investissement physique. Le **Charisme** reste le multiplicateur exclusif de la magie.
- **Absorption CON** : si le `mod(Constitution)` **positif** de la victime est > 0, il est soustrait aux dégâts d'attaque qu'elle subit (`max(1, dégâts − mod(CON))`) ; un modificateur négatif ne fragilise jamais.
- **Critique / fumble & Instinct** : 20 naturel (ou seuil critique étendu par `floor(mod(Instinct)/2)`) → toujours touché, dés dédoublés ; 1 naturel → fumble (raté).
- **Soin** : `(niveau + 1)d4 + mod(Constitution) + max(0, mod(Savoir)) + max(0, mod(Charisme)) + healPower` PV, plafonnés au PV max. Le champ **`healPower`** est propre aux capacités curatives : chaque type dispose d'**un seul** soin (`healPower` 10, recharge 3) — la graduation se fait par le niveau, pas par le type. Les soins gardent `power: 0` et ne passent donc jamais par le jet d'attaque. Le Charisme s'ajoute au Savoir — il donne un véritable archétype de soigneur.
- **Buff** : bonus additif permanent sur une stat (`StatBoost { stat, value }`) ; un buff de Constitution augmente aussi le PV max.
- **Expérience** : requise `80 × niveau − 40` (courbe linéaire douce) ; gagnée `40 + 16 × votre niveau`, modulée par l'écart de niveau (`1.5^écart`, bornée ×0.4…×2.5) et le rang du vaincu (`normal` 1 / `boss` 1.5).
- **Fusion d'objets en fin de région** : à la conquête d'une région, les objets **laissés par le boss** et porteurs d'un bonus durable sont figés dans la fiche du champion. Cette fusion s'applique à une **copie** du monstre — le monstre du run et l'inventaire restent inchangés, pour ne pas récupérer deux fois le même bonus.

## Démarrage

```bash
bun install        # installer les dépendances
bun run dev        # serveur de dev (Vite) 
bun run build      # build de production
bun run preview    # prévisualiser le build
```

Qualité :

```bash
bun test           # 138 tests (bun test, runner natif)
bun run check      # svelte-check + tsc (0 erreur, 0 warning attendu)
```

| Fichier de test | Couverture |
| --- | --- |
| `BattleEngine.test.ts` | Jets d'attaque d20, CA, critique/fumble, dégâts physiques et magiques, absorption par la Constitution |
| `RoundInitiative.test.ts` | Ordre d'attaque du round |
| `EnemyScaling.test.ts` | Scaling des ennemis (sauvages et boss) sur le joueur |
| `MonsterACAndCharisma.test.ts` | Plafonnement de la CA, rôle mécanique du Charisme |
| `HealMoves.test.ts` | Graduation des sorts de soin (`healPower`) |
| `MoveButtonEffects.test.ts` | Effets affichés sur les boutons de sélection d'attaques |
| `ArenaStageLayout.test.ts` | Mise en scène Street Fighter (décor, ombre, HUD, hauteur du sprite) |
| `AttackAnimations.test.ts` | Les trois familles d'animation, leur miroir joueur/ennemi, victoire/défaite |
| `RoundEndDelay.test.ts` | Report de l'écran suivant et des quatre chemins de coup fatal |
| `ChampionReplayLevel.test.ts` | Rejeu d'un champion au niveau 1 |
| `ChampionItemFusion.test.ts` | Fusion des objets du boss, isolation du monstre du run |
| `MonsterSilhouette.test.ts` | Silhouette humanoïde, membres cylindriques, posture de garde |
| `HealPriorityOrder.test.ts` | Le soin passe avant l'attaque ; sonde de soin sans aléa |
| `HealPriorityStore.test.ts` | La règle est réellement appliquée par le store (soin joueur, soin ennemi, ennemi gelé) |
| `BalanceInvariants.test.ts` | Invariants d'équilibrage : réciprocité et équilibre de la table de types, parité des kits et de l'échelle de puissance entre les 6 types, croissance de stats normalisée, cadence des dégâts = cadence des PV, échelle des ennemis, ramp de difficulté des régions |

### Mesurer l'équilibrage

```bash
bun run scripts/balanceSim.ts            # tout
bun run scripts/balanceSim.ts table      # audit de la table de types
bun run scripts/balanceSim.ts moves      # parité du catalogue par type
bun run scripts/balanceSim.ts mirror     # taux de victoire en miroir, par palier
bun run scripts/balanceSim.ts regions    # tension par région
bun run scripts/balanceSim.ts calibrate  # taux de victoire selon la menace
```

Le simulateur monte des duels avec le **vrai moteur** de combat et les vraies
fabriques (champion forgé et apprenant son panel comme à la création, ennemis
issus de `RandomEnemyFactory`), ce qui permet de régler les constantes de
difficulté sur des chiffres plutôt qu'à l'intuition.

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
│   │   ├── Consumable.ts     # Catalogue d'objets + provenance d'un lot d'inventaire ('shop' / 'boss')
│   │   ├── StatusEffect.ts   # Statuts élémentaires (brûlure, gel, paralysie, poison) : effets, jets de sauvegarde, libellés UI
│   │   ├── Region.ts         # Définition des 4 régions
│   │   ├── RegionMap.ts      # Carte de région (generateRegionMap injectable, nœuds combat/soin/boutique)
│   │   └── BattleState.ts    # État unifié du combat + run (BattleState / RunState)
│   └── services/
│       ├── BattleEngine.ts   # Résolution d20 (pure) → effets → logs/feedback (dés injectables, critiques avec Instinct)
│       ├── effectiveness.ts  # Table de types partagée (physique vs magie dampée) — moteur, IA, UI
│       ├── BattleController.ts # Orchestrateur de round/tour + run, IA ennemie, « résout » aussi l'initiative (DI, testable sans Svelte), butin de boss, fusion des objets durables
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
│   ├── runTabs.ts            # Onglets de l'écran de run (arène / carte / boutique / champion / reliques / journal) + onglet auto selon la phase
│   ├── renderers/
│   │   └── MonsterWebGLRenderer.ts # Maillage 3D procédural (three.js) : membres cylindriques, articulations sphériques, garde de combat
│   ├── stores/battleStore.ts # Store Svelte mince : état + timers d'animation, délègue au controller
│   ├── components/
│   │   ├── atoms/            # HealthBar, MoveDisplayer, SpriteDisplayer (canvas WebGL), FighterHud, MonsterCreator, RunHud, RunTabs, RelicChooser, RelicList, MapView, ShopView
│   │   └── molecules/        # MonsterDisplayer (animations d'attaque/victoire/défaite), Logs, Home, Header, Footer, CodexModal, ChampionCard, MoveManagerModal, InventoryModal
│   └── styles/               # Classes Tailwind réutilisables (design system) + palettes par type
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
- Quand la **dernière couche** est traversée, le **boss de région** vous attend (`rank` boss, PV ×1.4, **XP ×1.5**) ; après un boss → plein soin, **2 objets laissés sur le terrain** 🎁, puis carte de la région suivante. À la conquête de la région, le champion est gravé au Panthéon avec les bonus durables de son butin fusionnés.
- À chaque tour : sélectionnez un des mouvements (ceux en cooldown sont désactivés ; la jauge montre la recharge). Si vous choisissez un **soin**, il est joué avant toute attaque, même quand l'ennemi est plus rapide. Sinon l'**initiative** (`1d20 + mod(Vitesse)`) décide qui agit en premier — les deux camps jouent **dans l'ordre retenu**, un tour après l'autre (PV, logs et feedback affichés au fil de l'eau), le tour du perdant étant annulé s'il tombe K.O. Le déroulé suit la résolution d20 (jet vs CA, critique/fumble, dégâts, soin, buff).
- Chaque bouton d'attaque affiche ses **effets** : puissance, précision, soin, buff, efficacité contre la cible (**⚔ Super eff. / 🛡 Peu eff.**) et statut élémentaire ; le monstre du joueur expose aussi un panneau de **stats détaillées** (repliable).
- L'animation jouée dépend du move : **charge** pour une attaque physique, **projection sans contact** pour un sort à distance, **élévation lumineuse** pour un soin ou un buff. Fin de combat : animation de victoire ou de défaite, bandeau VICTOIRE / DÉFAITE, puis 1,4 s de battement avant l'écran suivant.
- Victoire sauvage → soin partiel + or + **choix de relique** (3 offres).
- Le monstre joueur gagne de l'expérience et monte de niveau (nouveaux mouvements débloqués selon type/niveau). Les buffs de stats et reliques sont permanents (règle D&D).
- Défaite → fin du run (permadeath) : résumé du score et « Nouveau run ».

## Stack technique

| Outil | Rôle |
| --- | --- |
| Svelte 5 | UI (runes / stores) |
| TypeScript | Typage strict |
| three.js | Rendu 3D des monstres (WebGL, maillage procédural) |
| Tailwind CSS 4 | Styling utilitaire |
| Rolldown Vite | Bundler / dev server |
| Bun | Runtime, package manager & runner de tests |

## Idées d'évolution

Les pistes d'amélioration — **équilibrage** (tension des combats, courbe d'XP, économie d'or, boss), **accessibilité** (aria-live, modales, `prefers-reduced-motion`), **animations** (audio, inclinaison du buste), **hygiène** (migration Svelte 5, typage strict) — sont détaillées dans [`TODO.md`](./TODO.md), y compris une section « Limites connues ».

### Limites connues (résumé)
- **Le rendu n'a jamais été contrôlé à l'écran** dans l'environnement de développement : les tests valident la géométrie 3D construite, le markup et les règles CSS, pas l'image. Durées, amplitudes et angles de garde sont à ajuster avec `bun run dev`.
- **Aucune animation n'est atténuée pour les utilisateurs sensibles** : `prefers-reduced-motion` reste à implémenter.
- **Pas de migration des données existantes** : les champions enregistrés avant la fusion des objets ont une fiche sans objet persistant, et les runs sauvegardées gardent l'ancienne échelle de PV.
- **Tension des combats** : le taux de victoire en miroir est mesuré entre 44 % et 72 % selon le type et le palier (contre 3-35 % avant rééquilibrage), et la difficulté croît bien de région en région. Le creux restant se situe entre les niveaux 7 et 9, où le panel de 4 capacités n'a encore aucune attaque de haut palier : c'est le prochain levier (décaler un palier de puissance).
- **Le soin passe avant l'attaque** contredit la règle d'initiative de D&D 5e, où l'ordre des actions ne dépend que des jets. C'est un choix assumé : le soin devient une ressource à déclencher tôt plutôt qu'à subir passivement. Les jets restent affichés et journalisés, mais ne départagent plus ce cas.
- **Rejeu d'un champion** : il repart au niveau 1 avec une réserve de PV réduite (les PV max dépendent du niveau) tout en gardant ses caractéristiques de fin de run.