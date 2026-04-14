<script lang="ts">
  import './styles.css';
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Dex } from "@pkmn/dex";
  import { savedTeams } from "$lib/stores/savedTeams";
  import type { SavedTeam, SavedTeamSlot } from "$lib/stores/savedTeams";
  import type { GenNumber, NatureTier } from "$lib/speedtiers";
  import { GEN_NUMBERS } from "$lib/speedtiers";
  import { spriteUrl } from "$lib/sprites";
  import PokemonPicker from "$lib/components/PokemonPicker/index.svelte";
  import SearchCombobox from "$lib/components/SearchCombobox/index.svelte";
  import { buildAllTiers } from "$lib/speedtiers";
  import type { SpeedEntry } from "$lib/speedtiers";
  import { parsePaste, resolvePaste } from "$lib/parsePaste";
  import Button from "$lib/components/ui/Button/index.svelte";

  // ── Load team ────────────────────────────────────────────────────────────
  let team: SavedTeam | null = null;
  let slots: (SavedTeamSlot | null)[] = Array(6).fill(null);
  let label = "";
  let genNum: GenNumber | null = null; // null = All Gens

  $: teamId = $page.params.id;

  onMount(() => {
    const found = $savedTeams.find((t) => t.id === teamId);
    if (!found) {
      goto("/");
      return;
    }
    team = found;
    label = found.label;
    genNum = found.genNum;
    slots = found.yourTeam.map((s) => (s ? { ...s } : null));
  });

  // ── Gen-awareness (null = all gens, treat as gen 9 for flags) ────────────
  $: g = genNum ?? 9;
  $: hasTera = g >= 9;
  $: hasAbility = g >= 3;
  $: hasItems = g >= 2;
  $: hasNatures = g >= 3;
  $: dvMode = g <= 2;
  $: ivMax = dvMode ? 15 : 31;
  $: allEntries = buildAllTiers(9);

  // ── Editing state ─────────────────────────────────────────────────────────
  let activeSlot: number | null = null;
  let showPicker = false;
  let moveSearch: string[] = ["", "", "", ""];
  let moveSuggestions: string[][] = [[], [], [], []];

  function openSlot(i: number) {
    activeSlot = i;
    moveSearch = slots[i]?.moves?.map((m) => m) ?? ["", "", "", ""];
    moveSuggestions = [[], [], [], []];
  }

  function closeSlot() {
    activeSlot = null;
    moveSearch = ["", "", "", ""];
    moveSuggestions = [[], [], [], []];
  }

  function openPicker() {
    showPicker = true;
  }

  function onPick(e: CustomEvent<SpeedEntry>) {
    if (activeSlot === null) return;
    const entry = e.detail;
    const abilities = getSpeciesAbilities(entry.id);
    slots[activeSlot] = {
      id: entry.id,
      name: entry.name,
      scarf: false,
      nature: "=" as NatureTier,
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
  function setField<K extends keyof SavedTeamSlot>(
    i: number,
    key: K,
    value: SavedTeamSlot[K],
  ) {
    if (!slots[i]) return;
    slots[i] = { ...slots[i]!, [key]: value };
    slots = [...slots];
  }

  function setEv(
    i: number,
    stat: keyof import("$lib/stores/teams").StatSpread,
    value: number,
  ) {
    const evs = {
      hp: 0,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      ...(slots[i]?.evs ?? {}),
    };
    evs[stat] = Math.max(0, Math.min(252, value));
    // Clamp to 508 total
    const total = Object.values(evs).reduce((a, b) => a + b, 0);
    if (total > 508) evs[stat] = Math.max(0, evs[stat] - (total - 508));
    setField(i, "evs", evs);
  }

  function setIv(
    i: number,
    stat: keyof import("$lib/stores/teams").StatSpread,
    value: number,
  ) {
    const ivs = {
      hp: 31,
      atk: 31,
      def: 31,
      spa: 31,
      spd: 31,
      spe: 31,
      ...(slots[i]?.ivs ?? {}),
    };
    ivs[stat] = Math.max(0, Math.min(ivMax, value));
    setField(i, "ivs", ivs);
  }

  function setMove(i: number, moveIdx: number, value: string) {
    const moves = [...(slots[i]?.moves ?? ["", "", "", ""])];
    moves[moveIdx] = value;
    setField(i, "moves", moves.filter(Boolean).length ? moves : undefined);
    moveSearch[moveIdx] = value;
    moveSearch = [...moveSearch];
    moveSuggestions[moveIdx] =
      value.length >= 2 ? searchMoves(slots[i]!.id, value) : [];
    moveSuggestions = [...moveSuggestions];
  }

  function pickMove(i: number, moveIdx: number, moveName: string) {
    moveSearch[moveIdx] = moveName;
    moveSearch = [...moveSearch];
    moveSuggestions[moveIdx] = [];
    moveSuggestions = [...moveSuggestions];
    const moves = [...(slots[i]?.moves ?? ["", "", "", ""])];
    moves[moveIdx] = moveName;
    setField(i, "moves", moves);
  }

  // ── Dex helpers ───────────────────────────────────────────────────────────
  const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  function getSpeciesAbilities(speciesId: string): string[] {
    const sp = Dex.species.get(speciesId);
    return Object.values(sp?.abilities ?? {}).filter(Boolean) as string[];
  }

  let allItems: string[] = [];
  let learnsetCache = new Map<string, string[]>();

  onMount(async () => {
    allItems = [...Dex.items.all()]
      .filter((i) => i.exists)
      .map((i) => i.name)
      .sort();
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
      getLearnset(speciesId).then((moves) => {
        _moveCache.set(speciesId, moves);
        // trigger reactivity
        moveSuggestions = moveSuggestions.map((_, idx) =>
          moveSearch[idx].length >= 2
            ? moves
                .filter((m) =>
                  m.toLowerCase().includes(moveSearch[idx].toLowerCase()),
                )
                .slice(0, 8)
            : [],
        );
      });
      return [];
    }
    return cached
      .filter((m) => m.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }

  function pickItem(i: number, name: string) {
    setField(i, "item", name);
    setField(i, "scarf", toId(name) === "choicescarf");
  }

  const NATURES: NatureTier[] = ["+", "=", "-"];
  const NATURE_LABELS: Record<NatureTier, string> = {
    "+": "+ Speed (Timid/Jolly/Naive/Hasty)",
    "=": "= Neutral",
    "-": "− Speed (Brave/Quiet/Relaxed/Sassy)",
  };
  const NATURE_EXPORT: Record<NatureTier, string> = {
    "+": "Timid",
    "=": "Hardy",
    "-": "Brave",
  };

  const TERA_TYPES = [
    "Normal",
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ice",
    "Fighting",
    "Poison",
    "Ground",
    "Flying",
    "Psychic",
    "Bug",
    "Rock",
    "Ghost",
    "Dragon",
    "Dark",
    "Steel",
    "Fairy",
  ];

  const STAT_KEYS: (keyof import("$lib/stores/teams").StatSpread)[] = [
    "hp",
    "atk",
    "def",
    "spa",
    "spd",
    "spe",
  ];
  const STAT_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

  // ── Import ────────────────────────────────────────────────────────────────
  let showImportModal = false;
  let importText = "";
  let importError = "";
  let importLoading = false;

  async function doImport() {
    importError = "";
    importLoading = true;
    try {
      const text = await resolvePaste(importText);
      const parsed = parsePaste(text, allEntries);
      const filled = parsed.filter(Boolean);
      if (!filled.length) {
        importError = "No matching Pokémon found — check the paste.";
        return;
      }
      slots = parsed.map((s) =>
        s
          ? {
              id: s.entry.id,
              name: s.entry.name,
              scarf: s.scarf,
              nature: s.nature,
              natureLocked: s.natureLocked ?? true,
              item: s.item,
              ability: s.ability,
              teraType: s.teraType,
              level: s.level,
              evs: s.evs,
              ivs: s.ivs,
              moves: s.moves,
              nickname: s.nickname,
            }
          : null,
      );
      showImportModal = false;
      importText = "";
    } catch (e: any) {
      importError = e?.message ?? "Failed to fetch paste.";
    } finally {
      importLoading = false;
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  let showExportModal = false;
  let exportText = "";
  let exportCopied = false;

  function generatePaste(): string {
    const blocks: string[] = [];
    for (const slot of slots) {
      if (!slot) continue;
      const lines: string[] = [];
      const namePart = slot.nickname
        ? `${slot.nickname} (${slot.name})`
        : slot.name;
      lines.push(slot.item ? `${namePart} @ ${slot.item}` : namePart);
      if (slot.ability) lines.push(`Ability: ${slot.ability}`);
      if (slot.level && slot.level !== 50) lines.push(`Level: ${slot.level}`);
      if (hasTera && slot.teraType) lines.push(`Tera Type: ${slot.teraType}`);
      if (slot.evs) {
        const ev = slot.evs;
        const parts: string[] = [];
        if (ev.hp) parts.push(`${ev.hp} HP`);
        if (ev.atk) parts.push(`${ev.atk} Atk`);
        if (ev.def) parts.push(`${ev.def} Def`);
        if (ev.spa) parts.push(`${ev.spa} SpA`);
        if (ev.spd) parts.push(`${ev.spd} SpD`);
        if (ev.spe) parts.push(`${ev.spe} Spe`);
        if (parts.length) lines.push(`EVs: ${parts.join(" / ")}`);
      }
      lines.push(`${NATURE_EXPORT[slot.nature ?? "="]} Nature`);
      if (slot.ivs) {
        const iv = slot.ivs;
        const parts: string[] = [];
        if (iv.hp !== 31) parts.push(`${iv.hp} HP`);
        if (iv.atk !== 31) parts.push(`${iv.atk} Atk`);
        if (iv.def !== 31) parts.push(`${iv.def} Def`);
        if (iv.spa !== 31) parts.push(`${iv.spa} SpA`);
        if (iv.spd !== 31) parts.push(`${iv.spd} SpD`);
        if (iv.spe !== 31) parts.push(`${iv.spe} Spe`);
        if (parts.length) lines.push(`IVs: ${parts.join(" / ")}`);
      }
      for (const move of slot.moves ?? []) {
        if (move) lines.push(`- ${move}`);
      }
      blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n");
  }

  async function exportPaste() {
    const text = generatePaste();
    try {
      await navigator.clipboard.writeText(text);
      exportCopied = true;
      setTimeout(() => (exportCopied = false), 2000);
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
    goto("/");
  }
</script>

<svelte:head><title>Edit Team — Turnadus</title></svelte:head>

{#if showPicker && activeSlot !== null}
  <PokemonPicker
    entries={allEntries}
    on:pick={onPick}
    on:close={() => (showPicker = false)}
  />
{/if}

{#if showImportModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click={() => {
      showImportModal = false;
      importError = "";
    }}
  >
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">Import Poképaste</span>
        <button
          class="modal-close"
          on:click={() => {
            showImportModal = false;
            importError = "";
          }}>✕</button
        >
      </div>
      <textarea
        class="export-textarea"
        placeholder="Paste a Showdown team or pokepast.es URL…"
        bind:value={importText}
      ></textarea>
      {#if importError}<p class="import-error">{importError}</p>{/if}
      <div class="modal-actions">
        <Button variant="primary" size="sm" disabled={importLoading || !importText.trim()} onClick={doImport}>
          {importLoading ? "Importing…" : "Import"}
        </Button>
      </div>
    </div>
  </div>
{/if}

{#if showExportModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={() => (showExportModal = false)}>
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header">
        <span class="modal-title">Export Poképaste</span>
        <button class="modal-close" on:click={() => (showExportModal = false)}
          >✕</button
        >
      </div>
      <textarea
        class="export-textarea"
        readonly
        value={exportText}
        on:focus={(e) => e.currentTarget.select()}
      ></textarea>
    </div>
  </div>
{/if}

<div class="page">
  <div class="toolbar">
    <a href="/" class="back-btn">← Back</a>
    <input class="label-input" bind:value={label} placeholder="Team name…" />
    <div class="select-wrap">
      <select
        class="gen-select"
        value={genNum ?? ""}
        on:change={(e) => {
          const v = e.currentTarget.value;
          genNum = v === "" ? null : (+v as GenNumber);
        }}
      >
        <option value="">All Gens</option>
        {#each GEN_NUMBERS as g}
          <option value={g}>Gen {g}</option>
        {/each}
      </select>
      <svg
        class="select-chevron"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg
      >
    </div>
    <Button variant="secondary" size="sm" onClick={() => (showImportModal = true)}>Import</Button>
    <Button variant="secondary" size="sm" onClick={exportPaste}>{exportCopied ? "Copied!" : "Export"}</Button>
    <Button variant="primary" size="sm" onClick={save}>Save</Button>
  </div>

  <div class="slots-grid">
    {#each slots as slot, i}
      <div class="slot-card" class:active={activeSlot === i}>
        <!-- Slot header -->
        <div class="slot-header">
          {#if slot}
            <img
              src={spriteUrl(slot.name)}
              alt={slot.name}
              class="edit-sprite"
            />
            <div class="slot-title">
              <span class="slot-name"
                >{slot.nickname
                  ? `${slot.nickname} (${slot.name})`
                  : slot.name}</span
              >
              <span class="slot-sub"
                >{slot.item ?? "No item"} · {slot.ability ?? "No ability"}</span
              >
            </div>
            <div class="slot-header-btns">
              <button
                class="slot-edit-btn"
                on:click={() => (activeSlot === i ? closeSlot() : openSlot(i))}
              >
                {activeSlot === i ? "▲" : "▼"}
              </button>
              <button
                class="slot-clear-btn"
                aria-label="Remove"
                on:click={() => clearSlot(i)}>✕</button
              >
            </div>
          {:else}
            <button
              class="slot-empty"
              on:click={() => {
                openSlot(i);
                openPicker();
              }}
            >
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
              <Button variant="secondary" size="sm" onClick={openPicker}>Change Species</Button>
            </div>

            <!-- Nickname -->
            <div class="field-row">
              <label class="field-label" for="field-{i}-nickname"
                >Nickname</label
              >
              <input
                id="field-{i}-nickname"
                class="field-input"
                value={slot.nickname ?? ""}
                placeholder={slot.name}
                on:input={(e) =>
                  setField(i, "nickname", e.currentTarget.value || undefined)}
              />
            </div>

            <!-- Level -->
            <div class="field-row">
              <label class="field-label" for="field-{i}-level">Level</label>
              <input
                id="field-{i}-level"
                class="field-input short"
                type="number"
                min="1"
                max="100"
                value={slot.level ?? 50}
                on:change={(e) => setField(i, "level", +e.currentTarget.value)}
              />
            </div>

            <!-- Item -->
            {#if hasItems}
              <div class="field-row">
                <label class="field-label" for="field-{i}-item">Item</label>
                <SearchCombobox
                  id="field-{i}-item"
                  items={allItems}
                  value={slot.item ?? ""}
                  placeholder="e.g. Life Orb"
                  on:input={(e: CustomEvent<string>) => setField(i, "item", e.detail || undefined)}
                  on:select={(e: CustomEvent<string>) => pickItem(i, e.detail)}
                />
              </div>
            {/if}

            <!-- Ability -->
            {#if hasAbility}
              {@const abilities = getSpeciesAbilities(slot.id)}
              <div class="field-row">
                <label class="field-label" for="field-{i}-ability"
                  >Ability</label
                >
                <select
                  id="field-{i}-ability"
                  class="field-input"
                  on:change={(e) =>
                    setField(i, "ability", e.currentTarget.value)}
                >
                  {#each abilities as ab}
                    <option
                      value={ab}
                      selected={ab === (slot.ability ?? abilities[0])}
                      >{ab}</option
                    >
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Tera Type -->
            {#if hasTera}
              <div class="field-row">
                <label class="field-label" for="field-{i}-tera">Tera Type</label
                >
                <select
                  id="field-{i}-tera"
                  class="field-input"
                  value={slot.teraType ?? "Normal"}
                  on:change={(e) =>
                    setField(i, "teraType", e.currentTarget.value)}
                >
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
                <select
                  id="field-{i}-nature"
                  class="field-input"
                  value={slot.nature}
                  on:change={(e) =>
                    setField(i, "nature", e.currentTarget.value as NatureTier)}
                >
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
                <span
                  class="ev-total"
                  class:over={Object.values(slot.evs ?? {}).reduce(
                    (a, b) => a + b,
                    0,
                  ) > 508}
                >
                  {Object.values(slot.evs ?? {}).reduce((a, b) => a + b, 0)} / 508
                </span>
              </div>
              <div class="stat-grid">
                {#each STAT_KEYS as stat, si}
                  <label class="stat-label" for="ev-{i}-{stat}"
                    >{STAT_LABELS[si]}</label
                  >
                  <input
                    id="ev-{i}-{stat}"
                    class="stat-input"
                    type="number"
                    min="0"
                    max="252"
                    value={slot.evs?.[stat] ?? 0}
                    on:change={(e) => setEv(i, stat, +e.currentTarget.value)}
                  />
                {/each}
              </div>
            </div>

            <!-- IVs / DVs -->
            <div class="stat-block">
              <div class="stat-block-title">
                {dvMode ? "DVs (0–15)" : "IVs"}
              </div>
              <div class="stat-grid">
                {#each STAT_KEYS as stat, si}
                  <label class="stat-label" for="iv-{i}-{stat}"
                    >{STAT_LABELS[si]}</label
                  >
                  <input
                    id="iv-{i}-{stat}"
                    class="stat-input"
                    type="number"
                    min="0"
                    max={ivMax}
                    value={slot.ivs?.[stat] ?? ivMax}
                    on:change={(e) => setIv(i, stat, +e.currentTarget.value)}
                  />
                {/each}
              </div>
            </div>

            <!-- Moves -->
            <div class="moves-block">
              <div class="stat-block-title">Moves</div>
              {#each [0, 1, 2, 3] as mi}
                <SearchCombobox
                  items={_moveCache.get(slot.id) ?? []}
                  value={moveSearch[mi]}
                  placeholder="Move {mi + 1}"
                  on:input={(e: CustomEvent<string>) => {
                    setMove(i, mi, e.detail);
                    getLearnset(slot.id).then((moves) =>
                      _moveCache.set(slot.id, moves),
                    );
                  }}
                  on:select={(e: CustomEvent<string>) => pickMove(i, mi, e.detail)}
                />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

