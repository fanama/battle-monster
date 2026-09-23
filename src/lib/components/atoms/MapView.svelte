<script lang="ts">
  import type { RegionMap } from "../../../core/entities/RegionMap";
  import { TYPE_LABELS } from "../../../core/entities/Move";
  import { TYPE_ICONS } from "../../styles/typeColors";

  export let map: RegionMap | null;
  export let currentLayer: number;
  /** Colonne choisie à chaque couche déjà parcourue (le chemin réellement pris). */
  export let path: number[] = [];
  export let onNodeSelect: (col: number) => void;

  const W = 600;
  const TOP = 44;
  const ROW_GAP = 100;
  const R = 30;

  const nodeMeta = {
    combat: { icon: "⚔️", label: "Combat", grad: "url(#grad-combat)", stroke: "#f87171", text: "#fecaca" },
    heal: { icon: "🩹", label: "Soin", grad: "url(#grad-heal)", stroke: "#34d399", text: "#a7f3d0" },
    shop: { icon: "🛒", label: "Boutique", grad: "url(#grad-shop)", stroke: "#fbbf24", text: "#fde68a" },
  };

  // Icône & libellé d'un nœud : pour un combat, c'est le type du monstre
  // gardien qui est visible (icône du monstre + « ⚔️ Feu »), pas un ⚔️ générique.
  function nodeEmblem(node: { site: string; enemyType?: string }, isDone: boolean) {
    if (isDone) return { icon: "✓", label: "Pris" };
    if (node.site === "combat") {
      const t = (node.enemyType ?? "normal") as keyof typeof TYPE_ICONS;
      return { icon: TYPE_ICONS[t], label: `⚔️ ${TYPE_LABELS[t]}` };
    }
    const meta = nodeMeta[node.site as keyof typeof nodeMeta];
    return { icon: meta.icon, label: meta.label };
  }

  function xsFor(count: number): number[] {
    if (count <= 1) return [W / 2];
    if (count === 2) return [W * 0.33, W * 0.67];
    if (count === 3) return [W * 0.25, W * 0.5, W * 0.75];
    return [W * 0.18, W * 0.4, W * 0.6, W * 0.82];
  }

  // Positions (x, y) de chaque nœud de chaque couche.
  $: rows = (map?.layers ?? []).map((layer, row) =>
    layer.map((node, col) => ({ node, x: xsFor(layer.length)[col]!, y: TOP + row * ROW_GAP }))
  );

  // Dernier nœud choisi (celui d'où l'on vient) : null sur la première couche.
  $: prevCol = currentLayer === 0 ? null : (path[currentLayer - 1] ?? null);

  // Colonnes accessibles de la couche courante (reliées au nœud précédent).
  $: reachable = new Set<number>(
    prevCol == null
      ? (rows[currentLayer] ?? []).map(p => p.node.col)
      : rows[currentLayer]?.filter(p => Math.abs(p.node.col - prevCol) <= 1).map(p => p.node.col) ?? []
  );

  // Chemins du graphe : chaque nœud relie les colonnes ±1 de la couche suivante.
  // Rendu distinct selon leur rôle : passage pris (path), options de la couche
  // courante (avail) ou simple lien du graphe (faint).
  $: links = rows.slice(0, -1).flatMap((rowP, ri) => {
    const next = rows[ri + 1]!;
    const out: { d: string; cls: "path" | "avail" | "faint" }[] = [];
    for (const a of rowP) {
      for (const b of next) {
        if (Math.abs(a.node.col - b.node.col) > 1) continue;
        let cls: "path" | "avail" | "faint" = "faint";
        if (path[ri] === a.node.col && path[ri + 1] === b.node.col) cls = "path";
        else if (ri === currentLayer - 1 && a.node.col === prevCol) cls = "avail";
        out.push({ d: `M${a.x},${a.y + R * 0.55} L${b.x},${b.y - R * 0.55}`, cls });
      }
    }
    return out;
  });

  $: bossY = TOP + rows.length * ROW_GAP + 30;
  $: bossReach = currentLayer >= rows.length - 1;
  $: H = bossY + 52;
</script>

<div
  class="flex flex-col items-center rounded-lg border-4 border-stone-600
    bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950
    p-2 md:p-3 mb-3 md:mb-4 shadow-xl overflow-x-clip"
