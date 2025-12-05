export const styles = {
  layout: {
    title: `
      text-center font-serif font-extrabold
      text-3xl md:text-5xl 
      uppercase tracking-widest md:tracking-[0.2em]
      text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-500 to-amber-800
      drop-shadow-[0_2px_2px_rgba(0,0,0,1)]
      relative z-50
      mt-8 mb-4 md:mt-6 md:mb-8
      py-2
    `,
    main: `
      w-full max-w-2xl mx-auto 
      p-2 md:p-4 
      font-mono select-none 
      min-h-screen 
      flex flex-col
    `,
    arena: `
      border-2 md:border-4 border-stone-600 rounded-lg 
      bg-stone-800 relative 
      /* Height Fix: Use min-height to allow monsters to fit */
      min-h-[300px] md:h-96 
      mb-3 md:mb-4 
      /* Layout Fix: Align to bottom, push away from edges */
      flex justify-between items-end 
      px-2 py-4 md:px-8 md:pb-8
      shadow-xl
    `,
    bottomGrid: "flex flex-col md:grid md:grid-cols-2 gap-4 md:h-48",
  },
  actionBar: {
    container: `
        grid grid-cols-2 gap-2 md:gap-3 
        p-2 md:p-3 
        rounded-xl relative overflow-hidden
        bg-stone-900 border-2 md:border-4 border-stone-600
        shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_5px_15px_rgba(0,0,0,0.5)]
        min-h-[140px] md:min-h-auto
      `,
    textureOverlay:
      "absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]",
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
    defeat: "text-red-700 drop-shadow-[0_0_8px_rgba(185,28,28,0.4)]",
  },
}
