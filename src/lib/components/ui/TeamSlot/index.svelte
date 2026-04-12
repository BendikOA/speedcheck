<script lang="ts">
  import "./styles.css";
  import { createEventDispatcher } from "svelte";
  import { spriteUrl } from "$lib/sprites";
  import type { TeamSlot } from "$lib/stores/teams";
  import Pill from "$lib/components/ui/Pill/index.svelte";

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
    <Pill
      color="#f5c96c"
      active={slot.scarf}
      interactive
      on:click={(e) => { e.stopPropagation(); dispatch("scarf"); }}
    >Scarf</Pill>
  {:else}
    <button class="slot-empty" on:click={() => dispatch("pick")}>
      <span class="plus">+</span>
    </button>
  {/if}
</div>
