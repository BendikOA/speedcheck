<script lang="ts">
  import './styles.css';
  import { slide } from 'svelte/transition';
  import { Generations } from '@smogon/calc';
  import type { TeamSlot } from '$lib/stores/teams';
  import type { Conditions } from '$lib/speedtiers';
  import type { UsageMoves, UsageMovesFull } from '$lib/smogonUsage';
  import { runCalc, getMovesForSlot, mergeSet, getCalcStats } from '$lib/damageCalc';
  import type { CalcFieldMods } from '$lib/damageCalc';
  import type { SetsByPokemon } from '$lib/smogonUsage';
  import { spriteUrl } from '$lib/sprites';
  import { displayName as shortName } from '$lib/displayName';

  export let yourTeam: TeamSlot[];
  export let oppTeam: TeamSlot[];
  export let cond: Conditions;
  export let smogonMoves: UsageMoves = {};
  export let champMovesFull: UsageMovesFull = {};
  export let setsData: SetsByPokemon = {};
  export let fieldMega: Map<string, number> = new Map();
  export let onclose: () => void = () => {};

  const GEN9 = Generations.get(9);

  const NATURES = [
    'Hardy','Lonely','Brave','Adamant','Naughty',
    'Bold','Docile','Relaxed','Impish','Lax',
    'Timid','Hasty','Serious','Jolly','Naive',
    'Modest','Mild','Quiet','Bashful','Rash',
    'Calm','Gentle','Sassy','Careful','Quirky',
  ] as const;

  const NATURE_MODS: Record<string, { plus?: string; minus?: string }> = {
    Hardy:{}, Docile:{}, Serious:{}, Bashful:{}, Quirky:{},
    Lonely:{plus:'Atk',minus:'Def'}, Brave:{plus:'Atk',minus:'Spe'},
    Adamant:{plus:'Atk',minus:'SpA'}, Naughty:{plus:'Atk',minus:'SpD'},
    Bold:{plus:'Def',minus:'Atk'}, Relaxed:{plus:'Def',minus:'Spe'},
    Impish:{plus:'Def',minus:'SpA'}, Lax:{plus:'Def',minus:'SpD'},
    Timid:{plus:'Spe',minus:'Atk'}, Hasty:{plus:'Spe',minus:'Def'},
    Jolly:{plus:'Spe',minus:'SpA'}, Naive:{plus:'Spe',minus:'SpD'},
    Modest:{plus:'SpA',minus:'Atk'}, Mild:{plus:'SpA',minus:'Def'},
    Quiet:{plus:'SpA',minus:'Spe'}, Rash:{plus:'SpA',minus:'SpD'},
    Calm:{plus:'SpD',minus:'Atk'}, Gentle:{plus:'SpD',minus:'Def'},
    Sassy:{plus:'SpD',minus:'Spe'}, Careful:{plus:'SpD',minus:'SpA'},
  };
  function natureLabel(n: string): string {
    const m = NATURE_MODS[n];
    return m?.plus ? `${n} (+${m.plus}/-${m.minus})` : n;
  }

  const TYPE_COLORS: Record<string, string> = {
    Normal:'#9199a1', Fire:'#ff9c54', Water:'#4d90d5', Electric:'#f3d23b',
    Grass:'#63bc5a', Ice:'#74cec0', Fighting:'#ce416b', Poison:'#ab6ac8',
    Ground:'#d97845', Flying:'#8fa8dd', Psychic:'#f97176', Bug:'#91c12f',
    Rock:'#c9bb8a', Ghost:'#5269ad', Dragon:'#0a6dc4', Dark:'#595761',
    Steel:'#5a8ea2', Fairy:'#ec8fe6',
  };

  function boostSymbol(val: number): string {
    if (val === 0) return '0';
    const sym = val > 0 ? '▲' : '▽';
    const n = Math.abs(val);
    return n <= 3 ? sym.repeat(n) : `${sym}${n}`;
  }

  const EV_KEYS = ['hp','atk','def','spa','spd','spe'] as const;
  type EvKey = typeof EV_KEYS[number];
  const EV_LABELS: Record<EvKey, string> = { hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe' };

  type EvSpread = Record<EvKey, number>;

  function zeroEvs(): EvSpread { return { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 }; }
  function copyEvs(evs: Partial<EvSpread> | undefined): EvSpread {
    if (!evs) return zeroEvs();
    const raw = { hp: evs.hp??0, atk: evs.atk??0, def: evs.def??0, spa: evs.spa??0, spd: evs.spd??0, spe: evs.spe??0 };
    // Normalize to Champions scale (0-32): if any value > 32 it's traditional (0-252) → divide by 8
    const maxVal = Math.max(...Object.values(raw));
    if (maxVal > 32) {
      return { hp: Math.min(32, Math.round(raw.hp/8)), atk: Math.min(32, Math.round(raw.atk/8)),
               def: Math.min(32, Math.round(raw.def/8)), spa: Math.min(32, Math.round(raw.spa/8)),
               spd: Math.min(32, Math.round(raw.spd/8)), spe: Math.min(32, Math.round(raw.spe/8)) };
    }
    return raw;
  }
  function entryAbilityNames(slot: NonNullable<TeamSlot>): string[] {
    return slot.entry.abilities
      .map(id => GEN9.abilities.get(id as any)?.name as string | undefined)
      .filter((n): n is string => !!n);
  }
  function abilityOptions(slot: NonNullable<TeamSlot> | null, megaIdx = 0): string[] {
    if (!slot) return [];
    const megaAbility = megaIdx > 0 ? slot.entry.megaForms[megaIdx - 1]?.ability : undefined;
    if (megaAbility) {
      // Mega form has a fixed ability — only offer that one
      return [megaAbility];
    }
    const fromEntry = entryAbilityNames(slot);
    if (slot.ability && !fromEntry.includes(slot.ability)) return [slot.ability, ...fromEntry];
    return fromEntry;
  }

  // Selection: one index from your team, one from opp team
  let selYou: number | null = null;
  let selOpp: number | null = null;

  // Selected set index per side (reset when pokemon changes)
  let yourSetIdx = 0;
  let oppSetIdx  = 0;
  $: { selYou; yourSetIdx = 0; }
  $: { selOpp; oppSetIdx  = 0; }

  $: atkSlot = selYou !== null ? yourTeam[selYou] : null;
  $: defSlot = selOpp !== null ? oppTeam[selOpp]  : null;

  $: atkMegaIdx = selYou !== null ? (fieldMega.get(`you-${selYou}`) ?? 0) : 0;
  $: defMegaIdx = selOpp !== null ? (fieldMega.get(`opp-${selOpp}`) ?? 0) : 0;

  $: atkSets = atkSlot ? (setsData[atkSlot.entry.id] ?? []) : [];
  $: defSets = defSlot ? (setsData[defSlot.entry.id] ?? []) : [];

  // Merge set data into slot for fields not provided by the import
  $: atkEffective = (atkSlot && atkSets[yourSetIdx]) ? mergeSet(atkSlot, atkSets[yourSetIdx]) : atkSlot;
  $: defEffective = (defSlot && defSets[oppSetIdx])  ? mergeSet(defSlot, defSets[oppSetIdx])  : defSlot;

  // Per-side editable override state (reset when effective slot changes)
  let atkNature = 'Serious';
  let atkEvs: EvSpread = zeroEvs();
  let atkAbility = '';
  let defNature = 'Serious';
  let defEvs: EvSpread = zeroEvs();
  let defAbility = '';

  $: {
    const s = atkEffective;
    atkNature  = s?.natureName ?? 'Serious';
    atkEvs     = copyEvs(s?.evs);
    const opts = abilityOptions(s, atkMegaIdx);
    atkAbility = opts[0] ?? s?.ability ?? '';
  }
  $: {
    const s = defEffective;
    defNature  = s?.natureName ?? 'Serious';
    defEvs     = copyEvs(s?.evs);
    const opts = abilityOptions(s, defMegaIdx);
    defAbility = opts[0] ?? s?.ability ?? '';
  }

  $: atkAbilityOpts = abilityOptions(atkEffective, atkMegaIdx);
  $: defAbilityOpts = abilityOptions(defEffective, defMegaIdx);

  // Final slots used for calc (with user overrides applied, EVs in 0-32 Champions scale)
  $: atkCalcSlot = atkEffective
    ? { ...atkEffective, natureName: atkNature, evs: atkEvs, ability: atkAbility || undefined }
    : null;
  $: defCalcSlot = defEffective
    ? { ...defEffective, natureName: defNature, evs: defEvs, ability: defAbility || undefined }
    : null;

  // Computed final stats (updates live as EVs/nature change)
  $: atkStats = atkCalcSlot ? getCalcStats(atkCalcSlot) : null;
  $: defStats = defCalcSlot ? getCalcStats(defCalcSlot) : null;

  $: atkMoves = atkEffective ? getMovesForSlot(atkEffective, smogonMoves, champMovesFull) : [];
  $: defMoves = defEffective ? getMovesForSlot(defEffective, smogonMoves, champMovesFull) : [];

  $: atkResults = (atkCalcSlot && defCalcSlot && atkMoves.length)
    ? runCalc(atkCalcSlot, 'you', defCalcSlot, atkMoves, cond, atkMods)
    : [];
  $: defResults = (defCalcSlot && atkCalcSlot && defMoves.length)
    ? runCalc(defCalcSlot, 'opp', atkCalcSlot, defMoves, cond, defMods)
    : [];

  $: hasImportedAtk = !!(atkSlot?.evs && Object.values(atkSlot.evs).some(v => v > 0));
  $: hasImportedDef = !!(defSlot?.evs && Object.values(defSlot.evs).some(v => v > 0));

  // ── Stat boosts ────────────────────────────────────────────────
  type Boosts = { atk: number; def: number; spa: number; spd: number };
  const BOOST_KEYS = ['atk','def','spa','spd'] as const;
  type BoostKey = typeof BOOST_KEYS[number];
  const BOOST_LABELS: Record<BoostKey, string> = { atk:'Atk', def:'Def', spa:'SpA', spd:'SpD' };

  function zeroBoosts(): Boosts { return { atk:0, def:0, spa:0, spd:0 }; }

  let atkBoosts: Boosts = zeroBoosts();
  let defBoosts: Boosts = zeroBoosts();
  $: { atkEffective; atkBoosts = zeroBoosts(); }
  $: { defEffective; defBoosts = zeroBoosts(); }

  function adjustBoost(side: 'atk' | 'def', stat: BoostKey, delta: number) {
    const cur = side === 'atk' ? atkBoosts : defBoosts;
    const next = { ...cur, [stat]: Math.max(-6, Math.min(6, cur[stat] + delta)) };
    if (side === 'atk') atkBoosts = next; else defBoosts = next;
  }

  // ── Accordion open state ───────────────────────────────────────
  let atkOpen = false;
  let defOpen = false;

  // ── Field effects ───────────────────────────────────────────────
  // Per-side: HH = outgoing boost; Ref/LS/AV/FG = screens protecting this side
  let atkHH = false, atkRef = false, atkLS = false, atkAV = false, atkFG = false;
  let defHH = false, defRef = false, defLS = false, defAV = false, defFG = false;
  $: { atkSlot; defSlot;
    atkHH = atkRef = atkLS = atkAV = atkFG = false;
    defHH = defRef = defLS = defAV = defFG = false;
  }

  function toggleField(side: 'atk' | 'def', f: 'hh'|'ref'|'ls'|'av'|'fg') {
    if (side === 'atk') {
      if (f==='hh') atkHH=!atkHH; else if (f==='ref') atkRef=!atkRef;
      else if (f==='ls') atkLS=!atkLS; else if (f==='av') atkAV=!atkAV;
      else atkFG=!atkFG;
    } else {
      if (f==='hh') defHH=!defHH; else if (f==='ref') defRef=!defRef;
      else if (f==='ls') defLS=!defLS; else if (f==='av') defAV=!defAV;
      else defFG=!defFG;
    }
  }

  // ── Mods objects passed to runCalc ─────────────────────────────
  $: atkMods = {
    helpingHand: atkHH, reflect: defRef, lightScreen: defLS,
    auroraVeil: defAV, friendGuard: defFG,
    attackerBoosts: atkBoosts, defenderBoosts: defBoosts,
  } satisfies CalcFieldMods;
  $: defMods = {
    helpingHand: defHH, reflect: atkRef, lightScreen: atkLS,
    auroraVeil: atkAV, friendGuard: atkFG,
    attackerBoosts: defBoosts, defenderBoosts: atkBoosts,
  } satisfies CalcFieldMods;

  function evTotal(evs: EvSpread): number {
    return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
  }
  function setEv(side: 'atk' | 'def', key: EvKey, raw: string) {
    const v = Math.min(32, Math.max(0, parseInt(raw) || 0));
    if (side === 'atk') atkEvs = { ...atkEvs, [key]: v };
    else                defEvs = { ...defEvs, [key]: v };
  }

  function koLabel(nHko: number, guaranteed: boolean): string {
    if (nHko === 1) return guaranteed ? 'OHKO' : 'pOHKO';
    return guaranteed ? `${nHko}HKO` : `p${nHko}HKO`;
  }

  function koClass(nHko: number): string {
    if (nHko === 1) return 'ko-1';
    if (nHko === 2) return 'ko-2';
    if (nHko === 3) return 'ko-3';
    if (nHko === 4) return 'ko-4';
    return 'ko-many';
  }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="calc-overlay" on:click|self={() => onclose()}>
  <div class="calc-panel">

    <!-- Header -->
    <div class="calc-header">
      <span class="calc-title">⚔ Damage Calculator</span>
      <button class="calc-close" on:click={() => onclose()} aria-label="Close">✕</button>
    </div>

    <div class="calc-body">

      <!-- Team selector -->
      <div class="calc-team-select">
        <div class="calc-team-row">
          <span class="calc-team-label">Your<br/>Team</span>
          <div class="calc-team-sprites">
            {#each yourTeam as slot, i}
              <button
                class="mon-btn"
                class:selected-atk={selYou === i}
                disabled={!slot}
                aria-pressed={selYou === i}
                aria-label={slot ? slot.entry.name : 'Empty'}
                on:click={() => { selYou = selYou === i ? null : i; }}
              >
                {#if slot}
                  <img src={spriteUrl(slot.entry.name)} alt={slot.entry.name} />
                {:else}
                  <span style="color: var(--gb-3); font-size: 1.2rem;">—</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <div class="calc-team-row">
          <span class="calc-team-label">Oppo&shy;nent</span>
          <div class="calc-team-sprites">
            {#each oppTeam as slot, i}
              <button
                class="mon-btn"
                class:selected-def={selOpp === i}
                disabled={!slot}
                aria-pressed={selOpp === i}
                aria-label={slot ? slot.entry.name : 'Empty'}
                on:click={() => { selOpp = selOpp === i ? null : i; }}
              >
                {#if slot}
                  <img src={spriteUrl(slot.entry.name)} alt={slot.entry.name} />
                {:else}
                  <span style="color: var(--gb-3); font-size: 1.2rem;">—</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Prompt when nothing selected yet -->
      {#if !atkSlot && !defSlot}
        <p class="matchup-hint">Select one Pokémon from each team to see damage calcs</p>
      {:else if atkSlot && defSlot}

        <!-- Matchup summary bar -->
        <div class="matchup-header">
          <div class="matchup-mon">
            <img src={spriteUrl(atkSlot.entry.name)} alt={atkSlot.entry.name} class="matchup-sprite" />
            <span class="matchup-name" style="color: #52b44b">{shortName(atkSlot.entry.name)}</span>
          </div>
          <span class="matchup-vs">⚔ vs ⚔</span>
          <div class="matchup-mon">
            <img src={spriteUrl(defSlot.entry.name)} alt={defSlot.entry.name} class="matchup-sprite" />
            <span class="matchup-name" style="color: #e8622d">{shortName(defSlot.entry.name)}</span>
          </div>
        </div>

        <!-- Set pickers + EV notes -->
        <div class="set-row">
          <div class="set-cell">
            {#if atkSets.length > 0}
              <span class="set-label">Set:</span>
              <select class="set-select" bind:value={yourSetIdx}>
                {#each atkSets as s, i}
                  <option value={i}>{s.label}{s.proxy ? ' *' : ''}</option>
                {/each}
              </select>
              {#if !hasImportedAtk}<span class="set-hint">applied</span>{/if}
            {:else if !hasImportedAtk}
              <span class="ev-note-inline">no EV data</span>
            {/if}
          </div>
          <div class="set-cell set-cell-right">
            {#if defSets.length > 0}
              <span class="set-label">Set:</span>
              <select class="set-select" bind:value={oppSetIdx}>
                {#each defSets as s, i}
                  <option value={i}>{s.label}{s.proxy ? ' *' : ''}</option>
                {/each}
              </select>
              {#if !hasImportedDef}<span class="set-hint">applied</span>{/if}
            {:else if !hasImportedDef}
              <span class="ev-note-inline">no EV data</span>
            {/if}
          </div>
        </div>

        <!-- Stat editors (accordion) -->
        <div class="stat-panels">
          {#each (['atk', 'def'] as const) as side}
            {@const isAtk   = side === 'atk'}
            {@const nature  = isAtk ? atkNature  : defNature}
            {@const evs     = isAtk ? atkEvs     : defEvs}
            {@const ability = isAtk ? atkAbility : defAbility}
            {@const absOpts = isAtk ? atkAbilityOpts : defAbilityOpts}
            {@const boosts  = isAtk ? atkBoosts  : defBoosts}
            {@const hh  = isAtk ? atkHH  : defHH}
            {@const ref = isAtk ? atkRef : defRef}
            {@const ls  = isAtk ? atkLS  : defLS}
            {@const av  = isAtk ? atkAV  : defAV}
            {@const fg  = isAtk ? atkFG  : defFG}
            {@const isOpen  = isAtk ? atkOpen  : defOpen}
            {@const activeBoosts = BOOST_KEYS.filter(k => boosts[k] !== 0)}
            {@const activeFields = [hh&&'HH',ref&&'Ref',ls&&'LS',av&&'AV',fg&&'FG'].filter((x): x is string => !!x)}
            {@const stats = isAtk ? atkStats : defStats}
            <div class="stat-panel">
              <!-- Accordion header -->
              <button class="sp-accordion" on:click={() => isAtk ? (atkOpen = !atkOpen) : (defOpen = !defOpen)}>
                <span class="sp-chevron" class:sp-chevron-open={isOpen}>›</span>
                <span class="sp-side-badge" class:sp-atk={isAtk} class:sp-def={!isAtk}>
                  {isAtk ? shortName(atkSlot?.entry.name ?? '') : shortName(defSlot?.entry.name ?? '')}
                </span>
                <span class="sp-summary">
                  <span class="sp-sum-nature">{nature}</span>
                  {#if activeBoosts.length}
                    <span class="sp-sum-tag">
                      {activeBoosts.map(k => `${BOOST_LABELS[k]}${boostSymbol(boosts[k])}`).join(' ')}
                    </span>
                  {/if}
                  {#if activeFields.length}
                    <span class="sp-sum-tag">{activeFields.join(' · ')}</span>
                  {/if}
                </span>
              </button>

              <!-- Collapsible body -->
              {#if isOpen}
                <div class="sp-body" transition:slide={{ duration: 140 }}>
                  <div class="sp-top-row">
                    <select class="sp-select" value={nature}
                      on:change={(e) => isAtk ? (atkNature = e.currentTarget.value) : (defNature = e.currentTarget.value)}>
                      {#each NATURES as n}<option value={n}>{natureLabel(n)}</option>{/each}
                    </select>
                    {#if absOpts.length > 0}
                      <select class="sp-select sp-ability" value={ability}
                        on:change={(e) => isAtk ? (atkAbility = e.currentTarget.value) : (defAbility = e.currentTarget.value)}>
                        {#each absOpts as a}<option value={a}>{a}</option>{/each}
                      </select>
                    {/if}
                  </div>
                  <!-- Computed stats row -->
                  {#if stats}
                    <div class="stat-vals-row">
                      {#each EV_KEYS as k}
                        <div class="ev-col">
                          <span class="stat-val-num">{stats[k] ?? '—'}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                  <!-- EV inputs -->
                  <div class="ev-row">
                    {#each EV_KEYS as k}
                      <div class="ev-col">
                        <span class="ev-label">{EV_LABELS[k]}</span>
                        <input class="ev-input" type="number" min="0" max="32" step="1"
                          value={evs[k]}
                          on:change={(e) => setEv(side, k, e.currentTarget.value)} />
                      </div>
                    {/each}
                  </div>
                  <div class="ev-total">{evTotal(evs)} / 66 EVs</div>
                  <div class="boost-row">
                    {#each BOOST_KEYS as stat}
                      {@const val = boosts[stat]}
                      <div class="boost-item">
                        <span class="boost-label">{BOOST_LABELS[stat]}</span>
                        <button class="boost-btn" on:click={() => adjustBoost(side, stat, -1)} disabled={val <= -6}>−</button>
                        <span class="boost-val" class:boost-pos={val > 0} class:boost-neg={val < 0}>{boostSymbol(val)}</span>
                        <button class="boost-btn" on:click={() => adjustBoost(side, stat, 1)} disabled={val >= 6}>+</button>
                      </div>
                    {/each}
                  </div>
                  <div class="field-row">
                    <button class="field-chip" class:fc-active={hh} title="Helping Hand (boosts outgoing moves)"
                      on:click={() => toggleField(side, 'hh')}>HH</button>
                    <button class="field-chip" class:fc-active={ref} title="Reflect (halves physical damage taken)"
                      on:click={() => toggleField(side, 'ref')}>Reflect</button>
                    <button class="field-chip" class:fc-active={ls} title="Light Screen (halves special damage taken)"
                      on:click={() => toggleField(side, 'ls')}>L.Screen</button>
                    <button class="field-chip" class:fc-active={av} title="Aurora Veil (halves all damage taken)"
                      on:click={() => toggleField(side, 'av')}>A.Veil</button>
                    <button class="field-chip" class:fc-active={fg} title="Friend Guard ally (reduces damage taken by 25%)"
                      on:click={() => toggleField(side, 'fg')}>F.Guard</button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <!-- Results: two columns -->
        <div class="results-grid">

          <!-- Your pokemon attacks opponent -->
          <div class="result-col">
            <div class="result-col-header">
              <span class="col-atk-label">Atk →</span>
              <span class="col-atk-name">{shortName(atkSlot.entry.name)}</span>
            </div>
            {#if atkResults.length === 0}
              <p class="no-moves">{atkMoves.length ? 'No damaging moves' : 'No move data'}</p>
            {:else}
              <table class="move-table">
                <tbody>
                  {#each atkResults as r}
                    <tr class:possible={!r.guaranteed}>
                      <td class="move-name">
                        <span class="type-badge" style="background:{TYPE_COLORS[r.moveType] ?? '#9199a1'}">{r.moveType}</span>
                        {r.moveName}
                      </td>
                      <td class="move-range">{r.minPct.toFixed(1)}–{r.maxPct.toFixed(1)}%</td>
                      <td class="move-ko {koClass(r.nHko)}">{koLabel(r.nHko, r.guaranteed)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <!-- Opponent attacks your pokemon -->
          <div class="result-col">
            <div class="result-col-header">
              <span class="col-atk-label">Atk →</span>
              <span class="col-atk-name">{shortName(defSlot.entry.name)}</span>
            </div>
            {#if defResults.length === 0}
              <p class="no-moves">{defMoves.length ? 'No damaging moves' : 'No move data'}</p>
            {:else}
              <table class="move-table">
                <tbody>
                  {#each defResults as r}
                    <tr class:possible={!r.guaranteed}>
                      <td class="move-name">
                        <span class="type-badge" style="background:{TYPE_COLORS[r.moveType] ?? '#9199a1'}">{r.moveType}</span>
                        {r.moveName}
                      </td>
                      <td class="move-range">{r.minPct.toFixed(1)}–{r.maxPct.toFixed(1)}%</td>
                      <td class="move-ko {koClass(r.nHko)}">{koLabel(r.nHko, r.guaranteed)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

        </div>

      {:else}
        <p class="matchup-hint">
          {#if atkSlot}Select an opponent Pokémon{:else}Select one of your Pokémon{/if}
        </p>
      {/if}

    </div>
  </div>
</div>
