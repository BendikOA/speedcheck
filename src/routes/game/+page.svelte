<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import { calcEffectiveSpeed, WEATHER_ABILITY, DEFAULT_CONDITIONS } from '$lib/speedtiers';
  import type { Conditions } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import { getPriorityMoves, getPriorityAbilities, loadPriorityCache } from '$lib/priority';
  import type { PriorityMove, PriorityAbility } from '$lib/priority';

  let priorityReady = false;

  // ── Team data ──────────────────────────────────────────────────────────────
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam:  TeamSlot[] = Array(6).fill(null);

  onMount(async () => {
    const state = get(teamState);
    yourTeam = state.yourTeam;
    oppTeam  = state.oppTeam;
    await loadPriorityCache();
    priorityReady = true;
  });

  // ── Field selection ────────────────────────────────────────────────────────
  let yourField = new Set<number>();
  let oppField  = new Set<number>();

  function toggleField(side: 'you' | 'opp', index: number) {
    const set  = side === 'you' ? yourField : oppField;
    const team = side === 'you' ? yourTeam  : oppTeam;
    const key  = `${side}-${index}`;
    if (set.has(index)) {
      set.delete(index);
      fieldScarfs.delete(key);
      fieldParalysis.delete(key);
    } else if (set.size < 2) {
      set.add(index);
      fieldScarfs.set(key, team[index]?.scarf ?? false);
      fieldParalysis.set(key, false);
    }
    yourField      = new Set(yourField);
    oppField       = new Set(oppField);
    fieldScarfs    = new Map(fieldScarfs);
    fieldParalysis = new Map(fieldParalysis);
  }

  // ── Per-field toggles ─────────────────────────────────────────────────────
  let fieldScarfs    = new Map<string, boolean>();
  let fieldParalysis = new Map<string, boolean>();

  function toggleFieldScarf(key: string, side: 'you' | 'opp') {
    const wasOn = fieldScarfs.get(key) ?? false;
    const fieldSet = side === 'you' ? yourField : oppField;
    fieldSet.forEach(i => fieldScarfs.set(`${side}-${i}`, false));
    if (!wasOn) fieldScarfs.set(key, true);
    fieldScarfs = new Map(fieldScarfs);
  }

  function toggleFieldParalysis(key: string) {
    fieldParalysis.set(key, !(fieldParalysis.get(key) ?? false));
    fieldParalysis = new Map(fieldParalysis);
  }

  // ── Conditions ─────────────────────────────────────────────────────────────
  let cond: Conditions = { ...DEFAULT_CONDITIONS };

  type Weather = 'rain' | 'sun' | 'sand' | 'snow';
  function toggleWeather(w: Weather) {
    const was = cond[w];
    cond = { ...cond, rain: false, sun: false, sand: false, snow: false };
    cond[w] = !was;
  }

  function toggleCond(key: keyof Conditions, group?: string) {
    if (group === 'weather') toggleWeather(key as Weather);
    else cond = { ...cond, [key]: !cond[key] };
  }

  const CONDITION_BUTTONS: { key: keyof Conditions; label: string; group?: string }[] = [
    { key: 'trickRoom', label: 'Trick Room' },
    { key: 'rain',      label: 'Rain',      group: 'weather' },
    { key: 'sun',       label: 'Sun',       group: 'weather' },
    { key: 'sand',      label: 'Sand',      group: 'weather' },
    { key: 'snow',      label: 'Snow',      group: 'weather' },
    { key: 'electric',  label: 'Electric Terrain', group: 'terrain' },
    { key: 'grassy',    label: 'Grassy Terrain',   group: 'terrain' },
    { key: 'psychic',   label: 'Psychic Terrain',  group: 'terrain' },
  ];

  // ── Speed order ────────────────────────────────────────────────────────────
  type FieldRow = {
    key: string;
    side: 'you' | 'opp';
    slot: NonNullable<TeamSlot>;
    scarf: boolean;
    paralysis: boolean;
    effectiveSpeed: number;
    triggeredAbility: string | null;
    priorityMoves: PriorityMove[];
    priorityAbilities: PriorityAbility[];
  };

  $: fieldRows = (() => {
    void priorityReady; // re-run when cache loads
    const rows: FieldRow[] = [];

    const buildRow = (side: 'you' | 'opp', i: number, slot: NonNullable<TeamSlot>) => {
      const key      = `${side}-${i}`;
      const scarf    = fieldScarfs.get(key)    ?? false;
      const paralysis = fieldParalysis.get(key) ?? false;
      const triggered = slot.entry.abilities.find(a => {
        const t = WEATHER_ABILITY[a];
        return t && cond[t];
      }) ?? null;
      rows.push({
        key, side, slot, scarf, paralysis, triggeredAbility: triggered,
        effectiveSpeed: calcEffectiveSpeed(slot.entry, side, { scarf, paralysis }, cond),
        priorityMoves: getPriorityMoves(slot.entry.id),
        priorityAbilities: getPriorityAbilities(slot.entry.abilities),
      });
    };

    yourField.forEach(i => { const s = yourTeam[i]; if (s) buildRow('you', i, s); });
    oppField.forEach(i  => { const s = oppTeam[i];  if (s) buildRow('opp', i, s); });

    rows.sort((a, b) => cond.trickRoom
      ? a.effectiveSpeed - b.effectiveSpeed
      : b.effectiveSpeed - a.effectiveSpeed);

    return rows;
  })();

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetGame() {
    yourField      = new Set();
    oppField       = new Set();
    fieldScarfs    = new Map();
    fieldParalysis = new Map();
    cond           = { ...DEFAULT_CONDITIONS };
    goto('/');
  }