>
  <p class="font-serif font-bold tracking-widest text-amber-200 uppercase text-xs md:text-sm mb-1">
    🗺️ Choisissez votre destination
  </p>

  <svg viewBox="0 0 {W} {H}" class="w-full max-w-[430px] h-auto select-none">
    <defs>
      <radialGradient id="grad-combat" cx="0.35" cy="0.3" r="1">
        <stop offset="0%" stop-color="#b91c1c" />
        <stop offset="100%" stop-color="#450a0a" />
      </radialGradient>
      <radialGradient id="grad-heal" cx="0.35" cy="0.3" r="1">
        <stop offset="0%" stop-color="#059669" />
        <stop offset="100%" stop-color="#064e3b" />
      </radialGradient>
      <radialGradient id="grad-shop" cx="0.35" cy="0.3" r="1">
        <stop offset="0%" stop-color="#d97706" />
        <stop offset="100%" stop-color="#78350f" />
      </radialGradient>
      <radialGradient id="grad-done" cx="0.35" cy="0.3" r="1">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#14532d" />
      </radialGradient>
      <radialGradient id="grad-boss" cx="0.35" cy="0.3" r="1">
        <stop offset="0%" stop-color="#f43f5e" />
        <stop offset="100%" stop-color="#881337" />
      </radialGradient>
      <filter id="map-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="map-dots" width="14" height="14" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="rgba(251,191,36,0.10)" />
      </pattern>
    </defs>

    <rect width="100%" height="100%" fill="#1c1917" rx="10" />
    <rect width="100%" height="100%" fill="url(#map-dots)" rx="10" />

    <!-- Numéros de couches -->
    {#each rows as _, ri}
      <text x="16" y={TOP + ri * ROW_GAP + 6} text-anchor="middle" font-size="10" font-family="monospace"
        class="{ri < currentLayer ? 'fill-emerald-500' : ri === currentLayer ? 'fill-amber-300 font-bold' : 'fill-stone-600'}">
        {ri + 1}
      </text>
    {/each}

    <!-- Chemins du graphe -->
    {#each links as link}
      <path d={link.d} fill="none" stroke-width="{link.cls === 'path' ? 4 : link.cls === 'avail' ? 2.5 : 2}" stroke-linecap="round"
        class="{link.cls === 'path'
          ? 'stroke-emerald-400'
          : link.cls === 'avail'
            ? 'stroke-amber-300/60'
            : 'stroke-stone-600/25'}" />
    {/each}

    <!-- Nœuds -->
    {#each rows as rowP, row}
      {#each rowP as { node, x, y }}
        {@const meta = nodeMeta[node.site]}
        {@const done = row < currentLayer}
        {@const current = row === currentLayer}
        {@const chosen = done && path[row] === node.col}
        {@const available = current && reachable.has(node.col)}
        {@const em = nodeEmblem(node, done)}

        {#if available}
          <circle cx={x} cy={y} r={R + 6} fill="none" stroke={meta.stroke} stroke-width="2" opacity="0.65" class="map-pulse" />
        {/if}

        <g
          role="button"
          tabindex={available ? 0 : -1}
          aria-label={done ? (chosen ? `${em.label} (pris)` : `couche ${row + 1} (faite)`) : available ? `${em.label} — relié, choisir ce nœud` : current ? `${em.label} — hors de portée` : `${em.label} à venir`}
          class="{available ? 'cursor-pointer map-node' : ''}"
          on:click={() => { if (available) onNodeSelect(node.col); }}
          on:keydown={(e) => { if (available && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onNodeSelect(node.col); } }}
        >
          {#if done}
            <!-- couches passées : le nœud pris est marqué, les autres estompés -->
            <circle cx={x} cy={y} r={R} fill="url(#grad-done)" fill-opacity={chosen ? 1 : 0.55}
              stroke={chosen ? "#6ee7b7" : "#34d399"} stroke-width={chosen ? 3 : 2} opacity={chosen ? 1 : 0.45} />
            <text x={x} y={y + 1} text-anchor="middle" dominant-baseline="central" font-size="20" fill="#bbf7d0"
              font-weight={chosen ? "bold" : "normal"} opacity={chosen ? 1 : 0.5}>✓</text>
          {:else}
            <circle cx={x} cy={y} r={R}
              fill={available ? meta.grad : "#292524"}
              stroke={available ? meta.stroke : "#57534e"}
              stroke-width="2.5"
              opacity={available ? 1 : 0.45}
              class="{available ? 'map-node-disc' : current ? 'cursor-not-allowed' : ''}" />
            <text x={x} y={y + 1} text-anchor="middle" dominant-baseline="central" font-size="21"
              opacity={available ? 1 : 0.3}>{em.icon}</text>
            {#if available}
              <text x={x} y={y + R + 16} text-anchor="middle" font-size="9" font-family="monospace" fill={meta.text}
                opacity="0.9" letter-spacing="0.08em">{em.label}</text>
              <title>{em.label} — relié à votre position, clic pour avancer</title>
            {/if}
          {/if}
        </g>
      {/each}
    {/each}

    <!-- Le boss au bout de la carte -->
    <g role="img" aria-label="Boss de région">
      {#if bossReach}
        <circle cx={W / 2} cy={bossY} r={R + 7} fill="none" stroke="#f43f5e" stroke-width="2" opacity="0.7" class="map-pulse" />
      {/if}
      <circle cx={W / 2} cy={bossY} r={R} fill="url(#grad-boss)" stroke="#fda4af" stroke-width="3"
        opacity={bossReach ? 1 : 0.7} />
      <text x={W / 2} y={bossY + 1} text-anchor="middle" dominant-baseline="central" font-size="22">👑</text>
      <text x={W / 2} y={bossY + R + 16} text-anchor="middle" font-size="9" font-family="monospace" letter-spacing="0.14em"
        class="{bossReach ? 'fill-rose-300' : 'fill-rose-900'}">BOSS DE RÉGION</text>
    </g>
  </svg>

  <p class="mt-1 text-[10px] md:text-xs text-stone-400 font-mono">
    {currentLayer + 1} / {rows.length} — nœuds reliés à votre position ({reachable.size} {reachable.size > 1 ? "choix" : "choix"})
  </p>
</div>

<style>
  .map-node-disc {
    transition: transform 0.15s ease;
    transform-box: fill-box;
    transform-origin: center;
  }
  .map-node:hover .map-node-disc {
    transform: scale(1.12);
    filter: url(#map-glow);
  }
  .map-node:active .map-node-disc {
    transform: scale(0.95);
  }
  .map-pulse {
    animation: mapPulse 1.6s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }
  @keyframes mapPulse {
    0%, 100% {
      opacity: 0.2;
      transform: scale(0.85);
    }
    50% {
      opacity: 0.85;
      transform: scale(1.1);
    }
  }
</style>