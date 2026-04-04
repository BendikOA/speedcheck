<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { buildSpeedTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { SpeedEntry, GenNumber } from '$lib/speedtiers';
  import { parsePaste, resolvePaste } from '$lib/parsePaste';
  import { spriteUrl } from '$lib/sprites';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import { savedTeams } from '$lib/stores/savedTeams';
  import type { SavedTeam } from '$lib/stores/savedTeams';
  import PokemonPicker from '$lib/components/PokemonPicker.svelte';

  let genNum: GenNumber = 9;
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam:  TeamSlot[] = Array(6).fill(null);
  let pickerTarget: { side: 'you' | 'opp'; index: number } | null = null;

  $: allEntries = buildSpeedTiers(genNum);
  $: yourIds = yourTeam.flatMap(s => s ? [s.entry.id] : []);
  $: oppIds  = oppTeam.flatMap(s => s ? [s.entry.id] : []);
  // Each side only excludes its own slots — opponent can have the same Pokémon
  $: pickerExclude = pickerTarget?.side === 'opp' ? oppIds : yourIds;

  // Simple combined speed preview — all filled slots, sorted
  $: speedPreview = [
    ...yourTeam.map(s => s ? { side: 'you' as const, s } : null).filter(Boolean),
    ...oppTeam.map(s => s ? { side: 'opp' as const, s } : null).filter(Boolean),
  ]
    .map(x => ({ side: x!.side, entry: x!.s!.entry, scarf: x!.s!.scarf }))
    .map(x => ({ ...x, speed: applyModifiers(x.entry.maxSpeed, { scarf: x.scarf }) }))
    .sort((a, b) => b.speed - a.speed);

  $: canStart  = yourTeam.some(Boolean) && oppTeam.some(Boolean);
  $: canSave   = yourTeam.some(Boolean);

  function openPicker(side: 'you' | 'opp', index: number) {
    pickerTarget = { side, index };
  }

  function onPick(entry: SpeedEntry) {
    if (!pickerTarget) return;
    const { side, index } = pickerTarget;
    if (side === 'you') { yourTeam[index] = { entry, scarf: false, nature: '=' }; yourTeam = [...yourTeam]; }
    else { oppTeam[index] = { entry, scarf: false, nature: '=' }; oppTeam = [...oppTeam]; }
    pickerTarget = null;
  }

  function clearSlot(side: 'you' | 'opp', index: number) {
    if (side === 'you') { yourTeam[index] = null; yourTeam = [...yourTeam]; }
    else { oppTeam[index] = null; oppTeam = [...oppTeam]; }
  }

  function toggleScarf(side: 'you' | 'opp', index: number) {
    const team = side === 'you' ? yourTeam : oppTeam;
    const wasOn = team[index]?.scarf ?? false;
    // Clear scarf from whole team, then set this one if it wasn't already on
    team.forEach(s => { if (s) s.scarf = false; });
    if (!wasOn && team[index]) team[index]!.scarf = true;
    if (side === 'you') yourTeam = [...yourTeam];
    else oppTeam = [...oppTeam];
  }

  function changeGen(g: GenNumber) {
    genNum = g;
    yourTeam = Array(6).fill(null);
    oppTeam  = Array(6).fill(null);
  }

  function startGame() {
    teamState.set({ genNum, yourTeam: [...yourTeam], oppTeam: [...oppTeam] });
    goto('/game');
  }

  // ── Saved teams ───────────────────────────────────────────────────────────
  onMount(() => savedTeams.init());

  let saveLabel = '';
  let showSaveInput = false;

  function saveCurrentTeam() {
    const label = saveLabel.trim() || `Team ${new Date().toLocaleDateString()}`;
    const toSlot = (s: TeamSlot) => s ? { id: s.entry.id, name: s.entry.name, scarf: s.scarf } : null;
    savedTeams.save({
      label,
      genNum,
      yourTeam: yourTeam.map(toSlot),
    });
    saveLabel = '';
    showSaveInput = false;
  }

  function loadTeam(saved: SavedTeam) {
    const tiers = buildSpeedTiers(saved.genNum);
    const byId = new Map(tiers.map(e => [e.id, e]));
    genNum   = saved.genNum;
    yourTeam = saved.yourTeam.map(s => s && byId.has(s.id) ? { entry: byId.get(s.id)!, scarf: s.scarf, nature: '=' as const } : null);
    oppTeam  = Array(6).fill(null);
  }

  let renamingId: string | null = null;
  let renameValue = '';

  // ── Paste import ──────────────────────────────────────────────────────────
  let showImport = false;
  let importSide: 'you' | 'opp' = 'you';
  let importText = '';
  let importError = '';
  let importLoading = false;

  async function doImport() {
    importError = '';
    importLoading = true;
    try {
      const text = await resolvePaste(importText);
      const slots = parsePaste(text, allEntries);
      const filled = slots.filter(Boolean);
      if (!filled.length) { importError = 'No matching Pokémon found — check the paste or selected gen.'; return; }
      if (importSide === 'you') yourTeam = slots;
      else oppTeam = slots;
      showImport = false;
      importText = '';
    } catch (e: any) {
      importError = e?.message ?? 'Failed to fetch paste.';
    } finally {
      importLoading = false;
    }
  }
</script>

<svelte:head><title>Team Builder — VGC Tools</title></svelte:head>

{#if pickerTarget}
  <PokemonPicker
    entries={allEntries}
    exclude={pickerExclude}
    on:pick={e => onPick(e.detail)}
    on:close={() => pickerTarget = null}
  />
{/if}

{#if showImport}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click|self={() => { showImport = false; importError = ''; }}>
    <div class="modal">
      <div class="modal-header">
        <span class="modal-title">Import Poképaste</span>
        <button class="modal-close" on:click={() => { showImport = false; importError = ''; }}>✕</button>
      </div>

      <div class="import-side-tabs">
        <button class="side-tab" class:active={importSide === 'you'} on:click={() => importSide = 'you'}>Your Team</button>
        <button class="side-tab" class:active={importSide === 'opp'} on:click={() => importSide = 'opp'}>Opponent</button>
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
        <button class="save-confirm" on:click={doImport} disabled={importLoading || !importText.trim()}>
          {importLoading ? 'Loading…' : 'Import'}
        </button>
        <button class="save-cancel" on:click={() => { showImport = false; importError = ''; importText = ''; }}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<div class="page">
  <div class="gen-tabs">
    {#each GEN_NUMBERS as g}
      <button class="gen-tab" class:active={genNum === g} on:click={() => changeGen(g)}>Gen {g}</button>
    {/each}
  </div>

  <div class="layout">
    <!-- Teams -->
    <div class="teams-col">
      {#each [{ side: 'you' as const, team: yourTeam, label: 'Your Team' }, { side: 'opp' as const, team: oppTeam, label: 'Opponent' }] as { side, team, label }}
        <div class="team-block">
          <span class="team-label" class:you={side === 'you'} class:opp={side === 'opp'}>{label}</span>
          <div class="slots">
            {#each team as slot, i}
              <div class="slot">
                {#if slot}
                  <button class="slot-clear" on:click={() => clearSlot(side, i)}>×</button>
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="slot-filled" on:click={() => openPicker(side, i)}>
                    <img src={spriteUrl(slot.entry.name)} alt={slot.entry.name} class="slot-sprite" />
                    <span class="slot-name">{slot.entry.name}</span>
                    <span class="slot-spe">{slot.entry.baseSpe}</span>
                  </div>
                  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                  <div class="scarf-pill" class:active={slot.scarf} on:click|stopPropagation={() => toggleScarf(side, i)}>
                    Scarf
                  </div>
                {:else}
                  <button class="slot-empty" on:click={() => openPicker(side, i)}>
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
        <button class="import-btn" on:click={() => showImport = true}>Import Paste</button>
        {#if canSave}
          {#if showSaveInput}
            <div class="save-row">
              <input
                class="save-input"
                placeholder="Team name…"
                bind:value={saveLabel}
                on:keydown={e => e.key === 'Enter' && saveCurrentTeam()}
                autocomplete="off"
              />
              <button class="save-confirm" on:click={saveCurrentTeam}>Save</button>
              <button class="save-cancel" on:click={() => { showSaveInput = false; saveLabel = ''; }}>✕</button>
            </div>
          {:else}
            <button class="save-btn" on:click={() => showSaveInput = true}>Save Team</button>
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
            <div class="preview-row" class:side-you={row.side === 'you'} class:side-opp={row.side === 'opp'}>
              <span class="preview-rank">{i + 1}</span>
              <img src={spriteUrl(row.entry.name)} alt={row.entry.name} class="preview-sprite" />
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
            {#if renamingId === team.id}
              <input
                class="rename-input"
                bind:value={renameValue}
                on:keydown={e => {
                  if (e.key === 'Enter') { savedTeams.rename(team.id, renameValue); renamingId = null; }
                  if (e.key === 'Escape') renamingId = null;
                }}
                on:blur={() => { savedTeams.rename(team.id, renameValue); renamingId = null; }}
              />
            {:else}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <span class="saved-label" on:dblclick={() => { renamingId = team.id; renameValue = team.label; }}>
                {team.label}
              </span>
            {/if}
            <span class="saved-gen">Gen {team.genNum}</span>
            <div class="saved-slots">
              {#each team.yourTeam.filter(Boolean) as slot}
                <img src={spriteUrl(slot!.name)} alt={slot!.name} class="saved-sprite" title={slot!.name} />
              {/each}
            </div>
            <div class="saved-actions">
              <button class="saved-load" on:click={() => loadTeam(team)}>Load</button>
              <button class="saved-delete" on:click={() => savedTeams.remove(team.id)}>✕</button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .gen-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .gen-tabs::-webkit-scrollbar { display: none; }

  .gen-tab {
    padding: 0.45rem 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 44px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .gen-tab:active { opacity: 0.7; }
  @media (hover: hover) {
    .gen-tab:hover { color: var(--text); border-color: var(--text-muted); }
  }

  .gen-tab.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 2rem;
    align-items: start;
  }

  @media (max-width: 700px) {
    .layout { grid-template-columns: 1fr; }
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

  .team-label.you { color: #6c8ef5; }
  .team-label.opp { color: #f56c6c; }

  .slots {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.4rem;
  }

  @media (max-width: 600px) {
    .slots { grid-template-columns: repeat(3, 1fr); }
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
    transition: background 0.1s, color 0.1s;
  }

  .slot-empty:active { background: var(--surface-2); }
  @media (hover: hover) {
    .slot-empty:hover { background: var(--surface-2); color: var(--text); }
  }

  .slot-filled {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    padding: 0.25rem;
    width: 100%;
  }

  .slot-sprite {
    width: 56px;
    height: 56px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .slot-name {
    font-size: 0.65rem;
    font-weight: 500;
    text-align: center;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  .slot-spe {
    font-size: 0.6rem;
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
    padding: 0.4rem 0.5rem;
    min-height: unset;
  }

  .slot-clear:active { color: var(--danger); }
  @media (hover: hover) {
    .slot-clear:hover { color: var(--danger); }
  }

  .scarf-pill {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 0.15rem 0.4rem;
    border-radius: 100px;
    border: 1px solid var(--border);
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
    margin-bottom: 0.25rem;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
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
    transition: background 0.15s, opacity 0.15s;
  }

  @media (min-width: 600px) {
    .start-btn { width: auto; align-self: flex-start; }
  }

  .start-btn:active:not(:disabled) { background: var(--accent-hover); }
  @media (hover: hover) {
    .start-btn:hover:not(:disabled) { background: var(--accent-hover); }
  }
  .start-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Action row: Start + Save */
  .action-row {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  @media (min-width: 600px) {
    .action-row { flex-direction: row; align-items: center; flex-wrap: wrap; }
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
    transition: border-color 0.15s, color 0.15s;
    white-space: nowrap;
  }

  @media (hover: hover) { .save-btn:hover { color: var(--text); border-color: var(--text-muted); } }

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
    outline: none;
    min-height: 44px;
  }
  .save-input:focus { border-color: var(--accent); }

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

  .saved-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.85rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    flex-wrap: wrap;
  }

  .saved-label {
    font-weight: 600;
    font-size: 0.95rem;
    min-width: 6rem;
    cursor: text;
    user-select: none;
  }

  .saved-gen {
    font-size: 0.78rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .saved-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem;
    flex: 1;
  }

  .saved-sprite {
    width: 32px;
    height: 32px;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .saved-actions {
    display: flex;
    gap: 0.4rem;
    margin-left: auto;
    flex-shrink: 0;
  }

  .saved-load {
    padding: 0.4rem 0.85rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 36px;
  }

  .saved-delete {
    padding: 0.4rem 0.65rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    min-height: 36px;
  }
  @media (hover: hover) { .saved-delete:hover { color: var(--danger); border-color: var(--danger); } }

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
    transition: border-color 0.15s, color 0.15s;
  }
  @media (hover: hover) { .import-btn:hover { color: var(--text); border-color: var(--text-muted); } }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
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
    min-height: unset;
    padding: 0.25rem 0.5rem;
  }
  .modal-close:hover { color: var(--text); }

  .import-side-tabs {
    display: flex;
    gap: 0.4rem;
  }

  .side-tab {
    padding: 0.4rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    min-height: unset;
    transition: border-color 0.15s, color 0.15s;
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
  .import-textarea:focus { border-color: var(--accent); }

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
    padding: 0.2rem 0.4rem;
    background: var(--surface);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--text);
    outline: none;
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

  .preview-row:last-child { border-bottom: none; }
  .preview-row.side-you { border-left-color: #6c8ef5; }
  .preview-row.side-opp { border-left-color: #f56c6c; }

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
