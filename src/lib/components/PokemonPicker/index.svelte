<!--
  PokemonPicker Component

  A searchable modal overlay for selecting Pokemon from a list.

  Used in:
  - Main page (+page.svelte) for team building
  - Team edit page (teams/[id]/edit/+page.svelte) for changing Pokemon

  Features:
  - Searchable input with real-time filtering
  - Featured Pokemon section (top 100 by usage)
  - Exclusion list to prevent selecting already chosen Pokemon
  - Mobile-responsive bottom sheet design
  - Keyboard navigation (Escape to close)

  Props:
  - entries: Full list of SpeedEntry objects
  - featured: Optional featured entries to show first
  - exclude: Array of Pokemon IDs to exclude from selection

  Events:
  - pick: Dispatches selected SpeedEntry
  - close: Dispatches when modal should close
-->

<script lang="ts">
  import { search, entriesStore, featuredStore, excludeStore, filtered, pick, onKeydown } from './pokemonPicker';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import './styles.scss';

  export let entries: SpeedEntry[];
  export let featured: SpeedEntry[] = [];
  export let exclude: string[] = [];

  $: $entriesStore = entries;
  $: $featuredStore = featured;
  $: $excludeStore = exclude;

  const dispatch = createEventDispatcher<{ pick: SpeedEntry; close: void }>();

  let inputEl: HTMLInputElement;

  onMount(() => {
    search.set('');
    setTimeout(() => inputEl?.focus(), 80);
  });
</script>

<svelte:window on:keydown={(e) => onKeydown(dispatch, e)} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="overlay" on:click|self={() => { search.set(''); dispatch('close'); }}>
  <div class="panel">
    <div class="panel-handle"></div>
    <input
      id="picker-search"
      name="picker-search"
      bind:this={inputEl}
      bind:value={$search}
      placeholder="Search Pokémon…"
      class="search"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />

    {#if $filtered.length === 0}
      <p class="empty">No results</p>
    {:else}
      <div class="results">
        {#each $filtered as entry}
          <button class="result" on:click={() => pick(dispatch, entry)}>
            <img src={spriteUrl(entry.name)} alt={entry.name} class="sprite" loading="lazy" />
            <span class="rname">{entry.name}</span>
            <span class="rspe">{entry.baseSpe}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>