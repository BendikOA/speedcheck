<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import { calcEffectiveSpeed, WEATHER_ABILITY, PROTO_ABILITY, DEFAULT_CONDITIONS } from '$lib/speedtiers';
  import type { Conditions, NatureTier } from '$lib/speedtiers';
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
      fieldProto.delete(key);
      fieldNature.delete(key);
      fieldCommander.delete(key);
      fieldMega.delete(key);
    } else if (set.size < 2) {
      set.add(index);
      fieldScarfs.set(key, team[index]?.scarf ?? false);
      fieldParalysis.set(key, false);
      fieldProto.set(key, false);
      fieldNature.set(key, '=');
      fieldCommander.set(key, false);
      fieldMega.set(key, 0);
    }
    yourField      = new Set(yourField);
    oppField       = new Set(oppField);
    fieldScarfs    = new Map(fieldScarfs);
    fieldParalysis = new Map(fieldParalysis);
    fieldProto     = new Map(fieldProto);
    fieldNature    = new Map(fieldNature);
    fieldCommander = new Map(fieldCommander);
    fieldMega      = new Map(fieldMega);
  }

  // ── Per-field toggles ─────────────────────────────────────────────────────
  let fieldScarfs    = new Map<string, boolean>();
  let fieldParalysis = new Map<string, boolean>();
  let fieldProto     = new Map<string, boolean>();
  let fieldNature    = new Map<string, NatureTier>();
  let fieldCommander = new Map<string, boolean>();
  let fieldMega      = new Map<string, number>(); // 0=base, 1=mega/megaX, 2=megaY

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

  function toggleFieldProto(key: string) {
    fieldProto.set(key, !(fieldProto.get(key) ?? false));
    fieldProto = new Map(fieldProto);
  }

  function cycleNature(key: string) {
    const cur = fieldNature.get(key) ?? '=';
    // = (neutral) → + (positive) → - (negative) → = …
    const next: NatureTier = cur === '=' ? '+' : cur === '+' ? '-' : '=';
    fieldNature.set(key, next);
    fieldNature = new Map(fieldNature);
  }

  function toggleCommander(key: string) {
    fieldCommander.set(key, !(fieldCommander.get(key) ?? false));
    fieldCommander = new Map(fieldCommander);
  }

  function cycleMega(key: string, numForms: number) {
    const cur = fieldMega.get(key) ?? 0;
    fieldMega.set(key, (cur + 1) % (numForms + 1));
    fieldMega = new Map(fieldMega);
  }

  // ── Conditions ─────────────────────────────────────────────────────────────
  let cond: Conditions = { ...DEFAULT_CONDITIONS };

  function toggleWeather(w: 'rain' | 'sun' | 'sand' | 'snow') {
    const was = cond[w];
    cond = { ...cond, rain: false, sun: false, sand: false, snow: false };
    if (!was) cond[w] = true;
  }

  function toggleTerrain(t: 'electric' | 'grassy' | 'psychic') {
    const was = cond[t];
    cond = { ...cond, electric: false, grassy: false, psychic: false };
    if (!was) cond[t] = true;
  }

  // ── Speed order ────────────────────────────────────────────────────────────
  type FieldRow = {
    key:              string;
    side:             'you' | 'opp';
    slot:             NonNullable<TeamSlot>;
    scarf:            boolean;
    paralysis:        boolean;
    nature:           NatureTier;
    canProtoBoost:    boolean;
    protoBoost:       boolean;
    protoLabel:       string;
    canCommander:     boolean;
    commander:        boolean;
    megaForms:        import('$lib/speedtiers').MegaStats[];
    megaIndex:        number;
    effectiveSpeed:   number;
    triggeredAbility: string | null;
    priorityMoves:    PriorityMove[];
    priorityAbilities: PriorityAbility[];
  };

  $: fieldRows = (() => {
    void priorityReady; // re-run when priority cache loads

    const rows: FieldRow[] = [];

    const buildRow = (side: 'you' | 'opp', i: number, slot: NonNullable<TeamSlot>) => {
      const key       = `${side}-${i}`;
      const scarf     = fieldScarfs.get(key)    ?? false;
      const paralysis = fieldParalysis.get(key) ?? false;
      const nature    = fieldNature.get(key)    ?? '+';
      const commander = fieldCommander.get(key) ?? false;

      // Proto/Quark: only show toggle when the relevant condition is active
      const protoAbilityId  = slot.entry.abilities.find(a => PROTO_ABILITY[a]);
      const protoCondition  = protoAbilityId ? PROTO_ABILITY[protoAbilityId] : null;
      const canProtoBoost   = !!protoAbilityId && !!protoCondition && !!cond[protoCondition];
      const protoBoost      = canProtoBoost && (fieldProto.get(key) ?? false);
      const protoLabel      = protoAbilityId === 'quarkdrive' ? 'QD ×1.5' : 'PS ×1.5';

      const canCommander = slot.entry.id === 'dondozo';
      const megaForms    = slot.entry.megaForms;
      const megaIndex    = fieldMega.get(key) ?? 0;

      const triggered = slot.entry.abilities.find(a => {
        const t = WEATHER_ABILITY[a];
        return t && cond[t];
      }) ?? null;

      rows.push({
        key, side, slot, scarf, paralysis, nature,
        canProtoBoost, protoBoost, protoLabel,
        canCommander, commander,
        megaForms, megaIndex,
        triggeredAbility: triggered,
        effectiveSpeed: calcEffectiveSpeed(
          slot.entry, side,
          { scarf, paralysis, protoBoost, commander, natureTier: nature, megaIndex },
          cond
        ),
        priorityMoves:     getPriorityMoves(slot.entry.id),
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
    fieldProto     = new Map();
    fieldNature    = new Map();
    fieldCommander = new Map();
    fieldMega      = new Map();
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
                <div class="tslot-types">
                  {#each slot.entry.types as t}
                    <span class="type-pip type-{t.toLowerCase()}">{t}</span>
                  {/each}
                </div>
              {:else}
                <span class="tslot-empty">—</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Conditions: all grouped -->
  <div class="conditions-bar">
    <div class="cond-group">
      <span class="cond-group-label">Field</span>
      <div class="cond-group-btns">
        <button class="cond-btn tr" class:active={cond.trickRoom}
          title="Trick Room: reverses Speed order for 5 turns — slower Pokémon move first"
          on:click={() => cond = { ...cond, trickRoom: !cond.trickRoom }}>Trick Room</button>
        <button class="cond-btn your" class:active={cond.yourTailwind}
          title="Your Tailwind: doubles Speed for your side for 4 turns (×2)"
          on:click={() => cond = { ...cond, yourTailwind: !cond.yourTailwind }}>Your TW</button>
        <button class="cond-btn opp" class:active={cond.oppTailwind}
          title="Opponent Tailwind: doubles Speed for the opponent's side for 4 turns (×2)"
          on:click={() => cond = { ...cond, oppTailwind: !cond.oppTailwind }}>Opp TW</button>
      </div>
    </div>
    <div class="cond-group">
      <span class="cond-group-label">Weather</span>
      <div class="cond-group-btns">
        {#each [
          { key: 'rain'  as const, label: 'Rain',  tip: 'Rain: doubles Speed of Swift Swim users (Kingdra, Barraskewda, etc.)' },
          { key: 'sun'   as const, label: 'Sun',   tip: 'Sun: doubles Speed of Chlorophyll users (Venusaur, Lilligant, etc.) and activates Protosynthesis' },
          { key: 'sand'  as const, label: 'Sand',  tip: 'Sand: doubles Speed of Sand Rush users (Excadrill, Sandaconda, etc.)' },
          { key: 'snow'  as const, label: 'Snow',  tip: 'Snow: doubles Speed of Slush Rush users (Beartic, Cetitan, etc.)' },
        ] as btn}
          <button class="cond-btn" class:active={cond[btn.key]}
            title={btn.tip} on:click={() => toggleWeather(btn.key)}>{btn.label}</button>
        {/each}
      </div>
    </div>
    <div class="cond-group">
      <span class="cond-group-label">Terrain</span>
      <div class="cond-group-btns">
        {#each [
          { key: 'electric' as const, label: 'Electric', tip: 'Electric Terrain: doubles Speed of Surge Surfer users (Raichu-Alola) and activates Quark Drive' },
          { key: 'grassy'   as const, label: 'Grassy',   tip: 'Grassy Terrain: gives Grassy Glide +1 priority. Halves damage from Earthquake/Bulldoze.' },
          { key: 'psychic'  as const, label: 'Psychic',  tip: 'Psychic Terrain: blocks all +1 and higher priority moves targeting grounded Pokémon' },
        ] as btn}
          <button class="cond-btn" class:active={cond[btn.key]}
            title={btn.tip} on:click={() => toggleTerrain(btn.key)}>{btn.label}</button>
        {/each}
      </div>
    </div>
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
          {@const activeMega = row.megaIndex > 0 ? row.megaForms[row.megaIndex - 1] : null}
          {@const displayName = activeMega ? activeMega.name : row.slot.entry.name}
          <div class="speed-row" class:side-you={row.side === 'you'} class:side-opp={row.side === 'opp'}>
            <span class="pos">{i + 1}</span>
            <img src={spriteUrl(displayName)} alt={displayName} class="row-sprite" />

            <div class="row-main">
              <div class="row-top">
                <span class="row-name">{displayName}</span>
                <div class="row-badges">
                  {#if row.megaIndex > 0}
                    {@const mf = row.megaForms[row.megaIndex - 1]}
                    <span class="badge mega-badge" title="{mf?.name}: Base Speed {mf?.baseSpe} (toggled via Mega button below)">{mf?.name ?? 'Mega'}</span>
                  {/if}
                  {#if row.triggeredAbility}
                    <span class="badge ability" title="{row.triggeredAbility}: doubles Speed in the current weather/terrain">{row.triggeredAbility}</span>
                  {/if}
                  {#if row.protoBoost}
                    <span class="badge proto-badge" title="{row.protoLabel === 'QD ×1.5' ? 'Quark Drive' : 'Protosynthesis'}: +1.5× Speed when Speed is the boosted stat (toggled via button below)">{row.protoLabel}</span>
                  {/if}
                  {#if row.commander}
                    <span class="badge commander-badge" title="Commander: Tatsugiri entered Dondozo's mouth — +2 Speed stages (×2)">Cmd ×2</span>
                  {/if}
                  {#if (row.side === 'you' && cond.yourTailwind) || (row.side === 'opp' && cond.oppTailwind)}
                    <span class="badge tailwind" title="Tailwind: ×2 Speed for your side for 4 turns">TW ×2</span>
                  {/if}
                  {#if row.scarf}
                    <span class="badge scarf-badge" title="Choice Scarf: ×1.5 Speed">Scarf ×1.5</span>
                  {/if}
                  {#if row.paralysis}
                    <span class="badge para-badge" title="Paralysis: ×0.5 Speed">PAR ×0.5</span>
                  {/if}
                  {#each row.priorityMoves as pm}
                    {@const active = !cond.psychic && (!pm.requiresCondition || cond[pm.requiresCondition as keyof typeof cond])}
                    {@const tooltip = cond.psychic
                      ? `${pm.name}: blocked by Psychic Terrain (priority moves don't work on grounded Pokémon)`
                      : pm.requiresCondition && !cond[pm.requiresCondition as keyof typeof cond]
                        ? `${pm.name}: only has +${pm.priority} priority under ${pm.requiresCondition} terrain`
                        : `This Pokémon may know ${pm.name} — a +${pm.priority} priority move${pm.note ? ` (${pm.note})` : ''}`}
                    <span class="badge priority-badge" class:suppressed={!active} title={tooltip}
                    >{pm.name} {pm.priority > 0 ? '+' : ''}{pm.priority}</span>
                  {/each}
                  {#each row.priorityAbilities as pa}
                    <span class="badge prio-ability-badge" title="{pa.name}: {pa.effect}">{pa.name}</span>
                  {/each}
                </div>
              </div>

              <div class="row-toggles">
                <!-- Nature: cycles = → + → - -->
                <button
                  class="toggle-pill nature-pill"
                  class:nature-pos={row.nature === '+'}
                  class:nature-neu={row.nature === '='}
                  class:nature-neg={row.nature === '-'}
                  on:click={() => cycleNature(row.key)}
                  title="Speed nature — click to cycle&#10;= Neutral (Hardy/Docile/Serious/Bashful/Quirky): no modifier&#10;+ Positive (Timid/Jolly/Naive/Hasty): ×1.1 Speed&#10;− Negative (Brave/Quiet/Relaxed/Sassy): ×0.9 Speed"
                >{row.nature === '+' ? '+Spe' : row.nature === '=' ? '=Spe' : '−Spe'}</button>

                <!-- Scarf -->
                <label class="toggle-pill" class:active={row.scarf}
                  title="Choice Scarf: multiplies Speed by ×1.5. Only one Scarf active per side at a time.">
                  <input type="checkbox" checked={row.scarf} on:change={() => toggleFieldScarf(row.key, row.side)} />
                  Scarf
                </label>

                <!-- Paralysis -->
                <label class="toggle-pill para" class:active={row.paralysis}
                  title="Paralysis: multiplies Speed by ×0.5">
                  <input type="checkbox" checked={row.paralysis} on:change={() => toggleFieldParalysis(row.key)} />
                  PAR
                </label>

                <!-- Proto/Quark (only when condition is active) -->
                {#if row.canProtoBoost}
                  <label class="toggle-pill proto" class:active={row.protoBoost}
                    title="{row.protoLabel === 'QD ×1.5' ? 'Quark Drive (Electric Terrain active)' : 'Protosynthesis (Sun active)'}: boosts the highest stat by ×1.5. Toggle on if Speed is the boosted stat.">
                    <input type="checkbox" checked={row.protoBoost} on:change={() => toggleFieldProto(row.key)} />
                    {row.protoLabel}
                  </label>
                {/if}

                <!-- Commander (Dondozo only) -->
                {#if row.canCommander}
                  <label class="toggle-pill commander-pill" class:active={row.commander}
                    title="Commander: when Tatsugiri uses Commander, Dondozo gains +2 in all stats including Speed (×2 effective)">
                    <input type="checkbox" checked={row.commander} on:change={() => toggleCommander(row.key)} />
                    Cmd
                  </label>
                {/if}

                <!-- Mega toggle: button cycles through forms (base → mega/megaX → megaY → base) -->
                {#if row.megaForms.length === 1}
                  <button
                    class="toggle-pill"
                    class:active={row.megaIndex > 0}
                    title="Mega Evolution: {row.megaForms[0].name} (Base Speed {row.megaForms[0].baseSpe}). Click to toggle."
                    on:click={() => cycleMega(row.key, 1)}
                  >{row.megaIndex > 0 ? row.megaForms[0].name : 'Mega'}</button>
                {:else if row.megaForms.length > 1}
                  <button
                    class="toggle-pill"
                    class:active={row.megaIndex > 0}
                    title="Cycle Mega forms — {row.megaForms.map(f => `${f.name} (Base ${f.baseSpe})`).join(' / ')}. Click to cycle."
                    on:click={() => cycleMega(row.key, row.megaForms.length)}
                  >{row.megaIndex === 0 ? 'Mega X/Y' : row.megaForms[row.megaIndex - 1].name}</button>
                {/if}
              </div>
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
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }

  .top-conds {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .reset-btn {
    padding: 0.45rem 0.9rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    flex-shrink: 0;
    min-height: 36px;
  }
  .reset-btn:hover { color: var(--text); border-color: var(--text-muted); }

  /* Conditions */
  .conditions-bar {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 1.25rem;
  }

  .cond-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cond-group-label {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    width: 3.5rem;
    flex-shrink: 0;
  }

  .cond-group-btns {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .cond-btn {
    padding: 0.35rem 0.7rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    min-height: 34px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
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
    margin-bottom: 1.25rem;
  }

  .team-row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  @media (min-width: 640px) {
    .team-row { flex-direction: row; align-items: center; gap: 1rem; }
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
    height: 116px;
    padding: 0.3rem 0.25rem;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s, background 0.15s;
  }
  .tslot:disabled { opacity: 0.3; cursor: not-allowed; }
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
    .tslot.has-mon:not(:disabled):hover { border-color: var(--text-muted); }
  }

  .tslot-sprite {
    width: 54px;
    height: 54px;
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
  .tslot-empty { color: var(--border); font-size: 1.2rem; }

  .tslot-types {
    display: flex;
    gap: 2px;
    margin-top: 2px;
  }

  .type-pip {
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 1px 4px;
    border-radius: 3px;
    color: #fff;
  }

  /* Type colours */
  .type-normal   { background: #9a9da1; }
  .type-fire     { background: #e8622d; }
  .type-water    { background: #4d8fe8; }
  .type-electric { background: #e8c030; color: #1a1a1a; }
  .type-grass    { background: #52b44b; }
  .type-ice      { background: #62cec0; color: #1a1a1a; }
  .type-fighting { background: #c03428; }
  .type-poison   { background: #993399; }
  .type-ground   { background: #d4a84b; color: #1a1a1a; }
  .type-flying   { background: #7b8fe8; }
  .type-psychic  { background: #e83880; }
  .type-bug      { background: #8fa820; }
  .type-rock     { background: #b8a038; color: #1a1a1a; }
  .type-ghost    { background: #6060b0; }
  .type-dragon   { background: #6038f8; }
  .type-dark     { background: #503828; }
  .type-steel    { background: #7090a0; }
  .type-fairy    { background: #e87090; }

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
    padding: 0.65rem 1rem;
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
    font-size: 0.72rem;
    padding: 0.1rem 0.45rem;
    background: color-mix(in srgb, #c46cf5 15%, var(--surface));
    border: 1px solid #c46cf5;
    color: #c46cf5;
    border-radius: 100px;
  }

  .empty-hint { font-size: 0.85rem; color: var(--text-muted); }

  .speed-list { display: flex; flex-direction: column; }

  .speed-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--border);
    border-left: 4px solid transparent;
  }
  .speed-row:last-child { border-bottom: none; }
  .speed-row.side-you { border-left-color: #6c8ef5; }
  .speed-row.side-opp { border-left-color: #f56c6c; }

  .pos {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-muted);
    width: 1.5rem;
    text-align: center;
    flex-shrink: 0;
  }

  .row-sprite {
    width: 60px;
    height: 60px;
    object-fit: contain;
    image-rendering: pixelated;
    flex-shrink: 0;
  }

  /* Main column: name+badges stacked above toggles */
  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .row-top {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.3rem;
    min-width: 0;
  }

  .row-name {
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .row-badges {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .badge {
    font-size: 0.68rem;
    padding: 0.1rem 0.4rem;
    border-radius: 100px;
    border: 1px solid;
    white-space: nowrap;
  }

  .badge.ability {
    color: #6cf5b8; border-color: #6cf5b8;
    background: color-mix(in srgb, #6cf5b8 10%, var(--surface));
  }
  .badge.tailwind {
    color: #6c8ef5; border-color: #6c8ef5;
    background: color-mix(in srgb, #6c8ef5 10%, var(--surface));
  }
  .badge.scarf-badge {
    color: #f5c96c; border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
  }
  .badge.para-badge {
    color: #f5a06c; border-color: #f5a06c;
    background: color-mix(in srgb, #f5a06c 10%, var(--surface));
  }
  .badge.priority-badge {
    font-size: 0.63rem;
    color: #f56cc8; border-color: #f56cc8;
    background: color-mix(in srgb, #f56cc8 10%, var(--surface));
  }
  .badge.priority-badge.suppressed {
    color: var(--text-muted); border-color: var(--border);
    background: none; opacity: 0.45; text-decoration: line-through;
  }
  .badge.prio-ability-badge {
    font-size: 0.63rem;
    color: #c46cf5; border-color: #c46cf5;
    background: color-mix(in srgb, #c46cf5 10%, var(--surface));
  }
  .badge.mega-badge {
    color: #f5d76c; border-color: #f5d76c;
    background: color-mix(in srgb, #f5d76c 10%, var(--surface));
  }
  .badge.proto-badge {
    color: #6cf5e0; border-color: #6cf5e0;
    background: color-mix(in srgb, #6cf5e0 10%, var(--surface));
  }
  .badge.commander-badge {
    color: #6ca5f5; border-color: #6ca5f5;
    background: color-mix(in srgb, #6ca5f5 10%, var(--surface));
  }

  /* Toggle pills row */
  .row-toggles {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  .toggle-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    user-select: none;
    min-height: 28px;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .toggle-pill input { display: none; }
  .toggle-pill:active { opacity: 0.75; }

  .toggle-pill.active {
    color: #f5c96c; border-color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
  }
  .toggle-pill.para.active {
    color: #f5a06c; border-color: #f5a06c;
    background: color-mix(in srgb, #f5a06c 10%, var(--surface));
  }
  .toggle-pill.proto.active {
    color: #6cf5e0; border-color: #6cf5e0;
    background: color-mix(in srgb, #6cf5e0 10%, var(--surface));
  }
  .toggle-pill.commander-pill.active {
    color: #6ca5f5; border-color: #6ca5f5;
    background: color-mix(in srgb, #6ca5f5 10%, var(--surface));
  }
  /* mega uses same active colour as scarf (default) — no override needed */

  /* Nature pill cycles: + green / = grey / − red */
  .nature-pill {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .nature-pill.nature-pos {
    color: #6cf587; border-color: #6cf587;
    background: color-mix(in srgb, #6cf587 10%, var(--surface));
  }
  .nature-pill.nature-neu { color: var(--text-muted); }
  .nature-pill.nature-neg {
    color: #f56c6c; border-color: #f56c6c;
    background: color-mix(in srgb, #f56c6c 10%, var(--surface));
  }

  .row-speed {
    font-size: 1.6rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 3.5rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* Mobile tightening */
  @media (max-width: 500px) {
    .speed-row { gap: 0.4rem; padding: 0.5rem 0.6rem; }
    .row-sprite { width: 48px; height: 48px; }
    .row-name { font-size: 0.9rem; }
    .row-speed { font-size: 1.35rem; min-width: 3rem; }
    .pos { font-size: 1rem; width: 1.25rem; }
  }
</style>
