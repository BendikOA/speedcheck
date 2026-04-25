<script lang="ts">
  import "./styles.scss";
  import { createEventDispatcher } from "svelte";
  import type { TeamSlot } from "$lib/stores/teams";
  import TeamSlotComponent from "$lib/components/ui/TeamSlot/index.svelte";
  import Button from "$lib/components/ui/Button/index.svelte";

  export let label: string = "Your team";
  export let color: string = "#bcfd49";
  export let slots: (TeamSlot | null)[] = Array(6).fill(null);
  export let showSave: boolean = true;

  const dispatch = createEventDispatcher<{
    pick:   { index: number };
    clear:  { index: number };
    scarf:  { index: number };
    save:   void;
    import: void;
  }>();
</script>

<div class="team-panel">
  <div class="team-header">
    <div class="team-label">
      <span class="team-color" style="background: {color}"></span>
      <span class="team-name">{label}</span>
    </div>
    <div class="team-actions">
      {#if showSave}
        <Button variant="secondary" size="sm" onClick={() => dispatch("save")}>Save</Button>
      {/if}
      <Button variant="secondary" size="sm" onClick={() => dispatch("import")}>Import</Button>
    </div>
  </div>

  <div class="team-slots">
    {#each slots as slot, i}
      <TeamSlotComponent
        {slot}
        on:pick={() => dispatch("pick", { index: i })}
        on:clear={() => dispatch("clear", { index: i })}
        on:scarf={() => dispatch("scarf", { index: i })}
      />
    {/each}
  </div>
</div>
