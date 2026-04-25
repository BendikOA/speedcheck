<script lang="ts">
  import "./styles.scss";
  import { createEventDispatcher } from "svelte";
  import { spriteUrl } from "$lib/sprites";

  export let name: string | null = null;
  export let highlighted: boolean = false;

  const dispatch = createEventDispatcher<{ pick: void; clear: void }>();
</script>

<div class="slot-card" class:highlighted class:filled={!!name}>
  {#if name}
    <button class="slot-clear" on:click={() => dispatch("clear")} aria-label="Remove">×</button>
    <button class="slot-pick" on:click={() => dispatch("pick")} aria-label="Change {name}">
      <img src={spriteUrl(name)} alt="" class="slot-sprite" />
    </button>
  {:else}
    <button class="slot-pick slot-empty" on:click={() => dispatch("pick")} aria-label="Add Pokémon">
      <span class="plus">+</span>
    </button>
  {/if}
</div>
