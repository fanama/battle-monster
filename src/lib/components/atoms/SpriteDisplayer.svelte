<script lang="ts">
  import { Monster } from "../../../core/entities/Monster";
  export let monster: Monster;
  export let isPlayer: boolean;
</script>

<div>
  <img
    src={monster.spriteUrl}
    alt="enemy"
    class={`
        relative z-10 h-32 object-contain pixelated drop-shadow-lg
        ${isPlayer && "transform scale-x-[-1]"}
      `}
  />
</div>
