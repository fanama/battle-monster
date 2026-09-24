export const styles = {
  layout: {
    title: `
      text-center font-serif font-extrabold
      text-2xl sm:text-3xl md:text-5xl 
      uppercase tracking-widest sm:tracking-[0.15em] md:tracking-[0.2em]
      text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800
      drop-shadow-[0_2px_2px_rgba(0,0,0,1)]
      relative z-50
      mt-3 mb-2 sm:mt-4 sm:mb-4 md:mt-6 md:mb-8
      py-1 sm:py-2
    `,
    main: `
      w-full max-w-5xl mx-auto 
      p-2 sm:p-3 md:p-4 
      font-mono select-none 
      flex flex-col flex-1
    `,
    // Chrome de l'arène : fond + couleur de bordure viennent de REGION_COLORS
    // (composé dans App.svelte selon la région courante).
    arena: `
      border-2 md:border-4 rounded-xl
      relative
      flex-grow min-h-[300px] sm:min-h-[360px] md:min-h-[420px]
      mb-3 md:mb-4
      flex justify-between items-end
      p-2 sm:p-4 md:px-8 md:pb-6
      shadow-xl overflow-x-clip gap-2
    `,
    bottomGrid: "flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4 md:min-h-52",
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
    moveWrapper: "relative z-10",
  },
  winner: {
    base: `
        col-span-2 flex items-center justify-center
        py-2 mt-1 rounded border border-white/10
        bg-black/70 backdrop-blur-sm z-20
        font-serif font-bold 
        text-base md:text-lg 
        tracking-widest md:tracking-[0.2em] uppercase
        transition-all duration-500 animate-in fade-in zoom-in-95
      `,
    victory: "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]",
    defeat: "text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]",
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