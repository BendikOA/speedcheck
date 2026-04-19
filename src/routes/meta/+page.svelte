<script lang="ts">
  import './styles.css';
  import { spriteUrl, staticSpriteUrl, itemIconStyle } from '$lib/sprites';
  import type { MetaPageData, MetaEntry } from './+page.server';
  import UsageSection from '$lib/components/ui/UsageSection/index.svelte';

  export let data: MetaPageData;

  const STAT_LABELS: [keyof MetaEntry['baseStats'], string][] = [
    ['hp', 'HP'],
    ['atk', 'Atk'],
    ['def', 'Def'],
    ['spa', 'SpA'],
    ['spd', 'SpD'],
    ['spe', 'Spe'],
  ];

  let search = '';
  let selectedId = data.entries[0]?.id ?? '';
  let drawerOpen = false;

  $: filtered = search.trim()
    ? data.entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : data.entries;

  $: selected = data.entries.find(e => e.id === selectedId) ?? data.entries[0];

  $: statTotal = selected
    ? Object.values(selected.baseStats).reduce((s, v) => s + v, 0)
    : 0;

  function selectMon(id: string) {
    selectedId = id;
    drawerOpen = false;
  }
</script>

<svelte:head>
  <title>Meta Analysis — Turnadus | Pokémon Champions Regulation M-A</title>
  <meta name="description" content="Pokémon Champions Regulation M-A usage stats: top moves, items, abilities, and teammate pairings for every Pokémon in the meta." />
  <link rel="canonical" href="https://turnadus.com/meta" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Meta Analysis — Turnadus | Pokémon Champions" />
  <meta property="og:description" content="Pokémon Champions Regulation M-A usage stats: top moves, items, abilities, and teammate pairings for every Pokémon in the meta." />
  <meta property="og:url" content="https://turnadus.com/meta" />
  <meta property="og:image" content="https://turnadus.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Meta Analysis — Turnadus | Pokémon Champions" />
  <meta name="twitter:description" content="Pokémon Champions Regulation M-A usage stats: top moves, items, abilities, and teammate pairings for every Pokémon in the meta." />
  <meta name="twitter:image" content="https://turnadus.com/og-image.png" />
</svelte:head>

{#if drawerOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="sidebar-backdrop" on:click={() => (drawerOpen = false)}></div>
{/if}

<div class="meta-page">

  <!-- ── Sidebar ────────────────────────────────────────── -->
  <aside class="meta-sidebar" class:drawer-open={drawerOpen} aria-label="Pokémon list">
    <div class="sidebar-search-wrap">
      <input
        class="sidebar-search"
        type="search"
        placeholder="Search Pokémon…"
        bind:value={search}
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>
    <ul class="sidebar-list">
      {#each filtered as entry (entry.id)}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <li
          class="sidebar-item"
          class:active={entry.id === selectedId}
          on:click={() => selectMon(entry.id)}
          role="option"
          aria-selected={entry.id === selectedId}
          tabindex="0"
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectMon(entry.id); }}
        >
          <img src={staticSpriteUrl(entry.name)} alt={entry.name} class="sidebar-sprite" />
          <span class="sidebar-name">{entry.name}</span>
          <span class="sidebar-pct">{entry.usagePct}%</span>
        </li>
      {/each}
    </ul>
  </aside>

  <!-- ── Detail ─────────────────────────────────────────── -->
  <div class="meta-detail">

    {#if selected}

      <!-- Mobile: change pokemon button -->
      <button class="change-mon-btn" on:click={() => (drawerOpen = true)} aria-label="Change Pokémon">
        <img src={staticSpriteUrl(selected.name)} alt={selected.name} />
        <span class="change-mon-name">{selected.name}</span>
        <span class="change-mon-label">Change ▾</span>
      </button>

      <!-- Header -->
      <div class="detail-header">
        <img src={spriteUrl(selected.name)} alt={selected.name} class="detail-sprite" />
        <div class="detail-info">
          <h1 class="detail-name">{selected.name}</h1>
          <div class="type-badges">
            {#each selected.types as type}
              <span class="type-badge type-{type.toLowerCase()}">{type}</span>
            {/each}
          </div>
          <p class="detail-usage">
            {selected.usagePct}% usage · {selected.usageCount} teams of {data.totalTeams}
          </p>
        </div>
      </div>

      <!-- Base Stats -->
      <section class="detail-section">
        <h2 class="detail-section-title">Base Stats</h2>
        <div class="stats-grid">
          {#each STAT_LABELS as [key, label]}
            {@const val = selected.baseStats[key]}
            <div class="stat-row">
              <span class="stat-label">{label}</span>
              <span class="stat-val">{val}</span>
              <div class="stat-bar-bg">
                <div
                  class="stat-bar stat-{key}"
                  style="width: {Math.min((val / 255) * 100, 100)}%"
                ></div>
              </div>
            </div>
          {/each}
          <div class="stat-total-row">
            <span class="stat-total-label">BST</span>
            <span class="stat-total-val">{statTotal}</span>
            <span></span>
          </div>
        </div>
      </section>

      <!-- Moves / Items / Abilities / Teammates — 2×2 on desktop -->
      <div class="sections-grid">

        <UsageSection title="Moves" items={selected.moves} rowClass="usage-row-move" emptyText="No move data available.">
          <svelte:fragment slot="default" let:item>
            {#if item.type}
              <span class="move-type-badge type-{item.type.toLowerCase()}">{item.type}</span>
            {/if}
          </svelte:fragment>
        </UsageSection>

        <UsageSection title="Items" items={selected.items} rowClass="usage-row-item" emptyText="No item data available.">
          <svelte:fragment slot="default" let:item>
            <span class="item-icon" style={itemIconStyle(item.name)} aria-hidden="true"></span>
          </svelte:fragment>
        </UsageSection>

        <UsageSection title="Abilities" items={selected.abilities} emptyText="No ability data available." />

        <UsageSection title="Teammates" items={selected.teammates} rowClass="teammate-row" emptyText="No teammate data available.">
          <svelte:fragment slot="default" let:item>
            <img src={staticSpriteUrl(item.name)} alt={item.name} class="teammate-sprite" />
          </svelte:fragment>
        </UsageSection>

      </div>

    {/if}
  </div>

</div>
