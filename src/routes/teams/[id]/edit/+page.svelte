<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Dex } from '@pkmn/dex';
  import { savedTeams } from '$lib/stores/savedTeams';
  import type { SavedTeam, SavedTeamSlot } from '$lib/stores/savedTeams';
  import type { GenNumber, NatureTier } from '$lib/speedtiers';
  import { GEN_NUMBERS } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import PokemonPicker from '$lib/components/PokemonPicker.svelte';
  import { buildAllTiers } from '$lib/speedtiers';
  import type { SpeedEntry } from '$lib/speedtiers';

  // ── Load team ────────────────────────────────────────────────────────────
  let team: SavedTeam | null = null;
  let slots: (SavedTeamSlot | null)[] = Array(6).fill(null);
  let label = '';
  let genNum: GenNumber | null = null; // null = All Gens

  $: teamId = $page.params.id;

  onMount(() => {
    const found = $savedTeams.find(t => t.id === teamId);
    if (!found) { goto('/'); return; }
    team  = found;
    label = found.label;
    genNum = found.genNum;
    slots = found.yourTeam.map(s => s ? { ...s } : null);
  });

  // ── Gen-awareness (null = all gens, treat as gen 9 for flags) ────────────
  $: g            = genNum ?? 9;
  $: hasTera      = g >= 9;
  $: hasAbility   = g >= 3;
  $: hasItems     = g >= 2;
  $: hasNatures   = g >= 3;
  $: dvMode       = g <= 2;
  $: ivMax        = dvMode ? 15 : 31;
  $: allEntries   = buildAllTiers(9);

  // ── Editing state ─────────────────────────────────────────────────────────
  let activeSlot: number | null = null;
  let showPicker = false;
  let moveSearch: string[] = ['', '', '', ''];
  let moveSuggestions: string[][] = [[], [], [], []];

  function openSlot(i: number) {
    activeSlot = i;
    moveSearch = slots[i]?.moves?.map(m => m) ?? ['', '', '', ''];
    moveSuggestions = [[], [], [], []];
  }

  function closeSlot() {
    activeSlot = null;
    moveSearch = ['', '', '', ''];
    moveSuggestions = [[], [], [], []];
  }

  function openPicker() { showPicker = true; }

  function onPick(e: CustomEvent<SpeedEntry>) {
    if (activeSlot === null) return;
    const entry = e.detail;
    const abilities = getSpeciesAbilities(entry.id);
    slots[activeSlot] = {
      id:      entry.id,
      name:    entry.name,
      scarf:   false,
      nature:  '=' as NatureTier,
      ability: abilities[0] ?? undefined,
    };
    slots = [...slots];
    showPicker = false;
  }

  function clearSlot(i: number) {
    slots[i] = null;
    slots = [...slots];
    if (activeSlot === i) closeSlot();
  }

  // ── Field updaters ────────────────────────────────────────────────────────
  function setField<K extends keyof SavedTeamSlot>(i: number, key: K, value: SavedTeamSlot[K]) {
    if (!slots[i]) return;
    slots[i] = { ...slots[i]!, [key]: value };
    slots = [...slots];
  }

  function setEv(i: number, stat: keyof import('$lib/stores/teams').StatSpread, value: number) {
    const evs = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0, ...(slots[i]?.evs ?? {}) };
    evs[stat] = Math.max(0, Math.min(252, value));
    // Clamp to 508 total
    const total = Object.values(evs).reduce((a, b) => a + b, 0);
    if (total > 508) evs[stat] = Math.max(0, evs[stat] - (total - 508));
    setField(i, 'evs', evs);
  }

  function setIv(i: number, stat: keyof import('$lib/stores/teams').StatSpread, value: number) {
    const ivs = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31, ...(slots[i]?.ivs ?? {}) };
    ivs[stat] = Math.max(0, Math.min(ivMax, value));
    setField(i, 'ivs', ivs);
  }

  function setMove(i: number, moveIdx: number, value: string) {
    const moves = [...(slots[i]?.moves ?? ['', '', '', ''])];
    moves[moveIdx] = value;
    setField(i, 'moves', moves.filter(Boolean).length ? moves : undefined);
    moveSearch[moveIdx] = value;
    moveSearch = [...moveSearch];
    moveSuggestions[moveIdx] = value.length >= 2 ? searchMoves(slots[i]!.id, value) : [];
    moveSuggestions = [...moveSuggestions];
  }

  function pickMove(i: number, moveIdx: number, moveName: string) {
    moveSearch[moveIdx] = moveName;
    moveSearch = [...moveSearch];
    moveSuggestions[moveIdx] = [];
    moveSuggestions = [...moveSuggestions];
    const moves = [...(slots[i]?.moves ?? ['', '', '', ''])];
    moves[moveIdx] = moveName;
    setField(i, 'moves', moves);
  }

  // ── Dex helpers ───────────────────────────────────────────────────────────
  const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  function getSpeciesAbilities(speciesId: string): string[] {
    const sp = Dex.species.get(speciesId);
    return Object.values(sp?.abilities ?? {}).filter(Boolean) as string[];
  }

  let allItems: string[] = [];
  let learnsetCache = new Map<string, string[]>();

  onMount(async () => {
    allItems = [...Dex.items.all()].filter(i => i.exists).map(i => i.name).sort();
  });

  async function getLearnset(speciesId: string): Promise<string[]> {
    if (learnsetCache.has(speciesId)) return learnsetCache.get(speciesId)!;
    const allMoves = new Set<string>();
    let cur = Dex.species.get(speciesId);
    while (cur?.exists) {
      const ls = await Dex.learnsets.get(cur.id);
      for (const m of Object.keys(ls?.learnset ?? {})) {
        const move = Dex.moves.get(m);
        if (move?.exists) allMoves.add(move.name);
      }
      cur = cur.prevo ? Dex.species.get(cur.prevo) : (null as any);
    }
    const sorted = [...allMoves].sort();
    learnsetCache.set(speciesId, sorted);
    return sorted;
  }

  let _moveCache = new Map<string, string[]>();
  function searchMoves(speciesId: string, query: string): string[] {
    const cached = _moveCache.get(speciesId);
    if (!cached) {
      // Trigger async load, return empty for now
      getLearnset(speciesId).then(moves => {
        _moveCache.set(speciesId, moves);
        // trigger reactivity
        moveSuggestions = moveSuggestions.map((_, idx) =>
          moveSearch[idx].length >= 2
            ? moves.filter(m => m.toLowerCase().includes(moveSearch[idx].toLowerCase())).slice(0, 8)
            : []
        );
      });
      return [];
    }
    return cached.filter(m => m.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }

  function searchItems(query: string): string[] {
    if (query.length < 2) return [];
    return allItems.filter(i => i.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  }

  let itemSuggestions: string[] = [];

  function onItemInput(i: number, value: string) {
    setField(i, 'item', value || undefined);
    itemSuggestions = searchItems(value);
    slots = [...slots];
  }

  function pickItem(i: number, name: string) {
    itemSuggestions = [];
    setField(i, 'item', name);
    setField(i, 'scarf', toId(name) === 'choicescarf');
  }

  const NATURES: NatureTier[] = ['+', '=', '-'];
  const NATURE_LABELS: Record<NatureTier, string> = {
    '+': '+ Speed (Timid/Jolly/Naive/Hasty)',
    '=': '= Neutral',
    '-': '− Speed (Brave/Quiet/Relaxed/Sassy)',
  };
  const NATURE_EXPORT: Record<NatureTier, string> = { '+': 'Timid', '=': 'Hardy', '-': 'Brave' };

  const TERA_TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground',
    'Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

  const STAT_KEYS: (keyof import('$lib/stores/teams').StatSpread)[] = ['hp','atk','def','spa','spd','spe'];
  const STAT_LABELS = ['HP','Atk','Def','SpA','SpD','Spe'];

  // ── Export ────────────────────────────────────────────────────────────────
  let showExportModal = false;
  let exportText = '';
  let exportCopied = false;

  function generatePaste(): string {
    const blocks: string[] = [];
    for (const slot of slots) {
      if (!slot) continue;
      const lines: string[] = [];
      const namePart = slot.nickname ? `${slot.nickname} (${slot.name})` : slot.name;
      lines.push(slot.item ? `${namePart} @ ${slot.item}` : namePart);
      if (slot.ability) lines.push(`Ability: ${slot.ability}`);
      if (slot.level && slot.level !== 50) lines.push(`Level: ${slot.level}`);
      if (hasTera && slot.teraType) lines.push(`Tera Type: ${slot.teraType}`);
      if (slot.evs) {
        const ev = slot.evs;
        const parts: string[] = [];
        if (ev.hp)  parts.push(`${ev.hp} HP`);
        if (ev.atk) parts.push(`${ev.atk} Atk`);
        if (ev.def) parts.push(`${ev.def} Def`);
        if (ev.spa) parts.push(`${ev.spa} SpA`);
        if (ev.spd) parts.push(`${ev.spd} SpD`);
        if (ev.spe) parts.push(`${ev.spe} Spe`);
        if (parts.length) lines.push(`EVs: ${parts.join(' / ')}`);
      }
      lines.push(`${NATURE_EXPORT[slot.nature ?? '=']} Nature`);
      if (slot.ivs) {
        const iv = slot.ivs;
        const parts: string[] = [];
        if (iv.hp  !== 31) parts.push(`${iv.hp} HP`);
        if (iv.atk !== 31) parts.push(`${iv.atk} Atk`);
        if (iv.def !== 31) parts.push(`${iv.def} Def`);
        if (iv.spa !== 31) parts.push(`${iv.spa} SpA`);
        if (iv.spd !== 31) parts.push(`${iv.spd} SpD`);
        if (iv.spe !== 31) parts.push(`${iv.spe} Spe`);
        if (parts.length) lines.push(`IVs: ${parts.join(' / ')}`);
      }
      for (const move of slot.moves ?? []) {
        if (move) lines.push(`- ${move}`);
      }
      blocks.push(lines.join('\n'));
    }
    return blocks.join('\n\n');
  }

  async function exportPaste() {
    const text = generatePaste();
    try {
      await navigator.clipboard.writeText(text);
      exportCopied = true;
      setTimeout(() => exportCopied = false, 2000);
    } catch {
      exportText = text;
      showExportModal = true;
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function save() {
    if (!team) return;
    savedTeams.updateTeam(team.id, {
      label,
      genNum: genNum ?? 9,
      yourTeam: slots,
    });
    goto('/');
  }
</script>

<svelte:head><title>Edit Team — Turnadus</title></svelte:head>

{#if showPicker && activeSlot !== null}
  <PokemonPicker
    entries={allEntries}
    on:pick={onPick}
    on:close={() => showPicker = false}
  />
{/if}

{#if showExportModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={() => showExportModal = false}>
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">Export Poképaste</span>
        <button class="modal-close" on:click={() => showExportModal = false}>✕</button>
      </div>
      <textarea class="export-textarea" readonly value={exportText}
        on:focus={e => e.currentTarget.select()}></textarea>
    </div>
  </div>
{/if}

<div class="page">
  <div class="toolbar">
    <a href="/" class="back-btn">← Back</a>
    <input class="label-input" bind:value={label} placeholder="Team name…" />
    <div class="select-wrap">
      <select class="gen-select"
        value={genNum ?? ''}
        on:change={e => { const v = e.currentTarget.value; genNum = v === '' ? null : +v as GenNumber; }}>
        <option value="">All Gens</option>
        {#each GEN_NUMBERS as g}
          <option value={g}>Gen {g}</option>
        {/each}
      </select>
      <svg class="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <button class="export-btn" on:click={exportPaste}>
      {exportCopied ? 'Copied!' : 'Export'}
    </button>
    <button class="save-btn" on:click={save}>Save</button>
  </div>

  <div class="slots-grid">
    {#each slots as slot, i}
      <div class="slot-card" class:active={activeSlot === i}>
        <!-- Slot header -->
        <div class="slot-header">
          {#if slot}
            <img src={spriteUrl(slot.name)} alt={slot.name} class="slot-sprite" />
            <div class="slot-title">
              <span class="slot-name">{slot.nickname ? `${slot.nickname} (${slot.name})` : slot.name}</span>
              <span class="slot-sub">{slot.item ?? 'No item'} · {slot.ability ?? 'No ability'}</span>
            </div>
            <div class="slot-header-btns">
              <button class="slot-edit-btn" on:click={() => activeSlot === i ? closeSlot() : openSlot(i)}>
                {activeSlot === i ? '▲' : '▼'}
              </button>
              <button class="slot-clear-btn" aria-label="Remove" on:click={() => clearSlot(i)}>✕</button>
            </div>
          {:else}
            <button class="slot-empty" on:click={() => { openSlot(i); openPicker(); }}>
              <span class="plus">+</span>
              <span class="empty-label">Add Pokémon</span>
            </button>
          {/if}
        </div>

        <!-- Expanded editor -->
        {#if activeSlot === i && slot}
          <div class="slot-editor">
            <div class="editor-row">
              <!-- Change species -->
              <button class="change-species-btn" on:click={openPicker}>Change Species</button>
            </div>

            <!-- Nickname -->
            <div class="field-row">
              <label class="field-label" for="field-{i}-nickname">Nickname</label>
              <input id="field-{i}-nickname" class="field-input" value={slot.nickname ?? ''} placeholder={slot.name}
                on:input={e => setField(i, 'nickname', e.currentTarget.value || undefined)} />
            </div>

            <!-- Level -->
            <div class="field-row">
              <label class="field-label" for="field-{i}-level">Level</label>
              <input id="field-{i}-level" class="field-input short" type="number" min="1" max="100"
                value={slot.level ?? 50}
                on:change={e => setField(i, 'level', +e.currentTarget.value)} />
            </div>

            <!-- Item -->
            {#if hasItems}
              <div class="field-row autocomplete-wrap">
                <label class="field-label" for="field-{i}-item">Item</label>
                <div class="autocomplete">
                  <input id="field-{i}-item" class="field-input" value={slot.item ?? ''}
                    on:input={e => onItemInput(i, e.currentTarget.value)}
                    on:focus={() => itemSuggestions = searchItems(slot.item ?? '')}
                    placeholder="e.g. Life Orb" />
                  {#if itemSuggestions.length}
                    <ul class="suggestions" role="listbox">
                      {#each itemSuggestions as s}
                        <li><button on:click={() => pickItem(i, s)}>{s}</button></li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </div>
            {/if}

            <!-- Ability -->
            {#if hasAbility}
              {@const abilities = getSpeciesAbilities(slot.id)}
              <div class="field-row">
                <label class="field-label" for="field-{i}-ability">Ability</label>
                <select id="field-{i}-ability" class="field-input"
                  on:change={e => setField(i, 'ability', e.currentTarget.value)}>
                  {#each abilities as ab}
                    <option value={ab} selected={ab === (slot.ability ?? abilities[0])}>{ab}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Tera Type -->
            {#if hasTera}
              <div class="field-row">
                <label class="field-label" for="field-{i}-tera">Tera Type</label>
                <select id="field-{i}-tera" class="field-input"
                  value={slot.teraType ?? 'Normal'}
                  on:change={e => setField(i, 'teraType', e.currentTarget.value)}>
                  {#each TERA_TYPES as t}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Nature -->
            {#if hasNatures}
              <div class="field-row">
                <label class="field-label" for="field-{i}-nature">Nature</label>
                <select id="field-{i}-nature" class="field-input"
                  value={slot.nature}
                  on:change={e => setField(i, 'nature', e.currentTarget.value as NatureTier)}>
                  {#each NATURES as n}
                    <option value={n}>{NATURE_LABELS[n]}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- EVs -->
            <div class="stat-block">
              <div class="stat-block-title">
                EVs
                <span class="ev-total" class:over={Object.values(slot.evs ?? {}).reduce((a,b)=>a+b,0) > 508}>
                  {Object.values(slot.evs ?? {}).reduce((a,b)=>a+b,0)} / 508
                </span>
              </div>
              <div class="stat-grid">
                {#each STAT_KEYS as stat, si}
                  <label class="stat-label" for="ev-{i}-{stat}">{STAT_LABELS[si]}</label>
                  <input id="ev-{i}-{stat}" class="stat-input" type="number" min="0" max="252"
                    value={slot.evs?.[stat] ?? 0}
                    on:change={e => setEv(i, stat, +e.currentTarget.value)} />
                {/each}
              </div>
            </div>

            <!-- IVs / DVs -->
            <div class="stat-block">
              <div class="stat-block-title">{dvMode ? 'DVs (0–15)' : 'IVs'}</div>
              <div class="stat-grid">
                {#each STAT_KEYS as stat, si}
                  <label class="stat-label" for="iv-{i}-{stat}">{STAT_LABELS[si]}</label>
                  <input id="iv-{i}-{stat}" class="stat-input" type="number" min="0" max={ivMax}
                    value={slot.ivs?.[stat] ?? ivMax}
                    on:change={e => setIv(i, stat, +e.currentTarget.value)} />
                {/each}
              </div>
            </div>

            <!-- Moves -->
            <div class="moves-block">
              <div class="stat-block-title">Moves</div>
              {#each [0,1,2,3] as mi}
                <div class="autocomplete move-row">
                  <input class="field-input" placeholder="Move {mi + 1}"
                    value={moveSearch[mi]}
                    on:input={e => setMove(i, mi, e.currentTarget.value)}
                    on:focus={() => {
                      if (moveSearch[mi].length >= 2)
                        moveSuggestions[mi] = searchMoves(slot.id, moveSearch[mi]);
                    }} />
                  {#if moveSuggestions[mi]?.length}
                    <ul class="suggestions" role="listbox">
                      {#each moveSuggestions[mi] as s}
                        <li><button on:click={() => pickMove(i, mi, s)}>{s}</button></li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .back-btn {
    padding: 0 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
    min-height: 44px;
    transition: color 0.15s, border-color 0.15s;
  }
  .back-btn:hover { color: var(--text); border-color: var(--text-muted); }

  .label-input {
    flex: 1;
    min-width: 10rem;
    padding: 0 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.95rem;
    min-height: 44px;
  }
  .label-input:focus-visible { border-color: var(--accent); }

  .select-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .select-chevron {
    position: absolute;
    right: 0.6rem;
    pointer-events: none;
    color: var(--text-muted);
  }
  .gen-select {
    padding: 0 2rem 0 0.75rem;
    appearance: none;
    -webkit-appearance: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.85rem;
    min-height: 44px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .save-btn {
    padding: 0 1.1rem;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: #fff;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
    white-space: nowrap;
    transition: background 0.15s;
  }
  .save-btn:hover { background: var(--accent-hover); }

  .export-btn {
    padding: 0 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    min-height: 44px;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
  }
  .export-btn:hover { color: var(--text); border-color: var(--text-muted); }

  /* Export / modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .modal-box {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .modal-title { font-weight: 600; font-size: 1rem; }
  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem;
    min-height: unset;
  }
  .export-textarea {
    width: 100%;
    min-height: 220px;
    padding: 0.65rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.82rem;
    font-family: monospace;
    resize: vertical;
    box-sizing: border-box;
  }

  /* Slots */
  .slots-grid {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .slot-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .slot-card.active { border-color: var(--accent); }

  .slot-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    min-height: 56px;
  }

  .slot-sprite {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .slot-title {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .slot-name {
    font-weight: 600;
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slot-sub {
    font-size: 0.78rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slot-header-btns {
    display: flex;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .slot-edit-btn, .slot-clear-btn {
    padding: 0 0.7rem;
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.8rem;
    min-height: 44px;
    min-width: 44px;
    transition: color 0.15s, border-color 0.15s;
  }
  .slot-edit-btn:hover { color: var(--text); border-color: var(--text-muted); }
  .slot-clear-btn:hover { color: var(--danger); border-color: var(--danger); }

  .slot-empty {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    min-height: 48px;
    padding: 0;
    transition: color 0.15s;
  }
  .slot-empty:hover { color: var(--text); }
  .plus { font-size: 1.4rem; line-height: 1; }
  .empty-label { font-size: 0.85rem; }

  /* Editor */
  .slot-editor {
    padding: 0.85rem 0.85rem 1rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .editor-row {
    display: flex;
    gap: 0.5rem;
  }

  .change-species-btn {
    padding: 0 0.85rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    min-height: 44px;
    transition: color 0.15s, border-color 0.15s;
  }
  .change-species-btn:hover { color: var(--text); border-color: var(--text-muted); }

  .field-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .field-label {
    font-size: 0.82rem;
    color: var(--text-muted);
    width: 5.5rem;
    flex-shrink: 0;
  }

  .field-input {
    flex: 1;
    padding: 0 0.6rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.85rem;
    min-height: 44px;
  }
  .field-input:focus-visible { border-color: var(--accent); }
  .field-input.short { max-width: 80px; flex: none; }

  /* Autocomplete */
  .autocomplete-wrap { position: relative; }
  .autocomplete { position: relative; flex: 1; }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    z-index: 20;
    list-style: none;
    max-height: 180px;
    overflow-y: auto;
  }

  .suggestions li button {
    width: 100%;
    padding: 0 0.7rem;
    background: none;
    border: none;
    color: var(--text);
    font-size: 0.85rem;
    cursor: pointer;
    text-align: left;
    min-height: 44px;
    justify-content: flex-start;
    transition: background 0.1s;
  }
  .suggestions li button:hover { background: var(--border); }

  /* Stat block */
  .stat-block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .stat-block-title {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ev-total { font-weight: 400; text-transform: none; letter-spacing: 0; }
  .ev-total.over { color: var(--danger); }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.3rem;
  }

  @media (max-width: 500px) {
    .stat-grid { grid-template-columns: repeat(3, 1fr); }
  }

  .stat-label {
    font-size: 0.72rem;
    color: var(--text-muted);
    text-align: center;
    display: block;
  }

  .stat-input {
    width: 100%;
    padding: 0.4rem 0.25rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 0.85rem;
    text-align: center;
    min-height: 44px;
  }
  .stat-input:focus-visible { border-color: var(--accent); }

  /* Moves */
  .moves-block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .move-row {
    position: relative;
  }
</style>
