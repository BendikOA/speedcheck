<script lang="ts">
  import './styles.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Dex } from '@pkmn/dex';
  import { savedTeams } from '$lib/stores/savedTeams';
  import type { SavedTeam, SavedTeamSlot } from '$lib/stores/savedTeams';
  import type { GenNumber, NatureTier } from '$lib/speedtiers';
  import { GEN_NUMBERS, buildAllTiers, calcRawSpeed } from '$lib/speedtiers';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl, iconStyle } from '$lib/sprites';
  import PokemonPicker from '$lib/components/PokemonPicker/index.svelte';
  import SearchCombobox from '$lib/components/SearchCombobox/index.svelte';
  import { parsePaste, resolvePaste } from '$lib/parsePaste';
  import Button from '$lib/components/ui/Button/index.svelte';
  import { runCalc } from '$lib/damageCalc';
  import type { TeamSlot } from '$lib/stores/teams';
  import type { StatSpread } from '$lib/stores/teams';
  import { loadChampionsMovesFull, loadChampionsBuilds } from '$lib/smogonUsage';
  import type { CalcMoveResult } from '$lib/damageCalc';
  import { generatePaste } from '$lib/pasteExport';
  import PasteModal from '$lib/components/ui/PasteModal/index.svelte';

  // ── Team loading ──────────────────────────────────────────────────────────
  let team: SavedTeam | null = null;
  let slots: (SavedTeamSlot | null)[] = Array(6).fill(null);
  let label = '';
  let genNum: GenNumber | null = null;

  $: teamId = $page.params.id;

  onMount(() => {
    const found = $savedTeams.find(t => t.id === teamId);
    if (!found) { goto('/teams'); return; }
    team = found;
    label = found.label;
    genNum = found.genNum;
    slots = found.yourTeam.map(s => s ? { ...s } : null);
    allEntries = buildAllTiers(9);
  });

  // ── Gen flags ─────────────────────────────────────────────────────────────
  $: g          = genNum ?? 9;
  $: hasTera    = g >= 9;
  $: hasAbility = g >= 3;
  $: hasItems   = g >= 2;
  $: hasNatures = g >= 3;
  $: dvMode     = g <= 2;
  $: ivMax      = dvMode ? 15 : 31;
  let allEntries: SpeedEntry[] = [];

  // ── Active slot + tab ─────────────────────────────────────────────────────
  let activeSlot: number | null = null;
  let activeTab: 'build' | 'vs-meta' = 'build';
  let showPicker = false;

  function openSlot(i: number) {
    activeSlot = i;
    activeTab = 'build';
    if (slots[i]) loadMoveData(slots[i]!.id);
  }

  function clearSlot(i: number) {
    slots[i] = null;
    slots = [...slots];
    if (activeSlot === i) activeSlot = null;
  }

  function onPick(e: CustomEvent<SpeedEntry>) {
    if (activeSlot === null) return;
    const entry = e.detail;
    const abilities = getSpeciesAbilities(entry.id);
    slots[activeSlot] = {
      id: entry.id,
      name: entry.name,
      scarf: false,
      nature: '=' as NatureTier,
      ability: abilities[0] ?? undefined,
    };
    slots = [...slots];
    showPicker = false;
    loadMoveData(entry.id);
  }

  // ── Stat keys ─────────────────────────────────────────────────────────────
  const STAT_KEYS: (keyof StatSpread)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  const STAT_COLORS = ['#4caf50', '#ef5350', '#ff9800', '#5c6bc0', '#26a69a', '#ab47bc'];

  function computeStat(base: number, ev: number, iv: number, isHP: boolean, natureMult: number): number {
    if (isHP) return Math.floor((2 * base + iv + Math.floor(ev / 4)) * 50 / 100 + 60);
    return Math.floor(Math.floor((2 * base + iv + Math.floor(ev / 4)) * 50 / 100 + 5) * natureMult);
  }

  $: activeBaseStats = (() => {
    if (activeSlot === null || !slots[activeSlot]) return null;
    const sp = Dex.species.get(slots[activeSlot]!.id);
    return sp.exists ? sp.baseStats : null;
  })();

  $: activeComputedStats = (() => {
    if (activeSlot === null || !slots[activeSlot] || !activeBaseStats) return null;
    const slot = slots[activeSlot]!;
    const bs = activeBaseStats;
    const evs: Partial<StatSpread> = slot.evs ?? {};
    const ivs: Partial<StatSpread> = slot.ivs ?? {};
    const sNat = slot.nature === '+' ? 1.1 : slot.nature === '-' ? 0.9 : 1.0;
    const ev = (k: keyof StatSpread) => evs[k] ?? 0;
    const iv = (k: keyof StatSpread) => ivs[k] ?? (dvMode ? 15 : 31);
    return {
      hp:  computeStat(bs.hp,  ev('hp'),  iv('hp'),  true,  1.0),
      atk: computeStat(bs.atk, ev('atk'), iv('atk'), false, 1.0),
      def: computeStat(bs.def, ev('def'), iv('def'), false, 1.0),
      spa: computeStat(bs.spa, ev('spa'), iv('spa'), false, 1.0),
      spd: computeStat(bs.spd, ev('spd'), iv('spd'), false, 1.0),
      spe: computeStat(bs.spe, ev('spe'), iv('spe'), false, sNat),
    };
  })();

  $: evTotal = activeSlot !== null && slots[activeSlot]
    ? Object.values(slots[activeSlot]!.evs ?? {}).reduce((a, b) => a + b, 0)
    : 0;

  function maxEvForStat(stat: keyof StatSpread, slot: SavedTeamSlot): number {
    const evs: Partial<StatSpread> = slot.evs ?? {};
    const totalOther = STAT_KEYS.filter(k => k !== stat).reduce((a, k) => a + (evs[k] ?? 0), 0);
    return Math.min(252, 508 - totalOther);
  }

  function sliderPct(ev: number): string {
    return `${Math.round(ev / 252 * 100)}%`;
  }

  // ── Field updaters ────────────────────────────────────────────────────────
  function setField<K extends keyof SavedTeamSlot>(i: number, key: K, value: SavedTeamSlot[K]) {
    if (!slots[i]) return;
    slots[i] = { ...slots[i]!, [key]: value };
    slots = [...slots];
  }

  function setEv(i: number, stat: keyof StatSpread, value: number) {
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...(slots[i]?.evs ?? {}) };
    evs[stat] = Math.max(0, Math.min(252, value));
    const total = Object.values(evs).reduce((a, b) => a + b, 0);
    if (total > 508) evs[stat] = Math.max(0, evs[stat] - (total - 508));
    setField(i, 'evs', evs);
  }

  function setIv(i: number, stat: keyof StatSpread, value: number) {
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...(slots[i]?.ivs ?? {}) };
    ivs[stat] = Math.max(0, Math.min(ivMax, value));
    setField(i, 'ivs', ivs);
  }

  function setMove(i: number, mi: number, value: string) {
    const moves = [...(slots[i]?.moves ?? ['', '', '', ''])];
    moves[mi] = value;
    setField(i, 'moves', moves.some(Boolean) ? moves : undefined);
  }

  // ── Dex helpers ───────────────────────────────────────────────────────────
  const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  function getSpeciesAbilities(id: string): string[] {
    const sp = Dex.species.get(id);
    return Object.values(sp?.abilities ?? {}).filter(Boolean) as string[];
  }

  let allItems: string[] = [];
  let learnsetCache = new Map<string, string[]>();
  let moveCache = new Map<string, string[]>(); // meta-sorted: meta moves first

  onMount(async () => {
    allItems = [...Dex.items.all()].filter(i => i.exists).map(i => i.name).sort();
  });

  async function getLearnset(speciesId: string): Promise<string[]> {
    if (learnsetCache.has(speciesId)) return learnsetCache.get(speciesId)!;
    const allMoves = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = Dex.species.get(speciesId);
    while (cur?.exists) {
      const ls = await Dex.learnsets.get(cur.id);
      for (const m of Object.keys(ls?.learnset ?? {})) {
        const move = Dex.moves.get(m);
        if (move?.exists) allMoves.add(move.name);
      }
      cur = cur.prevo ? Dex.species.get(cur.prevo) : null;
    }
    const sorted = [...allMoves].sort();
    learnsetCache.set(speciesId, sorted);
    return sorted;
  }

  async function loadMoveData(speciesId: string) {
    if (moveCache.has(speciesId)) return;
    const [learnset, metaFull] = await Promise.all([
      getLearnset(speciesId),
      loadChampionsMovesFull(),
    ]);
    const metaMoves = (metaFull[speciesId] ?? []).map(m => m.name);
    const metaSet = new Set(metaMoves.map(m => m.toLowerCase()));
    const sorted = [...metaMoves, ...learnset.filter(m => !metaSet.has(m.toLowerCase()))];
    moveCache.set(speciesId, sorted);
    moveCache = new Map(moveCache); // trigger reactivity
  }

  function pickItem(i: number, name: string) {
    setField(i, 'item', name);
    setField(i, 'scarf', toId(name) === 'choicescarf');
  }

  // ── Nature + Tera ─────────────────────────────────────────────────────────
  const NATURES: NatureTier[] = ['+', '=', '-'];
  const NATURE_LABELS: Record<NatureTier, string> = {
    '+': '+ Speed (Timid / Jolly / Naive / Hasty)',
    '=': '= Neutral',
    '-': '− Speed (Brave / Quiet / Relaxed / Sassy)',
  };
  const TERA_TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

  // ── Import ────────────────────────────────────────────────────────────────
  let showImportModal = false;
  let importError = '';
  let importLoading = false;

  async function doImport(rawText: string) {
    importError = '';
    importLoading = true;
    try {
      const text = await resolvePaste(rawText);
      const parsed = parsePaste(text, allEntries);
      const filled = parsed.filter(Boolean);
      if (!filled.length) { importError = 'No matching Pokémon found — check the paste.'; return; }
      slots = parsed.map(s => s ? {
        id: s.entry.id, name: s.entry.name, scarf: s.scarf, nature: s.nature,
        natureLocked: s.natureLocked ?? true, item: s.item, ability: s.ability,
        teraType: s.teraType, level: s.level, evs: s.evs, ivs: s.ivs,
        moves: s.moves, nickname: s.nickname,
      } : null);
      showImportModal = false;
    } catch (e: unknown) {
      importError = (e as Error)?.message ?? 'Failed to fetch paste.';
    } finally {
      importLoading = false;
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  let showExportModal = false;
  let exportText = '';
  let exportCopied = false;

  async function exportPaste() {
    const text = generatePaste(slots, { hasTera });
    try {
      await navigator.clipboard.writeText(text);
      exportCopied = true;
      setTimeout(() => (exportCopied = false), 2000);
    } catch {
      exportText = text;
      showExportModal = true;
    }
  }

  // ── Vs Meta ───────────────────────────────────────────────────────────────
  interface MetaEntry { id: string; name: string; moves: string[]; item?: string; }
  let metaList: MetaEntry[] = [];
  let metaSearch = '';
  let selectedMetaId: string | null = null;
  let metaLoading = false;
  let vsCalcResults: { yourMoves: CalcMoveResult[]; theirMoves: CalcMoveResult[] } | null = null;

  $: filteredMeta = metaSearch.length >= 2
    ? metaList.filter(m => m.name.toLowerCase().includes(metaSearch.toLowerCase())).slice(0, 8)
    : [];

  $: selectedMeta = metaList.find(m => m.id === selectedMetaId) ?? null;

  // Speed comparison data
  $: mySpeedVal = (() => {
    if (activeSlot === null || !slots[activeSlot]) return 0;
    const slot = slots[activeSlot]!;
    const sp = Dex.species.get(slot.id);
    if (!sp.exists) return 0;
    return calcRawSpeed(sp.baseStats.spe, slot.evs?.spe ?? 0, slot.nature);
  })();

  $: metaSpeedTiers = selectedMetaId ? (() => {
    const sp = Dex.species.get(selectedMetaId);
    if (!sp.exists) return null;
    const base = sp.baseStats.spe;
    return {
      min:     calcRawSpeed(base, 0,   '-'),
      neutral: calcRawSpeed(base, 0,   '='),
      max:     calcRawSpeed(base, 252, '+'),
    };
  })() : null;

  function evsToOutspeed(myBase: number, myNature: NatureTier, targetSpeed: number): number | null {
    for (let ev = 0; ev <= 252; ev += 4) {
      if (calcRawSpeed(myBase, ev, myNature) > targetSpeed) return ev;
    }
    return null;
  }

  async function loadVsMeta() {
    if (metaList.length || metaLoading) return;
    metaLoading = true;
    try {
      const [movesFull, builds] = await Promise.all([loadChampionsMovesFull(), loadChampionsBuilds()]);
      const entries: MetaEntry[] = [];
      for (const [id, moves] of Object.entries(movesFull)) {
        const sp = Dex.species.get(id);
        if (!sp.exists) continue;
        entries.push({ id, name: sp.name, moves: moves.map(m => m.name), item: builds[id]?.item });
      }
      metaList = entries.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Failed to load meta list', e);
    }
    metaLoading = false;
  }

  function buildMetaTeamSlot(meta: MetaEntry): NonNullable<TeamSlot> {
    const sp = Dex.species.get(meta.id);
    const entry = allEntries.find(e => e.id === meta.id) ?? {
      id: meta.id,
      name: sp.exists ? sp.name : meta.id,
      baseSpe: sp.exists ? sp.baseStats.spe : 0,
      maxSpeed: 0, minSpeed: 0, neutralSpeed: 0,
      abilities: Object.values(sp?.abilities ?? {}).filter(Boolean) as string[],
      types: sp.exists ? [...sp.types] : [],
      megaForms: [],
      baseSpeciesId: meta.id,
    };
    return {
      entry,
      scarf: meta.item ? toId(meta.item) === 'choicescarf' : false,
      nature: '=' as NatureTier,
      item: meta.item,
      ability: Object.values(sp?.abilities ?? {})[0] as string | undefined,
      moves: meta.moves,
      level: 50,
    };
  }

  function savedToTeamSlot(saved: SavedTeamSlot): NonNullable<TeamSlot> {
    const entry = allEntries.find(e => e.id === saved.id) ?? {
      id: saved.id, name: saved.name,
      baseSpe: 0, maxSpeed: 0, minSpeed: 0, neutralSpeed: 0,
      abilities: [], types: [], megaForms: [], baseSpeciesId: saved.id,
    };
    return { entry, ...saved };
  }

  $: if (activeTab === 'vs-meta' && metaList.length === 0 && !metaLoading) loadVsMeta();

  $: if (selectedMetaId && activeSlot !== null && slots[activeSlot] && allEntries.length) {
    const mySlot = savedToTeamSlot(slots[activeSlot]!);
    const theirSlot = buildMetaTeamSlot(selectedMeta!);
    const myMoves = (slots[activeSlot]!.moves ?? []).filter(Boolean);
    const theirMoves = selectedMeta?.moves.slice(0, 8) ?? [];
    const cond = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vsCalcResults = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yourMoves: myMoves.length ? runCalc(mySlot, 'you', theirSlot, myMoves, cond as any) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theirMoves: theirMoves.length ? runCalc(theirSlot, 'opp', mySlot, theirMoves, cond as any) : [],
      };
    } catch {
      vsCalcResults = null;
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function save() {
    if (!team) return;
    savedTeams.updateTeam(team.id, { label, genNum: genNum ?? 9, yourTeam: slots });
    goto('/teams');
  }
</script>

<svelte:head><title>Team Builder — Turnadus</title></svelte:head>

<!-- Picker -->
{#if showPicker && activeSlot !== null}
  <PokemonPicker entries={allEntries} on:pick={onPick} on:close={() => (showPicker = false)} />
{/if}

<PasteModal
  open={showImportModal}
  loading={importLoading}
  error={importError}
  showCancel={false}
  on:close={() => { showImportModal = false; importError = ''; }}
  on:import={(e) => doImport(e.detail)}
/>

<!-- Export modal -->
{#if showExportModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="tb-modal-backdrop" on:click={() => (showExportModal = false)}>
    <div class="tb-modal-box" on:click|stopPropagation>
      <div class="tb-modal-header">
        <span class="tb-modal-title">Export Poképaste</span>
        <button class="tb-modal-close" on:click={() => (showExportModal = false)}>✕</button>
      </div>
      <textarea class="tb-textarea" readonly value={exportText} on:focus={e => e.currentTarget.select()}></textarea>
    </div>
  </div>
{/if}

<div class="tb-page">
  <!-- Toolbar -->
  <div class="tb-toolbar">
    <a href="/teams" class="tb-back">← Back</a>
    <input class="tb-label" bind:value={label} placeholder="Team name…" />
    <div class="tb-select-wrap">
      <select class="tb-select" value={genNum ?? ''} on:change={e => { const v = e.currentTarget.value; genNum = v === '' ? null : (+v as GenNumber); }}>
        <option value="">All Gens</option>
        {#each GEN_NUMBERS as gn}<option value={gn}>Gen {gn}</option>{/each}
      </select>
      <svg class="tb-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <Button variant="secondary" size="sm" onClick={() => (showImportModal = true)}>Import</Button>
    <Button variant="secondary" size="sm" onClick={exportPaste}>{exportCopied ? 'Copied!' : 'Export'}</Button>
    <Button variant="primary" size="sm" onClick={save}>Save</Button>
  </div>

  <!-- Body -->
  <div class="tb-body">

    <!-- Slot list -->
    <div class="tb-slots">
      {#each slots as slot, i}
        <button
          class="tb-slot-btn"
          class:tb-slot-active={activeSlot === i}
          class:tb-slot-empty={!slot}
          on:click={() => openSlot(i)}
        >
          {#if slot}
            <span style={iconStyle(slot.name)} class="tb-slot-icon" role="img" aria-label={slot.name}></span>
            <div class="tb-slot-info">
              <span class="tb-slot-name">{slot.nickname || slot.name}</span>
              <span class="tb-slot-sub">{slot.item || slot.ability || ''}</span>
            </div>
          {:else}
            <span class="tb-slot-num">{i + 1}</span>
            <span class="tb-slot-empty-lbl">Empty</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Editor -->
    <div class="tb-editor">
      {#if activeSlot === null}
        <div class="tb-editor-empty">
          <p>Select a slot to start editing</p>
        </div>
      {:else if !slots[activeSlot]}
        <div class="tb-editor-empty">
          <Button variant="primary" onClick={() => { showPicker = true; }}>+ Add Pokémon</Button>
        </div>
      {:else}
        {@const slot = slots[activeSlot]!}
        {@const i = activeSlot}
        {@const types = (() => { const sp = Dex.species.get(slot.id); return sp.exists ? [...sp.types] : []; })()}

        <!-- Editor header -->
        <div class="tb-header">
          <img src={spriteUrl(slot.name)} alt={slot.name} class="tb-sprite" />
          <div class="tb-header-info">
            <div class="tb-header-name">{slot.nickname || slot.name}</div>
            {#if slot.nickname}<div class="tb-header-species">{slot.name}</div>{/if}
            <div class="tb-header-types">
              {#each types as type}
                <span class="type-badge type-{type.toLowerCase()}">{type}</span>
              {/each}
            </div>
          </div>
          <div class="tb-header-btns">
            <Button variant="secondary" size="sm" onClick={() => (showPicker = true)}>Change</Button>
            <button class="tb-clear-btn" aria-label="Remove" on:click={() => clearSlot(i)}>✕</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tb-tabs">
          <button class="tb-tab" class:tb-tab-active={activeTab === 'build'} on:click={() => (activeTab = 'build')}>Build</button>
          <button class="tb-tab" class:tb-tab-active={activeTab === 'vs-meta'} on:click={() => { activeTab = 'vs-meta'; loadVsMeta(); }}>Vs Meta</button>
        </div>

        <!-- ── Build tab ─────────────────────────────────────────── -->
        {#if activeTab === 'build'}
          <div class="tb-build">

            <!-- Nickname + Level -->
            <div class="tb-field-row tb-field-row-2">
              <div class="tb-field">
                <label class="tb-lbl">Nickname</label>
                <input class="tb-input" value={slot.nickname ?? ''} placeholder={slot.name}
                  on:input={e => setField(i, 'nickname', e.currentTarget.value || undefined)} />
              </div>
              <div class="tb-field tb-field-sm">
                <label class="tb-lbl">Level</label>
                <input class="tb-input" type="number" min="1" max="100" value={slot.level ?? 50}
                  on:change={e => setField(i, 'level', +e.currentTarget.value)} />
              </div>
            </div>

            <!-- Item -->
            {#if hasItems}
              <div class="tb-field">
                <label class="tb-lbl">Item</label>
                <SearchCombobox items={allItems} value={slot.item ?? ''} placeholder="e.g. Life Orb"
                  on:input={e => setField(i, 'item', (e as CustomEvent<string>).detail || undefined)}
                  on:select={e => pickItem(i, (e as CustomEvent<string>).detail)} />
              </div>
            {/if}

            <!-- Ability -->
            {#if hasAbility}
              {@const abilities = getSpeciesAbilities(slot.id)}
              <div class="tb-field">
                <label class="tb-lbl">Ability</label>
                <select class="tb-select-input" on:change={e => setField(i, 'ability', e.currentTarget.value)}>
                  {#each abilities as ab}
                    <option value={ab} selected={ab === (slot.ability ?? abilities[0])}>{ab}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Nature -->
            {#if hasNatures}
              <div class="tb-field">
                <label class="tb-lbl">Nature</label>
                <select class="tb-select-input" value={slot.nature} on:change={e => setField(i, 'nature', e.currentTarget.value as NatureTier)}>
                  {#each NATURES as n}
                    <option value={n}>{NATURE_LABELS[n]}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Tera Type -->
            {#if hasTera}
              <div class="tb-field">
                <label class="tb-lbl">Tera Type</label>
                <select class="tb-select-input" value={slot.teraType ?? 'Normal'} on:change={e => setField(i, 'teraType', e.currentTarget.value)}>
                  {#each TERA_TYPES as t}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- EV Sliders -->
            <div class="tb-section">
              <div class="tb-section-title">
                EVs
                <span class="tb-ev-budget" class:tb-ev-over={evTotal > 508}>{evTotal} / 508</span>
                <span class="tb-ev-remaining">{508 - evTotal} remaining</span>
              </div>
              {#each STAT_KEYS as stat, si}
                {@const ev = slot.evs?.[stat] ?? 0}
                {@const statVal = activeComputedStats?.[stat] ?? 0}
                {@const maxEv = maxEvForStat(stat, slot)}
                {@const pct = sliderPct(ev)}
                {@const color = STAT_COLORS[si]}
                <div class="tb-ev-row">
                  <span class="tb-ev-lbl" style="color:{color}">{STAT_LABELS[si]}</span>
                  <input
                    type="range" min="0" max={maxEv} value={ev}
                    class="tb-ev-slider"
                    style="--ev-color:{color}; --ev-pct:{pct}"
                    on:input={e => setEv(i, stat, +e.currentTarget.value)}
                  />
                  <input
                    type="number" min="0" max="252" value={ev}
                    class="tb-ev-num"
                    on:change={e => setEv(i, stat, +e.currentTarget.value)}
                  />
                  <span class="tb-ev-stat">{statVal}</span>
                </div>
              {/each}
            </div>

            <!-- IVs -->
            <div class="tb-section">
              <div class="tb-section-title">{dvMode ? 'DVs (0–15)' : 'IVs'}</div>
              <div class="tb-iv-grid">
                {#each STAT_KEYS as stat, si}
                  <div class="tb-iv-cell">
                    <label class="tb-iv-lbl" style="color:{STAT_COLORS[si]}">{STAT_LABELS[si]}</label>
                    <input type="number" min="0" max={ivMax} value={slot.ivs?.[stat] ?? ivMax}
                      class="tb-iv-input"
                      on:change={e => setIv(i, stat, +e.currentTarget.value)} />
                  </div>
                {/each}
              </div>
            </div>

            <!-- Moves -->
            <div class="tb-section">
              <div class="tb-section-title">Moves <span class="tb-section-hint">sorted by meta usage</span></div>
              {#each [0, 1, 2, 3] as mi}
                <SearchCombobox
                  items={moveCache.get(slot.id) ?? []}
                  value={slot.moves?.[mi] ?? ''}
                  placeholder="Move {mi + 1}"
                  on:input={e => setMove(i, mi, (e as CustomEvent<string>).detail)}
                  on:select={e => setMove(i, mi, (e as CustomEvent<string>).detail)}
                />
              {/each}
            </div>
          </div>

        <!-- ── Vs Meta tab ────────────────────────────────────────── -->
        {:else}
          <div class="tb-vsmeta">
            {#if metaLoading}
              <p class="tb-vs-hint">Loading meta data…</p>
            {:else}
              <!-- Search -->
              <div class="tb-field tb-meta-search-wrap">
                <label class="tb-lbl">Search</label>
                <div class="tb-meta-search">
                  <input class="tb-input" placeholder="Search meta Pokémon…" bind:value={metaSearch}
                    autocomplete="off" autocorrect="off" autocapitalize="off" />
                  {#if filteredMeta.length > 0}
                    <div class="tb-meta-dropdown">
                      {#each filteredMeta as m}
                        <button class="tb-meta-item" on:click={() => { selectedMetaId = m.id; metaSearch = m.name; }}>
                          <span style={iconStyle(m.name)} class="tb-meta-icon" role="img" aria-label={m.name}></span>
                          {m.name}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              {#if selectedMeta && metaSpeedTiers}
                <!-- Speed comparison -->
                <div class="tb-vs-section">
                  <div class="tb-vs-title">Speed Comparison</div>
                  <div class="tb-speed-my">
                    <span class="tb-speed-label">Your {slot.name}</span>
                    <span class="tb-speed-val tb-speed-you">{mySpeedVal}</span>
                  </div>
                  <div class="tb-speed-tiers">
                    {#each [
                      { label: `${selectedMeta.name} max (+Spe, 252 EVs)`, val: metaSpeedTiers.max },
                      { label: `${selectedMeta.name} neutral (0 EVs)`,    val: metaSpeedTiers.neutral },
                      { label: `${selectedMeta.name} min (−Spe, 0 EVs)`, val: metaSpeedTiers.min },
                    ] as tier}
                      <div class="tb-speed-row">
                        <span class="tb-speed-label">{tier.label}</span>
                        <span class="tb-speed-val">{tier.val}</span>
                        {#if tier.val > mySpeedVal}
                          <span class="tb-speed-badge tb-speed-slow">They outspeed</span>
                        {:else}
                          <span class="tb-speed-badge tb-speed-fast">You outspeed</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  {#if metaSpeedTiers.max > mySpeedVal && activeBaseStats}
                    {@const needed = evsToOutspeed(activeBaseStats.spe, slot.nature, metaSpeedTiers.max)}
                    <div class="tb-speed-hint">
                      {#if needed !== null}
                        To outspeed their max: <strong>{needed} Spe EVs</strong> with {slot.nature === '+' ? '+Spe nature ✓' : 'current nature'}.
                      {:else}
                        Cannot outspeed their max even at 252 EVs.{slot.nature !== '+' ? ' Try +Spe nature.' : ''}
                      {/if}
                    </div>
                  {/if}
                </div>

                <!-- Damage calc -->
                {#if vsCalcResults}
                  <div class="tb-vs-section">
                    <div class="tb-vs-title">Your {slot.name} → {selectedMeta.name}</div>
                    {#if vsCalcResults.yourMoves.length}
                      {#each vsCalcResults.yourMoves as r}
                        <div class="tb-calc-row">
                          <span class="tb-calc-move">{r.moveName}</span>
                          <span class="tb-calc-dmg">{Math.round(r.minPct)}–{Math.round(r.maxPct)}%</span>
                          <span class="tb-calc-hko" class:tb-calc-guaranteed={r.guaranteed}>
                            {r.nHko === 1 ? 'OHKO' : `${r.nHko}HKO`}{r.guaranteed ? '' : '?'}
                          </span>
                        </div>
                      {/each}
                    {:else}
                      <p class="tb-vs-hint">Add moves to your Pokémon to see damage.</p>
                    {/if}
                  </div>

                  <div class="tb-vs-section">
                    <div class="tb-vs-title">{selectedMeta.name} → {slot.name}</div>
                    {#if vsCalcResults.theirMoves.length}
                      {#each vsCalcResults.theirMoves as r}
                        <div class="tb-calc-row">
                          <span class="tb-calc-move">{r.moveName}</span>
                          <span class="tb-calc-dmg">{Math.round(r.minPct)}–{Math.round(r.maxPct)}%</span>
                          <span class="tb-calc-hko" class:tb-calc-guaranteed={r.guaranteed}>
                            {r.nHko === 1 ? 'OHKO' : `${r.nHko}HKO`}{r.guaranteed ? '' : '?'}
                          </span>
                        </div>
                      {/each}
                    {:else}
                      <p class="tb-vs-hint">No damage calc data available.</p>
                    {/if}
                  </div>
                {/if}

              {:else if !selectedMetaId}
                <p class="tb-vs-hint">Search for a meta Pokémon above to compare speed and damage.</p>
              {/if}
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>
