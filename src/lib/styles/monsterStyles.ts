export const monsterStyles = {
  container: {
    base: `
      relative flex flex-col items-center
      bg-stone-800 border-2 md:border-4 rounded-xl
      shadow-2xl overflow-hidden
      w-40 md:w-56
      transition-all duration-300
      shrink-0
    `,
    player: "border-sky-400 shadow-lg shadow-sky-400/20",
    enemy: "border-rose-500 shadow-lg shadow-rose-500/20",
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
    wrapper_base: `
      relative -mt-3 md:-mt-4 z-20 w-11/12 
      border md:border-2 shadow-md 
      py-0.5 md:py-1 
      transform skew-x-[-10deg]
    `,
    wrapper_player: "bg-gradient-to-r from-sky-800 via-sky-600 to-sky-800 border-sky-300",
    wrapper_enemy: "bg-gradient-to-r from-rose-800 via-rose-600 to-rose-800 border-rose-300",
    text: `
      text-[10px] md:text-sm font-bold text-white text-center 
      uppercase tracking-widest 
      transform skew-x-[10deg] drop-shadow-md
    `,
    level_player: "font-mono text-sky-300",
    level_enemy: "font-mono text-rose-300",
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
