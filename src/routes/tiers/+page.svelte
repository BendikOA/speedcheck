<script lang="ts">
  import { buildSpeedTiers, buildAllTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { GenNumber } from '$lib/speedtiers';
  import type { PageData } from './$types';

  export let data: PageData;

  type Filter = 'champions' | GenNumber | null;
  let selected: Filter = null;
  let search = '';
  let scarf = false;
  let tailwind = false;
  let trickRoom = false;
  let paralysis = false;

  const championsSet = new Set(data.championsIds);

  function genFromFilter(f: Filter): GenNumber | null {
    return f === 'champions' ? 9 : (f as GenNumber | null);
  }

  $: isChampions = selected === 'champions';
  $: genNum = genFromFilter(selected);
  $: baseEntries = isChampions ? buildAllTiers(9) : (genNum ? buildSpeedTiers(genNum) : buildAllTiers(9));
  $: allEntries = isChampions
    ? baseEntries.filter(e => championsSet.has(e.id))
    : baseEntries;
  $: hasNatures = isChampions || genNum === null || genNum >= 3;
  $: hasMegas   = isChampions || (genNum !== null && (genNum === 6 || genNum === 7));

  type Row = {
    id: string;
    name: string;
    baseSpe: number;
    displayMax: number;
    displayNeutral: number;
    displayMin: number;
    isMega: boolean;
  };

  $: filtered = (() => {
    const q = search.toLowerCase();
    const rows: Row[] = [];

    for (const e of allEntries) {
      const nameMatch = e.name.toLowerCase().includes(q);
      const megaMatch = hasMegas && e.megaForms.some(m => m.name.toLowerCase().includes(q));
      if (!nameMatch && !megaMatch) continue;

      if (nameMatch) {
        rows.push({
          id:             e.id,
          name:           e.name,
          baseSpe:        e.baseSpe,
          displayMax:     applyModifiers(e.maxSpeed,     { scarf, tailwind, paralysis }),
          displayNeutral: applyModifiers(e.neutralSpeed, { scarf, tailwind, paralysis }),
          displayMin:     applyModifiers(e.minSpeed,     { scarf, tailwind, paralysis }),
          isMega: false,
        });
      }

      // Expand mega forms as sub-rows
      if (hasMegas) {
        for (const m of e.megaForms) {
          if (!nameMatch && !m.name.toLowerCase().includes(q)) continue;
          rows.push({
            id:             m.id,
            name:           m.name,
            baseSpe:        m.baseSpe,
            displayMax:     applyModifiers(m.maxSpeed,     { scarf, tailwind, paralysis }),
            displayNeutral: applyModifiers(m.neutralSpeed, { scarf, tailwind, paralysis }),
            displayMin:     applyModifiers(m.minSpeed,     { scarf, tailwind, paralysis }),
            isMega: true,
          });
        }
      }
    }

    rows.sort((a, b) => trickRoom
      ? a.displayMax - b.displayMax || a.baseSpe - b.baseSpe
      : b.displayMax - a.displayMax || b.baseSpe - a.baseSpe
    );
    return rows;
  })();

  function changeFilter(f: Filter) {
    selected = f;
    scarf = tailwind = trickRoom = paralysis = false;
  }
</script>

<svelte:head>
  <title>Pokémon Speed Tiers — Turnadus | VGC &amp; Pokémon Champions</title>
  <meta name="description" content="Complete Pokémon speed tier list for VGC and Pokémon Champions. Every Pokémon's base and max speed stat, sortable and searchable. Know your speed benchmarks." />
  <meta property="og:title" content="Pokémon Speed Tiers — Turnadus" />
  <meta property="og:description" content="Full Pokémon speed tier list for VGC and Pokémon Champions. Base and max speeds for every Pokémon in the game." />
  <meta property="og:url" content="https://turnadus.com/tiers" />
</svelte:head>

<div class="page">
  <!-- 1. Choose Pokémon -->
  <div class="section-label">Choose Pokémon</div>
  <input
    type="search"
    placeholder="Search all {allEntries.length} Pokémon…"
    bind:value={search}
    class="search"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
  />

  <!-- 2. Variables -->
  <div class="section-label">Variables</div>
  <div class="controls">
    <div class="gen-tabs scroll-x">
      <button class="gen-tab" class:active={selected === 'champions'} on:click={() => changeFilter('champions')}>
        Champions
      </button>
      <button class="gen-tab" class:active={selected === null} on:click={() => changeFilter(null)}>
        All
      </button>
      {#each GEN_NUMBERS as g}
        <button class="gen-tab" class:active={selected === g} on:click={() => changeFilter(g)}>
          Gen {g}
        </button>
      {/each}
    </div>

    <div class="toggles">
      {#if hasNatures}
        <label class="toggle" class:active={scarf}>
          <input type="checkbox" bind:checked={scarf} />
          Scarf ×1.5
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

  <!-- 3. Table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Pokémon</th>
          <th scope="col" class="col-speed">Base</th>
          <th scope="col" class="col-speed">Max</th>
          {#if hasNatures}<th scope="col" class="col-speed hide-xs">Neutral</th>{/if}
          <th scope="col" class="col-speed">Min</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as entry, i}
          <tr class:mega-row={entry.isMega}>
            <td class="rank">{i + 1}</td>
            <td class="name">{entry.isMega ? '↳ ' : ''}{entry.name}</td>
            <td class="base">{entry.baseSpe}</td>
            <td class="stat max">{entry.displayMax}</td>
            {#if hasNatures}<td class="stat hide-xs">{entry.displayNeutral}</td>{/if}
            <td class="stat min">{entry.displayMin}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="count">{filtered.length} Pokémon</p>
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 0; }

  .section-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gb-low-contrast);
    margin-bottom: 0.5rem;
    margin-top: 1.25rem;
  }

  .section-label:first-child { margin-top: 0; }

  .search {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius);
    color: var(--gb-2);
    font-size: 16px;
    outline: none;
    min-height: 48px;
    margin-bottom: 0.25rem;
  }

  .search:focus-visible { border-color: var(--gb-1); }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1.25rem;
  }

  .gen-tabs {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .gen-tabs::-webkit-scrollbar { display: none; }

  .gen-tab {
    padding: 0.45rem 0.85rem;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    color: var(--gb-low-contrast);
    font-size: 0.85rem;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 44px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .gen-tab:active { opacity: 0.7; }
  @media (hover: hover) {
    .gen-tab:hover { color: var(--gb-2); border-color: var(--gb-low-contrast); }
  }

  .gen-tab.active {
    border-color: var(--gb-1);
    color: var(--gb-1);
    background: color-mix(in srgb, var(--gb-1) 10%, var(--gb-4));
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--gb-low-contrast);
    user-select: none;
    min-height: 44px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .toggle input { display: none; }
  .toggle:active { opacity: 0.7; }

  .toggle.active {
    border-color: var(--gb-1);
    color: var(--gb-1);
    background: color-mix(in srgb, var(--gb-1) 10%, var(--gb-4));
  }

  /* Table */
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border: 1px solid var(--gb-3);
    border-radius: var(--radius);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead th {
    background: var(--gb-4);
    padding: 0.6rem 0.75rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gb-low-contrast);
    border-bottom: 1px solid var(--gb-3);
    white-space: nowrap;
  }

  tbody tr { border-bottom: 1px solid var(--gb-3); }
  tbody tr:last-child { border-bottom: none; }
  @media (hover: hover) { tbody tr:hover { background: var(--gb-3); } }

  td { padding: 0.45rem 0.75rem; }

  .mega-row { background: color-mix(in srgb, var(--gb-1) 4%, transparent); }
  .mega-row .name { color: var(--gb-low-contrast); font-style: italic; }

  .rank { color: var(--gb-low-contrast); font-size: 0.8rem; width: 2.5rem; }
  .name { font-weight: 500; }
  .base { color: var(--gb-low-contrast); font-variant-numeric: tabular-nums; }
  .stat { font-variant-numeric: tabular-nums; font-weight: 500; }
  .max  { color: var(--success); }
  .min  { color: var(--gb-low-contrast); }
  .col-speed { text-align: right; }
  .stat { text-align: right; }
  .base { text-align: right; }

  /* Hide neutral column on very small screens */
  @media (max-width: 400px) {
    .hide-xs { display: none; }
  }

  .count {
    margin-top: 0.6rem;
    font-size: 0.82rem;
    color: var(--gb-low-contrast);
  }
</style>
