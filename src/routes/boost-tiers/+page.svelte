<script lang="ts">
  import { buildAllTiers, buildSpeedTiers, GEN_NUMBERS } from '$lib/speedtiers';
  import Input from '$lib/components/ui/Input/index.svelte';
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

<svelte:head>
  <title>Boosted Speed Tiers — Turnadus | Scarf &amp; Stat Boost Reference</title>
  <meta name="description" content="Pokémon speed tiers under every boost condition — Choice Scarf, Tailwind, stat stages, and more. Essential reference for VGC and Pokémon Champions players." />
  <link rel="canonical" href="https://turnadus.com/boost-tiers" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Boosted Speed Tiers — Turnadus" />
  <meta property="og:description" content="See Pokémon speeds with Choice Scarf, Tailwind, and stat boosts applied. Built for VGC and Pokémon Champions players." />
  <meta property="og:url" content="https://turnadus.com/boost-tiers" />
  <meta property="og:image" content="https://turnadus.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Boosted Speed Tiers — Turnadus" />
  <meta name="twitter:description" content="See Pokémon speeds with Choice Scarf, Tailwind, and stat boosts applied. Built for VGC and Pokémon Champions players." />
  <meta name="twitter:image" content="https://turnadus.com/og-image.png" />
</svelte:head>

<div class="boost-page">
  <div class="section-label">Boost Speed Tiers</div>
  <p class="subtitle">Final speed values after common boosts — Dragon Dance, Agility, Tailwind, Scarf, etc.</p>

  <Input
    type="search"
    placeholder="Filter by Pokémon name…"
    bind:value={search}
    style="width: 100%"
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

