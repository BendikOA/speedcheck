<script lang="ts">
  import './styles.css';
  import { buildSpeedTiers, buildAllTiers, GEN_NUMBERS } from '$lib/speedtiers';
  import { staticSpriteUrl, itemIconStyle } from '$lib/sprites';
  import Input from '$lib/components/ui/Input/index.svelte';
  import type { GenNumber } from '$lib/speedtiers';
  import type { PageData } from './$types';

  export let data: PageData;

  // Use plain strings to avoid null/number binding issues with <select>
  let filterValue = 'champions';
  let search = '';

  const championsSet = new Set(data.championsIds);

  $: isChampions = filterValue === 'champions';
  $: isAll = filterValue === 'all';
  $: genNum = (isChampions || isAll) ? null : parseInt(filterValue) as GenNumber;

  $: baseEntries = (() => {
    if (isChampions || isAll) return buildAllTiers(9);
    return buildSpeedTiers(genNum!);
  })();

  $: allEntries = isChampions
    ? baseEntries.filter(e => championsSet.has(e.id) || championsSet.has(e.baseSpeciesId))
    : baseEntries;

  $: hasNatures = isChampions || isAll || (genNum !== null && genNum >= 3);

  type TierGroup = {
    baseSpe: number;
    entries: { id: string; name: string }[];
    max: number;
    neu: number;
    zeroEv: number;
    neg: number;
    mScarf: number;
    nScarf: number;
  };

  // Neutral nature, 252 EVs at lv50 with 31 IVs = baseSpe + 52
  function neuSpeed(baseSpe: number): number {
    return baseSpe + 52;
  }

  $: grouped = (() => {
    const q = search.toLowerCase();
    const map = new Map<number, TierGroup>();

    for (const e of allEntries) {
      if (q && !e.name.toLowerCase().includes(q)) continue;

      if (!map.has(e.baseSpe)) {
        const neu = neuSpeed(e.baseSpe);
        map.set(e.baseSpe, {
          baseSpe: e.baseSpe, entries: [],
          max: e.maxSpeed, neu, zeroEv: e.neutralSpeed, neg: e.minSpeed,
          mScarf: Math.floor(e.maxSpeed * 1.5),
          nScarf: Math.floor(neu * 1.5),
        });
      }
      map.get(e.baseSpe)!.entries.push({ id: e.id, name: e.name });
    }

    const rows = [...map.values()];
    rows.sort((a, b) => b.max - a.max);
    return rows;
  })();

  $: totalPokemon = grouped.reduce((s, r) => s + r.entries.length, 0);
</script>

<svelte:head>
  <title>Pokémon Speed Tiers — Turnadus | VGC &amp; Pokémon Champions</title>
  <meta name="description" content="Complete Pokémon speed tier list for VGC and Pokémon Champions. Every Pokémon's base and max speed stat, sortable and searchable. Know your speed benchmarks." />
  <meta property="og:title" content="Pokémon Speed Tiers — Turnadus" />
  <meta property="og:description" content="Full Pokémon speed tier list for VGC and Pokémon Champions. Base and max speeds for every Pokémon in the game." />
  <meta property="og:url" content="https://turnadus.com/tiers" />
</svelte:head>

<div class="tiers-page">
  <div class="tiers-toolbar">
    <Input
      type="search"
      placeholder="Search {allEntries.length} Pokémon…"
      bind:value={search}
      style="flex: 1; min-width: 0;"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
    />
    <select class="filter-select" bind:value={filterValue}>
      <option value="champions">Reg M-A</option>
      <option value="all">All</option>
      {#each GEN_NUMBERS as g}
        <option value={String(g)}>Gen {g}</option>
      {/each}
    </select>
  </div>

  <div class="table-wrap">
    <table class="tier-table">
      <thead>
        <tr>
          <th class="th-pokemon">Pokémon</th>
          <th class="th-num">Base</th>
          <th class="th-num">Max</th>
          {#if hasNatures}<th class="th-num">Neutral</th>{/if}
          <th class="th-num">0EVs</th>
          {#if hasNatures}<th class="th-num">Negative</th>{/if}
          {#if hasNatures}<th class="th-num th-scarf">Max<span class="scarf-icon" style={itemIconStyle('Choice Scarf')}></span></th>{/if}
          {#if hasNatures}<th class="th-num th-scarf">Neutral<span class="scarf-icon" style={itemIconStyle('Choice Scarf')}></span></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each grouped as row (row.baseSpe)}
          <tr>
            <td class="td-sprites">
              {#each row.entries as e (e.id)}
                <img
                  class="pkmn-icon"
                  src={staticSpriteUrl(e.name)}
                  alt={e.name}
                  title={e.name}
                  loading="lazy"
                  on:error={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              {/each}
            </td>
            <td class="td-num td-base">{row.baseSpe}</td>
            <td class="td-num td-max">{row.max}</td>
            {#if hasNatures}<td class="td-num td-neu">{row.neu}</td>{/if}
            <td class="td-num">{row.zeroEv}</td>
            {#if hasNatures}<td class="td-num td-neg">{row.neg}</td>{/if}
            {#if hasNatures}<td class="td-num td-scarf">{row.mScarf}</td>{/if}
            {#if hasNatures}<td class="td-num td-nscarf">{row.nScarf}</td>{/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="count">{grouped.length} tiers · {totalPokemon} Pokémon</p>
</div>
