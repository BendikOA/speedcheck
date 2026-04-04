<script lang="ts">
  import { goto } from '$app/navigation';
  import { buildSpeedTiers, applyModifiers, GEN_NUMBERS } from '$lib/speedtiers';
  import type { SpeedEntry, GenNumber } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import PokemonPicker from '$lib/components/PokemonPicker.svelte';

  let genNum: GenNumber = 9;
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam:  TeamSlot[] = Array(6).fill(null);
  let pickerTarget: { side: 'you' | 'opp'; index: number } | null = null;

  $: allEntries = buildSpeedTiers(genNum);
  $: yourIds = yourTeam.flatMap(s => s ? [s.entry.id] : []);
  $: oppIds  = oppTeam.flatMap(s => s ? [s.entry.id] : []);
  $: excludeIds = [...yourIds, ...oppIds];

  // Simple combined speed preview — all filled slots, sorted
  $: speedPreview = [
    ...yourTeam.map(s => s ? { side: 'you' as const, s } : null).filter(Boolean),
    ...oppTeam.map(s => s ? { side: 'opp' as const, s } : null).filter(Boolean),
  ]
    .map(x => ({ side: x!.side, entry: x!.s!.entry, scarf: x!.s!.scarf }))
    .map(x => ({ ...x, speed: applyModifiers(x.entry.maxSpeed, { scarf: x.scarf }) }))
    .sort((a, b) => b.speed - a.speed);

  $: canStart = yourTeam.some(Boolean) && oppTeam.some(Boolean);

  function openPicker(side: 'you' | 'opp', index: number) {
    pickerTarget = { side, index };
  }

  function onPick(entry: SpeedEntry) {
    if (!pickerTarget) return;
    const { side, index } = pickerTarget;
    if (side === 'you') { yourTeam[index] = { entry, scarf: false }; yourTeam = [...yourTeam]; }
    else { oppTeam[index] = { entry, scarf: false }; oppTeam = [...oppTeam]; }
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
</script>

<svelte:head><title>Team Builder — VGC Tools</title></svelte:head>

{#if pickerTarget}
  <PokemonPicker
    entries={allEntries}
    exclude={excludeIds}
    on:pick={e => onPick(e.detail)}
    on:close={() => pickerTarget = null}
  />
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

      <button class="start-btn" disabled={!canStart} on:click={startGame}>
        Start Game →
      </button>
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
</div>

<style>
  .gen-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .gen-tab {
    padding: 0.35rem 0.75rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .gen-tab:hover { color: var(--text); border-color: var(--text-muted); }

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
    min-height: 86px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .slot-empty {
    width: 100%;
    height: 86px;
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

  .slot-empty:hover { background: var(--surface-2); color: var(--text); }

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
    top: 2px;
    right: 4px;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    z-index: 1;
  }

  .slot-clear:hover { color: var(--danger); }

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
    align-self: flex-start;
    padding: 0.65rem 2rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }

  .start-btn:hover:not(:disabled) { background: var(--accent-hover); }
  .start-btn:disabled { opacity: 0.35; cursor: not-allowed; }

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
