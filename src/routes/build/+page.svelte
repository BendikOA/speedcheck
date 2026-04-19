<script lang="ts">
  import './styles.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Dex } from '@pkmn/dex';
  import { savedTeams } from '$lib/stores/savedTeams';
  import type { SavedTeam, SavedTeamSlot } from '$lib/stores/savedTeams';
  import type { GenNumber, NatureTier } from '$lib/speedtiers';
  import { GEN_NUMBERS, buildAllTiers, calcRawSpeed } from '$lib/speedtiers';
  import type { SpeedEntry } from '$lib/speedtiers';
  import { spriteUrl, iconStyle } from '$lib/sprites';
  import PokemonPicker from '$lib/components/PokemonPicker/index.svelte';
  import Autocomplete from '$lib/components/ui/Autocomplete/index.svelte';
  import { parsePaste, resolvePaste } from '$lib/parsePaste';
  import Button from '$lib/components/ui/Button/index.svelte';
  import { runCalc } from '$lib/damageCalc';
  import type { TeamSlot } from '$lib/stores/teams';
  import type { StatSpread } from '$lib/stores/teams';
  import { loadChampionsMovesFull, loadChampionsBuilds, loadChampionsItemUsage } from '$lib/smogonUsage';
  import type { CalcMoveResult } from '$lib/damageCalc';
  import { generatePaste } from '$lib/pasteExport';
  import { NATURE_TABLE, ALL_NATURES, natureMult, natureLabel } from '$lib/natures';
  import PasteModal from '$lib/components/ui/PasteModal/index.svelte';

  // ── State ──────────────────────────────────────────────────────────────────
  let team: SavedTeam | null = null;
  let slots: (SavedTeamSlot | null)[] = Array(6).fill(null);
  let label = 'New Team';
  let genNum: GenNumber | null = null;
  let isNew = true;

  // ── EV mode ───────────────────────────────────────────────────────────────
  // Champions: 66 pts total, max 20 per stat, formula uses ev directly.
  // Showdown:  508 total, max 252 per stat, formula uses floor(ev/4).
  let evMode: 'champ' | 'showdown' = 'champ';
  $: EV_MAX_STAT  = evMode === 'champ' ? 32  : 252;
  $: EV_MAX_TOTAL = evMode === 'champ' ? 66  : 508;

  function switchEvMode(next: 'champ' | 'showdown') {
    if (next === evMode) return;
    // Convert existing EVs so stats stay the same when toggling
    slots = slots.map(slot => {
      if (!slot?.evs) return slot;
      const e = slot.evs;
      // 1 champ pt = 8 traditional EVs in terms of stat formula contribution
      const conv = (v: number) => next === 'champ'
        ? Math.min(32, Math.round(v / 8))
        : Math.min(252, v * 8);
      return { ...slot, evs: { hp: conv(e.hp), atk: conv(e.atk), def: conv(e.def), spa: conv(e.spa), spd: conv(e.spd), spe: conv(e.spe) } };
    });
    evMode = next;
  }

  $: teamId = $page.url.searchParams.get('id');

  onMount(() => {
    allEntries = buildAllTiers(9);
    loadAllItems();
    if (teamId) {
      const found = $savedTeams.find(t => t.id === teamId);
      if (found) {
        team = found;
        label = found.label;
        genNum = found.genNum;
        slots = found.yourTeam.map(s => s ? { ...s } : null);
        isNew = false;
        slots.forEach(s => { if (s) loadMoveData(s.id); });
      }
    }
    autoSelectSlot();
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

  function isMobile() { return typeof window !== 'undefined' && window.innerWidth <= 700; }

  function selectSlot(i: number) {
    activeSlot = i;
    activeTab = 'build';
    if (slots[i]) loadMoveData(slots[i]!.id);
  }

  function autoSelectSlot() {
    // On mobile, always auto-select the first filled slot (or slot 0) so the editor is immediately visible
    if (isMobile()) {
      const first = slots.findIndex(s => s !== null);
      activeSlot = first >= 0 ? first : 0;
    }
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

  // ── Stat computation ──────────────────────────────────────────────────────
  const STAT_KEYS: (keyof StatSpread)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  const STAT_COLORS = ['#4caf50', '#ef5350', '#ff9800', '#5c6bc0', '#26a69a', '#ab47bc'];

  // Champions: each point contributes ev*2 to the formula (≡ passing ev*8 into traditional floor(ev/4))
  // Traditional: floor(ev/4)
  function computeStat(base: number, ev: number, iv: number, isHP: boolean, nat: number, champ: boolean): number {
    const contrib = champ ? ev * 2 : Math.floor(ev / 4);
    if (isHP) return Math.floor((2 * base + iv + contrib) * 50 / 100 + 60);
    return Math.floor(Math.floor((2 * base + iv + contrib) * 50 / 100 + 5) * nat);
  }

  $: activeBaseStats = (() => {
    if (activeSlot === null || !slots[activeSlot]) return null;
    const sp = Dex.species.get(slots[activeSlot]!.id);
    return sp.exists ? sp.baseStats : null;
  })();

  $: activeStats = (() => {
    if (!activeBaseStats || activeSlot === null || !slots[activeSlot]) return null;
    const slot = slots[activeSlot]!;
    const bs = activeBaseStats;
    const evs: Partial<StatSpread> = slot.evs ?? {};
    const ivs: Partial<StatSpread> = slot.ivs ?? {};
    const nm = (s: keyof StatSpread) => natureMult(slot.natureName, s);
    const ev = (k: keyof StatSpread) => evs[k] ?? 0;
    const iv = (k: keyof StatSpread) => ivs[k] ?? (dvMode ? 15 : 31);
    const champ = evMode === 'champ';
    return {
      hp:  computeStat(bs.hp,  ev('hp'),  iv('hp'),  true,  1.0,       champ),
      atk: computeStat(bs.atk, ev('atk'), iv('atk'), false, nm('atk'), champ),
      def: computeStat(bs.def, ev('def'), iv('def'), false, nm('def'), champ),
      spa: computeStat(bs.spa, ev('spa'), iv('spa'), false, nm('spa'), champ),
      spd: computeStat(bs.spd, ev('spd'), iv('spd'), false, nm('spd'), champ),
      spe: computeStat(bs.spe, ev('spe'), iv('spe'), false, nm('spe'), champ),
    };
  })();

  $: evTotal = (() => {
    if (activeSlot === null || !slots[activeSlot]) return 0;
    return Object.values(slots[activeSlot]!.evs ?? {}).reduce((a, b) => a + b, 0);
  })();

  function maxEv(stat: keyof StatSpread, slot: SavedTeamSlot): number {
    const evs: Partial<StatSpread> = slot.evs ?? {};
    const other = STAT_KEYS.filter(k => k !== stat).reduce((a, k) => a + (evs[k] ?? 0), 0);
    return Math.min(EV_MAX_STAT, EV_MAX_TOTAL - other);
  }

  // ── Field updaters ────────────────────────────────────────────────────────
  function setField<K extends keyof SavedTeamSlot>(i: number, key: K, val: SavedTeamSlot[K]) {
    if (!slots[i]) return;
    slots[i] = { ...slots[i]!, [key]: val };
    slots = [...slots];
  }

  function setEv(i: number, stat: keyof StatSpread, val: number) {
    const evs = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0, ...(slots[i]?.evs ?? {}) };
    evs[stat] = Math.max(0, Math.min(EV_MAX_STAT, val));
    const sum = Object.values(evs).reduce((a, b) => a + b, 0);
    if (sum > EV_MAX_TOTAL) evs[stat] = Math.max(0, evs[stat] - (sum - EV_MAX_TOTAL));
    setField(i, 'evs', evs);
  }

  function setIv(i: number, stat: keyof StatSpread, val: number) {
    const ivs = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31, ...(slots[i]?.ivs ?? {}) };
    ivs[stat] = Math.max(0, Math.min(ivMax, val));
    setField(i, 'ivs', ivs);
  }

  function setMove(i: number, mi: number, val: string) {
    const moves = [...(slots[i]?.moves ?? ['','','',''])];
    moves[mi] = val;
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
  let moveCache = new Map<string, string[]>(); // meta-sorted

  async function loadAllItems() {
    const allDexItems = [...Dex.items.all()].filter(i => i.exists).map(i => i.name);
    const metaOrder   = await loadChampionsItemUsage();
    const metaSet     = new Set(metaOrder.map(n => n.toLowerCase()));
    // Meta items first (by usage), then the rest alphabetically
    allItems = [
      ...metaOrder.filter(n => allDexItems.some(d => d.toLowerCase() === n.toLowerCase())),
      ...allDexItems.filter(n => !metaSet.has(n.toLowerCase())).sort(),
    ];
  }

  async function getLearnset(speciesId: string): Promise<string[]> {
    if (learnsetCache.has(speciesId)) return learnsetCache.get(speciesId)!;
    const all = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cur: any = Dex.species.get(speciesId);
    while (cur?.exists) {
      const ls = await Dex.learnsets.get(cur.id);
      for (const m of Object.keys(ls?.learnset ?? {})) {
        const move = Dex.moves.get(m);
        if (move?.exists) all.add(move.name);
      }
      cur = cur.prevo ? Dex.species.get(cur.prevo) : null;
    }
    const sorted = [...all].sort();
    learnsetCache.set(speciesId, sorted);
    return sorted;
  }

  async function loadMoveData(speciesId: string) {
    if (moveCache.has(speciesId)) return;
    const [learnset, metaFull] = await Promise.all([getLearnset(speciesId), loadChampionsMovesFull()]);
    const meta = (metaFull[speciesId] ?? []).map(m => m.name);
    const metaSet = new Set(meta.map(m => m.toLowerCase()));
    moveCache.set(speciesId, [...meta, ...learnset.filter(m => !metaSet.has(m.toLowerCase()))]);
    moveCache = new Map(moveCache);
  }

  function pickItem(i: number, name: string) {
    setField(i, 'item', name);
    setField(i, 'scarf', toId(name) === 'choicescarf');
  }

  function setNature(i: number, name: string) {
    const info = NATURE_TABLE[name];
    if (!info) return;
    slots[i] = { ...slots[i]!, natureName: name, nature: info.tier };
    slots = [...slots];
  }

  const TERA_TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

  // ── Import/Export ─────────────────────────────────────────────────────────
  let showImport = false;
  let importError = '';
  let importLoading = false;
  let showExport = false;
  let exportText = '';
  let exportCopied = false;

  async function doImport(rawText: string) {
    importError = '';
    importLoading = true;
    try {
      const text = await resolvePaste(rawText);
      const parsed = parsePaste(text, allEntries);
      if (!parsed.filter(Boolean).length) { importError = 'No matching Pokémon found.'; return; }
      // Convert EVs to Champions scale if needed.
      // Champions pastes already use 0-32; Showdown pastes use 0-252.
      // Detect by checking if any EV exceeds 32 or total exceeds 66 (Champions max).
      if (evMode === 'champ') {
        for (const s of parsed) {
          if (s && s.evs) {
            const e = s.evs;
            const maxEv = Math.max(e.hp, e.atk, e.def, e.spa, e.spd, e.spe);
            const total = e.hp + e.atk + e.def + e.spa + e.spd + e.spe;
            if (maxEv > 32 || total > 66) {
              // Showdown format — divide by 8 to get Champions scale
              s.evs = { hp: Math.min(32, Math.round(e.hp / 8)), atk: Math.min(32, Math.round(e.atk / 8)), def: Math.min(32, Math.round(e.def / 8)), spa: Math.min(32, Math.round(e.spa / 8)), spd: Math.min(32, Math.round(e.spd / 8)), spe: Math.min(32, Math.round(e.spe / 8)) };
            }
            // else: already in Champions format, use as-is
          }
        }
      }
      slots = parsed.map(s => s ? {
        id: s.entry.id, name: s.entry.name, scarf: s.scarf, nature: s.nature,
        natureName: s.natureName, natureLocked: s.natureLocked ?? true,
        item: s.item, ability: s.ability,
        teraType: s.teraType, level: s.level, evs: s.evs, ivs: s.ivs,
        moves: s.moves, nickname: s.nickname,
      } : null);
      slots.forEach(s => { if (s) loadMoveData(s.id); });
      showImport = false;
    } catch (e: unknown) {
      importError = (e as Error)?.message ?? 'Failed to fetch paste.';
    } finally {
      importLoading = false;
    }
  }

  function buildPaste(): string {
    return generatePaste(slots, { evScale: evMode === 'champ' ? 8 : 1, hasTera });
  }

  async function exportPaste() {
    const text = buildPaste();
    try {
      await navigator.clipboard.writeText(text);
      exportCopied = true;
      setTimeout(() => (exportCopied = false), 2000);
    } catch {
      exportText = text;
      showExport = true;
    }
  }

  // ── Vs Meta ───────────────────────────────────────────────────────────────
  interface MetaEntry { id: string; name: string; moves: string[]; item?: string; }
  let metaList: MetaEntry[] = [];
  let metaSearch = '';
  let metaDropdownOpen = false;
  let selectedMetaId: string | null = null;
  let metaLoading = false;
  let vsCalc: { yourMoves: CalcMoveResult[]; theirMoves: CalcMoveResult[] } | null = null;

  $: filteredMeta = metaSearch.length >= 2
    ? metaList.filter(m => m.name.toLowerCase().includes(metaSearch.toLowerCase())).slice(0, 8)
    : [];

  $: selectedMeta = metaList.find(m => m.id === selectedMetaId) ?? null;

  // calcRawSpeed uses floor(ev/4) internally; champ ev*2 = floor(ev*8/4), so pass ev*8
  $: toCalcEv = (ev: number) => evMode === 'champ' ? ev * 8 : ev;

  $: mySpeed = (() => {
    if (activeSlot === null || !slots[activeSlot]) return 0;
    const slot = slots[activeSlot]!;
    const sp = Dex.species.get(slot.id);
    return sp.exists ? calcRawSpeed(sp.baseStats.spe, toCalcEv(slot.evs?.spe ?? 0), slot.nature) : 0;
  })();

  $: metaSpeeds = selectedMetaId ? (() => {
    const sp = Dex.species.get(selectedMetaId);
    if (!sp.exists) return null;
    const b = sp.baseStats.spe;
    const maxEv = evMode === 'champ' ? 32 * 8 : 252; // max EV in calcRawSpeed terms
    return { min: calcRawSpeed(b, 0, '-'), neutral: calcRawSpeed(b, 0, '='), max: calcRawSpeed(b, maxEv, '+') };
  })() : null;

  function evsToOutspeed(myBase: number, myNat: NatureTier, target: number): number | null {
    const limit = evMode === 'champ' ? 32 : 252;
    const step  = evMode === 'champ' ? 1 : 4;
    for (let ev = 0; ev <= limit; ev += step) {
      if (calcRawSpeed(myBase, toCalcEv(ev), myNat) > target) return ev;
    }
    return null;
  }

  async function loadVsMeta() {
    if (metaList.length || metaLoading) return;
    metaLoading = true;
    try {
      const [full, builds] = await Promise.all([loadChampionsMovesFull(), loadChampionsBuilds()]);
      const entries: MetaEntry[] = [];
      for (const [id, moves] of Object.entries(full)) {
        const sp = Dex.species.get(id);
        if (sp.exists) entries.push({ id, name: sp.name, moves: moves.map(m => m.name), item: builds[id]?.item });
      }
      metaList = entries.sort((a, b) => a.name.localeCompare(b.name));
    } catch { /* ignore */ }
    metaLoading = false;
  }

  function buildMetaSlot(meta: MetaEntry): NonNullable<TeamSlot> {
    const sp = Dex.species.get(meta.id);
    const entry = allEntries.find(e => e.id === meta.id) ?? {
      id: meta.id, name: sp.exists ? sp.name : meta.id,
      baseSpe: sp.exists ? sp.baseStats.spe : 0,
      maxSpeed: 0, minSpeed: 0, neutralSpeed: 0,
      abilities: Object.values(sp?.abilities ?? {}).filter(Boolean) as string[],
      types: sp.exists ? [...sp.types] : [],
      megaForms: [], baseSpeciesId: meta.id,
    };
    return {
      entry,
      scarf: meta.item ? toId(meta.item) === 'choicescarf' : false,
      nature: '=' as NatureTier, item: meta.item,
      ability: Object.values(sp?.abilities ?? {})[0] as string | undefined,
      moves: meta.moves, level: 50,
    };
  }

  function slotToTeamSlot(saved: SavedTeamSlot): NonNullable<TeamSlot> {
    const entry = allEntries.find(e => e.id === saved.id) ?? {
      id: saved.id, name: saved.name,
      baseSpe: 0, maxSpeed: 0, minSpeed: 0, neutralSpeed: 0,
      abilities: [], types: [], megaForms: [], baseSpeciesId: saved.id,
    };
    return { entry, ...saved };
  }

  $: if (activeTab === 'vs-meta' && !metaList.length && !metaLoading) loadVsMeta();

  $: if (selectedMetaId && selectedMeta && activeSlot !== null && slots[activeSlot] && allEntries.length) {
    try {
      const my = slotToTeamSlot(slots[activeSlot]!);
      const their = buildMetaSlot(selectedMeta);
      const myMoves = (slots[activeSlot]!.moves ?? []).filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vsCalc = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        yourMoves: myMoves.length ? runCalc(my, 'you', their, myMoves, {} as any) : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theirMoves: runCalc(their, 'opp', my, selectedMeta.moves.slice(0, 8), {} as any),
      };
    } catch { vsCalc = null; }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function save() {
    if (isNew || !team) {
      const id = savedTeams.save({ label, genNum: genNum ?? 9, yourTeam: slots });
      goto(`/build?id=${id}`);
    } else {
      savedTeams.updateTeam(team.id, { label, genNum: genNum ?? 9, yourTeam: slots });
    }
  }
</script>

<svelte:head>
  <title>Team Builder — Turnadus | Pokémon VGC &amp; Champions</title>
  <meta name="description" content="Build your Pokémon VGC or Champions team. EV sliders, meta-sorted moves and items, damage calculations, and speed comparisons — all in one place." />
  <link rel="canonical" href="https://turnadus.com/build" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Team Builder — Turnadus" />
  <meta property="og:description" content="Build your Pokémon VGC or Champions team. EV sliders, meta-sorted moves, damage calc, and speed comparisons." />
  <meta property="og:url" content="https://turnadus.com/build" />
  <meta property="og:image" content="https://turnadus.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Team Builder — Turnadus" />
  <meta name="twitter:description" content="Build your Pokémon VGC or Champions team. EV sliders, meta-sorted moves, damage calc, and speed comparisons." />
  <meta name="twitter:image" content="https://turnadus.com/og-image.png" />
</svelte:head>

<!-- Picker -->
{#if showPicker && activeSlot !== null}
  <PokemonPicker entries={allEntries} on:pick={onPick} on:close={() => (showPicker = false)} />
{/if}

<PasteModal
  open={showImport}
  loading={importLoading}
  error={importError}
  showCancel={false}
  on:close={() => { showImport = false; importError = ''; }}
  on:import={(e) => doImport(e.detail)}
/>

<!-- Export modal -->
{#if showExport}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="bld-modal-bg" on:click={() => (showExport = false)}>
    <div class="bld-modal" on:click|stopPropagation>
      <div class="bld-modal-hd">
        <span>Export Poképaste</span>
        <button class="bld-modal-x" on:click={() => (showExport = false)}>✕</button>
      </div>
      <textarea class="bld-textarea" readonly value={exportText} on:focus={e => e.currentTarget.select()}></textarea>
    </div>
  </div>
{/if}

<div class="bld-page">
  <!-- Toolbar -->
  <div class="bld-toolbar">
    <!-- Team selector dropdown -->
    <div class="bld-select-wrap">
      <select class="bld-select bld-team-select"
        value={team?.id ?? ''}
        on:change={e => {
          const v = e.currentTarget.value;
          if (v === '') {
            team = null; label = 'New Team'; genNum = null;
            slots = Array(6).fill(null); isNew = true; activeSlot = null;
          } else {
            const found = $savedTeams.find(t => t.id === v);
            if (found) {
              team = found; label = found.label; genNum = found.genNum;
              slots = found.yourTeam.map(s => s ? { ...s } : null);
              isNew = false; activeSlot = null;
              slots.forEach(s => { if (s) loadMoveData(s.id); });
              autoSelectSlot();
            }
          }
        }}
      >
        <option value="">+ New team</option>
        {#each $savedTeams as t (t.id)}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
      <svg class="bld-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </div>

    <input class="bld-label" bind:value={label} placeholder="Team name…" />
    <div class="bld-toolbar-right">
      <div class="bld-select-wrap">
        <select class="bld-select" value={genNum ?? ''} on:change={e => { const v = e.currentTarget.value; genNum = v === '' ? null : (+v as GenNumber); }}>
          <option value="">All Gens</option>
          {#each GEN_NUMBERS as gn}<option value={gn}>Gen {gn}</option>{/each}
        </select>
        <svg class="bld-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="bld-ev-mode-toggle" title="Switch EV system">
        <button class="bld-ev-mode-btn" class:bld-ev-mode-on={evMode === 'champ'} on:click={() => switchEvMode('champ')}>Champions</button>
        <button class="bld-ev-mode-btn" class:bld-ev-mode-on={evMode === 'showdown'} on:click={() => switchEvMode('showdown')}>Showdown</button>
      </div>
      <button class="bld-action-btn" on:click={() => (showImport = true)}>Import</button>
      <button class="bld-action-btn" on:click={exportPaste}>{exportCopied ? 'Copied!' : 'Export'}</button>
      <button class="bld-save-btn" on:click={save}>{isNew ? 'Save Team' : 'Saved ✓'}</button>
    </div>
  </div>

  <!-- Body: meta-style two-column -->
  <div class="bld-body">

    <!-- Sidebar: slot list -->
    <aside class="bld-sidebar">
      {#each slots as slot, i}
        <button
          class="bld-slot"
          class:bld-slot-active={activeSlot === i}
          class:bld-slot-empty={!slot}
          on:click={() => selectSlot(i)}
        >
          {#if slot}
            <span style={iconStyle(slot.name)} class="bld-slot-icon" role="img" aria-label={slot.name}></span>
            <div class="bld-slot-info">
              <span class="bld-slot-name">{slot.nickname || slot.name}</span>
              <span class="bld-slot-sub">{slot.item || slot.ability || '\u00a0'}</span>
            </div>
            {#if slot.nature !== '='}
              <span class="bld-slot-nat" class:nat-plus={slot.nature === '+'} class:nat-minus={slot.nature === '-'}>{slot.nature === '+' ? '+Spe' : '−Spe'}</span>
            {/if}
          {:else}
            <span class="bld-slot-num">{i + 1}</span>
            <span class="bld-slot-empty-txt">Empty slot</span>
          {/if}
        </button>
      {/each}
    </aside>

    <!-- Detail panel -->
    <div class="bld-detail">
      {#if activeSlot === null}
        <div class="bld-detail-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <p>Select a slot to edit</p>
        </div>
      {:else if !slots[activeSlot]}
        <div class="bld-detail-empty">
          <Button variant="primary" onClick={() => { showPicker = true; }}>+ Add Pokémon to slot {activeSlot + 1}</Button>
        </div>
      {:else}
        {@const slot = slots[activeSlot]!}
        {@const i = activeSlot}
        {@const types = (() => { const sp = Dex.species.get(slot.id); return sp.exists ? [...sp.types] : []; })()}
        {@const abilities = getSpeciesAbilities(slot.id)}

        <!-- Pokemon header -->
        <div class="bld-poke-header">
          <img src={spriteUrl(slot.name)} alt={slot.name} class="bld-poke-sprite" />
          <div class="bld-poke-info">
            <div class="bld-poke-name">{slot.nickname || slot.name}</div>
            {#if slot.nickname}<div class="bld-poke-species">{slot.name}</div>{/if}
            <div class="bld-poke-types">
              {#each types as type}
                <span class="type-badge type-{type.toLowerCase()}">{type}</span>
              {/each}
            </div>
          </div>
          <div class="bld-poke-btns">
            <button class="bld-change-btn" on:click={() => (showPicker = true)}>Change</button>
            <button class="bld-remove-btn" aria-label="Remove" on:click={() => clearSlot(i)}>✕</button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bld-tabs">
          <button class="bld-tab" class:bld-tab-on={activeTab === 'build'} on:click={() => (activeTab = 'build')}>Build</button>
          <button class="bld-tab" class:bld-tab-on={activeTab === 'vs-meta'} on:click={() => { activeTab = 'vs-meta'; loadVsMeta(); }}>Vs Meta</button>
        </div>

        <!-- ── Build tab ─────────────────────────── -->
        {#if activeTab === 'build'}
          <div class="bld-build-grid">

            <!-- LEFT: fields + moves -->
            <div class="bld-col-left">

              <!-- Nickname + Level row -->
              <div class="bld-field-pair">
                <div class="bld-field">
                  <div class="bld-lbl">Nickname</div>
                  <input class="bld-input" value={slot.nickname ?? ''} placeholder={slot.name}
                    on:input={e => setField(i, 'nickname', e.currentTarget.value || undefined)} />
                </div>
                <div class="bld-field bld-field-xs">
                  <div class="bld-lbl">Level</div>
                  <input class="bld-input" type="number" min="1" max="100" value={slot.level ?? 50}
                    on:change={e => setField(i, 'level', +e.currentTarget.value)} />
                </div>
              </div>

              <!-- Item -->
              {#if hasItems}
                <div class="bld-field">
                  <div class="bld-lbl">Item</div>
                  <Autocomplete
                    items={allItems}
                    value={slot.item ?? ''}
                    placeholder="e.g. Life Orb"
                    oninput={(v) => setField(i, 'item', v || undefined)}
                    onselect={(v) => pickItem(i, v)}
                  />
                </div>
              {/if}

              <!-- Ability -->
              {#if hasAbility}
                <div class="bld-field">
                  <div class="bld-lbl">Ability</div>
                  {#if abilities.length <= 3}
                    <div class="bld-ability-row">
                      {#each abilities as ab}
                        <button
                          class="bld-ability-btn"
                          class:bld-ability-on={ab === (slot.ability ?? abilities[0])}
                          on:click={() => setField(i, 'ability', ab)}
                        >{ab}</button>
                      {/each}
                    </div>
                  {:else}
                    <select class="bld-select-input" on:change={e => setField(i, 'ability', e.currentTarget.value)}>
                      {#each abilities as ab}
                        <option value={ab} selected={ab === (slot.ability ?? abilities[0])}>{ab}</option>
                      {/each}
                    </select>
                  {/if}
                </div>
              {/if}

              <!-- Nature -->
              {#if hasNatures}
                <div class="bld-field">
                  <div class="bld-lbl">Nature</div>
                  <div class="bld-select-wrap">
                    <select class="bld-select-input"
                      value={slot.natureName ?? ''}
                      on:change={e => setNature(i, e.currentTarget.value)}
                    >
                      <option value="" disabled>Select nature…</option>
                      {#each ALL_NATURES as n}
                        <option value={n}>{natureLabel(n)}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/if}

              <!-- Tera Type -->
              {#if hasTera}
                <div class="bld-field">
                  <div class="bld-lbl">Tera Type</div>
                  <div class="bld-select-wrap">
                    <select class="bld-select-input"
                      value={slot.teraType ?? ''}
                      on:change={e => setField(i, 'teraType', e.currentTarget.value || undefined)}
                    >
                      <option value="" disabled>Select tera type…</option>
                      {#each TERA_TYPES as t}
                        <option value={t}>{t}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/if}

              <!-- Moves -->
              <div class="bld-field bld-moves">
                <div class="bld-lbl">Moves <span class="bld-lbl-hint">sorted by meta usage</span></div>
                {#each [0, 1, 2, 3] as mi}
                  <Autocomplete
                    items={moveCache.get(slot.id) ?? []}
                    value={slot.moves?.[mi] ?? ''}
                    placeholder="Move {mi + 1}"
                    oninput={(v) => setMove(i, mi, v)}
                    onselect={(v) => setMove(i, mi, v)}
                  />
                {/each}
              </div>
            </div>

            <!-- RIGHT: EV sliders + IVs -->
            <div class="bld-col-right">
              <div class="bld-field">
                <div class="bld-lbl">
                  {evMode === 'champ' ? 'Training Pts' : 'EVs'}
                  <span class="bld-ev-budget" class:bld-ev-over={evTotal > EV_MAX_TOTAL}>{evTotal} / {EV_MAX_TOTAL}</span>
                  <span class="bld-ev-left">{EV_MAX_TOTAL - evTotal} left</span>
                </div>
                {#each STAT_KEYS as stat, si}
                  {@const ev = slot.evs?.[stat] ?? 0}
                  {@const statVal = activeStats?.[stat] ?? 0}
                  {@const mev = maxEv(stat, slot)}
                  {@const pct = `${Math.round(ev / EV_MAX_STAT * 100)}%`}
                  {@const col = STAT_COLORS[si]}
                  <div class="bld-ev-row">
                    <span class="bld-ev-lbl" style="color:{col}">{STAT_LABELS[si]}</span>
                    <input
                      type="range" min="0" max={mev} value={ev}
                      class="bld-ev-slider"
                      style="--c:{col}; --p:{pct}"
                      on:input={e => setEv(i, stat, +e.currentTarget.value)}
                    />
                    <input
                      type="number" min="0" max={EV_MAX_STAT} value={ev}
                      class="bld-ev-num"
                      on:change={e => setEv(i, stat, +e.currentTarget.value)}
                    />
                    <span class="bld-ev-stat" style="color:{col}">{statVal}</span>
                  </div>
                {/each}
              </div>

              <div class="bld-field">
                <div class="bld-lbl">{dvMode ? 'DVs (0–15)' : 'IVs'}</div>
                <div class="bld-iv-grid">
                  {#each STAT_KEYS as stat, si}
                    <div class="bld-iv-cell">
                      <div class="bld-iv-lbl" style="color:{STAT_COLORS[si]}">{STAT_LABELS[si]}</div>
                      <input type="number" min="0" max={ivMax} value={slot.ivs?.[stat] ?? ivMax}
                        class="bld-iv-input"
                        on:change={e => setIv(i, stat, +e.currentTarget.value)} />
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>

        <!-- ── Vs Meta tab ────────────────────────── -->
        {:else}
          <div class="bld-vs">
            {#if metaLoading}
              <p class="bld-vs-hint">Loading meta data…</p>
            {:else}
              <!-- Meta search -->
              <div class="bld-field" style="position:relative">
                <div class="bld-lbl">Meta Pokémon</div>
                <div style="position:relative">
                  <input
                    class="bld-input"
                    placeholder="Search meta (e.g. Calyrex)"
                    bind:value={metaSearch}
                    autocomplete="off"
                    on:focus={() => (metaDropdownOpen = true)}
                    on:blur={() => setTimeout(() => (metaDropdownOpen = false), 150)}
                  />
                  {#if metaDropdownOpen && filteredMeta.length > 0}
                    <div class="bld-meta-dropdown">
                      {#each filteredMeta as m}
                        <button class="bld-meta-row" on:mousedown|preventDefault={() => { selectedMetaId = m.id; metaSearch = m.name; metaDropdownOpen = false; }}>
                          <span style={iconStyle(m.name)} class="bld-meta-icon" role="img" aria-label={m.name}></span>
                          {m.name}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>

              {#if selectedMeta && metaSpeeds}
                <div class="bld-vs-grid">
                  <!-- Speed section -->
                  <div class="bld-vs-card">
                    <div class="bld-vs-card-title">Speed</div>
                    <div class="bld-speed-my">
                      <span class="bld-speed-lbl">Your {slot.name}</span>
                      <span class="bld-speed-val bld-speed-you">{mySpeed}</span>
                    </div>
                    {#each [
                      { label: `${selectedMeta.name} max`, val: metaSpeeds.max },
                      { label: `${selectedMeta.name} neutral`, val: metaSpeeds.neutral },
                      { label: `${selectedMeta.name} min`, val: metaSpeeds.min },
                    ] as tier}
                      <div class="bld-speed-row">
                        <span class="bld-speed-lbl">{tier.label}</span>
                        <span class="bld-speed-val">{tier.val}</span>
                        <span class="bld-speed-badge" class:bld-spd-fast={tier.val <= mySpeed} class:bld-spd-slow={tier.val > mySpeed}>
                          {tier.val <= mySpeed ? 'You first' : 'They first'}
                        </span>
                      </div>
                    {/each}
                    {#if metaSpeeds.max > mySpeed && activeBaseStats}
                      {@const needed = evsToOutspeed(activeBaseStats.spe, slot.nature, metaSpeeds.max)}
                      <div class="bld-speed-tip">
                        {#if needed !== null}
                          <strong>{needed} Spe {evMode === 'champ' ? 'pts' : 'EVs'}</strong> to outspeed their max{slot.nature !== '+' ? ' (with current nature)' : ''}.
                        {:else}
                          Can't outspeed their max.{slot.nature !== '+' ? ' Try +Spe nature.' : ''}
                        {/if}
                      </div>
                    {/if}
                  </div>

                  <!-- Damage section -->
                  {#if vsCalc}
                    <div class="bld-vs-card">
                      <div class="bld-vs-card-title">Your moves → {selectedMeta.name}</div>
                      {#if vsCalc.yourMoves.length}
                        {#each vsCalc.yourMoves as r}
                          <div class="bld-calc-row">
                            <span class="bld-calc-move">{r.moveName}</span>
                            <span class="bld-calc-pct">{Math.round(r.minPct)}–{Math.round(r.maxPct)}%</span>
                            <span class="bld-calc-hko" class:bld-calc-ko={r.guaranteed}>{r.nHko === 1 ? 'OHKO' : `${r.nHko}HKO`}{r.guaranteed ? '' : '?'}</span>
                          </div>
                        {/each}
                      {:else}
                        <p class="bld-vs-hint">Add moves to see damage.</p>
                      {/if}
                    </div>

                    <div class="bld-vs-card">
                      <div class="bld-vs-card-title">{selectedMeta.name} → {slot.name}</div>
                      {#if vsCalc.theirMoves.length}
                        {#each vsCalc.theirMoves as r}
                          <div class="bld-calc-row">
                            <span class="bld-calc-move">{r.moveName}</span>
                            <span class="bld-calc-pct">{Math.round(r.minPct)}–{Math.round(r.maxPct)}%</span>
                            <span class="bld-calc-hko" class:bld-calc-ko={r.guaranteed}>{r.nHko === 1 ? 'OHKO' : `${r.nHko}HKO`}{r.guaranteed ? '' : '?'}</span>
                          </div>
                        {/each}
                      {:else}
                        <p class="bld-vs-hint">No damage data.</p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {:else if !selectedMetaId}
                <p class="bld-vs-hint">Search a meta Pokémon to compare speed and damage.</p>
              {/if}
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>
