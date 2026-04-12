<script lang="ts">
  import "./styles.css";
  import { createEventDispatcher } from "svelte";
  import { spriteUrl } from "$lib/sprites";
  import type { TeamSlot } from "$lib/stores/teams";

  /** The current slot — null means empty */
  export let slot: TeamSlot;

  const dispatch = createEventDispatcher<{
    pick: void;
    clear: void;
    scarf: void;
  }>();
</script>

<div class="slot">
  {#if slot}
    <button class="slot-clear" on:click={() => dispatch("clear")}>×</button>
    <button
      class="slot-filled"
      on:click={() => dispatch("pick")}
      aria-label="Change {slot.entry.name}"
    >
      <img src={spriteUrl(slot.entry.name)} alt="" class="slot-sprite" />
      <span class="slot-name">{slot.entry.name}</span>
      <span class="slot-spe">{slot.entry.baseSpe}</span>
    </button>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div
      class="scarf-pill"
      class:active={slot.scarf}
      on:click|stopPropagation={() => dispatch("scarf")}
    >
      Scarf
    </div>
  {:else}
    <button class="slot-empty" on:click={() => dispatch("pick")}>
      <span class="plus">+</span>
    </button>
  {/if}
</div>
