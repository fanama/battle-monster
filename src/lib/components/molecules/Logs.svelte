<script lang="ts">
  import { tick } from "svelte";

  export let logs: string[] = [];

  let logsContainer: HTMLDivElement;
  let autoScroll = true;

  // 1. Handle Scrolling Logic
  const scrollToBottom = async () => {
    // Wait for the DOM to update with the new log
    await tick();

    if (logsContainer && autoScroll) {
      logsContainer.scrollTo({
        top: logsContainer.scrollHeight,
        behavior: "smooth", // Optional: makes it look nicer
      });
    }
  };

  // 2. React to log updates
  $: if (logs) {
    scrollToBottom();
  }

  // 3. Detect if user scrolled up to stop auto-scrolling
  const handleScroll = () => {
    if (!logsContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = logsContainer;
    // If the user is within 50px of the bottom, enable auto-scroll.
    // Otherwise, assume they are reading history.
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 50;
    autoScroll = isAtBottom;
  };
</script>

<div
  bind:this={logsContainer}
  on:scroll={handleScroll}
  class="
    /* Structure & Size */
    h-64 overflow-y-auto flex flex-col gap-1 p-4 rounded-sm
    
    /* D&D Aesthetics */
    bg-[#fdf6e3] border-4 border-double border-amber-900/60
    shadow-[inset_0_2px_15px_rgba(0,0,0,0.1)]
    
    /* Typography */
    font-mono text-sm leading-5 text-amber-950 font-medium
    
    /* Performance */
    contain-strict
  "
>
  {#each logs as log}
    <div class="whitespace-pre-wrap break-all flex items-start group">
      <span
        class="text-amber-700/70 mr-2 select-none font-bold group-hover:text-red-700 transition-colors"
      >
        &gt;
      </span>
      <span>{log}</span>
    </div>
  {/each}
</div>
