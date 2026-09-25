<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";

  export let monster: Monster;
  export let isPlayer: boolean;

  type ElementType = Monster['type'];

  interface Palette {
    skin: string;
    skinLight: string;
    skinMid: string;
    skinDark: string;
    belly: string;
    bellyLight: string;
    accent: string;
    accentDark: string;
    line: string;
    eye: string;
    eyeLight: string;
    aura: string;
    particle: string;
  }

  const palettes: Record<ElementType, Palette> = {
    fire: {
      skin: '#d85a36', skinLight: '#ffad69', skinMid: '#a9362f', skinDark: '#5f2028',
      belly: '#d88738', bellyLight: '#ffd27a', accent: '#ffca55', accentDark: '#a94d25',
      line: '#421a25', eye: '#ffbd38', eyeLight: '#fff6c7', aura: '#ff6a36', particle: '#ff9f43'
    },
    water: {
      skin: '#287ea1', skinLight: '#91e1eb', skinMid: '#17627f', skinDark: '#123c59',
      belly: '#7bcbd5', bellyLight: '#d7fbf4', accent: '#66e6ef', accentDark: '#237f9d',
      line: '#102f45', eye: '#69e5ef', eyeLight: '#efffff', aura: '#32bfd9', particle: '#8be8ef'
    },
    grass: {
      skin: '#668a43', skinLight: '#b9cf72', skinMid: '#456837', skinDark: '#29462c',
      belly: '#b5a56c', bellyLight: '#e9dda4', accent: '#9bc85b', accentDark: '#537638',
      line: '#243521', eye: '#b9df68', eyeLight: '#f2ffd1', aura: '#6a9e46', particle: '#b7d875'
    },
    electric: {
      skin: '#d89b35', skinLight: '#ffe18b', skinMid: '#a76527', skinDark: '#63361f',
      belly: '#f1c969', bellyLight: '#fff0ac', accent: '#64d9f2', accentDark: '#2a78a4',
      line: '#442718', eye: '#55d9f5', eyeLight: '#e9fdff', aura: '#f1bd38', particle: '#6be2f5'
    },
    rock: {
      skin: '#827b70', skinLight: '#c1b9aa', skinMid: '#5f5a52', skinDark: '#3b3935',
      belly: '#999184', bellyLight: '#d4cdbf', accent: '#82c6bd', accentDark: '#426b68',
      line: '#292724', eye: '#8ee2d5', eyeLight: '#e1fffa', aura: '#8d8577', particle: '#9ed8ce'
    },
    normal: {
      skin: '#8a6b55', skinLight: '#d1ae8d', skinMid: '#654b3d', skinDark: '#3f3029',
      belly: '#c5aa8e', bellyLight: '#ead4b8', accent: '#d6b57e', accentDark: '#7e6248',
      line: '#30251f', eye: '#6bb7c7', eyeLight: '#e8fcff', aura: '#9c785e', particle: '#d2af8c'
    }
  };

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function torsoPath(shoulder: number, waist: number): string {
    return `M ${120 - shoulder} 110
      C ${120 - shoulder - 5} 121 ${120 - shoulder - 1} 136 ${120 - waist} 151
      C ${120 - waist - 2} 169 ${120 - waist + 3} 184 120 188
      C ${120 + waist - 3} 184 ${120 + waist + 2} 169 ${120 + waist} 151
      C ${120 + shoulder + 1} 136 ${120 + shoulder + 5} 121 ${120 + shoulder} 110
      C 105 103 96 104 91 109
      C 99 116 106 117 120 115
      C 134 117 141 116 149 109
      C 144 104 135 103 120 110 Z`;
  }

  function bellyPath(waist: number): string {
    return `M ${120 - waist * 0.76} 127
      C ${120 - waist * 0.92} 143 ${120 - waist * 0.78} 171 120 181
      C ${120 + waist * 0.78} 171 ${120 + waist * 0.92} 143 ${120 + waist * 0.76} 127
      C 109 121 131 121 120 127 Z`;
  }

  function headPath(type: ElementType, rx: number, ry: number): string {
    if (type === 'fire') {
      return `M ${120 - rx} 72 C ${120 - rx - 2} 48 ${120 - rx * 0.55} 34 120 34
        C ${120 + rx * 0.55} 34 ${120 + rx + 2} 48 ${120 + rx} 72
        L ${120 + rx * 0.84} 91 C ${120 + rx * 0.55} 106 139 112 120 113
        C 101 112 ${120 - rx * 0.55} 106 ${120 - rx * 0.84} 91 Z`;
    }
    if (type === 'water') {
      return `M ${120 - rx} 75 C ${120 - rx - 3} 53 ${120 - rx * 0.62} 39 120 38
        C ${120 + rx * 0.62} 39 ${120 + rx + 3} 53 ${120 + rx} 75
        C ${120 + rx * 0.77} 91 ${120 + rx * 0.42} 105 120 108
        C ${120 - rx * 0.42} 105 ${120 - rx * 0.77} 91 ${120 - rx} 75 Z`;
    }
    if (type === 'grass') {
      return `M ${120 - rx} 74 C ${120 - rx - 3} 48 ${120 - rx * 0.58} 35 120 35
        C ${120 + rx * 0.58} 35 ${120 + rx + 3} 48 ${120 + rx} 74
        C ${120 + rx} 94 ${120 + rx * 0.55} 109 120 110
        C ${120 - rx * 0.55} 109 ${120 - rx} 94 ${120 - rx} 74 Z`;
    }
    if (type === 'electric') {
      return `M ${120 - rx} 72 L ${120 - rx * 0.78} 45 L ${120 - rx * 0.34} 51
        C ${120 - rx * 0.2} 37 120 33 120 33
        C 120 33 ${120 + rx * 0.2} 37 ${120 + rx * 0.34} 51
        L ${120 + rx * 0.78} 45 L ${120 + rx} 72
        C ${120 + rx * 0.9} 91 ${120 + rx * 0.5} 107 120 109
        C ${120 - rx * 0.5} 107 ${120 - rx * 0.9} 91 ${120 - rx} 72 Z`;
    }
    if (type === 'rock') {
      return `M ${120 - rx} 55 L ${120 - rx * 0.72} 38 L ${120 - rx * 0.2} 34
        L 120 38 L ${120 + rx * 0.22} 34 L ${120 + rx * 0.74} 39
        L ${120 + rx} 58 L ${120 + rx * 0.86} 88 L ${120 + rx * 0.48} 106
        L 120 111 L ${120 - rx * 0.48} 106 L ${120 - rx * 0.86} 88 Z`;
    }
    return `M ${120 - rx} 73
      C ${120 - rx - 2} 50 ${120 - rx * 0.58} 36 120 35
      C ${120 + rx * 0.58} 36 ${120 + rx + 2} 50 ${120 + rx} 73
      C ${120 + rx * 0.9} 89 ${120 + rx * 0.58} 103 ${120 + rx * 0.25} 108
      L 120 113 L ${120 - rx * 0.25} 108
      C ${120 - rx * 0.58} 103 ${120 - rx * 0.9} 89 ${120 - rx} 73 Z`;
  }

  function leftArmPath(type: ElementType): string {
    if (type === 'rock') return 'M 88 119 C 70 126 62 145 64 166';
    if (type === 'water') return 'M 89 121 C 76 133 70 148 70 163';
    if (type === 'grass') return 'M 87 121 C 72 135 66 150 67 165';
    if (type === 'fire') return 'M 88 120 C 70 132 63 147 64 161';
    if (type === 'electric') return 'M 88 119 C 69 131 62 145 63 159';
    return 'M 88 120 C 72 132 66 148 67 164';
  }

  function leftLegPath(type: ElementType): string {
    if (type === 'fire' || type === 'electric') return 'M 106 176 L 94 197 L 106 210 L 102 225';
    if (type === 'water') return 'M 106 176 C 97 192 97 208 104 224';
    if (type === 'grass') return 'M 106 176 L 99 198 L 104 225';
    if (type === 'rock') return 'M 106 177 L 99 195 L 102 224';
    return 'M 106 176 L 100 199 L 104 225';
  }

  function rightLegPath(type: ElementType): string {
    if (type === 'fire' || type === 'electric') return 'M 134 176 L 146 197 L 134 210 L 138 225';
    if (type === 'water') return 'M 134 176 C 143 192 143 208 136 224';
    if (type === 'grass') return 'M 134 176 L 141 198 L 136 225';
    if (type === 'rock') return 'M 134 177 L 141 195 L 138 224';
    return 'M 134 176 L 140 199 L 136 225';
  }

  $: type = monster.type;
  $: palette = palettes[type];
  $: seed = hashString(`${monster.id}:${monster.name}:${monster.type}`);
  $: variant = seed % 3;
  $: patternOffset = seed % 5;
  $: levelTier = clamp(Math.floor(monster.level / 5), 0, 3);
  $: gid = `sprite-${seed.toString(36)}-${isPlayer ? 'p' : 'e'}`;
  $: isBoss = monster.rank === 'boss';
  $: isTired = monster.currentHp <= monster.maxHp * 0.35;
  $: isHappy = monster.charisma >= 14;
  $: isAngry = monster.strength >= 15;
  $: isFocused = monster.instinct >= 15;
  $: hasWisdomGem = monster.wisdom >= 15;
  $: hasCharismaCharm = monster.charisma >= 16;
  $: muscle = clamp((monster.strength - 10) * 0.75, -2, 9);
  $: bulk = clamp((monster.constitution - 10) * 0.7, -2, 8);
  $: agility = clamp((monster.speed - 10) * 0.4, -3, 6);
  $: shoulderWidth = clamp(32 + muscle * 0.65 + bulk * 0.55, 26, 45);
  $: waistWidth = clamp(25 + bulk * 0.7 + muscle * 0.15, 21, 35);
  $: limbWidth = clamp(11 + bulk * 0.7 + muscle * 0.18, 9, 18);
  $: headRadiusX = clamp(34 + (monster.charisma - 10) * 0.28 + (isBoss ? 2 : 0), 30, 40);
  $: headRadiusY = clamp(31 + bulk * 0.2, 29, 36);
  $: eyeScale = clamp(0.86 + monster.instinct * 0.015, 0.85, 1.12);
  $: bodyPath = torsoPath(shoulderWidth, waistWidth);
  $: bellyShape = bellyPath(waistWidth);
  $: headShape = headPath(type, headRadiusX, headRadiusY);
  $: rigScale = (isBoss ? 1.07 : 1) + Math.min(monster.level, 20) * 0.002;
  $: legLeft = leftLegPath(type);
  $: legRight = rightLegPath(type);
  $: legStretch = 1 + agility * 0.008;
  $: armLeft = leftArmPath(type);
  $: armRight = type === 'rock'
    ? 'M 152 119 C 170 126 178 145 176 166'
    : type === 'water'
      ? 'M 151 121 C 164 133 170 148 170 163'
      : type === 'grass'
        ? 'M 153 121 C 168 135 174 150 173 165'
        : type === 'fire'
          ? 'M 152 120 C 170 132 177 147 176 161'
          : type === 'electric'
            ? 'M 152 119 C 171 131 178 145 177 159'
            : 'M 152 120 C 168 132 174 148 173 164';
