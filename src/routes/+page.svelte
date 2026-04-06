<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import {
    buildSpeedTiers,
    buildAllTiers,
    applyModifiers,
    GEN_NUMBERS,
  } from "$lib/speedtiers";
  import type { SpeedEntry, GenNumber } from "$lib/speedtiers";
  import { parsePaste, resolvePaste } from "$lib/parsePaste";
  import { spriteUrl } from "$lib/sprites";
  import { teamState } from "$lib/stores/teams";
  import type { TeamSlot } from "$lib/stores/teams";
  import { savedTeams } from "$lib/stores/savedTeams";
  import type { SavedTeam } from "$lib/stores/savedTeams";
  import PokemonPicker from "$lib/components/PokemonPicker.svelte";
  import { loadSmogonOrder } from "$lib/smogonUsage";

  let genFilter: GenNumber | null = null; // null = all gens
  $: genNum = genFilter ?? (9 as GenNumber); // concrete gen for team state / saving
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam: TeamSlot[] = Array(6).fill(null);
  let pickerTarget: { side: "you" | "opp"; index: number } | null = null;
  let usageOrder: string[] = [];

  // When no gen filter, show all national dex Pokémon (gen 9 as widest set); otherwise gen-filtered
  $: allEntries = genFilter ? buildSpeedTiers(genFilter) : buildAllTiers(9);

  // Featured: usage-ordered top 100 for the selected gen (or gen 9 for "all")
  $: {
    const byId = new Map(allEntries.map((e) => [e.id, e]));
    featuredEntries = usageOrder
      .map((id) => byId.get(id))
      .filter(Boolean) as SpeedEntry[];
  }
  let featuredEntries: SpeedEntry[] = [];
  $: yourIds = yourTeam.flatMap((s) => (s ? [s.entry.id] : []));
  $: oppIds = oppTeam.flatMap((s) => (s ? [s.entry.id] : []));
  // Each side only excludes its own slots — opponent can have the same Pokémon
  $: pickerExclude = pickerTarget?.side === "opp" ? oppIds : yourIds;

  // Simple combined speed preview — all filled slots, sorted
  $: speedPreview = [
    ...yourTeam
      .map((s) => (s ? { side: "you" as const, s } : null))
      .filter(Boolean),
    ...oppTeam
      .map((s) => (s ? { side: "opp" as const, s } : null))
      .filter(Boolean),
  ]
    .map((x) => ({ side: x!.side, entry: x!.s!.entry, scarf: x!.s!.scarf }))
    .map((x) => ({
      ...x,
      speed: applyModifiers(x.entry.maxSpeed, { scarf: x.scarf }),
    }))
    .sort((a, b) => b.speed - a.speed);

  $: canStart = yourTeam.some(Boolean) && oppTeam.some(Boolean);
  $: canSave = yourTeam.some(Boolean);

  function openPicker(side: "you" | "opp", index: number) {
    pickerTarget = { side, index };
  }

  function onPick(entry: SpeedEntry) {
    if (!pickerTarget) return;
    const { side, index } = pickerTarget;
    if (side === "you") {
      yourTeam[index] = { entry, scarf: false, nature: "=" };
      yourTeam = [...yourTeam];
    } else {
      oppTeam[index] = { entry, scarf: false, nature: "=" };
      oppTeam = [...oppTeam];
    }
    pickerTarget = null;
  }

  function clearSlot(side: "you" | "opp", index: number) {
    if (side === "you") {
      yourTeam[index] = null;
      yourTeam = [...yourTeam];
    } else {
      oppTeam[index] = null;
      oppTeam = [...oppTeam];
    }
  }

  function toggleScarf(side: "you" | "opp", index: number) {
    const team = side === "you" ? yourTeam : oppTeam;
    const wasOn = team[index]?.scarf ?? false;
    // Clear scarf from whole team, then set this one if it wasn't already on
    team.forEach((s) => {
      if (s) s.scarf = false;
    });
    if (!wasOn && team[index]) team[index]!.scarf = true;
    if (side === "you") yourTeam = [...yourTeam];
    else oppTeam = [...oppTeam];
  }

  async function changeGen(g: GenNumber | null) {
    genFilter = g;
    yourTeam = Array(6).fill(null);
    oppTeam = Array(6).fill(null);
    try {
      usageOrder = await loadSmogonOrder(g ?? 9);
    } catch {
      usageOrder = [];
    }
  }

  function startGame() {
    teamState.set({ genNum, yourTeam: [...yourTeam], oppTeam: [...oppTeam] });
    goto("/game");
  }

  // ── Saved teams ───────────────────────────────────────────────────────────
  onMount(async () => {
    savedTeams.init();
    try {
      usageOrder = await loadSmogonOrder(9);
    } catch {
      /* fallback to speed-sorted */
    }
  });

  let saveLabel = "";
  let showSaveInput = false;

  function saveCurrentTeam() {
    const label = saveLabel.trim() || `Team ${new Date().toLocaleDateString()}`;
    const toSlot = (s: TeamSlot) =>
      s
        ? {
            id: s.entry.id,
            name: s.entry.name,
            scarf: s.scarf,
            nature: s.nature,
            natureLocked: s.natureLocked ?? false,
            item: s.item,
            ability: s.ability,
            teraType: s.teraType,
            level: s.level,
            evs: s.evs,
            ivs: s.ivs,
            moves: s.moves,
            nickname: s.nickname,
          }
        : null;
    savedTeams.save({ label, genNum, yourTeam: yourTeam.map(toSlot) });
    saveLabel = "";
    showSaveInput = false;
  }

  function loadTeam(saved: SavedTeam) {
    // Use full national dex so legality filtering can't drop saved Pokémon
    const tiers = buildAllTiers(9);
    const byId = new Map(tiers.map((e) => [e.id, e]));
    // Do not change genFilter — keep the pre-game page's current gen selection
    yourTeam = saved.yourTeam.map((s) =>
      s && byId.has(s.id)
        ? {
            entry: byId.get(s.id)!,
            scarf: s.scarf,
            nature: s.nature ?? "=",
            natureLocked: s.natureLocked ?? false,
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
    oppTeam = Array(6).fill(null);
  }

  let renamingId: string | null = null;
  let renameValue = "";

  // ── Paste import ──────────────────────────────────────────────────────────
  let showImport = false;
  let importSide: "you" | "opp" = "you";
  let importText = "";
  let importError = "";
  let importLoading = false;

  async function doImport() {
    importError = "";
    importLoading = true;
    try {
      const text = await resolvePaste(importText);
      const slots = parsePaste(text, buildAllTiers(9));
      const filled = slots.filter(Boolean);
      if (!filled.length) {
        importError =
          "No matching Pokémon found — check the paste.";
        return;
      }
      if (importSide === "you") yourTeam = slots;
      else oppTeam = slots;
      showImport = false;
      importText = "";
    } catch (e: any) {
      importError = e?.message ?? "Failed to fetch paste.";
    } finally {
      importLoading = false;
    }
  }
</script>

<svelte:head><title>Pokémon Select — Turnadus</title></svelte:head>
<svelte:window on:keydown={e => { if (e.key === 'Escape') { showImport = false; importError = ''; } }} />

{#if pickerTarget}
  <PokemonPicker
    entries={allEntries}
    featured={featuredEntries}
    exclude={pickerExclude}
    on:pick={(e) => onPick(e.detail)}
    on:close={() => (pickerTarget = null)}
  />
{/if}

{#if showImport}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="modal-backdrop"
    on:click|self={() => {
      showImport = false;
      importError = "";
    }}
  >
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Import Poképaste</span>
        <button
          class="modal-close"
          on:click={() => {
            showImport = false;
            importError = "";
          }}>✕</button
        >
      </div>

      <div class="import-side-tabs">
        <button
          class="side-tab"
          class:active={importSide === "you"}
          on:click={() => (importSide = "you")}>Your Team</button
        >
        <button
          class="side-tab"
          class:active={importSide === "opp"}
          on:click={() => (importSide = "opp")}>Opponent</button
        >
      </div>

      <textarea
        class="import-textarea"
        placeholder="Paste a pokepast.es URL or raw Showdown export here…"
        bind:value={importText}
        rows="10"
        autocomplete="off"
        spellcheck="false"
      ></textarea>

      {#if importError}
        <p class="import-error">{importError}</p>
      {/if}

      <div class="modal-actions">
        <button
          class="save-confirm"
          on:click={doImport}
          disabled={importLoading || !importText.trim()}
        >
          {importLoading ? "Loading…" : "Import"}
        </button>
        <button
          class="save-cancel"
          on:click={() => {
            showImport = false;
            importError = "";
            importText = "";
          }}>Cancel</button
        >
      </div>
    </div>
  </div>
{/if}

<div class="page">
  <div class="page-header">
    <span class="page-title">Pokémon Select</span>
    <div class="select-wrap">
      <select
        class="gen-select"
        value={genFilter ?? ""}
        on:change={(e) => {
          const v = e.currentTarget.value;
          changeGen(v === "" ? null : (+v as GenNumber));
        }}
      >
        <option value="">All Gens</option>
        {#each GEN_NUMBERS as g}
          <option value={g}>Gen {g}</option>
        {/each}
      </select>
      <svg class="select-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </div>

  <div class="layout">
    <!-- Teams -->
    <div class="teams-col">
      {#each [{ side: "you" as const, team: yourTeam, label: "Your Team" }, { side: "opp" as const, team: oppTeam, label: "Opponent" }] as { side, team, label }}
        <div class="team-block">
          <span
            class="team-label"
            class:you={side === "you"}
            class:opp={side === "opp"}>{label}</span
          >
          <div class="slots">
            {#each team as slot, i}
              <div class="slot">
                {#if slot}
                  <button class="slot-clear" on:click={() => clearSlot(side, i)}
                    >×</button
                  >
                  <button class="slot-filled" on:click={() => openPicker(side, i)}
                    aria-label="Change {slot.entry.name}">
                    <img
                      src={spriteUrl(slot.entry.name)}
                      alt=""
                      class="slot-sprite"
                    />
                    <span class="slot-name">{slot.entry.name}</span>
                    <span class="slot-spe">{slot.entry.baseSpe}</span>
                  </button>
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div
                    class="scarf-pill"
                    class:active={slot.scarf}
                    on:click|stopPropagation={() => toggleScarf(side, i)}
                  >
                    Scarf
                  </div>
                {:else}
                  <button
                    class="slot-empty"
                    on:click={() => openPicker(side, i)}
                  >
                    <span class="plus">+</span>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}

      <div class="action-row">
        <button class="start-btn" disabled={!canStart} on:click={startGame}>
          Start Game →
        </button>
        <button class="import-btn" on:click={() => (showImport = true)}
          >Import Paste</button
        >
        {#if canSave}
          {#if showSaveInput}
            <div class="save-row">
              <input
                id="save-label"
                name="save-label"
                class="save-input"
                placeholder="Team name…"
                bind:value={saveLabel}
                on:keydown={(e) => e.key === "Enter" && saveCurrentTeam()}
                autocomplete="off"
              />
              <button class="save-confirm" on:click={saveCurrentTeam}
                >Save</button
              >
              <button
                class="save-cancel"
                on:click={() => {
                  showSaveInput = false;
                  saveLabel = "";
                }}>✕</button
              >
            </div>
          {:else}
            <button class="save-btn" on:click={() => (showSaveInput = true)}
              >Save Team</button
            >
          {/if}
        {/if}
      </div>
    </div>

    <!-- Speed preview sidebar -->
    {#if speedPreview.length > 0}
      <div class="preview-col">
        <span class="preview-title">Speed Order</span>
        <div class="preview-list">
          {#each speedPreview as row, i}
            <div
              class="preview-row"
              class:side-you={row.side === "you"}
              class:side-opp={row.side === "opp"}
            >
              <span class="preview-rank">{i + 1}</span>
              <img
                src={spriteUrl(row.entry.name)}
                alt={row.entry.name}
                class="preview-sprite"
              />
              <span class="preview-name">{row.entry.name}</span>
              <span class="preview-speed">{row.speed}</span>
            </div>
          {/each}
        </div>
        <p class="preview-note">Modifiers available in game view</p>
      </div>
    {/if}
  </div>

  <!-- Saved teams -->
  {#if $savedTeams.length > 0}
    <div class="saved-section">
      <span class="saved-title">Saved Teams</span>
      <div class="saved-list">
        {#each $savedTeams as team (team.id)}
          <div class="saved-row">
            <!-- Top: label + gen + sprites -->
            <div class="saved-top">
              <div class="saved-top-meta">
                {#if renamingId === team.id}
                  <input
                    name="rename-team"
                    class="rename-input"
                    bind:value={renameValue}
                    on:keydown={(e) => {
                      if (e.key === "Enter") {
                        savedTeams.rename(team.id, renameValue);
                        renamingId = null;
                      }
                      if (e.key === "Escape") renamingId = null;
                    }}
                    on:blur={() => {
                      savedTeams.rename(team.id, renameValue);
                      renamingId = null;
                    }}
                  />
                {:else}
                  <button
                    class="saved-label"
                    title="Click to rename"
                    on:click={() => { renamingId = team.id; renameValue = team.label; }}
                  >
                    {team.label}
                    <svg class="rename-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                {/if}
                <span class="saved-gen">Gen {team.genNum}</span>
              </div>
              <div class="saved-slots">
                {#each team.yourTeam.filter(Boolean) as slot}
                  <img
                    src={spriteUrl(slot!.name)}
                    alt={slot!.name}
                    class="saved-sprite"
                    title={slot!.name}
                  />
                {/each}
              </div>
            </div>

            <!-- Bottom: record + actions on same row -->
            <div class="saved-bottom">
              <div class="saved-record">
                {#if team.wins + team.losses > 0}
                  <button
                    class="record-reset"
                    aria-label="Reset record"
                    title="Reset win/loss record"
                    on:click={() => savedTeams.resetRecord(team.id)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                      /><path d="M3 3v5h5" />
                    </svg>
                  </button>
                {/if}
                <span class="record-stat">
                  {team.wins}W {team.losses}L
                  {#if team.wins + team.losses > 0}
                    <span class="record-pct"
                      >{Math.round(
                        (team.wins / (team.wins + team.losses)) * 100,
                      )}%</span
                    >
                  {/if}
                </span>
                <button
                  class="record-btn win-btn"
                  on:click={() => savedTeams.recordResult(team.id, "win")}
                  >W</button
                >
                <button
                  class="record-btn loss-btn"
                  on:click={() => savedTeams.recordResult(team.id, "loss")}
                  >L</button
                >
              </div>
              <div class="saved-actions">
                <button class="saved-load" on:click={() => loadTeam(team)}
                  >Load</button
                >
                <a
                  class="saved-edit"
                  href="/teams/{team.id}/edit"
                  aria-label="Edit team"
                  title="Edit team"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    /><path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                </a>
                <button
                  class="saved-delete"
                  aria-label="Delete team"
                  title="Delete team"
                  on:click={() => savedTeams.remove(team.id)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" /><path
                      d="M19 6l-1 14H6L5 6"
                    /><path d="M10 11v6" /><path d="M14 11v6" /><path
                      d="M9 6V4h6v2"
                    />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
  }

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
    cursor: pointer;
    min-height: 44px;
    transition: border-color 0.15s;
  }
  .gen-select:focus { border-color: var(--accent); }

  .layout {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 2rem;
    align-items: start;
  }

  @media (max-width: 700px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .teams-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .team-block {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .team-label {
    font-weight: 700;
    font-size: 0.9rem;
  }

  .team-label.you {
    color: #6c8ef5;
  }
  .team-label.opp {
    color: #f56c6c;
  }

  .slots {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.4rem;
  }

  @media (max-width: 600px) {
    .slots {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .slot {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-height: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .slot-empty {
    width: 100%;
    min-height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius);
    font-size: 1.5rem;
    transition:
      background 0.1s,
      color 0.1s;
  }

  .slot-empty:active {
    background: var(--surface-2);
  }
  @media (hover: hover) {
    .slot-empty:hover {
      background: var(--surface-2);
      color: var(--text);
    }
  }

  .slot-filled {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    padding: 0.25rem;
    width: 100%;
    background: none;
    border: none;
    color: inherit;
  }

  .slot-sprite {
    width: 56px;
    height: 56px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .slot-name {
    font-size: 0.72rem;
    font-weight: 500;
    text-align: center;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  .slot-spe {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .slot-clear {
    position: absolute;
    top: 0;
    right: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    z-index: 1;
    /* Enlarge touch area */
    padding: 0.5rem;
    min-height: 44px;
    min-width: 44px;
  }

  .slot-clear:active {
    color: var(--danger);
  }
  @media (hover: hover) {
    .slot-clear:hover {
      color: var(--danger);
    }
  }

  .scarf-pill {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 0.2rem 0.5rem;
    border-radius: 100px;
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    margin-bottom: 0.25rem;
    transition:
      color 0.15s,
      border-color 0.15s,
      background 0.15s;
  }

  .scarf-pill.active {
    color: #f5c96c;
    border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 12%, var(--surface));
  }

  .start-btn {
    width: 100%;
    padding: 0.85rem 2rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 52px;
    transition:
      background 0.15s,
      opacity 0.15s;
  }

  @media (min-width: 600px) {
    .start-btn {
      width: auto;
      align-self: flex-start;
    }
  }

  .start-btn:active:not(:disabled) {
    background: var(--accent-hover);
  }
  @media (hover: hover) {
    .start-btn:hover:not(:disabled) {
      background: var(--accent-hover);
    }
  }
  .start-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* Action row: Start + Save */
  .action-row {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  @media (min-width: 600px) {
    .action-row {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
    }
  }

  .save-btn {
    padding: 0.75rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 0.95rem;
    cursor: pointer;
    min-height: 52px;
    transition:
      border-color 0.15s,
      color 0.15s;
    white-space: nowrap;
  }

  @media (hover: hover) {
    .save-btn:hover {
      color: var(--text);
      border-color: var(--text-muted);
    }
  }

  .save-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex: 1;
  }

  .save-input {
    flex: 1;
    padding: 0.65rem 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 16px;
    min-height: 44px;
  }
  .save-input:focus-visible {
    border-color: var(--accent);
  }

  .save-confirm {
    padding: 0.65rem 1rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
    white-space: nowrap;
  }

  .save-cancel {
    padding: 0.65rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    min-height: 44px;
  }

  /* Saved teams list */
  .saved-section {
    margin-top: 2rem;
    border-top: 1px solid var(--border);
    padding-top: 1.25rem;
  }

  .saved-title {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .saved-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Mobile: stacked layout */
  .saved-row {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.75rem 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .saved-top {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .saved-top-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
  }

  .saved-label {
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    user-select: none;
    background: none;
    border: none;
    color: var(--text);
    padding: 0;
    min-height: unset;
    gap: 0.35rem;
    justify-content: flex-start;
  }
  .rename-icon {
    opacity: 0;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: opacity 0.15s;
  }
  .saved-label:hover .rename-icon { opacity: 1; }

  .saved-gen {
    font-size: 0.78rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .saved-slots {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
    flex-shrink: 1;
    min-width: 0;
  }

  .saved-sprite {
    width: min(40px, calc((100vw - 14rem) / 6));
    height: min(40px, calc((100vw - 14rem) / 6));
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 1;
  }

  .saved-bottom {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .saved-record {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex: 1;
  }

  /* Desktop: restore original single-row layout */
  @media (min-width: 600px) {
    .saved-row {
      flex-direction: row;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.6rem 0.85rem;
    }
    .saved-top {
      display: contents; /* dissolve — children flow into parent row */
    }
    .saved-top-meta {
      flex-direction: row;
      align-items: center;
      flex: unset;
      gap: 0.75rem;
    }
    .saved-label {
      min-width: 6rem;
    }
    .saved-slots {
      display: flex;
      flex-wrap: wrap;
      grid-template-columns: unset;
      flex: 1;
      gap: 0.1rem;
    }
    .saved-sprite {
      width: 32px;
      height: 32px;
    }
    .saved-bottom {
      flex: unset;
      gap: 0.5rem;
    }
    .saved-record {
      flex: unset;
    }
    .saved-actions {
      margin-left: 0;
    }
  }

  .record-btn {
    padding: 0 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    transition:
      background 0.1s,
      color 0.1s,
      border-color 0.1s;
  }

  .win-btn {
    color: #4caf7d;
  }
  .loss-btn {
    color: #f56c6c;
  }
  .win-btn:hover {
    background: color-mix(in srgb, #4caf7d 15%, var(--surface));
    border-color: #4caf7d;
  }
  .loss-btn:hover {
    background: color-mix(in srgb, #f56c6c 15%, var(--surface));
    border-color: #f56c6c;
  }

  .record-stat {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    margin-right: 0.4rem;
    white-space: nowrap;
  }

  .record-pct {
    font-weight: 600;
    color: var(--text);
    margin-left: 0.2rem;
  }

  .record-reset {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    border-radius: var(--radius-sm);
    opacity: 0.5;
    transition:
      opacity 0.15s,
      color 0.15s;
  }
  .record-reset:hover {
    opacity: 1;
    color: var(--text);
  }


  .saved-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .saved-load {
    padding: 0 1rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 44px;
  }

  .saved-edit,
  .saved-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    transition:
      color 0.15s,
      border-color 0.15s;
  }
  @media (hover: hover) {
    .saved-edit:hover {
      color: var(--text);
      border-color: var(--text-muted);
    }
    .saved-delete:hover {
      color: var(--danger);
      border-color: var(--danger);
    }
  }

  /* Import button */
  .import-btn {
    padding: 0.75rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-size: 0.95rem;
    cursor: pointer;
    min-height: 52px;
    white-space: nowrap;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  @media (hover: hover) {
    .import-btn:hover {
      color: var(--text);
      border-color: var(--text-muted);
    }
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-title {
    font-weight: 700;
    font-size: 1rem;
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    padding: 0 0.75rem;
  }
  .modal-close:hover {
    color: var(--text);
  }

  .import-side-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .side-tab {
    padding: 0 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    min-height: 44px;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .side-tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .import-textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 0.82rem;
    font-family: monospace;
    resize: vertical;
    outline: none;
    line-height: 1.5;
  }
  .import-textarea:focus-visible {
    border-color: var(--accent);
  }

  .import-error {
    font-size: 0.85rem;
    color: var(--danger);
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .rename-input {
    font-size: 0.95rem;
    font-weight: 600;
    padding: 0 0.4rem;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--text);
    min-height: 44px;
    min-width: 8rem;
  }

  /* Speed preview sidebar */
  .preview-col {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .preview-title {
    display: block;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }

  .preview-list {
    display: flex;
    flex-direction: column;
  }

  .preview-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.6rem;
    border-bottom: 1px solid var(--border);
    border-left: 3px solid transparent;
    font-size: 0.82rem;
  }

  .preview-row:last-child {
    border-bottom: none;
  }
  .preview-row.side-you {
    border-left-color: #6c8ef5;
  }
  .preview-row.side-opp {
    border-left-color: #f56c6c;
  }

  .preview-rank {
    color: var(--text-muted);
    font-size: 0.75rem;
    width: 1rem;
    text-align: center;
    flex-shrink: 0;
  }

  .preview-sprite {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .preview-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-speed {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-size: 0.82rem;
    flex-shrink: 0;
  }

  .preview-note {
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    color: var(--text-muted);
    border-top: 1px solid var(--border);
  }
</style>
