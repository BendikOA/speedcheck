<script lang="ts">
  import "./styles.scss";
  import { createEventDispatcher } from "svelte";
  import type { TeamSlot } from "$lib/stores/teams";
  import SlotCard from "$lib/components/ui/SlotCard/index.svelte";
  import { displayName } from "$lib/displayName";

  export let slot: TeamSlot;
  export let highlighted: boolean = false;

  const dispatch = createEventDispatcher<{ pick: void; clear: void; scarf: void }>();
</script>

<div class="slot-wrapper">
  <SlotCard
    name={slot?.entry.name ?? null}
    {highlighted}
    on:pick={() => dispatch("pick")}
    on:clear={() => dispatch("clear")}
  />

  <div class="slot-info">
    {#if slot}
      <span class="slot-name">{displayName(slot.entry.name)}</span>
      <span class="slot-spe">{slot.entry.baseSpe}</span>
    {/if}
  </div>
</div>