</script>

<div class="sprite-root relative h-full w-full">
  <svg
    viewBox="0 0 240 230"
    preserveAspectRatio="xMidYMid meet"
    class="h-full w-full overflow-visible"
    role="img"
    aria-label="Sprite de {monster.name}, monstre de type {type}"
  >
    <title>{monster.name} — avatar félin</title>
    <defs>
      <linearGradient id="{gid}-skin" x1="0.08" y1="0.05" x2="0.9" y2="0.95">
        <stop offset="0%" stop-color={palette.skinLight} />
        <stop offset="26%" stop-color={palette.skin} />
        <stop offset="68%" stop-color={palette.skinMid} />
        <stop offset="100%" stop-color={palette.skinDark} />
      </linearGradient>
      <linearGradient id="{gid}-skin-dark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color={palette.skinMid} />
        <stop offset="100%" stop-color={palette.skinDark} />
      </linearGradient>
      <linearGradient id="{gid}-belly" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stop-color={palette.bellyLight} />
        <stop offset="58%" stop-color={palette.belly} />
        <stop offset="100%" stop-color={palette.skinMid} />
      </linearGradient>
      <linearGradient id="{gid}-accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color={palette.bellyLight} />
        <stop offset="45%" stop-color={palette.accent} />
        <stop offset="100%" stop-color={palette.accentDark} />
      </linearGradient>
      <radialGradient id="{gid}-aura" cx="50%" cy="46%" r="52%">
        <stop offset="0%" stop-color={palette.aura} stop-opacity="0.34" />
        <stop offset="56%" stop-color={palette.aura} stop-opacity="0.1" />
        <stop offset="100%" stop-color={palette.aura} stop-opacity="0" />
      </radialGradient>
      <radialGradient id="{gid}-iris" cx="35%" cy="28%" r="70%">
        <stop offset="0%" stop-color={palette.eyeLight} />
        <stop offset="34%" stop-color={palette.eye} />
        <stop offset="100%" stop-color={palette.accentDark} />
      </radialGradient>
      <radialGradient id="{gid}-muzzle" cx="50%" cy="18%" r="85%">
        <stop offset="0%" stop-color={palette.bellyLight} />
        <stop offset="100%" stop-color={palette.belly} />
      </radialGradient>
      <linearGradient id="{gid}-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={palette.aura} stop-opacity="0.22" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.34" />
      </linearGradient>

      {#if type === 'fire' || type === 'water'}
        <pattern id="{gid}-texture" width="12" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate({patternOffset * 3})">
          <path d="M -3 5 Q 3 -1 9 5 Q 3 10 -3 5 M 9 5 Q 15 -1 21 5" fill="none" stroke={palette.accentDark} stroke-width="1" opacity="0.38" />
          <path d="M 0 4 Q 3 1 6 4" fill="none" stroke={palette.bellyLight} stroke-width="0.8" opacity="0.28" />
        </pattern>
      {:else if type === 'grass'}
        <pattern id="{gid}-texture" width="17" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate({patternOffset * 4})">
          <path d="M 2 11 Q 5 2 8 11 M 10 5 Q 13 -1 15 6" fill="none" stroke={palette.accentDark} stroke-width="1" opacity="0.32" />
          <circle cx="5" cy="4" r="1" fill={palette.bellyLight} opacity="0.18" />
          <circle cx="13" cy="12" r="1.2" fill={palette.skinDark} opacity="0.2" />
        </pattern>
      {:else if type === 'electric'}
        <pattern id="{gid}-texture" width="18" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
          <path d="M -3 4 L 5 4 L 2 8 L 10 8 M 8 0 L 16 0 L 13 4 L 21 4" fill="none" stroke={palette.skinDark} stroke-width="2.1" opacity="0.3" />
          <path d="M 0 12 L 7 12" stroke={palette.bellyLight} stroke-width="1" opacity="0.22" />
        </pattern>
      {:else if type === 'rock'}
        <pattern id="{gid}-texture" width="24" height="22" patternUnits="userSpaceOnUse" patternTransform={`rotate(${patternOffset * 5})`}>
          <path d="M 0 0 L 11 0 L 7 9 L 0 12 M 11 0 L 24 0 L 21 14 L 7 9 M 7 9 L 10 22 L 0 17 M 10 22 L 21 14 L 24 22" fill="none" stroke={palette.line} stroke-width="0.8" opacity="0.22" />
          <path d="M 2 2 L 9 2 M 12 11 L 19 10" stroke={palette.skinLight} stroke-width="1" opacity="0.16" />
        </pattern>
      {:else}
        <pattern id="{gid}-texture" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform={`rotate(${patternOffset * 2})`}>
          <path d="M 1 7 L 3 3 M 6 9 L 8 5" stroke={palette.bellyLight} stroke-width="0.9" stroke-linecap="round" opacity="0.2" />
          <path d="M 7 2 L 9 0" stroke={palette.skinDark} stroke-width="0.7" stroke-linecap="round" opacity="0.18" />
        </pattern>
      {/if}

      <filter id="{gid}-depth" x="-35%" y="-25%" width="170%" height="170%">
        <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#090706" flood-opacity="0.48" />
      </filter>
      <filter id="{gid}-soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.34" />
      </filter>
      <filter id="{gid}-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="{gid}-blur">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <path id="{gid}-torso-shape" d={bodyPath} />
      <path id="{gid}-head-shape" d={headShape} />
      <clipPath id="{gid}-torso-clip"><use href="#{gid}-torso-shape" /></clipPath>
      <clipPath id="{gid}-head-clip"><use href="#{gid}-head-shape" /></clipPath>
      <clipPath id="{gid}-eye-left"><path d="M 91 73 Q 103 62 116 73 Q 103 82 91 73 Z" /></clipPath>
      <clipPath id="{gid}-eye-right"><path d="M 124 73 Q 136 62 149 73 Q 136 82 124 73 Z" /></clipPath>
    </defs>

    <ellipse cx="120" cy="228" rx="62" ry="10" fill="url(#{gid}-ground)" />
    {#if isPlayer}
      <ellipse cx="120" cy="226" rx="52" ry="6" fill="none" stroke="#7dd3fc" stroke-width="1.5" opacity="0.55" />
    {/if}
    <circle class="aura-pulse" cx="120" cy="123" r={isBoss ? 92 : 80} fill="url(#{gid}-aura)" />

    <g class="ambient-particle particle-one" fill={palette.particle}>
      <circle cx="43" cy="86" r={2.2 + levelTier * 0.25} opacity="0.6" />
    </g>
    <g class="ambient-particle particle-two" fill={palette.particle}>
      <path d="M 194 72 L 197 79 L 204 82 L 197 85 L 194 92 L 191 85 L 184 82 L 191 79 Z" opacity="0.58" />
    </g>
    <g class="ambient-particle particle-three" fill={palette.particle}>
      <circle cx="187" cy="151" r={1.8 + variant * 0.2} opacity="0.5" />
    </g>

    <g class="sprite-idle">
      <g transform="translate(120 228) scale({rigScale}) translate(-120 -228)">
        <g class="sprite-breathe">
          {#if type === 'fire'}
            <g class="wing-motion wing-left" filter="url(#{gid}-soft-shadow)">
              <path d="M 91 124 C 70 104 48 87 27 72 C 37 99 53 122 78 141 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="3" stroke-linejoin="round" />
              <path d="M 84 124 C 67 105 49 88 31 78 M 76 131 C 61 111 46 101 40 95 M 71 135 C 57 122 49 117 45 112" fill="none" stroke={palette.skinDark} stroke-width="2" opacity="0.7" />
              <path d="M 29 74 C 38 88 43 99 46 108" fill="none" stroke={palette.bellyLight} stroke-width="1.4" opacity="0.65" />
            </g>
            <g class="wing-motion wing-right" filter="url(#{gid}-soft-shadow)">
              <path d="M 149 124 C 170 104 192 87 213 72 C 203 99 187 122 162 141 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="3" stroke-linejoin="round" />
              <path d="M 156 124 C 173 105 191 88 209 78 M 164 131 C 179 111 194 101 200 95 M 169 135 C 183 122 191 117 195 112" fill="none" stroke={palette.skinDark} stroke-width="2" opacity="0.7" />
              <path d="M 211 74 C 202 88 197 99 194 108" fill="none" stroke={palette.bellyLight} stroke-width="1.4" opacity="0.65" />
            </g>
            <g class="tail-motion">
              <path d="M 151 175 C 178 173 197 185 205 207" fill="none" stroke={palette.line} stroke-width="16" stroke-linecap="round" />
              <path d="M 151 175 C 178 173 197 185 205 207" fill="none" stroke="url(#{gid}-skin)" stroke-width="11" stroke-linecap="round" />
              <path d="M 201 204 C 210 194 216 201 213 211 C 222 207 223 218 214 224 C 220 231 211 237 204 229 C 196 231 192 221 199 215 C 194 209 198 203 201 204 Z" fill="url(#{gid}-accent)" stroke={palette.accentDark} stroke-width="1.8" />
              <path d="M 205 212 Q 211 216 208 225 Q 202 220 205 212 Z" fill={palette.bellyLight} opacity="0.9" />
            </g>
          {:else if type === 'water'}
            <g class="tail-motion">
              <path d="M 153 174 C 176 173 194 185 207 203" fill="none" stroke={palette.line} stroke-width="13" stroke-linecap="round" />
              <path d="M 153 174 C 176 173 194 185 207 203" fill="none" stroke="url(#{gid}-skin)" stroke-width="8" stroke-linecap="round" />
              <path d="M 201 196 C 207 184 215 180 219 183 C 215 192 214 196 212 201 C 223 200 228 206 219 212 C 214 216 208 214 202 209 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
            </g>
            <path d="M 107 112 C 96 87 103 67 121 50 C 116 74 128 91 132 111 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.5" />
            <path d="M 81 132 C 57 123 45 134 39 151 C 58 151 72 145 86 139 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.5" />
            <path d="M 159 132 C 183 123 195 134 201 151 C 182 151 168 145 154 139 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.5" />
          {:else if type === 'grass'}
            <g class="branch-motion" fill="none" stroke={palette.line} stroke-linecap="round">
              <path d="M 99 100 C 82 88 70 74 65 55 M 83 80 L 69 65 M 74 69 L 58 68 M 141 100 C 158 88 170 74 175 55 M 157 80 L 171 65 M 166 69 L 182 68" stroke-width="5" />
              <path d="M 99 100 C 82 88 70 74 65 55 M 141 100 C 158 88 170 74 175 55" stroke={palette.skinMid} stroke-width="2.5" />
            </g>
            <g class="leaf-motion">
              <path d="M 65 56 C 47 52 41 42 46 32 C 59 35 66 43 65 56 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
              <path d="M 70 68 C 53 68 44 60 47 50 C 60 52 68 58 70 68 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
              <path d="M 58 68 C 44 73 35 69 33 60 C 45 55 54 58 58 68 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
              <path d="M 175 56 C 193 52 199 42 194 32 C 181 35 174 43 175 56 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
              <path d="M 170 68 C 187 68 196 60 193 50 C 180 52 172 58 170 68 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
              <path d="M 182 68 C 196 73 205 69 207 60 C 195 55 186 58 182 68 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.8" />
            </g>
            <path d="M 97 182 C 77 194 69 212 72 226 M 143 182 C 163 194 171 212 168 226" fill="none" stroke={palette.line} stroke-width="7" stroke-linecap="round" opacity="0.85" />
            <path d="M 97 182 C 77 194 69 212 72 226 M 143 182 C 163 194 171 212 168 226" fill="none" stroke="url(#{gid}-skin)" stroke-width="4" stroke-linecap="round" />
          {:else if type === 'electric'}
            <g class="tail-motion">
              <path d="M 149 176 C 175 175 187 157 193 138" fill="none" stroke={palette.line} stroke-width="17" stroke-linecap="round" />
              <path d="M 149 176 C 175 175 187 157 193 138" fill="none" stroke="url(#{gid}-skin)" stroke-width="12" stroke-linecap="round" />
              <path d="M 184 153 L 179 137 L 191 140 L 189 121 L 201 136 L 198 115 L 210 127 L 211 105 C 216 120 216 132 210 143 C 202 156 194 159 184 153 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
            </g>
            <g fill={palette.accent} opacity="0.65" filter="url(#{gid}-glow)">
              <path d="M 66 86 L 59 96 L 69 96 L 62 107 L 76 95 L 68 94 L 74 86 Z" />
              <path d="M 177 113 L 171 121 L 179 121 L 174 130 L 186 120 L 179 119 L 184 113 Z" />
            </g>
          {:else if type === 'rock'}
            <g class="crystal-glow" filter="url(#{gid}-soft-shadow)">
              <path d="M 93 113 L 79 87 L 95 93 L 99 70 L 109 92 L 105 68 L 118 94 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
              <path d="M 147 113 L 161 87 L 145 93 L 141 70 L 131 92 L 135 68 L 122 94 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
              <path d="M 89 158 L 70 145 L 80 160 L 64 165 L 84 169 Z M 151 158 L 170 145 L 160 160 L 176 165 L 156 169 Z" fill={palette.skinMid} stroke={palette.line} stroke-width="2" />
            </g>
            <g class="floating-shard" opacity="0.75">
              <path d="M 48 123 L 57 111 L 65 122 L 57 135 Z" fill={palette.skinMid} stroke={palette.line} stroke-width="1.5" />
              <path d="M 184 97 L 191 86 L 199 97 L 192 109 Z" fill={palette.skinMid} stroke={palette.line} stroke-width="1.5" />
            </g>
          {:else}
            <g class="tail-motion">
              <path d="M 148 175 C 176 168 190 184 190 203" fill="none" stroke={palette.line} stroke-width="18" stroke-linecap="round" />
              <path d="M 148 175 C 176 168 190 184 190 203" fill="none" stroke="url(#{gid}-skin)" stroke-width="12" stroke-linecap="round" />
              <path d="M 180 190 Q 195 187 203 199 Q 190 210 178 204 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" />
            </g>
          {/if}

          <g transform={`translate(0 176) scale(1 ${legStretch}) translate(0 -176)`}>
            <g class="leg-group" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d={legLeft} stroke={palette.line} stroke-width={limbWidth + 5} />
            <path d={legRight} stroke={palette.line} stroke-width={limbWidth + 5} />
            <path d={legLeft} stroke="url(#{gid}-skin)" stroke-width={limbWidth} />
            <path d={legRight} stroke="url(#{gid}-skin)" stroke-width={limbWidth} />
            <path d={legLeft} stroke={palette.skinLight} stroke-width={Math.max(1.5, limbWidth * 0.17)} opacity="0.34" transform="translate(-2 -1)" />
            <path d={legRight} stroke={palette.skinLight} stroke-width={Math.max(1.5, limbWidth * 0.17)} opacity="0.26" transform="translate(-2 -1)" />
          </g>

          {#if type === 'fire'}
            <g stroke={palette.line} stroke-width="1.6" stroke-linecap="round">
              <path d="M 100 225 L 91 231 M 105 225 L 100 233 M 108 226 L 109 233" />
              <path d="M 140 225 L 149 231 M 135 225 L 140 233 M 132 226 L 131 233" />
            </g>
          {:else if type === 'water'}
            <path d="M 103 221 C 90 220 84 226 88 231 C 98 233 107 229 108 223 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
            <path d="M 137 221 C 150 220 156 226 152 231 C 142 233 133 229 132 223 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
          {:else if type === 'grass'}
            <g fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.5">
              <path d="M 104 221 C 94 225 86 226 80 222 C 84 232 96 234 106 226 Z" />
              <path d="M 136 221 C 146 225 154 226 160 222 C 156 232 144 234 134 226 Z" />
            </g>
          {:else if type === 'electric'}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2">
              <path d="M 102 219 C 91 217 82 224 87 231 C 97 234 108 229 108 222 Z" />
              <path d="M 138 219 C 149 217 158 224 153 231 C 143 234 132 229 132 222 Z" />
            </g>
            <path d="M 89 229 L 85 233 M 94 231 L 92 235 M 151 229 L 155 233 M 146 231 L 148 235" stroke={palette.bellyLight} stroke-width="1.5" stroke-linecap="round" />
          {:else if type === 'rock'}
            <path d="M 90 215 L 111 217 L 108 233 L 84 232 Z M 129 217 L 150 215 L 156 232 L 132 233 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" stroke-linejoin="round" />
            <path d="M 88 222 L 105 223 M 136 223 L 151 221" stroke={palette.skinLight} stroke-width="1.2" opacity="0.45" />
          {:else}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.2">
              <path d="M 103 220 C 91 217 82 224 86 231 C 97 235 108 229 108 222 Z" />
              <path d="M 137 220 C 149 217 158 224 154 231 C 143 235 132 229 132 222 Z" />
            </g>
            <path d="M 91 230 L 88 234 M 97 232 L 96 236 M 149 230 L 152 234 M 143 232 L 144 236" stroke={palette.bellyLight} stroke-width="1.4" stroke-linecap="round" />
          {/if}
          </g>

          <g class="body-group" filter="url(#{gid}-depth)">
            <use href="#{gid}-torso-shape" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="3" stroke-linejoin="round" />
            <use href="#{gid}-torso-shape" fill="url(#{gid}-texture)" opacity={type === 'rock' ? 0.78 : 0.62} />
            <path d={bellyShape} fill="url(#{gid}-belly)" opacity="0.88" />
            <path d={bellyShape} fill="url(#{gid}-texture)" opacity="0.34" />
            <path d="M 120 111 C 106 121 107 139 111 153 C 114 161 120 165 120 165 C 120 165 126 161 129 153 C 133 139 134 121 120 111 Z" fill="#fff" opacity="0.055" />
            <path d="M {120 - shoulderWidth + 5} 118 C {120 - shoulderWidth + 1} 139 {120 - waistWidth - 2} 161 {120 - waistWidth + 6} 177" fill="none" stroke={palette.skinLight} stroke-width="3" opacity="0.26" stroke-linecap="round" />
            <path d="M 91 115 C 101 122 108 124 119 122 M 149 115 C 139 122 132 124 121 122" fill="none" stroke={palette.skinDark} stroke-width="2" opacity="0.42" stroke-linecap="round" />
            <path d="M 120 120 L 120 181" stroke={palette.skinDark} stroke-width="1.4" opacity="0.24" />
            <path d="M 104 128 Q 112 134 118 132 M 136 128 Q 128 134 122 132" fill="none" stroke={palette.skinLight} stroke-width="1.7" opacity="0.28" />
            <path d="M 108 166 Q 120 171 132 166" fill="none" stroke={palette.skinDark} stroke-width="1.5" opacity="0.3" />
          </g>

          {#if type === 'rock'}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" stroke-linejoin="round" filter="url(#{gid}-soft-shadow)">
              <path d="M 83 115 L 103 119 L 100 138 L 80 132 L 73 123 Z" />
              <path d="M 157 115 L 137 119 L 140 138 L 160 132 L 167 123 Z" />
            </g>
            <path d="M 79 121 L 98 125 M 142 125 L 161 121" stroke={palette.skinLight} stroke-width="1.5" opacity="0.45" />
          {:else if hasCharismaCharm}
            <g class="charm-sway">
              <path d="M 98 112 C 108 126 132 126 142 112" fill="none" stroke={palette.accentDark} stroke-width="3" />
              <path d="M 120 120 L 114 129 L 120 137 L 126 129 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.5" />
              <circle cx="120" cy="127" r="2" fill={palette.eyeLight} />
            </g>
          {/if}

          <g class="arm-group" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d={armLeft} stroke={palette.line} stroke-width={limbWidth + 5} />
            <path d={armRight} stroke={palette.line} stroke-width={limbWidth + 5} />
            <path d={armLeft} stroke="url(#{gid}-skin)" stroke-width={limbWidth} />
            <path d={armRight} stroke="url(#{gid}-skin)" stroke-width={limbWidth} />
            <path d={armLeft} stroke={palette.skinLight} stroke-width={Math.max(1.4, limbWidth * 0.15)} opacity="0.3" transform="translate(-2 -1)" />
            <path d={armRight} stroke={palette.skinLight} stroke-width={Math.max(1.4, limbWidth * 0.15)} opacity="0.22" transform="translate(-2 -1)" />
            <ellipse cx={120 - shoulderWidth + 2} cy="120" rx={limbWidth * 0.66} ry={limbWidth * 0.72} fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" />
            <ellipse cx={120 + shoulderWidth - 2} cy="120" rx={limbWidth * 0.66} ry={limbWidth * 0.72} fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" />
          </g>

          {#if type === 'water'}
            <g fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2">
              <path d="M 67 155 C 53 157 48 166 51 174 C 62 172 70 165 73 158 Z" />
              <path d="M 173 155 C 187 157 192 166 189 174 C 178 172 170 165 167 158 Z" />
            </g>
          {:else if type === 'grass'}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.2">
              <path d="M 65 155 C 56 157 54 169 60 176 C 69 172 73 165 73 158 Z" />
              <path d="M 175 155 C 184 157 186 169 180 176 C 171 172 167 165 167 158 Z" />
            </g>
            <g fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="1.3">
              <path d="M 60 171 C 50 168 47 161 51 156 C 59 158 63 164 60 171 Z" />
              <path d="M 180 171 C 190 168 193 161 189 156 C 181 158 177 164 180 171 Z" />
            </g>
          {:else if type === 'rock'}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.5" stroke-linejoin="round" filter="url(#{gid}-soft-shadow)">
              <path d="M 64 149 C 53 151 49 164 55 175 C 67 178 77 170 78 158 Z" />
              <path d="M 176 149 C 187 151 191 164 185 175 C 173 178 163 170 162 158 Z" />
            </g>
            <path d="M 57 159 L 72 163 M 183 159 L 168 163" stroke={palette.skinLight} stroke-width="1.4" opacity="0.38" />
          {:else}
            <g fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.2">
              <ellipse cx={type === 'fire' || type === 'electric' ? 63 : 66} cy="166" rx="10" ry="9" transform={`rotate(-12 ${type === 'fire' || type === 'electric' ? 63 : 66} 166)`} />
              <ellipse cx={type === 'fire' || type === 'electric' ? 177 : 174} cy="166" rx="10" ry="9" transform={`rotate(12 ${type === 'fire' || type === 'electric' ? 177 : 174} 166)`} />
            </g>
            <g stroke={palette.bellyLight} stroke-width="1.8" stroke-linecap="round" opacity="0.9">
              <path d="M 58 171 L 53 175 M 63 172 L 59 177 M 68 172 L 65 177" />
              <path d="M 182 171 L 187 175 M 177 172 L 181 177 M 172 172 L 175 177" />
            </g>
          {/if}

          {#if type === 'fire'}
            <g filter="url(#{gid}-soft-shadow)">
              <path d="M 88 47 C 76 34 78 18 91 8 C 89 24 99 32 101 45 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.5" />
              <path d="M 152 47 C 164 34 162 18 149 8 C 151 24 141 32 139 45 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.5" />
              <path d="M 89 37 C 84 29 86 21 91 17 C 91 27 95 32 96 40 Z M 151 37 C 156 29 154 21 149 17 C 149 27 145 32 144 40 Z" fill={palette.bellyLight} opacity="0.58" />
            </g>
          {:else if type === 'water'}
            <g class="fin-motion" filter="url(#{gid}-soft-shadow)">
              <path d="M 99 43 C 100 26 110 15 120 10 C 120 25 130 31 133 45 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.3" />
              <path d="M 110 41 L 120 24 L 124 43" fill="none" stroke={palette.bellyLight} stroke-width="1.3" opacity="0.6" />
              <path d="M 78 55 L 60 45 L 65 66 L 83 72 M 162 55 L 180 45 L 175 66 L 157 72" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.2" />
            </g>
          {:else if type === 'grass'}
            <g class="leaf-crown">
              <path d="M 103 42 C 91 25 95 13 108 7 C 106 22 116 29 116 40 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
              <path d="M 116 39 C 113 20 120 9 132 5 C 128 19 132 30 127 42 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
              <path d="M 132 43 C 141 27 153 25 163 31 C 153 40 146 46 135 49 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2" />
              {#if variant === 0}
                <circle cx="120" cy="18" r="5" fill={palette.bellyLight} stroke={palette.accentDark} stroke-width="1" />
                <circle cx="120" cy="18" r="2" fill={palette.accent} />
              {:else if variant === 1}
                <path d="M 102 28 C 93 20 95 12 102 8 C 105 17 109 21 109 29 Z" fill={palette.bellyLight} opacity="0.75" />
              {:else}
                <path d="M 139 27 C 146 16 155 15 161 21 C 154 27 148 31 140 33 Z" fill={palette.bellyLight} opacity="0.72" />
              {/if}
            </g>
          {:else if type === 'electric'}
            <g class="ear-twitch" filter="url(#{gid}-soft-shadow)">
              <path d="M 91 49 C 79 33 80 15 88 8 C 96 18 103 31 102 48 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.6" />
              <path d="M 149 49 C 161 33 160 15 152 8 C 144 18 137 31 138 48 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.6" />
              <path d="M 91 37 C 86 27 87 18 89 15 C 94 25 96 32 97 40 Z M 149 37 C 154 27 153 18 151 15 C 146 25 144 32 143 40 Z" fill={palette.accent} opacity="0.72" />
            </g>
          {:else if type === 'rock'}
            <g class="crystal-glow" filter="url(#{gid}-soft-shadow)">
              <path d="M 92 44 L 80 24 L 96 32 L 101 10 L 110 34 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.2" />
              <path d="M 148 44 L 160 24 L 144 32 L 139 10 L 130 34 Z" fill="url(#{gid}-accent)" stroke={palette.line} stroke-width="2.2" />
            </g>
          {:else}
            <g class="ear-twitch" filter="url(#{gid}-soft-shadow)">
              <path d="M 93 48 C 79 39 70 23 76 10 C 89 18 99 30 103 45 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.7" />
              <path d="M 147 48 C 161 39 170 23 164 10 C 151 18 141 30 137 45 Z" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="2.7" />
              <path d="M 80 21 C 83 28 90 35 96 39 C 88 31 85 25 84 19 Z M 160 21 C 157 28 150 35 144 39 C 152 31 155 25 156 19 Z" fill={palette.bellyLight} opacity="0.7" />
            </g>
          {/if}

          <g class="head-group" filter="url(#{gid}-depth)">
            <use href="#{gid}-head-shape" fill="url(#{gid}-skin)" stroke={palette.line} stroke-width="3" stroke-linejoin="round" />
            <use href="#{gid}-head-shape" fill="url(#{gid}-texture)" opacity={type === 'rock' ? 0.72 : 0.5} />
            <g clip-path="url(#{gid}-head-clip)">
              <ellipse cx="103" cy="48" rx="27" ry="19" fill={palette.skinLight} opacity="0.2" />
              <path d="M 78 66 C 87 89 91 100 104 111" fill="none" stroke={palette.skinLight} stroke-width="5" opacity="0.24" stroke-linecap="round" />
              <path d="M 160 63 C 155 86 147 102 135 112" fill="none" stroke={palette.skinDark} stroke-width="7" opacity="0.2" stroke-linecap="round" />
            </g>
            <path d="M {120 - headRadiusX + 4} 61 C {120 - headRadiusX + 2} 47 {120 - headRadiusX * 0.55} 38 120 36" fill="none" stroke={palette.bellyLight} stroke-width="2.4" opacity="0.38" stroke-linecap="round" />
          </g>

          {#if type !== 'rock'}
            <path d="M 96 86 C 97 96 104 103 120 106 C 136 103 143 96 144 86 C 136 81 104 81 96 86 Z" fill="url(#{gid}-muzzle)" opacity="0.95" />
            <path d="M 98 87 C 104 83 136 83 142 87" fill="none" stroke={palette.skinDark} stroke-width="1.4" opacity="0.28" />
          {/if}

          <g class="eye-blink">
            <ellipse cx="103" cy="73" rx="15" ry="10" fill={palette.skinDark} opacity="0.2" />
            <ellipse cx="137" cy="73" rx="15" ry="10" fill={palette.skinDark} opacity="0.2" />
            {#if isTired}
              <path d="M 91 74 Q 103 68 116 74 M 124 74 Q 136 68 149 74" fill="none" stroke={palette.line} stroke-width="3" stroke-linecap="round" />
            {:else}
              <path d="M 91 73 Q 103 62 116 73 Q 103 82 91 73 Z" fill="#f8f3e9" stroke={palette.line} stroke-width="1.8" />
              <path d="M 124 73 Q 136 62 149 73 Q 136 82 124 73 Z" fill="#f8f3e9" stroke={palette.line} stroke-width="1.8" />
              <g clip-path="url(#{gid}-eye-left)">
                <circle cx="104" cy="72" r={6.1 * eyeScale} fill="url(#{gid}-iris)" />
                <ellipse cx="104" cy="72" rx={type === 'water' || type === 'grass' || type === 'rock' ? 2.4 : 1.5} ry={5.3 * eyeScale} fill="#10131a" />
                <circle cx="101.5" cy="69" r="1.7" fill={palette.eyeLight} opacity="0.95" />
              </g>
              <g clip-path="url(#{gid}-eye-right)">
                <circle cx="136" cy="72" r={6.1 * eyeScale} fill="url(#{gid}-iris)" />
                <ellipse cx="136" cy="72" rx={type === 'water' || type === 'grass' || type === 'rock' ? 2.4 : 1.5} ry={5.3 * eyeScale} fill="#10131a" />
                <circle cx="133.5" cy="69" r="1.7" fill={palette.eyeLight} opacity="0.95" />
              </g>
              <path d="M 91 72 Q 103 61 116 72 M 124 72 Q 136 61 149 72" fill="none" stroke={palette.line} stroke-width="2.1" stroke-linecap="round" />
            {/if}

            {#if isAngry}
              <path d="M 89 60 L 115 67 M 151 60 L 125 67" fill="none" stroke={palette.line} stroke-width="3.6" stroke-linecap="round" />
            {:else if isHappy || isFocused}
              <path d="M 90 61 Q 102 56 115 62 M 150 61 Q 138 56 125 62" fill="none" stroke={palette.line} stroke-width="3" stroke-linecap="round" />
            {:else}
              <path d="M 90 62 Q 102 58 114 62 M 150 62 Q 138 58 126 62" fill="none" stroke={palette.skinDark} stroke-width="2.5" stroke-linecap="round" opacity="0.76" />
            {/if}
          </g>

          {#if type === 'fire'}
            <path d="M 108 89 Q 120 83 132 89 L 129 97 Q 120 101 111 97 Z" fill={palette.skinDark} stroke={palette.line} stroke-width="1.5" />
            <ellipse cx="115" cy="91" rx="1.8" ry="1.2" fill={palette.bellyLight} opacity="0.65" />
            <ellipse cx="125" cy="91" rx="1.8" ry="1.2" fill={palette.bellyLight} opacity="0.65" />
            <g fill="none" stroke={palette.accentDark} stroke-width="1.4" opacity="0.65">
              <path d="M 92 83 L 98 86 M 91 89 L 98 91 M 148 83 L 142 86 M 149 89 L 142 91" />
            </g>
          {:else if type === 'water'}
            <path d="M 109 89 Q 120 84 131 89 Q 128 97 120 98 Q 112 97 109 89 Z" fill={palette.skinDark} stroke={palette.line} stroke-width="1.4" />
            <path d="M 91 79 Q 83 84 84 91 M 89 86 Q 87 91 90 96 M 149 79 Q 157 84 156 91 M 151 86 Q 153 91 150 96" fill="none" stroke={palette.skinDark} stroke-width="1.8" stroke-linecap="round" opacity="0.58" />
            <circle cx="96" cy="49" r="2.4" fill={palette.bellyLight} opacity="0.46" />
            <circle cx="149" cy="57" r="1.7" fill={palette.bellyLight} opacity="0.38" />
          {:else if type === 'grass'}
            <ellipse cx="120" cy="91" rx="9" ry="6" fill={palette.skinDark} opacity="0.9" />
            <path d="M 114 89 Q 120 86 126 89" fill="none" stroke={palette.bellyLight} stroke-width="1.2" opacity="0.55" />
            <g fill={palette.accentDark} opacity="0.5">
              <circle cx="96" cy="57" r="2" /><circle cx="100" cy="62" r="1.3" /><circle cx="144" cy="57" r="2" /><circle cx="140" cy="62" r="1.3" />
            </g>
          {:else if type === 'electric'}
            <path d="M 108 90 Q 120 83 132 90 Q 128 100 120 100 Q 112 100 108 90 Z" fill="url(#{gid}-muzzle)" stroke={palette.skinDark} stroke-width="1.3" />
            <path d="M 114 89 Q 120 85 126 89 L 123 94 L 117 94 Z" fill={palette.skinDark} />
            <g fill="none" stroke={palette.bellyLight} stroke-width="1.1" opacity="0.64">
              <path d="M 103 94 L 81 91 M 103 99 L 83 102 M 137 94 L 159 91 M 137 99 L 157 102" />
            </g>
            <g fill="none" stroke={palette.skinDark} stroke-width="2" opacity="0.55">
              <path d="M 92 55 L 98 59 M 89 62 L 96 64 M 148 55 L 142 59 M 151 62 L 144 64" />
            </g>
          {:else if type === 'rock'}
            <path d="M 89 92 L 105 96 L 110 104 L 130 104 L 135 96 L 151 92" fill="none" stroke={palette.line} stroke-width="2.4" stroke-linejoin="round" />
            <path d="M 105 97 L 101 106 M 135 97 L 139 106" stroke={palette.accent} stroke-width="1.3" opacity="0.68" />
            <path d="M 95 49 L 101 57 L 97 65 M 145 49 L 139 57 L 143 65 M 115 39 L 118 45" fill="none" stroke={palette.accent} stroke-width="1.4" opacity="0.5" />
          {:else}
            <path d="M 106 89 Q 120 81 134 89 Q 132 102 120 105 Q 108 102 106 89 Z" fill="url(#{gid}-muzzle)" stroke={palette.skinDark} stroke-width="1.3" />
            <path d="M 112 88 Q 120 84 128 88 L 124 94 L 116 94 Z" fill={palette.skinDark} />
            <g fill="none" stroke={palette.bellyLight} stroke-width="1" opacity="0.55">
              <path d="M 106 95 L 85 92 M 106 100 L 87 103 M 134 95 L 155 92 M 134 100 L 153 103" />
            </g>
          {/if}

          {#if isHappy}
            <path d="M 108 100 Q 120 115 132 100 C 130 115 110 115 108 100 Z" fill="#5a2731" stroke={palette.line} stroke-width="1.6" />
            <path d="M 114 108 Q 120 103 126 108 Q 123 114 120 114 Q 117 114 114 108 Z" fill="#dc7782" />
            <path d="M 110 100 L 112 104 L 115 100 M 125 100 L 128 104 L 130 100" fill="#fff7df" stroke={palette.line} stroke-width="0.8" />
          {:else if isAngry}
            <path d="M 108 106 Q 120 98 132 106" fill="none" stroke={palette.line} stroke-width="2.8" stroke-linecap="round" />
            <path d="M 111 109 Q 120 105 129 109" fill="none" stroke={palette.skinDark} stroke-width="1.5" opacity="0.55" />
          {:else if isTired}
            <path d="M 111 106 Q 120 103 129 106 Q 120 111 111 106 Z" fill={palette.skinDark} opacity="0.75" />
          {:else}
            <path d="M 110 103 Q 120 110 130 103" fill="none" stroke={palette.line} stroke-width="2.7" stroke-linecap="round" />
            <path d="M 113 101 L 116 105 L 118 101 M 122 101 L 124 105 L 127 101" fill="#fff8e8" stroke={palette.line} stroke-width="0.8" />
          {/if}

          {#if hasWisdomGem}
            <g class="wisdom-glow" filter="url(#{gid}-glow)">
              <path d="M 120 40 L 127 47 L 120 55 L 113 47 Z" fill={palette.eye} stroke={palette.accentDark} stroke-width="1.4" />
              <path d="M 120 43 L 124 47 L 120 51 L 116 47 Z" fill={palette.eyeLight} opacity="0.78" />
            </g>
          {/if}

          {#if variant === 0}
            <g fill="none" stroke={palette.accentDark} stroke-width="1.5" opacity="0.56">
              <path d="M 120 61 L 120 69 M 114 63 L 117 68 M 126 63 L 123 68" />
            </g>
          {:else if variant === 1}
            <g fill={palette.accentDark} opacity="0.48">
              <circle cx="104" cy="48" r="1.8" /><circle cx="113" cy="44" r="1.2" /><circle cx="136" cy="48" r="1.8" /><circle cx="127" cy="44" r="1.2" />
            </g>
          {:else}
            <path d="M 111 50 Q 120 45 129 50 Q 126 58 120 60 Q 114 58 111 50 Z" fill={palette.accentDark} opacity="0.34" stroke={palette.bellyLight} stroke-width="1" />
          {/if}

          {#if isBoss}
            <g class="boss-crown" filter="url(#{gid}-soft-shadow)">
              <path d="M 92 29 L 87 8 L 102 18 L 111 2 L 120 17 L 129 2 L 138 18 L 153 8 L 148 29 Z" fill="url(#{gid}-accent)" stroke="#5a3a12" stroke-width="2.2" stroke-linejoin="round" />
              <path d="M 93 27 L 147 27 L 144 37 L 96 37 Z" fill={palette.accent} stroke="#5a3a12" stroke-width="1.7" />
              <circle cx="102" cy="21" r="2.4" fill="#d94a54" /><circle cx="120" cy="14" r="2.8" fill="#4ba3e8" /><circle cx="138" cy="21" r="2.4" fill="#67b95b" />
              <path d="M 98 31 L 142 31" stroke={palette.bellyLight} stroke-width="1.4" opacity="0.72" />
            </g>
          {/if}
        </g>
      </g>
    </g>
  </svg>
</div>

<style>
  .sprite-root {
    transform-origin: 50% 88%;
  }

  .sprite-idle {
    animation: idle-float 3.8s ease-in-out infinite;
    transform-origin: 50% 88%;
  }

  .sprite-breathe {
    animation: body-breathe 2.8s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 82%;
  }

  .body-group,
  .head-group {
    transform-box: fill-box;
    transform-origin: 50% 78%;
  }

  .tail-motion {
    animation: tail-drift 3.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 18% 62%;
  }

  .wing-left {
    animation: wing-left 1.35s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 92% 70%;
  }

  .wing-right {
    animation: wing-right 1.35s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 8% 70%;
  }

  .ear-twitch {
    animation: ear-twitch 4.2s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 100%;
  }

  .fin-motion,
  .leaf-crown,
  .leaf-motion,
  .branch-motion {
    animation: appendage-drift 3.6s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 100%;
  }

  .eye-blink {
    animation: blink 5.4s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  .aura-pulse {
    animation: aura-pulse 3.4s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }

  .ambient-particle {
    animation: particle-float 4.5s ease-in-out infinite;
  }

  .particle-one { animation-delay: -1.2s; }
  .particle-two { animation-delay: -2.5s; }
  .particle-three { animation-delay: -3.4s; }

  .crystal-glow {
    animation: crystal-pulse 3s ease-in-out infinite;
  }

  .floating-shard {
    animation: shard-float 4.1s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: center;
  }

  .boss-crown {
    animation: crown-float 3.1s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 100%;
  }

  .wisdom-glow {
    animation: gem-pulse 2.4s ease-in-out infinite;
  }

  .charm-sway {
    animation: charm-sway 3.4s ease-in-out infinite;
    transform-box: fill-box;
    transform-origin: 50% 0%;
  }

  @keyframes idle-float {
    0%, 100% { transform: translateY(0) rotate(-0.35deg); }
    50% { transform: translateY(-3px) rotate(0.35deg); }
  }

  @keyframes body-breathe {
    0%, 100% { transform: scale(1, 1); }
    50% { transform: scale(1.012, 0.988); }
  }

  @keyframes tail-drift {
    0%, 100% { transform: rotate(-2deg); }
    50% { transform: rotate(4deg); }
  }

  @keyframes wing-left {
    0%, 100% { transform: rotate(0deg) scaleY(1); }
    50% { transform: rotate(-4deg) scaleY(0.92); }
  }

  @keyframes wing-right {
    0%, 100% { transform: rotate(0deg) scaleY(1); }
    50% { transform: rotate(4deg) scaleY(0.92); }
  }

  @keyframes ear-twitch {
    0%, 80%, 100% { transform: rotate(0deg); }
    86% { transform: rotate(-3deg); }
    92% { transform: rotate(2deg); }
  }

  @keyframes appendage-drift {
    0%, 100% { transform: rotate(-1deg); }
    50% { transform: rotate(2deg); }
  }

  @keyframes blink {
    0%, 43%, 47%, 100% { transform: scaleY(1); }
    45% { transform: scaleY(0.08); }
  }

  @keyframes aura-pulse {
    0%, 100% { opacity: 0.68; transform: scale(0.96); }
    50% { opacity: 1; transform: scale(1.04); }
  }

  @keyframes particle-float {
    0%, 100% { opacity: 0.28; transform: translateY(3px); }
    50% { opacity: 0.82; transform: translateY(-7px); }
  }

  @keyframes crystal-pulse {
    0%, 100% { opacity: 0.82; }
    50% { opacity: 1; }
  }

  @keyframes shard-float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(5deg); }
  }

  @keyframes crown-float {
    0%, 100% { transform: translateY(0) rotate(-0.5deg); }
    50% { transform: translateY(-3px) rotate(0.5deg); }
  }

  @keyframes gem-pulse {
    0%, 100% { opacity: 0.72; }
    50% { opacity: 1; }
  }

  @keyframes charm-sway {
    0%, 100% { transform: rotate(-1.2deg); }
    50% { transform: rotate(1.2deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .sprite-idle,
    .sprite-breathe,
    .tail-motion,
    .wing-left,
    .wing-right,
    .ear-twitch,
    .fin-motion,
    .leaf-crown,
    .leaf-motion,
    .branch-motion,
    .eye-blink,
    .aura-pulse,
    .ambient-particle,
    .crystal-glow,
    .floating-shard,
    .boss-crown,
    .wisdom-glow,
    .charm-sway {
      animation: none;
    }
  }
</style>
