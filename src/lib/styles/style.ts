/**
 * Design system **« Dragon Quest »** — une seule source pour le chrome de l'UI.
 *
 * Constat qui a motivé ce fichier : avant, il n'y avait pas de langage visuel
 * commun. Ce module était référencé 8 fois dans 2 fichiers sur 92, et chaque
 * surface écrivait ses classes à la main — ambre dans `App.svelte`, violet pour
 * le Grimoire, émeraude pour l'Équipement, sky/rose pour les HUD, couleurs de
 * type sur les cartes. Rien ne se ressemblait.
 *
 * Désormais tout le chrome (fenêtres, lignes de menu, boutons, pastilles)
 * sort d'ici, dans l'esthétique **DQ XI** : panneau bleu-nuit translucide,
 * filet clair d'un pixel, coins doux, texte clair, **aucune lueur ni dégradé**.
 * Les seules couleurs vives autorisées portent de l'information : teinte de la
 * région, couleur du type élémentaire, or, PV.
 *
 * Les classes vivent dans un module TypeScript (et non dans `app.css`) pour
 * rester lisibles et composables ; Tailwind les détecte puisqu'il parcourt tous
 * les fichiers du projet.
 */

/** Primitives du chrome de fenêtre. */
export const dq = {
  /** Fenêtre principale : panneau bleu-nuit translucide, filet clair, coin doux. */
  window: `
    relative rounded-lg
    border border-sky-100/25
    bg-[#0d1526]/93
    shadow-[0_6px_22px_rgba(0,0,0,0.55)]
    backdrop-blur-[1px]
  `,
  /** Fenêtre encastrée : sous-panneau, encart de détail, ligne de rappel. */
  inset: `
    rounded-md border border-sky-100/15 bg-[#070d18]/85
  `,
  /** Barre de titre d'une fenêtre (filet bas, libellé espacé). */
  title: `
    flex items-center justify-between gap-2
    rounded-t-lg border-b border-sky-100/15 bg-sky-100/[0.06]
    px-2.5 py-1.5
    font-display text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-100/85
  `,
  /** Corps d'une fenêtre : intérieur respirant, sans défilement horizontal. */
  body: `p-2 sm:p-2.5`,

  /** Ligne de menu sélectionnable (le curseur ▸ est posé par la ligne elle-même). */
  row: `
    w-full flex items-center gap-2 rounded px-2 py-1.5 text-left
    text-xs sm:text-sm transition-colors
  `,
  rowActive: `bg-sky-50/10 text-white`,
  rowIdle: `text-sky-100/75 hover:bg-sky-50/5`,
  /** Ligne indisponible (recharge, tour adverse) : lisible mais éteinte. */
  rowOff: `text-slate-500 cursor-not-allowed`,

  /** Curseur de sélection (le « ▶ » de Dragon Quest). */
  cursor: `shrink-0 w-3 text-amber-300`,
  /** Espace réservé quand la ligne n'est pas sélectionnée (alignement stable). */
  cursorSlot: `shrink-0 w-3`,

  /** Valeur chiffrée : mono + `tabular-nums` pour que les chiffres ne dansent pas. */
  value: `font-mono tabular-nums`,
  /** Libellé secondaire, discret. */
  hint: `font-mono text-[10px] text-sky-200/55`,
  /** Pastille d'information neutre (type, précision, statut…). */
  badge: `
    inline-flex items-center gap-1 rounded border border-sky-100/20 bg-sky-100/[0.07]
    px-1.5 py-0.5 font-mono text-[10px] text-sky-100/85
  `,
  /** Pastille d'information **favorable** (super efficace, soin, buff). */
  badgeGood: `
    inline-flex items-center gap-1 rounded border border-emerald-300/30 bg-emerald-400/10
    px-1.5 py-0.5 font-mono text-[10px] text-emerald-200
  `,
  /** Pastille d'information **défavorable** (peu efficace). */
  badgeBad: `
    inline-flex items-center gap-1 rounded border border-rose-300/30 bg-rose-400/10
    px-1.5 py-0.5 font-mono text-[10px] text-rose-200
  `,
} as const;

/**
 * Mise en scène de l'arène et boutons de plein écran.
 *
 * `layout.arena` et `layout.arenaStage` sont verrouillés par
 * `tests/ArenaStageLayout.test.ts` : l'arène doit rogner ses débordements
 * (`overflow-hidden`) et les combattants s'aligner sur une même ligne de sol
 * (`items-end`).
 */
export const styles = {
  layout: {
    // Chrome de l'arène : fond + bordure viennent de REGION_COLORS (composé
    // dans App.svelte selon la région courante). La scène (ciel étoilé, lune,
    // horizon, sol en perspective, vignette) est posée en `absolute inset-0`
    // par l'arène elle-même, et les combattants sont alignés sur une même ligne
    // de sol (`items-end`), face à face, à la même échelle.
    arena: `
      border-2 md:border-4 rounded-xl
      relative overflow-hidden
      min-h-[300px] xs:min-h-[330px] sm:min-h-[370px] md:min-h-[440px]
      mb-3 md:mb-4
      flex flex-col
      shadow-xl
    `,
    // Rangée basse : les deux combattants, ancrés au sol.
    arenaStage: `
      relative z-20 flex-1 min-h-0
      flex items-end justify-between
      gap-2 px-3 sm:px-6 md:px-10
      pb-4 sm:pb-6 md:pb-8
      pt-16 sm:pt-20
    `,
  },
  buttons: {
    // Bouton de plein écran (fin de run, conquête de région, sortie de
    // boutique). Géométrie DQ : panneau plat, filet clair, capitales espacées.
    base: `
      mb-2 self-center
      py-2 px-8 rounded-lg
      font-display font-extrabold uppercase tracking-[0.18em] text-xs sm:text-sm
      border transition-colors
      transform active:scale-95
      focus:outline-none focus:ring-2 focus:ring-sky-200/40
    `,
    primary: `
      border-amber-200/50 bg-[#16233a] text-amber-100
      hover:bg-[#1d2d49] hover:border-amber-200/80
    `,
    danger: `
      border-rose-300/40 bg-[#2a1520] text-rose-100
      hover:bg-[#3a1d2b] hover:border-rose-300/70
    `,
  },
};
