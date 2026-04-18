<script lang="ts">
  import './styles.css';
  import { buildSpeedTiers, buildAllTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import { iconStyle } from '$lib/sprites';
  import Input from '$lib/components/ui/Input/index.svelte';
  import type { GenNumber } from '$lib/speedtiers';
  import type { PageData } from './$types';

  export let data: PageData;

  type Filter = 'champions' | GenNumber | null;
  let selected: Filter = null;
  let search = '';
  let tailwind = false;
  let trickRoom = false;
  let paralysis = false;

  const championsSet = new Set(data.championsIds);

  $: isChampions = selected === 'champions';
  $: genNum = selected === 'champions' ? 9 : (selected as GenNumber | null);
  $: baseEntries = isChampions ? buildAllTiers(9) : (genNum ? buildSpeedTiers(genNum) : buildAllTiers(9));
  $: allEntries = isChampions
    ? baseEntries.filter(e => championsSet.has(e.id) || championsSet.has(e.baseSpeciesId))
    : baseEntries;
  $: hasNatures = isChampions || selected === null || (selected as number) >= 3;
  $: hasMegas   = isChampions || (selected !== null && (selected === 6 || selected === 7));

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

  // Neutral nature, 252 EVs at lv50 with 31 IVs is always baseSpe + 52
  function neuSpeed(baseSpe: number): number {
    return baseSpe + 52;
  }

  $: grouped = (() => {
    const q = search.toLowerCase();
    const map = new Map<number, TierGroup>();

    function ensureTier(baseSpe: number, maxSpd: number, zeroEvSpd: number, negSpd: number): TierGroup {
      if (!map.has(baseSpe)) {
        const mod = (v: number) => applyModifiers(v, { tailwind, paralysis });
        const max = mod(maxSpd);
        const neu = mod(neuSpeed(baseSpe));
        const zeroEv = mod(zeroEvSpd);
        const neg = mod(negSpd);
        map.set(baseSpe, {
          baseSpe, entries: [],
          max, neu, zeroEv, neg,
          mScarf: Math.floor(max * 1.5),
          nScarf: Math.floor(neu * 1.5),
        });
      }
      return map.get(baseSpe)!;
    }

    for (const e of allEntries) {
      const eMatch = !q || e.name.toLowerCase().includes(q);
      const megaMatches = hasMegas
        ? e.megaForms.filter(m => !q || m.name.toLowerCase().includes(q))
        : [];
      if (!eMatch && !megaMatches.length && q) continue;

      if (eMatch || !q) {
        const tier = ensureTier(e.baseSpe, e.maxSpeed, e.neutralSpeed, e.minSpeed);
        tier.entries.push({ id: e.id, name: e.name });
      }

      if (hasMegas) {
        for (const m of e.megaForms) {
          if (q && !eMatch && !m.name.toLowerCase().includes(q)) continue;
          const tier = ensureTier(m.baseSpe, m.maxSpeed, m.neutralSpeed, m.minSpeed);
          tier.entries.push({ id: m.id, name: m.name });
        }
      }
    }

    const rows = [...map.values()];
    rows.sort((a, b) => trickRoom ? a.max - b.max : b.max - a.max);
    return rows;
  })();

  $: totalPokemon = grouped.reduce((s, r) => s + r.entries.length, 0);

  function changeFilter(f: Filter) {
    selected = f;
    tailwind = trickRoom = paralysis = false;
  }
</script>

<svelte:head>
  <title>Pokémon Speed Tiers — Turnadus | VGC &amp; Pokémon Champions</title>
  <meta name="description" content="Complete Pokémon speed tier list for VGC and Pokémon Champions. Every Pokémon's base and max speed stat, sortable and searchable. Know your speed benchmarks." />
  <meta property="og:title" content="Pokémon Speed Tiers — Turnadus" />
  <meta property="og:description" content="Full Pokémon speed tier list for VGC and Pokémon Champions. Base and max speeds for every Pokémon in the game." />
  <meta property="og:url" content="https://turnadus.com/tiers" />
</svelte:head>

<div class="tiers-page">
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
      <label class="toggle" class:active={tailwind}>
        <input type="checkbox" bind:checked={tailwind} /> Tailwind
      </label>
      <label class="toggle" class:active={trickRoom}>
        <input type="checkbox" bind:checked={trickRoom} /> Trick Room
      </label>
      <label class="toggle" class:active={paralysis}>
        <input type="checkbox" bind:checked={paralysis} /> Paralysis
      </label>
    </div>
  </div>

  <div class="table-wrap">
    <table class="tier-table">
      <thead>
        <tr>
          <th class="th-pokemon">Pokémon</th>
          <th class="th-num">Base</th>
          <th class="th-num">Max</th>
          {#if hasNatures}<th class="th-num">Neu</th>{/if}
          <th class="th-num">0EVs</th>
          {#if hasNatures}<th class="th-num">Neg</th>{/if}
          {#if hasNatures}<th class="th-num">M🧣</th>{/if}
          {#if hasNatures}<th class="th-num">N🧣</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each grouped as row (row.baseSpe)}
          <tr>
            <td class="td-sprites">
              {#each row.entries as e (e.id)}
                <span
                  class="pkmn-icon"
                  style={iconStyle(e.name)}
                  title={e.name}
                  aria-label={e.name}
                  role="img"
                ></span>
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
