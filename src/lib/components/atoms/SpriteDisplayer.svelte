<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";

  export let monster: Monster;
  export let isPlayer: boolean;

  const width = 200;
  const height = 200;
  const cx = 100;

  // --- Palettes par type : base / mi / ombre / éclat / contour / accent ---
  interface Palette {
    base: string;
    mid: string;
    shadow: string;
    highlight: string;
    stroke: string;
    accent: string;
    accentDeep: string;
    glow: string;
  }

  const palettes: Record<Monster['type'], Palette> = {
    fire: {
      base: "#FF7F50", mid: "#E64A2E", shadow: "#A6392B",
      highlight: "#FFC08F", stroke: "#6E1E1E",
      accent: "#FFD24D", accentDeep: "#E09B00", glow: "rgba(255,130,60,0.45)",
    },
    water: {
      base: "#5BC7F0", mid: "#2E9EDB", shadow: "#17649A",
      highlight: "#A6E6FF", stroke: "#0D3352",
      accent: "#D6F4FF", accentDeep: "#8FD9F5", glow: "rgba(80,195,235,0.45)",
    },
    grass: {
      base: "#7BC96F", mid: "#4E9B43", shadow: "#2C6628",
      highlight: "#BBE8A6", stroke: "#1C4A1B",
      accent: "#FFD977", accentDeep: "#E6A422", glow: "rgba(130,205,115,0.45)",
    },
    electric: {
      base: "#F4D03F", mid: "#E0A90E", shadow: "#8E6B00",
      highlight: "#FFF3A6", stroke: "#5F4700",
      accent: "#7FD8FF", accentDeep: "#2FA8E0", glow: "rgba(250,204,21,0.5)",
    },
    rock: {
      base: "#A89F91", mid: "#7E7466", shadow: "#4F473C",
      highlight: "#D8CFC2", stroke: "#2F2A22",
      accent: "#E8C073", accentDeep: "#A97A26", glow: "rgba(168,159,145,0.45)",
    },
    normal: {
      base: "#DCCBB9", mid: "#B79C86", shadow: "#7E6650",
      highlight: "#F3E9DD", stroke: "#47342A",
      accent: "#F1E3D2", accentDeep: "#C7AC94", glow: "rgba(220,205,185,0.4)",
    },
  };

  // --- Forme générale pilotée par les stats ---
  let t: Monster['type'] = 'normal';
  let palette: Palette = palettes.normal;
  let layout = { cy: 150, rx: 42, ry: 44, eyeY: 132 };
  let cy = 150;
  let rxM = 42;
  let ryM = 44;
  let headTopY = 106;
  let eyeR = 8.5;
  let isAngry = false;
  let isGrumpy = false;
  let isHappy = false;
  let isTired = false;
  let isBoss = false;
  let isFast = false;
  let mouthY = 149;
  let lEyeX = 83;
  let rEyeX = 117;
  let gid = 's';

  $: t = monster.type;
  $: palette = palettes[monster.type] ?? palettes.normal;
  $: gid = `s${monster.type}${isPlayer ? 'p' : 'e'}`;
  $: sizeMod = 1 + monster.constitution / 60;
  $: layout = (() => {
    switch (monster.type) {
      case 'fire':  return { cy: 150, rx: 42, ry: 46, eyeY: 134 }; // dragon dressé
      case 'water': return { cy: 160, rx: 46, ry: 36, eyeY: 148 }; // nageur bas
      case 'grass': return { cy: 148, rx: 40, ry: 46, eyeY: 130 }; // poire feuillue
      case 'electric': return { cy: 148, rx: 40, ry: 46, eyeY: 132 }; // créature étincelante
      case 'rock': return { cy: 160, rx: 52, ry: 42, eyeY: 148 }; // colosse de pierre
      default:      return { cy: 150, rx: 38, ry: 44, eyeY: 134 }; // boule de poils
    }
  })();
  $: cy = layout.cy;
  $: rxM = layout.rx * sizeMod;
  $: ryM = layout.ry * sizeMod;
  $: headTopY = cy - ryM;

  // --- Expression (instinct = yeux, force = sourcils, charisme = joues) ---
  $: eyeR = 8.5 * (0.85 + monster.wisdom * 0.04);
  $: isAngry = monster.strength > 14;
  $: isGrumpy = monster.strength > 11 && monster.charisma <= 10;
  $: isHappy = monster.charisma > 12;
  $: isTired = monster.currentHp <= monster.maxHp * 0.35;

  $: isBoss = monster.rank === 'boss';
  $: isFast = monster.speed > 13;
  $: isFolded = monster.speed <= 10;

  // Positions du visage (partagées par tous les types)
  $: lEyeX = cx - 17;
  $: rEyeX = cx + 17;
  $: mouthY = layout.eyeY + 17;
