<script lang="ts">
  import { tick } from "svelte";
  import { dq } from "../../styles/style";

  export let logs: string[] = [];
  /** Occupe toute la hauteur du panneau (onglet Journal) au lieu d'une hauteur fixe. */
  export let fill: boolean = false;

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
    {fill ? 'h-full min-h-0' : 'h-40 md:h-64'} overflow-y-auto flex flex-col gap-1 p-3 md:p-4
    {dq.inset}
    font-mono text-xs sm:text-sm leading-5 text-sky-100/85
    contain-strict
  "
>
  {#each logs as log}
    <div class="whitespace-pre-wrap break-all flex items-start group">
      <span
        class="text-amber-100/50 mr-2 select-none font-bold group-hover:text-amber-100 transition-colors"
      >
        &gt;
      </span>
      <span>{log}</span>
    </div>
  {/each}
</div>
