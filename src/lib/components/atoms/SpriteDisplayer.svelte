<script lang="ts">
  import { Monster } from "../../../core/entities/Monster";
  export let monster: Monster;
  export let isPlayer: boolean;

  // --- Visual Configuration ---
  const width = 200;
  const height = 200;

  // Palette Generation: Main color, Shadow color, and Outline color
  const palettes = {
    fire: { base: "#FF7F50", shadow: "#CD5C5C", highlight: "#FFA07A", stroke: "#8B0000" },
    water: { base: "#4FC3F7", shadow: "#0288D1", highlight: "#81D4FA", stroke: "#01579B" },
    grass: { base: "#9CCC65", shadow: "#689F38", highlight: "#C5E1A5", stroke: "#33691E" },
    normal: { base: "#D7CCC8", shadow: "#A1887F", highlight: "#EFEBE9", stroke: "#5D4037" },
  };

  $: palette = palettes[monster.type] || palettes.normal;

  // --- Dynamic Stats to Shape Logic ---
  // Stats normalize to roughly 0 to 20 range in logic
  $: sizeMod = 1 + (monster.constitution / 50); 
  $: bodyR = 45 * sizeMod;
  
  // Squash and stretch factors
  $: squashX = bodyR * (1 + monster.constitution * 0.01);
  $: squashY = bodyR * (1 - monster.constitution * 0.005);

  // Features
  $: eyeScale = 0.8 + (monster.intelligence * 0.05);
  $: hornHeight = monster.strength * 1.5;
  $: armLength = 15 + monster.strength;
  
  // Expression
  $: isHappy = monster.charisma > 10;
  $: isAngry = monster.strength > 15;

</script>

<div class="relative w-full h-full {isPlayer ? '-scale-x-100' : ''}">
  <svg viewBox="0 0 {width} {height}" class="overflow-visible w-full h-full">
    
    <ellipse cx="{width/2}" cy="{height - 20}" rx="{squashX * 0.8}" ry="8" fill="rgba(0,0,0,0.2)" />

    <g class="idle-animation">
      
      {#if monster.speed > 12}
        <g transform="translate({width/2}, {height/2})">
           <path d="M 20 -10 Q 60 -50 90 -20 Q 70 10 30 0 Z" 
                 fill={palette.shadow} stroke={palette.stroke} stroke-width="3" />
           <path d="M -20 -10 Q -60 -50 -90 -20 Q -70 10 -30 0 Z" 
                 fill={palette.shadow} stroke={palette.stroke} stroke-width="3" />
        </g>
      {/if}

      <g stroke={palette.stroke} stroke-width="3" fill={palette.shadow}>
        <path d="M {width/2 - 25} {height/2 + squashY - 10} 
                 q -10 30 -20 30 
                 q 20 5 30 -30" />
        <path d="M {width/2 + 25} {height/2 + squashY - 10} 
                 q 10 30 20 30 
                 q -20 5 -30 -30" />
      </g>

      <path d="M {width/2 - squashX} {height/2}
               C {width/2 - squashX} {height/2 - squashY} {width/2 + squashX} {height/2 - squashY} {width/2 + squashX} {height/2}
               C {width/2 + squashX} {height/2 + squashY} {width/2 - squashX} {height/2 + squashY} {width/2 - squashX} {height/2}"
            fill={palette.base}
            stroke={palette.stroke}
            stroke-width="3" />

      <path d="M {width/2 - squashX + 10} {height/2 + squashY - 10}
               Q {width/2} {height/2 + squashY - 5} {width/2 + squashX - 10} {height/2 + squashY - 25}
               L {width/2 + squashX - 5} {height/2 + 10}
               C {width/2 + squashX} {height/2 + squashY} {width/2 - squashX} {height/2 + squashY} {width/2 - squashX} {height/2}
               Z"
            fill={palette.shadow}
            opacity="0.6"
            style="mix-blend-mode: multiply;" />

      <ellipse cx="{width/2 - squashX * 0.4}" cy="{height/2 - squashY * 0.4}" 
               rx="{squashX * 0.2}" ry="{squashY * 0.15}" 
               fill="white" opacity="0.3" transform="rotate(-45 {width/2} {height/2})" />

      {#if monster.strength > 12}
        <path d="M {width/2 - 20} {height/2 - squashY + 10} 
                 l -10 -{hornHeight} l 15 5 z" 
                 fill="#F5F5F5" stroke={palette.stroke} stroke-width="2"/>
        <path d="M {width/2 + 20} {height/2 - squashY + 10} 
                 l 10 -{hornHeight} l -15 5 z" 
                 fill="#F5F5F5" stroke={palette.stroke} stroke-width="2"/>
      {/if}

      <g transform="translate(0, {monster.constitution > 15 ? 5 : 0})">
        
        <circle cx="{width/2 - 20}" cy="{height/2 - 10}" r="{12 * eyeScale}" fill="white" stroke={palette.stroke} stroke-width="2" />
        <circle cx="{width/2 + 20}" cy="{height/2 - 10}" r="{12 * eyeScale}" fill="white" stroke={palette.stroke} stroke-width="2" />
        
        <g fill={isAngry ? palette.shadow : palette.stroke}>
          <circle cx="{width/2 - 20}" cy="{height/2 - 10}" r="{6 * eyeScale}" />
          <circle cx="{width/2 + 20}" cy="{height/2 - 10}" r="{6 * eyeScale}" />
        </g>

        <circle cx="{width/2 - 23}" cy="{height/2 - 14}" r="{3 * eyeScale}" fill="white" />
        <circle cx="{width/2 + 17}" cy="{height/2 - 14}" r="{3 * eyeScale}" fill="white" />

        {#if isAngry}
          <path d="M {width/2 - 30} {height/2 - 25} l 15 8" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
          <path d="M {width/2 + 30} {height/2 - 25} l -15 8" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
        {/if}

        {#if isHappy}
          <path d="M {width/2 - 5} {height/2 + 15} Q {width/2} {height/2 + 20} {width/2 + 5} {height/2 + 15}" 
                fill="none" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
        {:else if isAngry}
          <path d="M {width/2 - 8} {height/2 + 18} l 4 -4 l 4 4 l 4 -4" 
                fill="none" stroke={palette.stroke} stroke-width="2" stroke-linecap="round" />
        {:else}
          <circle cx="{width/2}" cy="{height/2 + 15}" r="2" fill={palette.stroke} />
        {/if}

        {#if isHappy}
           <ellipse cx="{width/2 - 35}" cy="{height/2 + 5}" rx="6" ry="3" fill="#FFB7B2" opacity="0.8" />
           <ellipse cx="{width/2 + 35}" cy="{height/2 + 5}" rx="6" ry="3" fill="#FFB7B2" opacity="0.8" />
        {/if}
      </g>

      <g stroke={palette.stroke} stroke-width="3" fill={palette.base}>
        <path d="M {width/2 - squashX + 5} {height/2 + 10} 
                 q -{armLength} 10 -10 20 
                 q 10 5 20 -10" />
        <path d="M {width/2 + squashX - 5} {height/2 + 10} 
                 q {armLength} 10 10 20 
                 q -10 5 -20 -10" />
      </g>
      
    </g>
  </svg>
</div>

<style>
  /* The Idle Animation: A gentle bobbing motion */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }

  .idle-animation {
    animation: float 3s ease-in-out infinite;
  }
</style>