</script>

<div class="relative w-full h-full {isPlayer ? '-scale-x-100' : ''}">
  <svg viewBox="0 0 {width} {height}" class="overflow-visible w-full h-full">
    <defs>
      <linearGradient id="{gid}-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={palette.highlight} />
        <stop offset="45%" stop-color={palette.base} />
        <stop offset="100%" stop-color={palette.shadow} />
      </linearGradient>
      <radialGradient id="{gid}-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stop-color={palette.glow} />
        <stop offset="100%" stop-color="rgba(0,0,0,0)" />
      </radialGradient>
      <linearGradient id="{gid}-accent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={palette.accent} />
        <stop offset="100%" stop-color={palette.accentDeep} />
      </linearGradient>
      <filter id="{gid}-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.35" />
      </filter>
    </defs>

    <!-- Ombre au sol -->
    <ellipse cx={cx} cy="192" rx="{rxM * 0.95}" ry="7" fill="rgba(0,0,0,0.28)" />

    <!-- Aura lumineuse (plus forte pour un boss) -->
    <circle cx={cx} cy={headTopY + 20} r={isBoss ? 82 : 60} fill="url(#{gid}-glow)" />

    <g class="idle-animation">
      <g class="monster-rig">
        <!-- ============ ÉLÉMENTS ARRIÈRE (par type) ============ -->

        {#if t === 'fire'}
          <!-- Ailes (repliées si lent) -->
          <g class={isFast ? 'wing-flap' : ''} opacity={isFolded ? 0.55 : 1}>
            <path d="M 94 146 C 58 140 38 120 30 102 C 46 118 74 122 92 140 Z"
                  fill={palette.mid} stroke={palette.stroke} stroke-width="3" />
            <path d="M 106 146 C 142 140 162 120 170 102 C 154 118 126 122 108 140 Z"
                  fill={palette.mid} stroke={palette.stroke} stroke-width="3" />
            {#if isFast}
              <path d="M 40 112 C 52 108 66 106 88 136" fill="none" stroke={palette.highlight} stroke-width="2.5" stroke-linecap="round" />
              <path d="M 160 112 C 148 108 134 106 112 136" fill="none" stroke={palette.highlight} stroke-width="2.5" stroke-linecap="round" />
            {/if}
          </g>
          <!-- Queue à flamme -->
          <g class="tail-sway">
            <path d="M 106 150 C 130 154 132 172 126 186"
                  fill="none" stroke={palette.mid} stroke-width="9" stroke-linecap="round" />
            <path d="M 124 188 q 12 8 0 20 q -12 -11 0 -20" fill="url(#{gid}-accent)" stroke={palette.accentDeep} stroke-width="2" />
            <path d="M 124 192 q 4 3 0 8 q -3 -4 0 -8" fill="#FFF3C4" />
          </g>

        {:else if t === 'water'}
          <!-- Nageoires dorsale + pectorales -->
          <path d="M 94 132 L 104 108 L 114 128 Z" fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
          <path d="M 92 162 C 66 164 60 180 62 190 C 78 182 88 172 94 164 Z"
                fill={palette.shadow} stroke={palette.stroke} stroke-width="2.5" />
          <path d="M 108 164 C 134 166 140 182 138 190 C 122 182 112 172 106 166 Z"
                fill={palette.shadow} stroke={palette.stroke} stroke-width="2.5" />
          <!-- Queue à double lobe -->
          <g class="tail-sway">
            <path d="M 118 156 C 148 150 166 136 172 130 C 160 146 146 154 124 158 Z"
                  fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
            <path d="M 122 164 C 150 174 162 184 166 194 C 152 182 140 172 120 166 Z"
                  fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
          </g>

        {:else if t === 'grass'}
          <!-- Feuilles-oreilles -->
          <path d="M 82 116 C 70 94 74 76 88 66 C 88 86 90 100 94 114 Z"
                fill="url(#{gid}-accent)" stroke={palette.stroke} stroke-width="2.5" />
          <path d="M 118 116 C 130 94 126 76 112 66 C 112 86 110 100 106 114 Z"
                fill="url(#{gid}-accent)" stroke={palette.stroke} stroke-width="2.5" />
          <!-- Crête feuillue (3 feuilles) -->
          <path d="M 100 104 C 94 92 102 76 112 78 C 106 88 108 96 106 106 Z" fill="url(#{gid}-accent)" stroke={palette.stroke} stroke-width="2" />
          <path d="M 100 106 C 90 92 88 76 96 70 C 98 82 100 94 104 106 Z" fill="url(#{gid}-accent)" stroke={palette.stroke} stroke-width="2" />
          <path d="M 98 106 C 86 98 78 84 82 76 C 90 84 96 94 102 106 Z" fill={palette.mid} stroke={palette.stroke} stroke-width="2" />

        {:else if t === 'electric'}
          <!-- Crête d'ions (éclairs arrière) -->
          <g class={isFast ? 'wing-flap' : ''} fill={palette.accent} stroke={palette.stroke} stroke-width="2">
            <path d="M 84 122 L 78 102 L 92 112 L 86 90 L 100 106 L 96 84 L 108 102 Z" />
            <path d="M 116 122 L 122 102 L 108 112 L 114 90 L 100 106 L 104 84 L 92 102 Z" />
          </g>
          <!-- Queue-éclair -->
          <g class="tail-sway">
            <path d="M 120 156 C 142 158 152 150 158 138 C 148 146 142 152 128 156 C 140 154 136 166 122 168 Z"
                  fill={palette.accent} stroke={palette.stroke} stroke-width="2" />
          </g>

        {:else if t === 'rock'}
          <!-- Cristaux dorsaux -->
          <g fill={palette.accent} stroke={palette.stroke} stroke-width="2">
            <path d="M 84 118 L 78 94 L 93 108 Z" />
            <path d="M 100 112 L 99 86 L 109 104 Z" />
            <path d="M 116 118 L 124 96 L 118 112 Z" />
          </g>
          <!-- Queue-bloc -->
          <g class="tail-sway">
            <path d="M 116 162 C 140 160 154 168 152 180 C 138 172 128 164 114 166 Z"
                  fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
          </g>

        {:else}
          <!-- Oreilles duveteuses (normal) -->
          <path d="M 78 122 C 64 102 66 84 78 76 C 82 92 86 106 90 122 Z"
                fill={palette.base} stroke={palette.stroke} stroke-width="3" />
          <path d="M 122 122 C 136 102 134 84 122 76 C 118 92 114 106 110 122 Z"
                fill={palette.base} stroke={palette.stroke} stroke-width="3" />
          <path d="M 80 116 C 72 100 74 90 79 86 C 81 96 83 104 86 114 Z" fill={palette.accent} />
          <path d="M 120 116 C 128 100 126 90 121 86 C 119 96 117 104 114 114 Z" fill={palette.accent} />
          <!-- Touffe -->
          <path d="M 100 106 C 96 92 104 82 112 90 C 108 94 104 100 106 108 Z" fill={palette.mid} stroke={palette.stroke} stroke-width="2" />
        {/if}

        <!-- ============ CORPS (silhouette par type) ============ -->
        <g class="breathe" style="transform-box: fill-box; transform-origin: 50% 90%;">
          {#if t === 'fire'}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM} transform="rotate(-5 {cx} {cy})"
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Écailles ventrales -->
            <path d="M {cx - rxM * 0.75} {cy + ryM * 0.55}
                     C {cx} {cy + ryM * 1.05} {cx + rxM * 0.75} {cy + ryM * 0.55}
                     L {cx + rxM * 0.55} {cy + ryM * 0.2}
                     L {cx} {cy + ryM * 0.62} L {cx - rxM * 0.55} {cy + ryM * 0.2} Z"
                     fill={palette.shadow} opacity="0.55" style="mix-blend-mode: multiply;" />
          {:else if t === 'grass'}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM}
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Ventre clair -->
            <ellipse cx={cx} cy={cy + ryM * 0.45} rx={rxM * 0.6} ry={ryM * 0.42}
                     fill={palette.highlight} opacity="0.85" />
          {:else if t === 'water'}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM}
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Ventre pâle de poisson -->
            <path d="M {cx - rxM * 0.7} {cy + ryM * 0.5}
                     C {cx} {cy + ryM * 1.15} {cx + rxM * 0.7} {cy + ryM * 0.5}
                     C {cx + rxM * 0.45} {cy + ryM * 0.2} {cx - rxM * 0.45} {cy + ryM * 0.2} Z"
                     fill={palette.accent} opacity="0.5" />
          {:else if t === 'electric'}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM}
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Ventre zébré (électrique) -->
            <path d="M {cx - rxM * 0.7} {cy + ryM * 0.5}
                     C {cx} {cy + ryM * 1.15} {cx + rxM * 0.7} {cy + ryM * 0.5}
                     C {cx + rxM * 0.45} {cy + ryM * 0.2} {cx - rxM * 0.45} {cy + ryM * 0.2} Z"
                     fill={palette.highlight} opacity="0.55" />
          {:else if t === 'rock'}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM}
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Ventre fissuré -->
            <path d="M {cx - rxM * 0.62} {cy + ryM * 0.35} l 12 6 l -2 12 l 14 7 l -6 2 l -16 -9 Z"
                  fill={palette.shadow} opacity="0.5" />
          {:else}
            <ellipse cx={cx} cy={cy} rx={rxM} ry={ryM}
                     fill="url(#{gid}-body)" stroke={palette.stroke} stroke-width="3" filter="url(#{gid}-shadow)" />
            <!-- Ventre duveteux -->
            <ellipse cx={cx} cy={cy + ryM * 0.4} rx={rxM * 0.62} ry={ryM * 0.4}
                     fill={palette.accent} opacity="0.9" />
          {/if}
        </g>

        <!-- ============ ÉLÉMENTS AVANT (bras / pattes) ============ -->
        {#if t === 'fire'}
          <!-- Pattes -->
          <g fill={palette.shadow} stroke={palette.stroke} stroke-width="2.5">
            <path d="M 84 180 C 78 192 70 194 62 192 C 66 186 70 182 78 180 Z" />
            <path d="M 116 180 C 122 192 130 194 138 192 C 134 186 130 182 122 180 Z" />
          </g>
          <!-- Griffes -->
          <g fill="#F5EFE0">
            <path d="M 63 191 l -5 3 M 68 192 l -5 3 M 137 191 l 5 3 M 132 192 l 5 3" stroke={palette.stroke} stroke-width="1.5" />
          </g>
        {:else if t === 'grass'}
          <!-- Petites mains-feuilles -->
          <g stroke={palette.stroke} stroke-width="2.5">
            <path d="M 70 168 C 54 168 50 180 54 188 C 62 182 68 174 72 170 Z" fill={palette.mid} />
            <path d="M 130 168 C 146 168 150 180 146 188 C 138 182 132 174 128 170 Z" fill={palette.mid} />
          </g>
          <!-- Griffes -->
          <g fill="#F5EFE0">
            <path d="M 54 187 q -4 4 -2 6 M 146 187 q 4 4 2 6" stroke={palette.stroke} stroke-width="1.5" />
          </g>
        {:else if t === 'water'}
          <!-- Nageoires avant (données par le corps, petits reflets) -->
          <circle cx="70" cy="150" r="3.5" fill={palette.highlight} opacity="0.8" />
          <circle cx="132" cy="152" r="3" fill={palette.highlight} opacity="0.8" />
        {:else if t === 'electric'}
          <!-- Petites pattes + étincelles -->
          <g fill={palette.shadow} stroke={palette.stroke} stroke-width="2.5">
            <ellipse cx="86" cy="188" rx="9" ry="6" />
            <ellipse cx="114" cy="188" rx="9" ry="6" />
          </g>
          <g fill={palette.accent} opacity="0.9">
            <path d="M 88 168 l -6 8 l 5 1 l -4 8 l 9 -8 l -5 -1 l 6 -8 Z" />
            <path d="M 112 168 l 6 8 l -5 1 l 4 8 l -9 -8 l 5 -1 l -6 -8 Z" />
          </g>
        {:else if t === 'rock'}
          <!-- Poings rocheux -->
          <g fill={palette.base} stroke={palette.stroke} stroke-width="2.5">
            <path d="M 72 158 C 60 160 56 172 62 182 C 72 180 80 170 82 160 Z" />
            <path d="M 128 158 C 140 160 144 172 138 182 C 128 180 120 170 118 160 Z" />
          </g>
        {:else}
          <!-- Pattes de boule de poils -->
          <g fill={palette.shadow} stroke={palette.stroke} stroke-width="2.5">
            <ellipse cx="86" cy="188" rx="10" ry="6" />
            <ellipse cx="114" cy="188" rx="10" ry="6" />
          </g>
          <!-- Patounes avant -->
          <g fill={palette.base} stroke={palette.stroke} stroke-width="2.5">
            <path d="M 78 156 C 70 162 68 172 72 178 C 80 174 82 166 84 158 Z" />
            <path d="M 122 156 C 130 162 132 172 128 178 C 120 174 118 166 116 158 Z" />
          </g>
          <!-- Queue en boule -->
          <g class="tail-sway">
            <circle cx="138" cy="160" r="15" fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
            <circle cx="148" cy="174" r="11" fill={palette.mid} stroke={palette.stroke} stroke-width="2.5" />
          </g>
        {/if}

        <!-- ============ VISAGE (partagé, expression par stats) ============ -->
        <g transform="translate(0, {isTired ? 3 : 0})">
          <!-- Yeux -->
          <g stroke={palette.stroke} stroke-width="2">
            <circle cx={lEyeX} cy={layout.eyeY} r={eyeR} fill="#FFF" fill-opacity="0.98" />
            <circle cx={rEyeX} cy={layout.eyeY} r={eyeR} fill="#FFF" fill-opacity="0.98" />
          </g>
          <!-- Iris (diminué si fatigué) -->
          <g fill={isHappy && !isTired ? palette.accentDeep : "#2B1A12"}>
            <circle cx={lEyeX} cy={layout.eyeY} r={eyeR * (isTired ? 0.35 : 0.52)} />
            <circle cx={rEyeX} cy={layout.eyeY} r={eyeR * (isTired ? 0.35 : 0.52)} />
          </g>
          <!-- Pupilles / reflet -->
          <g fill="#FFF">
            <circle cx={lEyeX + 2.5} cy={layout.eyeY - 2.5} r={eyeR * 0.18} />
            <circle cx={rEyeX + 2.5} cy={layout.eyeY - 2.5} r={eyeR * 0.18} />
          </g>
          <!-- Paupières basses si fatigué -->
          {#if isTired}
            <g fill={palette.base} stroke={palette.stroke} stroke-width="2">
              <path d="M {lEyeX - eyeR} {layout.eyeY - 4} q {eyeR} {-5} {eyeR * 2} {-1}" />
              <path d="M {rEyeX - eyeR} {layout.eyeY - 4} q {eyeR} {-5} {eyeR * 2} {-1}" />
            </g>
          {/if}
          <!-- Sourcils -->
          {#if isAngry}
            <g stroke={palette.stroke} stroke-width="3" stroke-linecap="round">
              <path d="M {lEyeX - eyeR * 0.9} {layout.eyeY - eyeR * 0.9} l {eyeR * 1.1} 4.5" />
              <path d="M {rEyeX + eyeR * 0.9} {layout.eyeY - eyeR * 0.9} l {-eyeR * 1.1} 4.5" />
            </g>
          {:else if isHappy}
            <g stroke={palette.stroke} stroke-width="2.5" stroke-linecap="round" fill="none">
              <path d="M {lEyeX - eyeR} {layout.eyeY - eyeR} q {eyeR} {-5} {eyeR * 2} {1}" />
              <path d="M {rEyeX - eyeR} {layout.eyeY - eyeR} q {eyeR} {-5} {eyeR * 2} {1}" />
            </g>
          {:else if isGrumpy}
            <g stroke={palette.stroke} stroke-width="2.5" stroke-linecap="round">
              <path d="M {lEyeX - eyeR} {layout.eyeY - eyeR} l {eyeR * 1.6} 0" />
              <path d="M {rEyeX - eyeR} {layout.eyeY - eyeR} l {eyeR * 1.6} 0" />
            </g>
          {/if}
          <!-- Bouche -->
          {#if isHappy}
            <path d="M {cx - 9} {mouthY} Q {cx} {mouthY + 9} {cx + 9} {mouthY}"
                  fill="none" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
            <path d="M {cx + 2} {mouthY + 2} q 3 -2 2 -6" fill="none" stroke={palette.stroke} stroke-width="2" stroke-linecap="round" opacity="0.6" />
          {:else if isGrumpy}
            <path d="M {cx - 9} {mouthY + 4} q 9 -6 18 0" fill="none" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
          {:else if isTired}
            <path d="M {cx - 6} {mouthY} q 6 2 12 0" fill="none" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
          {:else}
            <path d="M {cx - 6} {mouthY} q 6 5 12 0" fill="none" stroke={palette.stroke} stroke-width="3" stroke-linecap="round" />
          {/if}
          <!-- Joues (boutons de rose) -->
          {#if isHappy}
            <ellipse cx={lEyeX - eyeR * 1.6} cy={mouthY - 2} rx="5.5" ry="3" fill="#FF9E9E" opacity="0.7" />
            <ellipse cx={rEyeX + eyeR * 1.6} cy={mouthY - 2} rx="5.5" ry="3" fill="#FF9E9E" opacity="0.7" />
          {/if}
        </g>

        <!-- ============ DÉTAILS DE TYPE ============ -->
        {#if t === 'fire'}
          <!-- Cornes -->
          <g fill="#FFF6E0" stroke={palette.stroke} stroke-width="2.5">
            <path d="M 84 112 q -12 -18 2 -28 q 8 12 10 26 Z" />
            <path d="M 116 112 q 12 -18 -2 -28 q -8 12 -10 26 Z" />
          </g>
          <!-- Petites flammes de cou -->
          {#if isFast}
            <g fill="url(#{gid}-accent)">
              <path d="M 98 112 q -5 -8 0 -16 q 5 8 0 16" />
              <path d="M 102 112 q -5 -8 0 -16 q 5 8 0 16" />
            </g>
          {/if}
        {:else if t === 'water'}
          <!-- Branchies -->
          <g stroke={palette.stroke} stroke-width="2" stroke-linecap="round" opacity="0.7">
            <path d="M 66 140 q -5 3 1 8 M 66 148 q -5 3 1 8 M 66 156 q -5 3 1 8" />
          </g>
          <!-- Gouttes -->
          <g fill={palette.highlight} opacity="0.85">
            <circle cx="88" cy="146" r="3" />
            <circle cx="114" cy="150" r="2.5" />
          </g>
        {:else if t === 'grass'}
          <!-- Baies / narines -->
          <circle cx={cx - 6} cy={mouthY - 6} r="3.2" fill={palette.accentDeep} />
          <circle cx={cx + 6} cy={mouthY - 6} r="3.2" fill={palette.accentDeep} />
        {:else if t === 'electric'}
          <!-- Narines -->
          <ellipse cx={cx - 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
          <ellipse cx={cx + 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
          <!-- Étincelles -->
          <g fill={palette.accent} opacity="0.9">
            <circle cx="70" cy="120" r="2.5" />
            <circle cx="132" cy="124" r="2" />
            <path d="M 100 96 l -3 -6 l 6 -2 l -7 -3 l 8 -4 Z" fill={palette.highlight} opacity="0.8" />
          </g>
        {:else if t === 'rock'}
          <!-- Narines -->
          <ellipse cx={cx - 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
          <ellipse cx={cx + 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
          <!-- Veines de la roche -->
          <g stroke={palette.accentDeep} stroke-width="1.5" opacity="0.7">
            <path d="M {cx + 18} {cy - ryM * 0.4} l 8 4 l -4 7" fill="none" />
            <path d="M {cx - 22} {cy + ryM * 0.2} l -7 3" fill="none" />
          </g>
        {:else}
          <!-- Narines -->
          <ellipse cx={cx - 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
          <ellipse cx={cx + 5} cy={mouthY - 6} rx="2" ry="2.6" fill={palette.stroke} opacity="0.65" />
        {/if}

        {#if t === 'grass'}
          <!-- Rayon de soleil : tâches émeraude -->
          <g fill={palette.mid} opacity="0.6">
            <circle cx={cx - rxM * 0.45} cy={cy - ryM * 0.25} r="3" />
            <circle cx={cx + rxM * 0.5} cy={cy + ryM * 0.1} r="2.5" />
          </g>
        {/if}

        <!-- ============ COURONNE (boss) ============ -->
        {#if isBoss}
          <g transform="translate({cx}, {headTopY - 20})" class="crown-float">
            <g stroke="#8A5A00" stroke-width="2">
              <path d="M -16 6 L -20 -8 L -7 0 L 0 -12 L 7 0 L 20 -8 L 16 6 Z" fill="#FFD24D" />
              <rect x="-16" y="6" width="32" height="8" rx="2" fill="#FFC63A" />
            </g>
            <circle cx="-9" cy="-2" r="1.8" fill="#E63946" />
            <circle cx="0" cy="-4" r="1.8" fill="#3A86FF" />
            <circle cx="9" cy="-2" r="1.8" fill="#38B000" />
          </g>
        {/if}
      </g>
    </g>
  </svg>
</div>

<style>
  /* Flottement général (gentil va-et-vient vertical) */
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-6px); }
  }

  /* Respiration : on « gonfle » légèrement le corps */
  @keyframes breathe {
    0%, 100% { transform: scale(1, 1); }
    50% { transform: scale(1.025, 0.975); }
  }

  /* Battement d'ailes (dragon rapide) */
  @keyframes wing-flap {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(6deg); }
  }
  .wing-flap {
    animation: wing-flap 0.9s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 60%;
  }

  /* Dandinement de la queue / des nageoires */
  @keyframes tail-sway {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(4deg); }
  }
  .tail-sway {
    animation: tail-sway 2.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 20% 80%;
  }

  /* La couronne reste légèrement en lévitation */
  @keyframes crown-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }
  .crown-float {
    animation: crown-float 2.6s ease-in-out infinite;
  }

  .idle-animation {
    animation: float 3s ease-in-out infinite;
  }
  .breathe {
    animation: breathe 2.4s ease-in-out infinite;
  }
</style>