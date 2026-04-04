<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';

  export let entries: SpeedEntry[];
  export let exclude: string[] = [];

  const dispatch = createEventDispatcher<{ pick: SpeedEntry; close: void }>();

  let search = '';
  let inputEl: HTMLInputElement;

  $: available = entries.filter(e => !exclude.includes(e.id));
  $: filtered = search.length < 1
    ? available.slice(0, 48)
    : available.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 48);

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

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
    z-index: 100;
    /* Desktop: centered */
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
  }

  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 480px;
    max-width: 95vw;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }

  /* Mobile: full-width bottom sheet */
  @media (max-width: 600px) {
    .overlay {
      align-items: flex-end;
      padding-top: 0;
    }

    .panel {
      width: 100%;
      max-width: 100%;
      max-height: 75vh;
      border-radius: var(--radius) var(--radius) 0 0;
      border-bottom: none;
      padding-bottom: var(--safe-bottom);
    }

    .panel-handle {
      display: block;
    }
  }

  .panel-handle {
    display: none;
    width: 36px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 10px auto 6px;
    flex-shrink: 0;
  }

  .search {
    display: block;
    width: 100%;
    padding: 0.85rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-size: 16px; /* prevents iOS zoom */
    outline: none;
    flex-shrink: 0;
  }

  .empty {
    padding: 2rem 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: center;
  }

  .results {
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;
  }

  @media (max-width: 400px) {
    .results { grid-template-columns: 1fr; }
  }

  .result {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    min-height: 52px;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;
    width: 100%;
    justify-content: flex-start;
  }

  .result:active { background: var(--surface-2); }

  @media (hover: hover) {
    .result:hover { background: var(--surface-2); }
  }

  .sprite {
    width: 40px;
    height: 40px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .rname {
    font-size: 0.85rem;
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .rspe {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
</style>
