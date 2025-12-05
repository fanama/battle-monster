export const monsterStyles = {
  container: {
    base: `
      relative flex flex-col items-center
      bg-stone-800 border-2 md:border-4 border-amber-600 rounded-xl
      shadow-2xl overflow-hidden
      w-40 md:w-56
      transition-all duration-300
    `,
    // Position logic separated for clarity
    player: "left-2 md:left-4 z-10",
    enemy: "right-2  md:right-4 md:top-4 z-0",
  },
  spriteSection: {
    wrapper: `
      relative w-full 
      h-28 md:h-40 
      bg-stone-900 border-b-4 border-stone-950 
      flex items-center justify-center overflow-hidden
    `,
    overlay: "absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent z-0",
  },
  nameTag: {
    wrapper: `
      relative -mt-3 md:-mt-4 z-20 w-11/12 
      bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 
      border md:border-2 border-amber-300 shadow-md 
      py-0.5 md:py-1 
      transform skew-x-[-10deg]
    `,
    text: `
      text-[10px] md:text-sm font-bold text-white text-center 
      uppercase tracking-widest 
      transform skew-x-[10deg] drop-shadow-md
    `,
  },
  info: {
    container: "w-full p-2 pt-3 md:p-3 md:pt-4 flex flex-col gap-1 md:gap-2",
    healthWrapper: "bg-stone-950/50 p-1 rounded border border-stone-600",
    moveGrid: `
      grid grid-cols-1 md:grid-cols-2 
      gap-x-2
      text-[10px] md:text-xs text-stone-400 
      px-1 
      h-16 md:h-20 
      font-mono overflow-y-auto
    `,
  },
};
