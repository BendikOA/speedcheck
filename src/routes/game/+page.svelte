<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import { calcEffectiveSpeed, WEATHER_ABILITY, DEFAULT_CONDITIONS } from '$lib/speedtiers';
  import type { Conditions } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';

  // ── Team data ──────────────────────────────────────────────────────────────
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam:  TeamSlot[] = Array(6).fill(null);

  onMount(() => {
    const state = get(teamState);
    yourTeam = state.yourTeam;
    oppTeam  = state.oppTeam;
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
    } else if (set.size < 2) {
      set.add(index);
      // Carry scarf state over from team builder
      fieldScarfs.set(key, team[index]?.scarf ?? false);
    }
    yourField   = new Set(yourField);
    oppField    = new Set(oppField);
    fieldScarfs = new Map(fieldScarfs);
  }

  // ── Per-field scarf (one per side) ────────────────────────────────────────
  let fieldScarfs = new Map<string, boolean>();

  function toggleFieldScarf(key: string, side: 'you' | 'opp') {
    const wasOn = fieldScarfs.get(key) ?? false;
    // Clear scarf for entire side first
    const fieldSet = side === 'you' ? yourField : oppField;
    fieldSet.forEach(i => fieldScarfs.set(`${side}-${i}`, false));
    // Toggle this one on if it wasn't already
    if (!wasOn) fieldScarfs.set(key, true);
    fieldScarfs = new Map(fieldScarfs);
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
    { key: 'rain',      label: 'Rain',     group: 'weather' },
    { key: 'sun',       label: 'Sun',      group: 'weather' },
    { key: 'sand',      label: 'Sand',     group: 'weather' },
    { key: 'snow',      label: 'Snow',     group: 'weather' },
    { key: 'electric',  label: 'Electric Terrain', group: 'terrain' },
  ];

  // ── Speed order ────────────────────────────────────────────────────────────
  type FieldRow = {
    key: string;
    side: 'you' | 'opp';
    slot: NonNullable<TeamSlot>;
    scarf: boolean;
    effectiveSpeed: number;
    triggeredAbility: string | null;
  };

  $: fieldRows = (() => {
    const rows: FieldRow[] = [];

    yourField.forEach(i => {
      const slot = yourTeam[i];
      if (!slot) return;
      const key = `you-${i}`;
      const scarf = fieldScarfs.get(key) ?? false;
      const triggered = slot.entry.abilities.find(a => {
        const t = WEATHER_ABILITY[a];
        return t && cond[t];
      }) ?? null;
      rows.push({ key, side: 'you', slot, scarf, triggeredAbility: triggered,
        effectiveSpeed: calcEffectiveSpeed(slot.entry, 'you', scarf, cond) });
    });

    oppField.forEach(i => {
      const slot = oppTeam[i];
      if (!slot) return;
      const key = `opp-${i}`;
      const scarf = fieldScarfs.get(key) ?? false;
      const triggered = slot.entry.abilities.find(a => {
        const t = WEATHER_ABILITY[a];
        return t && cond[t];
      }) ?? null;
      rows.push({ key, side: 'opp', slot, scarf, triggeredAbility: triggered,
        effectiveSpeed: calcEffectiveSpeed(slot.entry, 'opp', scarf, cond) });
    });

    rows.sort((a, b) => cond.trickRoom
      ? a.effectiveSpeed - b.effectiveSpeed
      : b.effectiveSpeed - a.effectiveSpeed);

    return rows;
  })();

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetGame() {
    yourField   = new Set();
    oppField    = new Set();
    fieldScarfs = new Map();
    cond        = { ...DEFAULT_CONDITIONS };
    goto('/');
  }
</script>

<svelte:head><title>Game — VGC Tools</title></svelte:head>

<div class="page">

  <!-- Top bar: reset + conditions -->
  <div class="top-bar">
    <button class="reset-btn" on:click={resetGame}>← New Game</button>

    <div class="conditions-bar">
      <button
        class="cond-btn your"
        class:active={cond.yourTailwind}
        on:click={() => cond = { ...cond, yourTailwind: !cond.yourTailwind }}
      >
        Your Tailwind
      </button>

      <div class="board-cond">
        {#each CONDITION_BUTTONS as btn}
          <button
            class="cond-btn"
            class:active={cond[btn.key]}
            class:tr={btn.key === 'trickRoom'}
            on:click={() => toggleCond(btn.key, btn.group)}
          >
            {btn.label}
          </button>
        {/each}
      </div>

      <button
        class="cond-btn opp"
        class:active={cond.oppTailwind}
        on:click={() => cond = { ...cond, oppTailwind: !cond.oppTailwind }}
      >
        Opp Tailwind
      </button>
    </div>
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
            </div>

            <label class="scarf-label" class:active={row.scarf}>
              <input type="checkbox" checked={row.scarf} on:change={() => toggleFieldScarf(row.key, row.side)} />
              Scarf
            </label>

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
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
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
    flex: 1;
  }

  .board-cond {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    flex: 1;
    justify-content: center;
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

  .cond-btn:hover { color: var(--text); border-color: var(--text-muted); }

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
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .team-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .team-label {
    font-size: 1rem;
    font-weight: 700;
    width: 100px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .team-label.you { color: #6c8ef5; }
  .team-label.opp { color: #f56c6c; }

  .pick-hint {
    font-weight: 400;
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .team-slots {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tslot {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 90px;
    padding: 0.4rem 0.3rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
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

  .tslot.has-mon:not(:disabled):hover {
    border-color: var(--text-muted);
  }

  .tslot-sprite {
    width: 68px;
    height: 68px;
    object-fit: contain;
    image-rendering: pixelated;
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
    line-height: 68px;
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

  .scarf-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.45rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    user-select: none;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .scarf-label input { display: none; }

  .scarf-label.active {
    color: #f5c96c;
    border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
  }

  .row-speed {
    font-size: 1.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 4rem;
    text-align: right;
    flex-shrink: 0;
  }
</style>
