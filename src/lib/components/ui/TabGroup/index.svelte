<script lang="ts">
  import './styles.scss';
  import { createEventDispatcher } from 'svelte';

  /** Each tab: a display label and an opaque value string */
  export let tabs: { label: string; value: string }[];
  /** The currently selected value */
  export let value: string;

  const dispatch = createEventDispatcher<{ change: string }>();
</script>

<div class="tab-group">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={value === tab.value}
      on:click={() => dispatch('change', tab.value)}
    >{tab.label}</button>
  {/each}
</div>
