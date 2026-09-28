export const styles = {
  layout: {
    // Chrome de l'arène : fond + couleur de bordure viennent de REGION_COLORS
    // (composé dans App.svelte selon la région courante).
    arena: `
      border-2 md:border-4 rounded-xl
      relative
      min-h-[270px] xs:min-h-[300px] sm:min-h-[340px] md:min-h-[420px]
      mb-3 md:mb-4
      flex justify-between items-end
      p-2 sm:p-4 md:px-8 md:pb-6
      shadow-xl overflow-x-clip gap-2
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
