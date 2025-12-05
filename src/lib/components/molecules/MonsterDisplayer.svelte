<script lang="ts">
  import type { Monster } from "../../../core/entities/Monster";
  import HealthBar from "../atoms/HealthBar.svelte";
  import SpriteDisplayer from "../atoms/SpriteDisplayer.svelte";
  import { monsterStyles } from "../../styles/monsterStyles";

  export let monster: Monster;
  export let isPlayer: boolean;
</script>

<div
  class="
    {monsterStyles.container.base} 
    {isPlayer ? monsterStyles.container.player : monsterStyles.container.enemy}
  "
>
  <div class={monsterStyles.spriteSection.overlay}></div>
  <SpriteDisplayer {monster} {isPlayer} />

  <div class={monsterStyles.nameTag.wrapper}>
    <h2 class={monsterStyles.nameTag.text}>
      {monster.name}
    </h2>
  </div>

  <div class={monsterStyles.info.container}>
    <div class={monsterStyles.info.healthWrapper}>
      <HealthBar current={monster.currentHp} max={monster.maxHp} />
    </div>

    <div class={monsterStyles.info.moveGrid}>
      {#each monster.moves as move}
        <div class="truncate">
          {move.name}
        </div>
      {/each}
    </div>
  </div>
</div>
