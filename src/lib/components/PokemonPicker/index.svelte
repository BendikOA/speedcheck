<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import './styles.css';

  export let entries: SpeedEntry[];
  export let featured: SpeedEntry[] = [];
  export let exclude: string[] = [];

  const dispatch = createEventDispatcher<{ pick: SpeedEntry; close: void }>();

  let search = '';
  let inputEl: HTMLInputElement;

  $: excludeSet = new Set(exclude);
  $: available = entries.filter(e => !excludeSet.has(e.id));

  $: filtered = search.length < 1
    ? (featured.length > 0
        ? featured.filter(e => !excludeSet.has(e.id)).slice(0, 100)
        : available.slice(0, 100))
    : available.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 100);

  onMount(() => {
    // Slight delay so the panel animates in before keyboard opens
    setTimeout(() => inputEl?.focus(), 80);
  });

  function pick(entry: SpeedEntry) { dispatch('pick', entry); }
  function onKeydown(e: KeyboardEvent) { if (e.key === 'Escape') dispatch('close'); }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="overlay" on:click|self={() => dispatch('close')}>
  <div class="panel">
    <div class="panel-handle"></div>
    <input
      id="picker-search"
      name="picker-search"
      bind:this={inputEl}
      bind:value={search}
      placeholder="Search Pokémon…"
      class="search"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />

    {#if filtered.length === 0}
      <p class="empty">No results</p>
    {:else}
      <div class="results">
        {#each filtered as entry}
          <button class="result" on:click={() => pick(entry)}>
            <img src={spriteUrl(entry.name)} alt={entry.name} class="sprite" loading="lazy" />
            <span class="rname">{entry.name}</span>
            <span class="rspe">{entry.baseSpe}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>