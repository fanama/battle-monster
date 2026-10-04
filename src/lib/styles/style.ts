export const styles = {
  layout: {
    // Chrome de l'arène : fond + couleur de bordure viennent de REGION_COLORS
    // (composé dans App.svelte selon la région courante).
    //
    // Vue « Street Fighter » : l'arène est une scène. Le décor (ciel + sol en
    // perspective) est posé en `absolute inset-0` par l'arène elle-même, et
    // les combattants sont alignés sur une même ligne de sol (`items-end`),
    // face à face, à la même échelle.
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
  actionBar: {
    container: `
        grid grid-cols-2 gap-2 md:gap-3 
        p-2 md:p-3 
        rounded-xl relative
        bg-gradient-to-b from-stone-900 to-stone-950 border-2 md:border-4 border-stone-600
        shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_5px_15px_rgba(0,0,0,0.5)]
        min-h-[140px] md:min-h-auto
      `,
    textureOverlay:
      "absolute inset-0 pointer-events-none opacity-10 pattern-dots",
  },
  buttons: {
    base: `
      mb-4 self-center
      py-2 px-8 rounded-lg
      font-serif font-bold uppercase tracking-widest
      border-2 shadow-lg
      transition-all duration-200
      transform active:scale-95
      focus:outline-none focus:ring-4
    `,
    primary: `
      bg-amber-500 border-amber-300 text-stone-900
      hover:bg-amber-400 hover:shadow-amber-400/30
      focus:ring-amber-400/50
    `,
    danger: `
      bg-rose-700 border-rose-500 text-white
      hover:bg-rose-600 hover:shadow-rose-600/30
      focus:ring-rose-400/50
    `,
  },
};