</script>

<svelte:head><title>Game — VGC Tools</title></svelte:head>

<div class="page">

  <!-- Top bar: reset only -->
  <div class="top-bar">
    <button class="reset-btn" on:click={resetGame}>← New Game</button>
  </div>

  <!-- Team rows -->
  <div class="teams">
    {#each [
      { side: 'you' as const, team: yourTeam, fieldSet: yourField, label: 'Your Team' },
      { side: 'opp' as const, team: oppTeam,  fieldSet: oppField,  label: 'Opponent'  }
    ] as { side, team, fieldSet, label }}
      <div class="team-row">
        <span class="team-label" class:you={side === 'you'} class:opp={side === 'opp'}>
          {label}
          <span class="pick-hint">pick 2</span>
        </span>
        <div class="team-slots">
          {#each team as slot, i}
            <button
              class="tslot"
              class:has-mon={!!slot}
              class:on-field={fieldSet.has(i)}
              class:side-you={side === 'you'}
              class:side-opp={side === 'opp'}
              disabled={!slot}
              on:click={() => toggleField(side, i)}
            >
              {#if slot}
                <img src={spriteUrl(slot.entry.name)} alt={slot.entry.name} class="tslot-sprite" />
                <span class="tslot-name">{slot.entry.name}</span>
              {:else}
                <span class="tslot-empty">—</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Conditions -->
  <div class="conditions-bar">
    <button
      class="cond-btn your"
      class:active={cond.yourTailwind}
      on:click={() => cond = { ...cond, yourTailwind: !cond.yourTailwind }}
    >Your Tailwind</button>

    <div class="board-cond">
      {#each CONDITION_BUTTONS as btn}
        <button
          class="cond-btn"
          class:active={cond[btn.key]}
          class:tr={btn.key === 'trickRoom'}
          on:click={() => toggleCond(btn.key, btn.group)}
        >{btn.label}</button>
      {/each}
    </div>

    <button
      class="cond-btn opp"
      class:active={cond.oppTailwind}
      on:click={() => cond = { ...cond, oppTailwind: !cond.oppTailwind }}
    >Opp Tailwind</button>
  </div>

  <!-- Speed order -->
  <div class="speed-section">
    <div class="speed-header">
      <span class="section-title">
        Speed Order
        {#if cond.trickRoom}<span class="tr-badge">Trick Room active</span>{/if}
      </span>
      {#if fieldRows.length === 0}
        <span class="empty-hint">Click Pokémon above to put them on the field</span>
      {/if}
    </div>

    {#if fieldRows.length > 0}
      <div class="speed-list">
        {#each fieldRows as row, i}
          <div class="speed-row" class:side-you={row.side === 'you'} class:side-opp={row.side === 'opp'}>
            <span class="pos">{i + 1}</span>
            <img src={spriteUrl(row.slot.entry.name)} alt={row.slot.entry.name} class="row-sprite" />
            <span class="row-name">{row.slot.entry.name}</span>

            <div class="row-badges">
              {#if row.triggeredAbility}
                <span class="badge ability">{row.triggeredAbility}</span>
              {/if}
              {#if (row.side === 'you' && cond.yourTailwind) || (row.side === 'opp' && cond.oppTailwind)}
                <span class="badge tailwind">Tailwind</span>
              {/if}
              {#if row.scarf}
                <span class="badge scarf-badge">Scarf</span>
              {/if}
              {#if row.paralysis}
                <span class="badge para-badge">PAR</span>
              {/if}
              {#each row.priorityMoves as pm}
                {@const active = !cond.psychic && (!pm.requiresCondition || cond[pm.requiresCondition as keyof typeof cond])}
                <span
                  class="badge priority-badge"
                  class:suppressed={!active}
                  title={cond.psychic ? 'Blocked by Psychic Terrain' : (pm.requiresCondition && !cond[pm.requiresCondition as keyof typeof cond] ? `Requires ${pm.requiresCondition} terrain` : (pm.note ?? ''))}
                >
                  {pm.name} {pm.priority > 0 ? '+' : ''}{pm.priority}
                </span>
              {/each}
              {#each row.priorityAbilities as pa}
                <span class="badge prio-ability-badge" title={pa.effect}>{pa.name}</span>
              {/each}
            </div>

            <div class="row-toggles">
              <label class="toggle-pill" class:active={row.scarf}>
                <input type="checkbox" checked={row.scarf} on:change={() => toggleFieldScarf(row.key, row.side)} />
                Scarf
              </label>
              <label class="toggle-pill para" class:active={row.paralysis}>
                <input type="checkbox" checked={row.paralysis} on:change={() => toggleFieldParalysis(row.key)} />
                PAR
              </label>
            </div>

            <span class="row-speed">{row.effectiveSpeed}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Top bar */
  .top-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .reset-btn {
    padding: 0.55rem 1.1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
  }

  .reset-btn:hover { color: var(--text); border-color: var(--text-muted); }

  /* Conditions */
  .conditions-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }

  .board-cond {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .cond-btn {
    padding: 0.55rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .cond-btn:active { opacity: 0.8; }
  @media (hover: hover) {
    .cond-btn:hover { color: var(--text); border-color: var(--text-muted); }
  }

  .cond-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  .cond-btn.tr.active {
    border-color: #c46cf5;
    color: #c46cf5;
    background: color-mix(in srgb, #c46cf5 12%, var(--surface));
  }

  .cond-btn.your.active {
    border-color: #6c8ef5;
    color: #6c8ef5;
    background: color-mix(in srgb, #6c8ef5 12%, var(--surface));
  }

  .cond-btn.opp.active {
    border-color: #f56c6c;
    color: #f56c6c;
    background: color-mix(in srgb, #f56c6c 12%, var(--surface));
  }

  /* Team rows */
  .teams {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .team-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  @media (min-width: 640px) {
    .team-row {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
  }

  .team-label {
    font-size: 0.95rem;
    font-weight: 700;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  @media (min-width: 640px) {
    .team-label {
      width: 100px;
      flex-shrink: 0;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
    }
  }

  .team-label.you { color: #6c8ef5; }
  .team-label.opp { color: #f56c6c; }

  .pick-hint {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .team-slots {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 600px) {
    .team-slots { grid-template-columns: repeat(3, 1fr); }
  }

  .tslot {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 96px;
    padding: 0.4rem 0.3rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s, background 0.15s;
  }

  .tslot:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .tslot.on-field.side-you {
    border-color: #6c8ef5;
    background: color-mix(in srgb, #6c8ef5 14%, var(--surface));
  }

  .tslot.on-field.side-opp {
    border-color: #f56c6c;
    background: color-mix(in srgb, #f56c6c 14%, var(--surface));
  }

  .tslot:active:not(:disabled) { opacity: 0.8; }
  @media (hover: hover) {
    .tslot.has-mon:not(:disabled):hover {
      border-color: var(--text-muted);
    }
  }

  .tslot-sprite {
    width: 60px;
    height: 60px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .tslot-name {
    font-size: 0.68rem;
    text-align: center;
    max-width: 86px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .tslot-empty {
    color: var(--border);
    font-size: 1.2rem;
  }

  /* Speed section */
  .speed-section {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .speed-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .section-title {
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .tr-badge {
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    background: color-mix(in srgb, #c46cf5 15%, var(--surface));
    border: 1px solid #c46cf5;
    color: #c46cf5;
    border-radius: 100px;
  }

  .empty-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .speed-list { display: flex; flex-direction: column; }

  .speed-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    border-left: 4px solid transparent;
  }

  .speed-row:last-child { border-bottom: none; }
  .speed-row.side-you { border-left-color: #6c8ef5; }
  .speed-row.side-opp { border-left-color: #f56c6c; }

  .pos {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-muted);
    width: 1.75rem;
    text-align: center;
    flex-shrink: 0;
  }

  .row-sprite {
    width: 72px;
    height: 72px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  .row-name {
    font-size: 1.1rem;
    font-weight: 600;
    flex: 1;
  }

  .row-badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.55rem;
    border-radius: 100px;
    border: 1px solid;
  }

  .badge.ability {
    color: #6cf5b8;
    border-color: #6cf5b8;
    background: color-mix(in srgb, #6cf5b8 10%, var(--surface));
  }

  .badge.tailwind {
    color: #6c8ef5;
    border-color: #6c8ef5;
    background: color-mix(in srgb, #6c8ef5 10%, var(--surface));
  }

  .badge.scarf-badge {
    color: #f5c96c;
    border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
  }

  .row-toggles {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  .toggle-pill {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    user-select: none;
    min-height: 44px;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }

  .toggle-pill input { display: none; }

  .toggle-pill.active {
    color: #f5c96c;
    border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
  }

  .toggle-pill.para.active {
    color: #f5a06c;
    border-color: #f5a06c;
    background: color-mix(in srgb, #f5a06c 10%, var(--surface));
  }

  .badge.para-badge {
    color: #f5a06c;
    border-color: #f5a06c;
    background: color-mix(in srgb, #f5a06c 10%, var(--surface));
  }

  .badge.priority-badge {
    color: #f56cc8;
    border-color: #f56cc8;
    background: color-mix(in srgb, #f56cc8 10%, var(--surface));
  }

  .badge.priority-badge.suppressed {
    color: var(--text-muted);
    border-color: var(--border);
    background: none;
    opacity: 0.45;
    text-decoration: line-through;
  }

  .badge.prio-ability-badge {
    color: #c46cf5;
    border-color: #c46cf5;
    background: color-mix(in srgb, #c46cf5 10%, var(--surface));
  }

  .toggle-pill:active { opacity: 0.75; }

  .row-speed {
    font-size: 1.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* Mobile: tighten the speed rows */
  @media (max-width: 500px) {
    .speed-row { gap: 0.5rem; padding: 0.6rem 0.75rem; }
    .row-sprite { width: 52px; height: 52px; }
    .row-name { font-size: 0.95rem; }
    .row-speed { font-size: 1.4rem; min-width: 3rem; }
    .pos { font-size: 1.1rem; width: 1.25rem; }
    .toggle-pill { padding: 0.4rem 0.55rem; font-size: 0.78rem; }

    .conditions-bar { gap: 0.35rem; }
  }
</style>
