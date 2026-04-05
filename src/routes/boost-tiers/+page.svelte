<script lang="ts">
  import { buildAllTiers, buildSpeedTiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { GenNumber } from '$lib/speedtiers';

  let selectedGen: GenNumber | null = null;
  let search = '';

  $: entries = selectedGen ? buildSpeedTiers(selectedGen) : buildAllTiers(9);

  // Boost configs to compute tiers for
  const BOOSTS: { label: string; multiplier: number; note: string }[] = [
    { label: '+1 (×1.5)', multiplier: 1.5, note: 'Dragon Dance, Quiver Dance, Scarf' },
    { label: '+2 (×2.0)', multiplier: 2.0, note: 'Agility, Rock Polish, Shift Gear, Tailwind' },
  ];

  type TierRow = {
    finalSpeed: number;
    boostLabel: string;
    boostNote:  string;
    multiplier: number;
    baseSpe:    number;
    natureMark: string; // '+', '=', or ''
    speedUsed:  number; // the nature-adjusted speed that was multiplied
    pokemon:    { name: string; id: string }[];
  };

  $: tiers = (() => {
    const q = search.toLowerCase();
    // Map: finalSpeed+boostLabel → TierRow
    const map = new Map<string, TierRow>();

    for (const entry of entries) {
      if (q && !entry.name.toLowerCase().includes(q)) continue;

      for (const boost of BOOSTS) {
        // + nature
        const maxFinal = Math.floor(entry.maxSpeed * boost.multiplier);
        const maxKey   = `${maxFinal}-${boost.label}`;
        if (!map.has(maxKey)) map.set(maxKey, {
          finalSpeed: maxFinal, boostLabel: boost.label, boostNote: boost.note,
          multiplier: boost.multiplier, baseSpe: entry.baseSpe,
          natureMark: '+', speedUsed: entry.maxSpeed, pokemon: [],
        });
        map.get(maxKey)!.pokemon.push({ name: entry.name, id: entry.id });

        // = nature (only if different)
        const neuFinal = Math.floor(entry.neutralSpeed * boost.multiplier);
        if (neuFinal !== maxFinal) {
          const neuKey = `${neuFinal}-${boost.label}`;
          if (!map.has(neuKey)) map.set(neuKey, {
            finalSpeed: neuFinal, boostLabel: boost.label, boostNote: boost.note,
            multiplier: boost.multiplier, baseSpe: entry.baseSpe,
            natureMark: '=', speedUsed: entry.neutralSpeed, pokemon: [],
          });
          map.get(neuKey)!.pokemon.push({ name: entry.name, id: entry.id });
        }
      }
    }

    return [...map.values()]
      .sort((a, b) => b.finalSpeed - a.finalSpeed || b.multiplier - a.multiplier);
  })();

  function changeGen(g: GenNumber | null) { selectedGen = g; }
</script>

<svelte:head><title>Boost Tiers — Speedcheck</title></svelte:head>

<div class="page">
  <div class="section-label">Boost Speed Tiers</div>
  <p class="subtitle">Final speed values after common boosts — Dragon Dance, Agility, Tailwind, Scarf, etc.</p>

  <input
    type="search"
    placeholder="Filter by Pokémon name…"
    bind:value={search}
    class="search"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
  />

  <div class="gen-tabs scroll-x">
    <button class="gen-tab" class:active={selectedGen === null} on:click={() => changeGen(null)}>All</button>
    {#each GEN_NUMBERS as g}
      <button class="gen-tab" class:active={selectedGen === g} on:click={() => changeGen(g)}>Gen {g}</button>
    {/each}
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Final Speed</th>
          <th>Boost</th>
          <th>Base Spe</th>
          <th>Nature</th>
          <th>Notes</th>
          <th>Notable Pokémon</th>
        </tr>
      </thead>
      <tbody>
        {#each tiers as tier, i}
          <tr>
            <td class="rank">{i + 1}</td>
            <td class="final-speed">{tier.finalSpeed}</td>
            <td class="boost-label">{tier.boostLabel}</td>
            <td class="base">{tier.baseSpe}</td>
            <td class="nature" class:nature-pos={tier.natureMark === '+'} class:nature-neu={tier.natureMark === '='}>{tier.natureMark === '+' ? '+ nature' : '= neutral'}</td>
            <td class="notes">{tier.boostNote}</td>
            <td class="pokemon-list">{tier.pokemon.map(p => p.name).join(', ')}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="count">{tiers.length} speed thresholds</p>
</div>

<style>
  .page { display: flex; flex-direction: column; gap: 0.75rem; }

  .section-label {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 0;
  }

  .subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: -0.25rem;
    margin-bottom: 0.25rem;
  }

  .search {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 16px;
    min-height: 48px;
  }
  .search:focus-visible { border-color: var(--accent); }

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
    padding: 0 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 44px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .gen-tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
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
    padding: 0.6rem 0.75rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  tbody tr { border-bottom: 1px solid var(--border); }
  tbody tr:last-child { border-bottom: none; }
  @media (hover: hover) { tbody tr:hover { background: var(--surface-2); } }

  td { padding: 0.45rem 0.75rem; }

  .rank       { color: var(--text-muted); font-size: 0.8rem; width: 2rem; }
  .final-speed { font-weight: 700; font-variant-numeric: tabular-nums; font-size: 1rem; color: var(--success); }
  .boost-label { font-size: 0.82rem; color: var(--text-muted); white-space: nowrap; }
  .base        { font-variant-numeric: tabular-nums; color: var(--text-muted); }
  .nature      { font-size: 0.8rem; white-space: nowrap; }
  .nature-pos  { color: #6c8ef5; }
  .nature-neu  { color: var(--text-muted); }
  .notes       { font-size: 0.82rem; color: var(--text-muted); white-space: nowrap; }
  .pokemon-list {
    font-size: 0.82rem;
    color: var(--text-muted);
    max-width: 320px;
    white-space: normal;
    line-height: 1.5;
  }

  .count {
    font-size: 0.82rem;
    color: var(--text-muted);
  }
</style>
