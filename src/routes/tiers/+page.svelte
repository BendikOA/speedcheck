<script lang="ts">
  import { buildSpeedTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { GenNumber } from '$lib/speedtiers';

  let selectedGen: GenNumber = 9;
  let search = '';
  let scarf = false;
  let tailwind = false;
  let trickRoom = false;
  let paralysis = false;

  $: allEntries = buildSpeedTiers(selectedGen);

  $: hasNatures = selectedGen >= 3;

  $: filtered = allEntries
    .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    .map(e => ({
      ...e,
      displayMax: applyModifiers(e.maxSpeed, { scarf, tailwind, paralysis }),
      displayMin: applyModifiers(e.minSpeed, { scarf, tailwind, paralysis }),
      displayNeutral: applyModifiers(e.neutralSpeed, { scarf, tailwind, paralysis })
    }))
    .sort((a, b) => trickRoom
      ? a.displayMax - b.displayMax || a.baseSpe - b.baseSpe
      : b.displayMax - a.displayMax || b.baseSpe - a.baseSpe
    );

  function changeGen(g: GenNumber) {
    selectedGen = g;
    scarf = false;
    tailwind = false;
    trickRoom = false;
    paralysis = false;
  }
</script>

<svelte:head>
  <title>Speed Tiers — VGC Tools</title>
</svelte:head>

<div class="page">
  <h1>Speed Tiers</h1>

  <div class="gen-tabs">
    {#each GEN_NUMBERS as g}
      <button
        class="gen-tab"
        class:active={selectedGen === g}
        on:click={() => changeGen(g)}
      >
        Gen {g}
      </button>
    {/each}
  </div>

  <div class="controls">
    <input
      type="search"
      placeholder="Search Pokémon..."
      bind:value={search}
      class="search"
    />

    <div class="toggles">
      {#if hasNatures}
        <label class="toggle" class:active={scarf}>
          <input type="checkbox" bind:checked={scarf} />
          Choice Scarf ×1.5
        </label>
      {/if}
      <label class="toggle" class:active={tailwind}>
        <input type="checkbox" bind:checked={tailwind} />
        Tailwind ×2
      </label>
      <label class="toggle" class:active={paralysis}>
        <input type="checkbox" bind:checked={paralysis} />
        Paralysis ×0.5
      </label>
      <label class="toggle" class:active={trickRoom}>
        <input type="checkbox" bind:checked={trickRoom} />
        Trick Room
      </label>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Pokémon</th>
          <th>Base Spe</th>
          <th>{hasNatures ? 'Max Speed' : 'Max Speed'}</th>
          {#if hasNatures}<th>Neutral</th>{/if}
          <th>Min Speed</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as entry, i}
          <tr>
            <td class="rank">{i + 1}</td>
            <td class="name">{entry.name}</td>
            <td class="base">{entry.baseSpe}</td>
            <td class="stat max">{entry.displayMax}</td>
            {#if hasNatures}<td class="stat">{entry.displayNeutral}</td>{/if}
            <td class="stat min">{entry.displayMin}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="count">{filtered.length} Pokémon</p>
</div>

<style>
  .page h1 {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .gen-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .gen-tab {
    padding: 0.35rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .gen-tab:hover {
    color: var(--text);
    border-color: var(--text-muted);
  }

  .gen-tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .search {
    padding: 0.5rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    width: 220px;
    outline: none;
  }

  .search:focus {
    border-color: var(--accent);
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-muted);
    user-select: none;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .toggle input {
    display: none;
  }

  .toggle.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead th {
    background: var(--surface);
    padding: 0.6rem 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--surface-2);
  }

  td {
    padding: 0.5rem 1rem;
  }

  .rank {
    color: var(--text-muted);
    font-size: 0.8rem;
    width: 3rem;
  }

  .name {
    font-weight: 500;
  }

  .base {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .stat {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .max {
    color: var(--success);
  }

  .min {
    color: var(--text-muted);
  }

  .count {
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>
