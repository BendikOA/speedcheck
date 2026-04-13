<script lang="ts">
  import './styles.css';
  import { buildSpeedTiers, buildAllTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import Input from '$lib/components/ui/Input/index.svelte';
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
    ? baseEntries.filter(e => championsSet.has(e.id) || championsSet.has(e.baseSpeciesId))
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
  <Input
    type="search"
    placeholder="Search all {allEntries.length} Pokémon…"
    bind:value={search}
    style="width: 100%; margin-bottom: 0.25rem"
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

