<script lang="ts">
  import './styles.css';
  import { spriteUrl, staticSpriteUrl, itemIconStyle } from '$lib/sprites';
  import type { MetaPageData, MetaEntry } from './+page.server';

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
  <title>Meta — Turnadus | VGC &amp; Pokémon Champions</title>
  <meta name="description" content="Pokémon usage stats, moves, items, abilities and teammates for VGC and Pokémon Champions Regulation M-A." />
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

        <!-- Moves -->
        <section class="detail-section">
          <h2 class="detail-section-title">Moves</h2>
          {#if selected.moves.length === 0}
            <p class="no-data">No move data available.</p>
          {:else}
            <div class="usage-rows">
              {#each selected.moves as move}
                <div class="usage-row usage-row-move">
                  <div class="usage-row-bar" style="width: {Math.min(move.pct, 100)}%"></div>
                  {#if move.type}
                    <span class="move-type-badge type-{move.type.toLowerCase()}">{move.type}</span>
                  {/if}
                  <span class="usage-row-name">{move.name}</span>
                  <span class="usage-row-pct">{move.pct}%</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <!-- Items -->
        <section class="detail-section">
          <h2 class="detail-section-title">Items</h2>
          {#if selected.items.length === 0}
            <p class="no-data">No item data available.</p>
          {:else}
            <div class="usage-rows">
              {#each selected.items as item}
                <div class="usage-row usage-row-item">
                  <div class="usage-row-bar" style="width: {Math.min(item.pct, 100)}%"></div>
                  <span class="item-icon" style={itemIconStyle(item.name)} aria-hidden="true"></span>
                  <span class="usage-row-name">{item.name}</span>
                  <span class="usage-row-pct">{item.pct}%</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <!-- Abilities -->
        <section class="detail-section">
          <h2 class="detail-section-title">Abilities</h2>
          {#if selected.abilities.length === 0}
            <p class="no-data">No ability data available.</p>
          {:else}
            <div class="usage-rows">
              {#each selected.abilities as ability}
                <div class="usage-row">
                  <div class="usage-row-bar" style="width: {Math.min(ability.pct, 100)}%"></div>
                  <span class="usage-row-name">{ability.name}</span>
                  <span class="usage-row-pct">{ability.pct}%</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <!-- Teammates -->
        <section class="detail-section">
          <h2 class="detail-section-title">Teammates</h2>
          {#if selected.teammates.length === 0}
            <p class="no-data">No teammate data available.</p>
          {:else}
            <div class="usage-rows">
              {#each selected.teammates as tm}
                <div class="teammate-row">
                  <div class="usage-row-bar" style="width: {Math.min(tm.pct, 100)}%"></div>
                  <img src={staticSpriteUrl(tm.name)} alt={tm.name} class="teammate-sprite" />
                  <span class="usage-row-name">{tm.name}</span>
                  <span class="usage-row-pct">{tm.pct}%</span>
                </div>
              {/each}
            </div>
          {/if}
        </section>

      </div>

    {/if}
  </div>

</div>
