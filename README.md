# Monster Battle

Jeu de combat au tour par tour entre monstres, façon Pokémon/Dragon Quest, avec un **moteur de combat fidèle aux règles D&D 5** (machine de combat `d20`) et un **mode roguelike** (runs, régions, boss, reliques). Frontend **Svelte 5 + TypeScript + Tailwind CSS 4**, construit avec **Vite (rolldown-vite)** et **Bun**.

## Fonctionnalités

- **Roguelike par runs** : créez votre champion, progressez à travers une **carte de région**, battez le **boss** de chaque région. Une défaite met fin au run (permadeath).
- **Monstres 3D (WebGL)** : les créatures ne sont plus des sprites plats mais un **maillage procédural en WebGL brut** (aucune librairie 3D : `MonsterWebGLRenderer.ts` pour la couche GPU, `monsterRig.ts` pour le rig pur et testable), construit en **cylindres** pour les membres et en sphères pour les articulations — silhouette **humanoïde** avec épaules, torse, cou, crâne et visage, en **garde de combat** (poings remontés, coudes écartés, assise élargie). Le monstre réagit à son état : PV bas, Force ou Savoir élevés, rang de boss.
- **Bestiaire & champion chibi fantasy, trait encré et toon 2 tons (2026-10)** : les monstres **et** le champion partagent le langage des kits de personnages chibi fantasy — grosse tête (~45 % de la figure), membres courts et trapus, appuis ronds, et un **visage expressif** issu d'une fabrique d'œil unique (grands yeux d'anime à double reflet, sourcils et bouche souriante). Le renderer encadre chaque silhouette d'un **contour encré** (coque gonflée le long des normales, faces avant éliminées, dessinée avant le corps) et remplace le cel-shading à 3 paliers par un **aplat toon à 2 tons** ; l'équipement du champion gagne une lecture « construction kit » (gorgerin, épaulières, tassettes, casque à garde-joues). Les 6 identités élémentaires sont conservées — cornes, ouïes, feuille, éclairs, dossard, oreilles rabattues. Tests dédiés `tests/ChibiStyle.test.ts`.
- **Champion chibi anime (façon Dragon Ball) & armure visible (3D)** : le camp joueur n'est plus un monstre comme les autres — c'est un **humain chibi** (`buildHumanRig`) : grosse tête occupant près de la moitié de la figure, **cheveux en pointes**, **grands yeux d'anime** (sclère, iris du type, pupille, reflet, sourcil) et membres courts et trapus, sur un squelette rigoureusement identique au monstre (10 articulations) pour que les animations restent partagées. La tunique, la cape et les bottes existantes sont conservées, teintées par le type élémentaire. Les **pièces réellement portées** se voient dans le maillage : arme en main droite, bouclier au bras gauche, plastron, casque, amulette. L'équipement 3D suit la fiche du champion (il apparaît/disparaît dès qu'on équipe/déséquipe, relu à chaque frame) et s'affiche partout où le champion est montré (arène, fiche Champion, Panthéon).
- **Arène façon Street Fighter** : la carte du monstre a quitté le champ de bataille. Les deux combattants sont posés sur un sol en perspective (horizon, lignes de sol, ombre portée), avec un **HUD de combattant** ancré aux deux coins opposés du haut de l'arène (nom, niveau, barre de vie, type, statuts).
- **Interface « Dragon Quest » unifiée (2026-10)** : tout le chrome sort d'une **source unique** — `src/lib/styles/style.ts`, export `dq` : fenêtre bleu-nuit translucide, filet clair d'un pixel, coins doux, texte clair, **aucune lueur ni dégradé**. Avant, ce design system était référencé **8 fois dans 2 fichiers sur 92** : chaque surface avait sa propre palette (ambre pour l'arène, violet pour le Grimoire, émeraude pour l'Équipement, sky/rose pour les HUD, couleur de type sur les cartes de capacité) et rien ne se ressemblait. Seules les couleurs qui **portent une information** restent vives : région, type élémentaire, or et PV. Le décor de l'arène (ciel étoilé, lune, vignette, lignes de sol) garde son ambiance Dragon Quest et repose au-dessus de la teinte régionale.
- **Combat en menu deux temps (façon DQ)** : les quatre grandes cartes de capacité de la barre d'action — jusqu'à **six pastilles** chacune (`P.N`, `🎯 +N`, `💚 +N PV`, `⬆ +N Stat`, `⚔ Super eff.`, statut %) — sont remplacées par une **fenêtre de commande** (`CommandWindow.svelte`) : ① `Attaquer / Sacoche / Grimoire / Faiblesses`, ② la **liste des capacités** (nom, type, état de recharge) accompagnée d'une **fenêtre de détail** qui affiche les chiffres de la capacité survolée ou sélectionnée. Navigation souris, tactile **et clavier** (↑ ↓, Entrée, Échap) : un menu à curseur doit répondre au clavier. Une capacité en recharge reste **inspectable** — elle porte `aria-disabled` plutôt que `disabled`, donc le focus l'atteint et ses chiffres s'affichent, mais son activation est inerte. Aucune commande morte n'est proposée : le moteur n'a pas de fuite, il n'y a donc pas de « Fuir », et la 4ᵉ entrée du menu (`Faiblesses`) ouvre le Codex élémentaire, exactement comme l'ancien bouton. `MoveDisplayer.svelte` (185 lignes) est **supprimé** — plus aucun code mort. La commande `Sacoche` suit la règle **どうぐ** de Dragon Quest : en combat, **utiliser un objet consomme l'action du tour** (l'ennemi agit ensuite) ; hors combat, l'effet reste immédiat.
- **Panthéon des Vétérans & Export / Import JSON** : chaque victoire contre un Boss de région immortalise votre monstre dans le Panthéon local (`LocalStorageChampionRepository`). Vous pouvez rejouer avec lui lors de futures runs, **télécharger sa fiche en fichier `.json` standardisé**, ou **importer un monstre** depuis vos fichiers directement dans l'onglet Panthéon de l'accueil. **Un champion rejoué repart au niveau 1** (niveau, XP et PV recalculés) ; la reprise d'une run sauvegardée et l'import, eux, conservent le niveau d'origine.
- **Création de champion (3 étapes)** : ① choisissez un **type élémentaire** parmi les **éléments débloqués**, ② répartissez **10 points de destin** sur Force / Vitesse / Constitution / Savoir / Instinct (plancher 8, plafond 18, aperçu live des PV, de la CA et des critiques), ③ **nommez** votre créature (tirage aléatoire cohérent avec le type). Un champion rejoué depuis le Panthéon garde son type ; un **nouveau** champion naît toujours **Normal**.
- **Déblocage des éléments (par les boss)** : un nouveau run **ne choisit pas** son type — le champion part **Normal** (`DEFAULT_CHAMPION_TYPE`), le seul toujours disponible. Battre un boss de région **révèle son élément** (`RegionDef.unlocks` : Verdure → Plante, Abysse → Eau, Braise → Feu, Citadelle → Électricité + Roche), définitivement sélectionnable aux créations suivantes. En fin de région, le champion en cours peut **adopter** l'élément révélé pour le reste de la run (`BattleController.retypeChampion` : mêmes stats/PV/équipement, panel reconstruit sur le nouveau type). La progression est persistée à part de la run (`LocalStorageProgressionRepository`).
- **Carte de région (Slay-the-Spire-like)** : chaque région présente une **carte SVG** aléatoire de nœuds (4 à 7 couches, jusqu'à 4 colonnes) — ⚔️ **Combat** (le premier est toujours un combat), 🩹 **Soin** (+50 % PV), 🛒 **Boutique** — chaque nœud de combat affiche le **type du monstre gardien** (🔥💧🌿✊⚡🪨, tiré parmi les types de la région, l'ennemi spawné correspond toujours) ; le **boss** attend en bout de carte.
- **Or & boutiques** : chaque combat sauvage rapporte de l'or (`8 + niveau`), les boss en rapportent `60`. Dépensez-le dans les boutiques : **potions** (tout le catalogue de consommables + une potion de soin total à 30 💰) et un **rayon Forge & Équipements** adapté à la profondeur de la région — **4 pièces par visite, dont une arme, une armure et un accessoire garantis** (+1 pièce au choix). Le catalogue compte **30 pièces** (8 armes, 7 armures, 8 accessoires, 4 casques, 3 boucliers), chaque famille ayant du choix à tous les budgets de région (≤ 65 / ≤ 80 / ≤ 95 / ∞ 💰). **Aucune relique ne s'y achète** — le pouvoir des monstres se gagne en combat.
- **Rachat au comptoir (2026-10)** : l'or ne servait qu'à acheter, la sacoche ne se vidait jamais. La section **« Rachat — Vendez vos possessions »** (`ShopView`, hors onglets d'achat : vendre ne dépend pas du rayon consulté) reprend les **potions de la sacoche** (une unité par clic) et les **pièces d'équipement non portées** à **75 %** du prix catalogue, arrondi au supérieur et jamais moins de 1 💰 (`sellPrice`). L'équipement **porté** est **refusé** — on ne vend pas ce qu'on tient : le message invite à le retirer d'abord (la fenêtre « Équipement » s'ouvre en boutique) et l'or reste intact. Les **reliques** ne se revendent pas (pouvoir arraché aux monstres, l'anti-doublon repose sur leur possession). Chaque ligne affiche le **prix de reprise** et le prix catalogue pour situer la perte, avec le total disponible ; un raccourci « 💰 Vendre (n) » descend au comptoir depuis l'en-tête (l'étal d'achat peut être long). Chaque vente est **sauvegardée** immédiatement et journalisée.
- **Régions & boss** : 4 régions (Plaines de Verdure, Rivages d'Abysse, Volcan de Braise, Citadelle Céleste), une **difficulté croissante** — chaque région porte une **menace** (`threat`, multiplicateur du budget de caractéristiques ennemis) qui monte de 0.82 à 0.92, et des **écarts de niveau** de plus en plus affirmés : les sauvages des deux premières régions apparaissent **en dessous** du niveau du joueur, ceux des deux dernières à son niveau ou au-dessus. Un boss régional est « gonflé » (PV ×1.2) et un **niveau au-dessus** du joueur ; il lâche 2 objets du catalogue et laisse le choix d'une relique rare.
- **Archétypes de sauvages (capacités signature)** : chaque sauvage instancie un panel portant une **identité** — **signature** (top-4 au score, les boss restent toujours en signature), **brute** (2 frappes physiques lourdes réservées), **statuteur** (3 capacités à statut) ou **tank** (soin + buff réservés). L'IA **lit l'identité sur le panel** et la joue : le statuteur contamine une cible saine, le tank garde son soin pour les PV bas (détecté à froid, fiable après restauration de sauvegarde), la brute frappe fort. Taux de victoire cibles mesuré : boss régionaux 55-75 %, sauvages plus faciles (l'ADN Dragon Quest — la tension vient des boss).
- **Catalogue de moves parité** : chaque type expose **exactement 8 capacités** sur la même échelle (puissances 35 / 55 / 65 / 85 / 100 / 130), **un soin**, **une amplification** et **quatre statuts**. L'identité d'un type vient de la nature de ses coups (physique ou magique, en alternance), de son statut et de sa courbe de caractéristiques — plus jamais d'un multiplicateur caché dans le catalogue.
- **Objets qui survivent d'une partie à l'autre** : ce sont les **pièces d'équipement** laissées par les boss, qui rejoignent la sacoche du run. La **fusion automatique d'objets** dans la fiche du champion a été **retirée** : le butin tombe en pièces, que le champion porte (ou non) — chaque run se ré-équipe. La fonction `BattleController.fuseDurableItemsIntoMonster` subsiste, testée, mais n'est plus branchée sur le jeu.
- **Reliques = le pouvoir des monstres vaincus** : après chaque combat sauvage et chaque boss, le monstre terrassé abandonne son pouvoir — choisissez une relique parmi celles offertes (bonus de caractéristiques, +CA, soin en début de combat, vol de vie, +10 % de dégâts, bonus de critiques) ou passez. Chaque relique gagnée en combat est explicitement **rattachée au monstre vaincu** (`powerOf` : nom + type du vaincu affichés sur la carte et dans la liste). Les effets, prix et l'anti-doublon restent ceux du catalogue — seule l'identité change. Une relique choisie **ne s'applique plus à la prise** : elle rejoint la **réserve** du run et n'agit qu'une fois **portée**, dans la limite de **3 emplacements** (voir la puce « Portage façon Dragon Quest / RPG Maker »). Les **plafonds d'équilibrage** portent donc sur les reliques portées : vol de vie ≤ 10 %, % de dégâts ≤ +10 %, soin de début ≤ +20 %, % d'EXP ≤ +25 % — la plage de critiques est unique par construction (le max l'emporte, jamais la somme), et le panneau « Effets cumulés » affiche ces valeurs plafonnées, exactement ce que le combat appliquera. Chaque relique ne peut être **possédée qu'une fois** (anti-doublon : les offres post-combat excluent le possédé ; la boutique n'en vend aucune). Ces plafonds s'appliquent aux **reliques seules** — les passifs de l'équipement porté gardent leur propre échelle (hors plafond).
- **Équipement porté (capacités signature)** : le monstre porte jusqu'à **5 pièces** sur des emplacements façon Dragon Quest (⚔️ Arme / 🛡️ Armure / ⛑️ Casque / 🛡️ Bouclier / 💍 Accessoire). **Seuls les équipements équipés sont actifs** — une pièce dans la sacoche n'a aucun effet tant qu'elle n'est pas portée depuis la fenêtre **🧰 Équipement & Reliques** (hors combat uniquement ; la même fenêtre gère les 3 emplacements de reliques). Effets par pièce : stats & CA (appliqués à la pose, inversés au retrait), passifs de combat (vol de vie, % de dégâts, plage de critiques, soin de début, % d'EXP) et pièces « spéciales » qui combinent des passifs rares. Provenances : **drop garanti à la fin de chaque combat** (budget qui suit la profondeur de la région **et le niveau de l'ennemi vaincu** : un ennemi haut niveau élargit le poly vers les pièces chères et **amplifie leurs effets jusqu'à ×2** au niveau 16, la pièce est marquée ✦ — la boutique vend le catalogue d'origine), **butin de boss** (2 pièces garanties, à la place de la fusion automatique d'objets — désormais retirée), **offres mixées** après chaque victoire (2 reliques + 1 pièce au choix, la pièce non choisie est perdue) et **boutique** (rayon Forge & Équipements). Une pastille dorée signale les pièces qui attendent dans la sacoche (badge bouton + onglet Champion). L'équipement est **effacé à chaque run** : le champion se ré-équipe à chaque partie (les reliques portées sont vidées de la même façon — chaque run repart d'une réserve vierge).
- **Portage façon Dragon Quest / RPG Maker (2026-10)** : les deux familles d'objets passent aux règles de la série, portage **hors combat** uniquement. ① **Reliques en 3 emplacements** — une relique de la réserve est **inerte**, seules les portées comptent (retrait exactement inversible, réserve jamais perdue). ② **Aperçu avant/après** chiffré avant de valider une pose : `Monster.previewEquip` / `previewRelic` clonent le monstre, y jouent la pose et n'affichent que les écarts — statistiques, **CA réelle recalculée** avec ses plafonds, PV max. ③ Bouton **« Meilleur équipement »** (最強装備 de RPG Maker) qui habille au mieux d'un geste : meilleure pièce possédée par emplacement (`equipmentScore`) **et** les 3 meilleures reliques de la réserve (`relicScore`) ; une pièce déjà portée gagne les égalités et rien n'est jamais perdu. ④ **Comparaison en boutique** : chaque pièce de la Forge est comparée à **celle que vous portez** dans le même emplacement (écart en pastilles vertes/rouges). ⑤ **Armes à deux mains** — le Marteau du Titan, l'Arc de Chasse et le Trident des Marées interdisent le bouclier : les porter **lâche le bouclier** (retour en sacoche), porter un bouclier tant qu'elles sont tenues est **refusé** (sacoche et monstre intacts, refus journalisé). ⑥ En combat, **agir avec un objet passe le tour** (commande どうぐ / Item) : l'ennemi riposte ensuite — se soigner n'est plus un bonus gratuit par-dessus l'attaque du même tour.
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
- **Sorts à distance en 3D — calque élémentaire de l'arène** : une attaque magique n'est plus un simple orbe CSS enfermé dans la boîte du lanceur, mais un **projectile WebGL** joué sur un canvas couvrant **toute l'arène** (`ArenaSpellLayer.svelte` + `SpellVfxLayer.ts`). Le sort part de la **main avant** du lanceur, décrit un **arc bombé** qui avance vers la caméra — la projection est une perspective douce calée sur les pixels de l'arène, si bien que le projectile grossit et passe **devant** la scène — puis explose sur le buste de la cible en **gerbe d'impact** (éclair, anneau de choc, éclats). Rendu **additif, sans test de profondeur** : un sort éclaire, il n'occulte rien. Les **six éléments** ont chacun leur palette et leur physique — feu qui tournoie, éclair court et nerveux, roche lourde à forte bosse, plante qui monte en vrille. Un **coup manqué** dissipe le projectile avant la cible au lieu d'exploser dessus, un **critique** élargit la gerbe, et les **soins / buffs** jouent un cordon élémentaire qui s'élève le long du lanceur. Géométrie, cadencement et palette vivent dans `spellVfx.ts` (module **pur**, testé sous Bun sans GPU) ; le renderer ne fait que téléverser les maillages et jouer les échantillons. La règle de routage `attackFamily` (*melee* / *ranged* / *utility*) est **partagée** avec la pose articulée de `MonsterDisplayer`, pour que l'effet 3D et l'animation du corps ne puissent plus diverger. **Repli assumé** : sans contexte WebGL, l'orbe CSS reprend la main (`vfxStore.spellVfxReady`) — le projectile n'est jamais perdu. Tests : `tests/SpellVfx.test.ts`.
- **Rythme du combat** : après un coup fatal, le vainqueur est écrit immédiatement (l'animation a le temps de se jouer) mais l'écran suivant — récompense, relique, run terminé — n'apparaît qu'après un délai de `ROUND_END_DELAY` (1,4 s).
- **Persistance** : progression sauvegardée automatiquement (`localStorage`) après chaque combat → **écran titre** avec « Continuer la partie », forge de champion ou sélection depuis le Panthéon.
- Interface responsive (mobile + desktop), esthétique « dark/fantasy », logs de combat scrollables, HUD de run, Codex D&D / table élémentaire interactif.

## Règles du jeu (moteur D&D)

Les règles ci-dessous sont portées depuis le moteur de combat du projet [`dnd`](../../dnd) (backend Go, `backend/internal/services/player_actions.go`) :

- **Modificateur d'attribut** : `floor((stat - 10) / 2)` — ex. 10 → +0, 12 → +1, 18 → +4.
- **CA (Classe d'Armure)** : `10 + min(mod(Vitesse), +5) + Armure`, plafonnée à **24** (`AC_HARD_CAP`). L'Armure vient des **reliques portées** et de l'**équipement porté** : elle compte à plein jusqu'à `+6`, puis un point sur deux (`effectiveArmorBonus`). Le plafond n'est pas décoratif — au-delà, seul un 20 naturel encore toucherait, et le monstre deviendrait intouchable.
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
- **Fusion d'objets (retirée)** : à la conquête d'une région, les objets à bonus durable **ne sont plus figés** dans la fiche du champion — le butin de boss tombe **en pièces d'équipement** (capacités signature), portées ou non. `fuseDurableItemsIntoMonster` subsiste, testé, mais n'est plus appelé par le jeu ; la fusion opérait de toute façon sur une **copie** du monstre, sans toucher au run.

## Démarrage

```bash
bun install        # installer les dépendances
bun run dev        # serveur de dev (Vite) 
bun run build      # build de production
bun run preview    # prévisualiser le build
```

Qualité :

```bash
bun test           # 408 tests (bun test, runner natif)
bun run check      # svelte-check + tsc (0 erreur, 0 warning attendu)
```

| Fichier de test | Couverture |
| --- | --- |
| `BattleEngine.test.ts` | Jets d'attaque d20, CA, critique/fumble, dégâts physiques et magiques, absorption par la Constitution |
| `RoundInitiative.test.ts` | Ordre d'attaque du round |
| `EnemyScaling.test.ts` | Scaling des ennemis (sauvages et boss) sur le joueur |
| `MonsterACAndCharisma.test.ts` | Plafonnement de la CA, rôle mécanique du Charisme |
| `HealMoves.test.ts` | Graduation des sorts de soin (`healPower`) |
| `MoveButtonEffects.test.ts` | Effets affichés dans les surfaces de sélection : puissance, précision, soin, buff, efficacité, statut — dans la **fenêtre de détail** de la fenêtre de commande et dans le Grimoire. Garde aussi le menu en deux temps, son clavier, et l'absence de commande morte |
| `ArenaStageLayout.test.ts` | Mise en scène Street Fighter (décor, ombre, HUD, hauteur du sprite) |
| `AttackAnimations.test.ts` | Les trois familles d'animation, leur miroir joueur/ennemi, victoire/défaite |
| `SpellVfx.test.ts` | Calque 3D des sorts : palette et cadencement par élément, trajectoire (arc, profondeur, dissipation d'un raté), gerbe d'impact (critique), projection calée sur les pixels de l'arène, maillages, et câblage UI (couche montée, ancrages sur les silhouettes, repli CSS) |
| `RoundEndDelay.test.ts` | Report de l'écran suivant et des quatre chemins de coup fatal |
| `ChampionReplayLevel.test.ts` | Rejeu d'un champion au niveau 1 |
| `ChampionItemFusion.test.ts` | Fusion des objets du boss, isolation du monstre du run |
| `MonsterSilhouette.test.ts` | Silhouette humanoïde, membres cylindriques, posture de garde |
| `HumanRig.test.ts` | Champion chibi anime : 10 articulations, tête ~moitié de la figure, cheveux en pointes, grands yeux, équipement 3D visible par emplacement |
| `MonsterPowerRelics.test.ts` | Reliques = pouvoir du monstre vaincu (provenance `powerOf`, effets inchangés, offres de victoire) |
| `TypeUnlock.test.ts` | Déblocage des éléments : carte des régions, défaut Normal, persistance localStorage, reforge du champion (adoption mi-run) |
| `HealPriorityOrder.test.ts` | Le soin passe avant l'attaque ; sonde de soin sans aléa |
| `HealPriorityStore.test.ts` | La règle est réellement appliquée par le store (soin joueur, soin ennemi, ennemi gelé) |
| `BalanceInvariants.test.ts` | Invariants d'équilibrage : réciprocité et équilibre de la table de types, parité des kits et de l'échelle de puissance entre les 6 types, croissance de stats normalisée, cadence des dégâts = cadence des PV, échelle des ennemis, ramp de difficulté des régions |
| `RelicCaps.test.ts` | Plafonds des effets de reliques (vol de vie, dégâts, soin de début, EXP), plage de critiques unique, échelle d'équipement non plafonnée, anti-doublon de possession, boutique sans relique |
| `Equipment.test.ts` | Emplacements DQ, seuls les équipements portés sont actifs, réversion exacte du portage, portage conservé par le snapshot, drops amplifiés par le niveau de l'ennemi vaincu, vitrine garantie (arme + armure + accessoire) |
| `EquipmentUniqueness.test.ts` | Régression `each_key_duplicate` : sacoche sans doublon (tirages, offres, restauration) et garde d'unicité du store |
| `DqMechanics.test.ts` | Attaques DQ : coup mortel (touche toujours, ignore la défense), charge ×1.6 tenue sur un raté, variance ±12 %, invariants du catalogue préservés |
| `DqRelicEquipment.test.ts` | Portage DQ / RPG Maker : reliques en 3 emplacements (réserve inerte, réversion exacte sur tout le catalogue, snapshot, remise à zéro au départ d'une run), armes à deux mains, aperçus avant/après, « meilleur équipement », objet qui passe le tour, et chaîne réelle (dégâts et soin de début de combat suivent les reliques portées) |
| `EnemyArchetypes.test.ts` | Panneaux d'archétypes (signature, brute, statuteur, tank) et IA de gimmick |
| `ChibiStyle.test.ts` | Bestiaire et champion chibi : proportions, visage expressif partagé, contour encré, aplat toon 2 tons |
| `ArenaEnvironment.test.ts` | Décor d'arène 3D : maillage (attributs parallèles, valeurs finies, couleurs bornées), caméra, horizon lumineux, piliers |
| `BattleHub.test.ts` | Lisibilité des points de vie en web et décor d'arène façon Dragon Quest (lune, étoiles, sol, vignette) |
| `BattleMusic.test.ts` | Musique de combat : fréquences des notes nommées, choix du thème, données des morceaux |
| `BattleMusicSequencer.test.ts` | Séquenceur de combat sur un faux `AudioContext` : les vraies entrées programment des notes, les deux thèmes diffèrent |
| `ShopStock.test.ts` | Stock de boutique : potions et équipements seulement (plus aucune relique en vente) |
| `ShopFilters.test.ts` | Filtres d'affinité et tri de la boutique passés sur le stock réel des 4 régions — le filtre « Toutes » ne masque plus le rayon Forge (régression signalée) |
| `ShopSell.test.ts` | Rachat des possessions : 75 % du catalogue (arrondi au supérieur, plancher 1 💰), liste de revente (potions empilées une par une, pièces de sacoche), refus de l'équipement **porté** (or et sacoche intacts, refus journalisé), action du store limitée à la phase boutique, et présence de la section dans `ShopView` (hors onglets) |

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
│   ├── LocalStorageProgressionRepository.ts # Persistance des éléments débloqués (boss)
│   └── monsterFactory.ts     # Instanciation commune (moves éligibles tirés)
├── lib/
│   ├── container.ts          # Composition root (injection de dépendance)
│   ├── runTabs.ts            # Onglets de l'écran de run (arène / carte / boutique / champion / reliques / journal) + onglet auto selon la phase
│   ├── renderers/
│   │   ├── MonsterWebGLRenderer.ts # Maillage 3D procédural (WebGL brut, sans librairie 3D) : membres cylindriques, articulations sphériques, garde de combat
│   │   ├── monsterRig.ts     # Rig pur et testable : squelette humanoïde, parties du corps, articulation
│   │   ├── spellVfx.ts       # Effets de sort (pur, sans GPU) : palette élémentaire, trajectoire, gerbe, canalisation, maillages, projection
│   │   └── SpellVfxLayer.ts  # Calque WebGL additif des sorts : projectile, lueur, éclats, anneau de choc
│   ├── stores/battleStore.ts # Store Svelte mince : état + timers d'animation, délègue au controller
│   ├── stores/vfxStore.ts    # Le calque de sorts 3D est-il opérationnel ? (repli CSS sinon)
│   ├── components/
│   │   ├── atoms/            # HealthBar, SpriteDisplayer (canvas WebGL), FighterHud, MonsterCreator, RunHud, RunTabs, RelicChooser, RelicList, MapView, ShopView
│   │   └── molecules/        # CommandWindow (menu de combat DQ en deux temps + fenêtre de détail), MonsterDisplayer (animations d'attaque/victoire/défaite), ArenaSpellLayer (sorts 3D), Logs, Home, Header, Footer, CodexModal, ChampionCard, MoveManagerModal, InventoryModal, EquipmentModal
│   └── styles/               # style.ts = design system DQ (`dq` : fenêtre, titre, ligne de menu, curseur, pastilles) + palettes par type + filtres de boutique testables (shopFilters.ts)
└── App.svelte                # Composition de l'écran de jeu
```

### Conventions

- **Domaine autonome** : `core/` ne doit pas importer Svelte ni Vite — testable en isolation.
- **Injection de dépendance** : le composition root câble `BattleEngine` (dés), `BattleController` (engine + ports), et le store (controller + `SaveRepository`). Rien d'autre n'instancie les concrètes.
- **Le store orchestre l'UI, le contrôleur orchestre le jeu** : `BattleController` gère les tours, l'IA ennemie et la progression de run ; `battleStore.ts` ne garde que les timers d'animation et la liaison avec les composants (vues passives).
- **Fiabilité** : `bun run check` doit rester à **0 erreur / 0 warning**.

## Gameplay détaillé

- **Création du champion** (type → 10 points de destin → nom) → démarre un run : une **carte de région** est tracée en SVG — couches de nœuds (4 à 7 selon la région, colonnes 1 → 2 → 3 → 4), reliées par un **vrai graphe** (chaque nœud ne connecte que les colonnes ±1 de la couche suivante). Choisissez un nœud à chaque couche : ⚔️ Combat (spawn sauvage — **le premier nœud est toujours un combat**), 🩹 Soin (+50 % PV max) ou 🛒 Boutique. **Seuls les nœuds reliés à votre position sont accessibles** (les plus éloignés restent grisés/verrouillés), et le **chemin réellement pris** est mis en évidence en vert.
- **Or** : gagnez `8 + niveau` 💰 en vainquant un sauvage (log « 💰 +… or »), `60` 💰 en battant un boss. Les boutiques ne vendent que des **potions** (tout le catalogue de consommables + une **potion de soin total** à 30 💰) et des **équipements** (rayon Forge adapté à la région, **4 pièces dont une arme, une armure et un accessoire garantis**) — **aucune relique** : le pouvoir des monstres se gagne en combat. Elles **rachètent** en retour vos potions (une unité par clic) et vos pièces **non portées** à **75 %** du prix catalogue : une pièce achetée n'est donc pas de l'argent perdu si elle est mal choisie. Un article acheté ne peut plus l'être (pièce d'équipement : anti-doublon sacoche + portée), « Poursuivre → » avance sur la carte. L'or **persiste d'une région à l'autre**.
- Quand la **dernière couche** est traversée, le **boss de région** vous attend (`rank` boss, PV ×1.2, **XP ×1.5**) ; après un boss → plein soin, **2 pièces d'équipement garanties + 1 consommable** laissés sur le terrain 🎁, puis carte de la région suivante. À la conquête de la région, le champion est gravé au Panthéon **tel quel** — ses pièces ne sont pas figées dans la fiche (chaque run se ré-équipe).
- À chaque tour : sélectionnez un des mouvements (ceux en cooldown sont désactivés ; la jauge montre la recharge). Si vous choisissez un **soin**, il est joué avant toute attaque, même quand l'ennemi est plus rapide. Sinon l'**initiative** (`1d20 + mod(Vitesse)`) décide qui agit en premier — les deux camps jouent **dans l'ordre retenu**, un tour après l'autre (PV, logs et feedback affichés au fil de l'eau), le tour du perdant étant annulé s'il tombe K.O. Le déroulé suit la résolution d20 (jet vs CA, critique/fumble, dégâts, soin, buff).
- Chaque bouton d'attaque affiche ses **effets** : puissance, précision, soin, buff, efficacité contre la cible (**⚔ Super eff. / 🛡 Peu eff.**) et statut élémentaire ; le monstre du joueur expose aussi un panneau de **stats détaillées** (repliable).
- L'animation jouée dépend du move : **charge** pour une attaque physique, **projection sans contact** pour un sort à distance, **élévation lumineuse** pour un soin ou un buff. Fin de combat : animation de victoire ou de défaite, bandeau VICTOIRE / DÉFAITE, puis 1,4 s de battement avant l'écran suivant.
- Victoire sauvage → soin partiel, or, **drop garanti d'une pièce d'équipement** et **offres mixées** : 2 reliques (le pouvoir du vaincu) + 1 pièce au choix. Une relique choisie rejoint la **réserve** : il faut la **porter** (hors combat, 3 emplacements) pour qu'elle agisse.
- Le monstre joueur gagne de l'expérience et monte de niveau (nouveaux mouvements débloqués selon type/niveau). Les buffs de stats gagnés en combat sont permanents (règle D&D) ; une **relique** n'agit qu'une fois **portée** — la retirer enlève exactement ses bonus.
- En combat, la commande **`Sacoche`** suit la règle どうぐ : un objet consommé **remplace l'action du tour**, l'ennemi agit ensuite. Hors combat, l'effet reste immédiat.
- Défaite → fin du run (permadeath) : résumé du score et « Nouveau run ».

## Stack technique

| Outil | Rôle |
| --- | --- |
| Svelte 5 | UI (runes / stores) |
| TypeScript | Typage strict |
| Tailwind CSS 4 | Styling utilitaire |
| Rolldown Vite | Bundler / dev server |
| Bun | Runtime, package manager & runner de tests |

## Idées d'évolution

Les pistes d'amélioration — **équilibrage** (tension des combats, courbe d'XP, économie d'or, boss), **accessibilité** (aria-live, modales, `prefers-reduced-motion`), **animations** (audio, inclinaison du buste), **hygiène** (migration Svelte 5, typage strict) — sont détaillées dans [`TODO.md`](./TODO.md), y compris une section « Limites connues ».

### Limites connues (résumé)
- **Le rendu 3D n'est pas contrôlé à l'œil** dans l'environnement de développement : les tests valident la géométrie construite, le markup et les règles CSS — durées, amplitudes et angles de garde restent à ajuster avec `bun run dev`. **Deux exceptions, mesurées sur l'application réelle** en Chrome headless : ① le **calque de sorts 3D** (contexte WebGL effectif) — chaque élément produit une gerbe de pixels visible, un coup manqué reste sombre et sans cœur lumineux, et le canvas est bien vidé au repos ; ② l'**interface DQ** — le DOM rendu est inspecté (fenêtre de commande, fenêtres de détail, chrome `dq` effectivement appliqué) et les captures d'écran sont produites. Le maillage du bestiaire, lui, n'a toujours pas été regardé.
- **Aucune animation n'est atténuée pour les utilisateurs sensibles** : `prefers-reduced-motion` reste à implémenter.
- **Pas de migration des données existantes** : les champions enregistrés avant la fusion des objets ont une fiche sans objet persistant, et les runs sauvegardées gardent l'ancienne échelle de PV.
- **Aucune migration des reliques vers les emplacements** : une sauvegarde antérieure au réglage des 3 emplacements garde ses reliques en **réserve**, donc inertes jusqu'à ce que le joueur en porte trois (rien n'est détruit, le bonus perdu n'est pas recrédité). Et le simulateur d'équilibrage ne modélise **ni le portage** (3 reliques + équipement) **ni le butin** : ses chiffres valident la chaîne de combat, pas l'économie des emplacements.
- **Tension des combats** : le taux de victoire en miroir est mesuré entre 44 % et 72 % selon le type et le palier (contre 3-35 % avant rééquilibrage), et la difficulté croît bien de région en région. Le creux restant se situe entre les niveaux 7 et 9, où le panel de 4 capacités n'a encore aucune attaque de haut palier : c'est le prochain levier (décaler un palier de puissance).
- **Le soin passe avant l'attaque** contredit la règle d'initiative de D&D 5e, où l'ordre des actions ne dépend que des jets. C'est un choix assumé : le soin devient une ressource à déclencher tôt plutôt qu'à subir passivement. Les jets restent affichés et journalisés, mais ne départagent plus ce cas.
- **Rejeu d'un champion** : il repart au niveau 1 avec une réserve de PV réduite (les PV max dépendent du niveau) tout en gardant ses caractéristiques de fin de run.