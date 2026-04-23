<script lang="ts">
  import "./styles.scss";
  import { createEventDispatcher } from "svelte";
  import { spriteUrl } from "$lib/sprites";
  import type { TeamSlot } from "$lib/stores/teams";
  import Pill from "$lib/components/ui/Pill/index.svelte";
  import { displayName } from "$lib/displayName";

  /** The current slot — null means empty */
  export let slot: TeamSlot;
  /** Highlight this slot (e.g. currently selected/active on the field) */
  export let highlighted: boolean = false;

  const dispatch = createEventDispatcher<{
    pick: void;
    clear: void;
    scarf: void;
  }>();
</script>

<div class="slot-wrapper">
  <div class="slot" class:highlighted>
    {#if slot}
      <button class="slot-clear" on:click={() => dispatch("clear")}>×</button>
      <button
        class="slot-filled"
        on:click={() => dispatch("pick")}
        aria-label="Change {slot.entry.name}"
      >
        <img src={spriteUrl(slot.entry.name)} alt="" class="slot-sprite" />
      </button>
    {:else}
      <button class="slot-empty" on:click={() => dispatch("pick")}>
        <span class="plus">+</span>
      </button>
    {/if}
  </div>

  {#if slot}
    <div class="slot-meta">
      <span class="slot-name">{displayName(slot.entry.name)}</span>
      <div class="slot-stats">
        <span class="slot-spe">{slot.entry.baseSpe}</span>
        <Pill
          color="#f5c96c"
          active={slot.scarf}
          interactive
          on:click={(e) => { e.stopPropagation(); dispatch("scarf"); }}
        >Scarf</Pill>
      </div>
    </div>
  {/if}
</div>
