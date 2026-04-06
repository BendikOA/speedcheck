<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { teamState } from '$lib/stores/teams';
  import type { TeamSlot } from '$lib/stores/teams';
  import { calcEffectiveSpeed, WEATHER_ABILITY, PROTO_ABILITY, DEFAULT_CONDITIONS } from '$lib/speedtiers';
  import type { Conditions, NatureTier } from '$lib/speedtiers';
  import { spriteUrl } from '$lib/sprites';
  import { getPriorityMoves, getPriorityAbilities, loadPriorityCache, PRIORITY_MOVES, loadBoostCache, getMaxSpeedBoostStage } from '$lib/priority';
  import type { PriorityMove, PriorityAbility } from '$lib/priority';
  import { tooltip } from '$lib/tooltip';
  import { loadSmogonPriorityMoves, loadSmogonAbilities, loadSmogonMoves, loadSmogonBuilds } from '$lib/smogonUsage';
  import type { UsagePriorityMoves, UsageAbilities, UsageMoves, UsageBuilds } from '$lib/smogonUsage';

  const GEN9_REGS = [
    { label: 'Reg I', format: 'gen9vgc2026regi' },
    { label: 'Reg F', format: 'gen9vgc2026regf' },
    { label: 'Reg G', format: 'gen9vgc2025regg' },
  ];

  let priorityReady = false;
  let smogonReady   = false;
  let selectedReg           = GEN9_REGS[0].format;
  let smogonPriorityMoves:   UsagePriorityMoves = {};
  let smogonAbilities:       UsageAbilities     = {};
  let smogonMoves:           UsageMoves         = {};
  let smogonBuilds:          UsageBuilds        = {};
  let openMoves              = new Set<string>();

  // ── Team data ──────────────────────────────────────────────────────────────
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam:  TeamSlot[] = Array(6).fill(null);

  onMount(async () => {
    const state = get(teamState);
    yourTeam = state.yourTeam;
    oppTeam  = state.oppTeam;
    await Promise.all([loadPriorityCache(), loadBoostCache()]);
    priorityReady = true;
    [smogonPriorityMoves, smogonAbilities, smogonMoves, smogonBuilds] = await Promise.all([
      loadSmogonPriorityMoves(9, selectedReg),
      loadSmogonAbilities(9, selectedReg),
      loadSmogonMoves(9, selectedReg),
      loadSmogonBuilds(9, selectedReg),
    ]);
    smogonReady = true;
  });

  async function changeReg(format: string) {
    smogonReady = false;
    selectedReg = format;
    [smogonPriorityMoves, smogonAbilities, smogonMoves, smogonBuilds] = await Promise.all([
      loadSmogonPriorityMoves(9, format),
      loadSmogonAbilities(9, format),
      loadSmogonMoves(9, format),
      loadSmogonBuilds(9, format),
    ]);
    smogonReady = true;
    // Re-apply likely builds if active (data changed for new reg)
    if (likelyBuildsActive) {
      const applyFor = (side: 'you' | 'opp', field: Set<number>, team: TeamSlot[]) => {
        field.forEach(i => {
          const slot = team[i];
          if (!slot) return;
          const key   = `${side}-${i}`;
          const build = smogonBuilds[slot.entry.id];
          if (!build) return;
          if (!(side === 'you' && slot.natureLocked)) fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === 'Choice Scarf') fieldScarfs.set(key, true);
        });
      };
      applyFor('you', yourField, yourTeam);
      applyFor('opp', oppField, oppTeam);
      fieldNature  = new Map(fieldNature);
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldScarfs  = new Map(fieldScarfs);
    }
  }

  function toggleMoves(key: string) {
    if (openMoves.has(key)) openMoves.delete(key);
    else openMoves.add(key);
    openMoves = new Set(openMoves);
  }

  // ── Usage-based toggles (declared early — used in toggleField) ───────────
  let likelyMovesActive     = false;
  let likelyAbilitiesActive = false;
  let likelyBuildsActive    = false;

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
      fieldSpeedEV.delete(key);
      // fieldProto / fieldNature / fieldCommander / fieldMega persist across field toggles
    } else if (set.size < 2) {
      set.add(index);
      fieldScarfs.set(key, team[index]?.scarf ?? false);
      fieldParalysis.set(key, false);
      if (!fieldNature.has(key)) fieldNature.set(key, '=');
      // Auto-apply likely build if mode is active
      if (likelyBuildsActive && team[index]) {
        const build = smogonBuilds[team[index]!.entry.id];
        if (build) {
          if (!(side === 'you' && team[index]!.natureLocked)) fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === 'Choice Scarf') fieldScarfs.set(key, true);
        }
      }
    }
    yourField      = new Set(yourField);
    oppField       = new Set(oppField);
    fieldScarfs    = new Map(fieldScarfs);
    fieldParalysis = new Map(fieldParalysis);
    fieldNature    = new Map(fieldNature);
    fieldSpeedEV   = new Map(fieldSpeedEV);
  }

  // ── Per-field toggles ─────────────────────────────────────────────────────
  let fieldScarfs     = new Map<string, boolean>();
  let fieldParalysis  = new Map<string, boolean>();
  let fieldProto      = new Map<string, boolean>();
  let fieldNature     = new Map<string, NatureTier>();
  let fieldCommander  = new Map<string, boolean>();
  let fieldMega       = new Map<string, number>(); // 0=base, 1=mega/megaX, 2=megaY
  let fieldSpeedBoost = new Map<string, number>(); // 0=off, 1=+1 stage, 2=+2 stages
  let fieldSpeedEV    = new Map<string, number>(); // Spe EV from likely build (0-252)

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

  function cycleSpeedBoost(key: string, maxStage: number) {
    const cur = fieldSpeedBoost.get(key) ?? 0;
    const next = cur >= maxStage ? 0 : cur + 1;
    fieldSpeedBoost.set(key, next);
    fieldSpeedBoost = new Map(fieldSpeedBoost);
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
    natureLocked:     boolean;
    canProtoBoost:    boolean;
    protoBoost:       boolean;
    protoCondActive:  boolean;
    protoLabel:       string;
    canCommander:     boolean;
    commander:        boolean;
    megaForms:        import('$lib/speedtiers').MegaStats[];
    megaIndex:        number;
    effectiveSpeed:    number;
    speedEV:           number | undefined; // set when likely build is active
    weatherAbility:    string | null; // always set if has a weather/terrain ability
    weatherTriggered:  boolean;       // true only when the relevant condition is active
    canSpeedBoost:     boolean;
    maxBoostStage:     number;
    speedBoostStage:   number;
    priorityMoves:     PriorityMove[];
    priorityAbilities: PriorityAbility[];
  };

  $: fieldRows = (() => {
    void priorityReady; void likelyMovesActive; void likelyAbilitiesActive; void likelyBuildsActive;

    const rows: FieldRow[] = [];

    const buildRow = (side: 'you' | 'opp', i: number, slot: NonNullable<TeamSlot>) => {
      const key       = `${side}-${i}`;
      const scarf     = fieldScarfs.get(key)    ?? false;
      const paralysis = fieldParalysis.get(key) ?? false;
      const nature    = fieldNature.get(key)    ?? '+';
      const commander = fieldCommander.get(key) ?? false;

      // Proto/Quark: always show toggle (can be triggered by Booster Energy regardless of weather/terrain)
      const protoAbilityId  = slot.entry.abilities.find(a => PROTO_ABILITY[a]);
      const canProtoBoost   = !!protoAbilityId;
      const protoBoost      = canProtoBoost && (fieldProto.get(key) ?? false);
      const protoCondition  = protoAbilityId ? PROTO_ABILITY[protoAbilityId] : null;
      const protoCondActive = !!protoCondition && !!cond[protoCondition];
      const protoLabel      = protoAbilityId === 'quarkdrive' ? 'QD ×1.5' : 'PS ×1.5';

      const canCommander = slot.entry.id === 'dondozo';
      const megaForms    = slot.entry.megaForms;
      const megaIndex    = fieldMega.get(key) ?? 0;

      // When likelyAbilitiesActive, narrow to the top-used ability only
      const effectiveAbilities = likelyAbilitiesActive && smogonAbilities[slot.entry.id]
        ? [smogonAbilities[slot.entry.id]]
        : slot.entry.abilities;

      // Weather/terrain ability — always find it, separately track if triggered
      const ABILITY_NAMES: Record<string, string> = {
        swiftswim: 'Swift Swim', chlorophyll: 'Chlorophyll',
        sandrush: 'Sand Rush', slushrush: 'Slush Rush', surgesurfer: 'Surge Surfer',
      };
      const weatherAbilityId = !megaIndex
        ? effectiveAbilities.find(a => WEATHER_ABILITY[a]) ?? null
        : null;
      const weatherAbility   = weatherAbilityId ? (ABILITY_NAMES[weatherAbilityId] ?? weatherAbilityId) : null;
      const weatherTriggered = !!weatherAbilityId && !!cond[WEATHER_ABILITY[weatherAbilityId]!];

      const natureLocked = side === 'you' && (slot.natureLocked ?? false);

      // Speed boost from moves (Dragon Dance, Agility, etc.)
      const maxBoostStage  = getMaxSpeedBoostStage(slot.entry.id);
      const canSpeedBoost  = maxBoostStage > 0;
      const speedBoostStage = canSpeedBoost ? (fieldSpeedBoost.get(key) ?? 0) : 0;

      // Priority moves: learnset-based normally, usage-filtered when likelyMovesActive
      const effectivePriorityMoves = likelyMovesActive && smogonPriorityMoves[slot.entry.id]
        ? smogonPriorityMoves[slot.entry.id]
            .map(id => PRIORITY_MOVES[id])
            .filter((m): m is PriorityMove => !!m)
        : getPriorityMoves(slot.entry.id);

      const speedEV = fieldSpeedEV.get(key);

      rows.push({
        key, side, slot, scarf, paralysis, nature, natureLocked,
        canProtoBoost, protoBoost, protoCondActive, protoLabel,
        canCommander, commander,
        megaForms, megaIndex,
        weatherAbility, weatherTriggered,
        canSpeedBoost, maxBoostStage, speedBoostStage,
        speedEV,
        effectiveSpeed: calcEffectiveSpeed(
          slot.entry, side,
          { scarf, paralysis, protoBoost, commander, natureTier: nature, megaIndex, speedBoostStage, speedEV },
          cond
        ),
        priorityMoves:     effectivePriorityMoves,
        priorityAbilities: getPriorityAbilities(effectiveAbilities),
      });
    };

    yourField.forEach(i => { const s = yourTeam[i]; if (s) buildRow('you', i, s); });
    oppField.forEach(i  => { const s = oppTeam[i];  if (s) buildRow('opp', i, s); });

    rows.sort((a, b) => cond.trickRoom
      ? a.effectiveSpeed - b.effectiveSpeed
      : b.effectiveSpeed - a.effectiveSpeed);

    return rows;
  })();

  function toggleLikelyMoves() {
    likelyMovesActive = !likelyMovesActive;
  }

  function toggleLikelyAbilities() {
    likelyAbilitiesActive = !likelyAbilitiesActive;
  }

  function toggleLikelyBuilds() {
    if (likelyBuildsActive) {
      // Clear EV overrides; reset natures to neutral
      yourField.forEach(i => { fieldSpeedEV.delete(`you-${i}`); fieldNature.set(`you-${i}`, '='); });
      oppField.forEach(i  => { fieldSpeedEV.delete(`opp-${i}`); fieldNature.set(`opp-${i}`, '='); });
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldNature  = new Map(fieldNature);
      likelyBuildsActive = false;
    } else {
      // Apply most common build to every fielded Pokémon
      const applyFor = (side: 'you' | 'opp', field: Set<number>, team: TeamSlot[]) => {
        field.forEach(i => {
          const slot = team[i];
          if (!slot) return;
          const key   = `${side}-${i}`;
          const build = smogonBuilds[slot.entry.id];
          if (!build) return;
          if (!(side === 'you' && slot.natureLocked)) fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === 'Choice Scarf') fieldScarfs.set(key, true);
        });
      };
      applyFor('you', yourField, yourTeam);
      applyFor('opp', oppField,  oppTeam);
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldNature  = new Map(fieldNature);
      fieldScarfs  = new Map(fieldScarfs);
      likelyBuildsActive = true;
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetGame() {
    yourField       = new Set();
    oppField        = new Set();
    fieldScarfs     = new Map();
    fieldParalysis  = new Map();
    fieldProto      = new Map();
    fieldNature     = new Map();
    fieldCommander  = new Map();
    fieldMega       = new Map();
    fieldSpeedBoost = new Map();
    fieldSpeedEV    = new Map();
    openMoves       = new Set();
    cond                  = { ...DEFAULT_CONDITIONS };
    likelyMovesActive     = false;
    likelyAbilitiesActive = false;
    likelyBuildsActive    = false;
    goto('/');
  }
</script>

<svelte:head><title>Game — Speedcheck</title></svelte:head>

<div class="page">

  <!-- Top bar -->
  <div class="top-bar">
    <button class="reset-btn" on:click={resetGame}>← New Game</button>
    {#if yourField.size > 0 || oppField.size > 0}
      <button
        class="smart-nature-btn"
        class:active={likelyBuildsActive}
        use:tooltip={likelyBuildsActive
          ? "Showing most common EV spread, nature & item from Smogon usage data — click to reset"
          : "Apply the most common EV spread, nature & item per Pokémon from Smogon usage data (speed tiers vary a lot based on the actual spread run)"}
        on:click={toggleLikelyBuilds}
      >Likely Build</button>
    {/if}
    <div class="top-bar-right">
      <div class="reg-tabs" class:loading={!smogonReady} use:tooltip={"Switch Smogon usage data source (affects Smart Natures, Likely Moves, Likely Abilities, and Move Reveal)"}>
        {#each GEN9_REGS as reg}
          <button
            class="reg-tab"
            class:active={selectedReg === reg.format}
            on:click={() => changeReg(reg.format)}
          >{reg.label}</button>
        {/each}
      </div>
      <button
        class="usage-btn"
        class:active={likelyMovesActive}
        use:tooltip={likelyMovesActive ? "Showing priority moves from usage data — click to revert to learnset" : "Show only priority moves actually used in the current meta (Smogon data). Click again to revert."}
        on:click={toggleLikelyMoves}
      >Likely Moves</button>
      <button
        class="usage-btn"
        class:active={likelyAbilitiesActive}
        use:tooltip={likelyAbilitiesActive ? "Showing top ability from usage data — click to revert" : "Narrow to the most commonly run ability per Pokémon (Smogon data). Affects weather/terrain triggers shown. Click again to revert."}
        on:click={toggleLikelyAbilities}
      >Likely Abilities</button>
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
            {@const slotKey   = `${side}-${i}`}
            {@const megaIdx   = fieldMega.get(slotKey) ?? 0}
            {@const activeMegaForm = slot && megaIdx > 0 ? slot.entry.megaForms[megaIdx - 1] : null}
            {@const displayName  = activeMegaForm ? activeMegaForm.name  : slot?.entry.name ?? ''}
            {@const displayTypes = activeMegaForm ? activeMegaForm.types : slot?.entry.types ?? []}
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
                <img src={spriteUrl(displayName)} alt={displayName} class="tslot-sprite" />
                <span class="tslot-name">{displayName}</span>
                <div class="tslot-types">
                  {#each displayTypes as t}
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
          use:tooltip={"Trick Room: reverses Speed order for 5 turns — slower Pokémon move first"}
          on:click={() => cond = { ...cond, trickRoom: !cond.trickRoom }}>Trick Room</button>
        <button class="cond-btn your" class:active={cond.yourTailwind}
          use:tooltip={"Your Tailwind: doubles Speed for your side for 4 turns (×2)"}
          on:click={() => cond = { ...cond, yourTailwind: !cond.yourTailwind }}>Your TW</button>
        <button class="cond-btn opp" class:active={cond.oppTailwind}
          use:tooltip={"Opponent Tailwind: doubles Speed for the opponent's side for 4 turns (×2)"}
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
            use:tooltip={btn.tip} on:click={() => toggleWeather(btn.key)}>{btn.label}</button>
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
            use:tooltip={btn.tip} on:click={() => toggleTerrain(btn.key)}>{btn.label}</button>
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
                    <span class="badge mega-badge" use:tooltip={`${mf?.name}: Base Speed ${mf?.baseSpe} (toggled via Mega button below)`}>{mf?.name ?? 'Mega'}</span>
                  {/if}
                  {#if row.weatherAbility}
                    <span class="badge ability" class:ability-dim={!row.weatherTriggered}
                      use:tooltip={`${row.weatherAbility}: ×2 Speed${row.weatherTriggered ? ' ✓ active' : ' — inactive (no matching weather/terrain)'}`}
                    >{row.weatherAbility}</span>
                  {/if}
                  {#if row.protoBoost}
                    <span class="badge proto-badge" use:tooltip={`${row.protoLabel === 'QD ×1.5' ? 'Quark Drive' : 'Protosynthesis'}: ×1.5 Speed when Speed is the boosted stat`}>{row.protoLabel}</span>
                  {/if}
                  {#if row.commander}
                    <span class="badge commander-badge" use:tooltip={"Commander: Tatsugiri entered Dondozo's mouth — +2 Speed stages (×2)"}>Cmd ×2</span>
                  {/if}
                  {#if (row.side === 'you' && cond.yourTailwind) || (row.side === 'opp' && cond.oppTailwind)}
                    <span class="badge tailwind" use:tooltip={"Tailwind: ×2 Speed for 4 turns"}>TW ×2</span>
                  {/if}
                  {#if row.scarf}
                    <span class="badge scarf-badge" use:tooltip={"Choice Scarf: ×1.5 Speed"}>Scarf ×1.5</span>
                  {/if}
                  {#if row.paralysis}
                    <span class="badge para-badge" use:tooltip={"Paralysis: ×0.5 Speed"}>PAR ×0.5</span>
                  {/if}
                  {#each row.priorityMoves as pm}
                    {@const active = !cond.psychic && (!pm.requiresCondition || cond[pm.requiresCondition as keyof typeof cond])}
                    {@const tipText = cond.psychic
                      ? `${pm.name}: blocked by Psychic Terrain (priority moves don't work on grounded Pokémon)`
                      : pm.requiresCondition && !cond[pm.requiresCondition as keyof typeof cond]
                        ? `${pm.name}: only has +${pm.priority} priority under ${pm.requiresCondition} terrain`
                        : `This Pokémon may know ${pm.name} — a +${pm.priority} priority move${pm.note ? ` (${pm.note})` : ''}`}
                    <span class="badge priority-badge" class:suppressed={!active} use:tooltip={tipText}
                    >{pm.name} {pm.priority > 0 ? '+' : ''}{pm.priority}</span>
                  {/each}
                  {#each row.priorityAbilities as pa}
                    <span class="badge prio-ability-badge" use:tooltip={`${pa.name}: ${pa.effect}`}>{pa.name}</span>
                  {/each}
                  {#if likelyBuildsActive}
                    {@const build = smogonBuilds[row.slot.entry.id]}
                    {#if build?.item && build.item !== 'Choice Scarf'}
                      <span class="badge item-badge" use:tooltip={`Most common item (Smogon ${selectedReg}): ${build.item}`}>{build.item}</span>
                    {/if}
                  {/if}
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
                  use:tooltip={row.natureLocked && likelyBuildsActive
                    ? "Nature from pokepaste — overruling Likely Build"
                    : "Speed nature — click to cycle\n+ Positive (Timid/Jolly/Naive/Hasty): 252 EVs ×1.1 — max speed investment\n= Neutral: 0 EVs, no modifier — no speed investment\n− Negative (Brave/Quiet/Relaxed/Sassy): 0 EVs ×0.9 — TR min speed"}
                >{row.nature === '+' ? '+' : row.nature === '=' ? '=' : '−'}Nat{#if row.natureLocked && likelyBuildsActive}&thinsp;🔒{/if}</button>

                <!-- Spe EV chip (shown when Likely Build is active) -->
                {#if row.speedEV !== undefined}
                  <span class="toggle-pill ev-pill"
                    use:tooltip={`Spe EVs from most common spread (Smogon ${selectedReg}): ${row.speedEV}`}
                  >{row.speedEV} EVs</span>
                {/if}

                <!-- Scarf -->
                <label class="toggle-pill" class:active={row.scarf}
                  use:tooltip={"Choice Scarf: multiplies Speed by ×1.5. Only one Scarf active per side at a time."}>
                  <input type="checkbox" checked={row.scarf} on:change={() => toggleFieldScarf(row.key, row.side)} />
                  Scarf
                </label>

                <!-- Paralysis -->
                <label class="toggle-pill para" class:active={row.paralysis}
                  use:tooltip={"Paralysis: multiplies Speed by ×0.5"}>
                  <input type="checkbox" checked={row.paralysis} on:change={() => toggleFieldParalysis(row.key)} />
                  PAR
                </label>

                <!-- Speed boost stages (Dragon Dance, Agility, etc.) -->
                {#if row.canSpeedBoost}
                  <button class="toggle-pill boost-pill" class:active={row.speedBoostStage > 0}
                    on:click={() => cycleSpeedBoost(row.key, row.maxBoostStage)}
                    use:tooltip={`Speed boost stages from moves (Dragon Dance, Agility, etc.).\nCurrent: +${row.speedBoostStage} stage${row.speedBoostStage !== 1 ? 's' : ''} (×${((2 + row.speedBoostStage) / 2).toFixed(1)})\nClick to cycle: 0 → +1 (×1.5) → +2 (×2.0) → 0`}>
                    +{row.speedBoostStage > 0 ? row.speedBoostStage : '?'} Spd
                  </button>
                {/if}

                <!-- Proto/Quark (only when condition is active) -->
                {#if row.canProtoBoost}
                  {@const protoName = row.protoLabel === 'QD ×1.5' ? 'Quark Drive' : 'Protosynthesis'}
                  {@const protoTrigger = row.protoLabel === 'QD ×1.5' ? 'Electric Terrain' : 'Sun'}
                  <label class="toggle-pill proto" class:active={row.protoBoost}
                    use:tooltip={`${protoName}: ×1.5 Speed when Speed is the highest stat. Activates in ${protoTrigger}${row.protoCondActive ? ' ✓ active' : ''} or via Booster Energy. Toggle on if Speed is the boosted stat.`}>
                    <input type="checkbox" checked={row.protoBoost} on:change={() => toggleFieldProto(row.key)} />
                    {row.protoLabel}
                  </label>
                {/if}

                <!-- Commander (Dondozo only) -->
                {#if row.canCommander}
                  <label class="toggle-pill commander-pill" class:active={row.commander}
                    use:tooltip={"Commander: when Tatsugiri uses Commander, Dondozo gains +2 in all stats including Speed (×2 effective)"}>
                    <input type="checkbox" checked={row.commander} on:change={() => toggleCommander(row.key)} />
                    Cmd
                  </label>
                {/if}

                <!-- Mega toggle: button cycles through forms (base → mega/megaX → megaY → base) -->
                {#if row.megaForms.length === 1}
                  <button
                    class="toggle-pill mega-pill"
                    class:active={row.megaIndex > 0}
                    use:tooltip={`Mega Evolution: ${row.megaForms[0].name} (Base Speed ${row.megaForms[0].baseSpe}). Click to toggle.`}
                    on:click={() => cycleMega(row.key, 1)}
                  >{row.megaIndex > 0 ? row.megaForms[0].name : 'Mega'}</button>
                {:else if row.megaForms.length > 1}
                  <button
                    class="toggle-pill mega-pill"
                    class:active={row.megaIndex > 0}
                    use:tooltip={`Cycle Mega forms — ${row.megaForms.map(f => `${f.name} (Base ${f.baseSpe})`).join(' / ')}. Click to cycle.`}
                    on:click={() => cycleMega(row.key, row.megaForms.length)}
                  >{row.megaIndex === 0 ? 'Mega X/Y' : row.megaForms[row.megaIndex - 1].name}</button>
                {/if}

                <!-- Move reveal -->
                {#if smogonMoves[row.slot.entry.id]?.length}
                  <button
                    class="toggle-pill moves-pill"
                    class:active={openMoves.has(row.key)}
                    use:tooltip={"Show top moves from Smogon usage data for this Pokémon"}
                    on:click={() => toggleMoves(row.key)}
                  >{openMoves.has(row.key) ? '▾ Moves' : '▸ Moves'}</button>
                {/if}
              </div>

              <!-- Move list panel -->
              {#if openMoves.has(row.key) && smogonMoves[row.slot.entry.id]?.length}
                <div class="move-list">
                  {#each smogonMoves[row.slot.entry.id] as move}
                    <span class="move-chip">{move}</span>
                  {/each}
                </div>
              {/if}
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

  .top-bar-right {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .usage-btn {
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
    min-height: 44px;
  }
  .usage-btn:hover { color: var(--text); border-color: var(--text-muted); }
  .usage-btn.active { color: var(--text); border-color: var(--text-muted); }

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
    min-height: 44px;
  }
  .reset-btn:hover { color: var(--text); border-color: var(--text-muted); }

  .smart-nature-btn {
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
    min-height: 44px;
  }
  .smart-nature-btn:hover { color: var(--text); border-color: var(--text-muted); }
  .smart-nature-btn.active { color: var(--text); border-color: var(--text-muted); }

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
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    width: 4.5rem;
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
    min-height: 44px;
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
    font-size: 0.75rem;
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
    font-size: 0.6rem;
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
    font-size: 0.78rem;
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
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    border-radius: 100px;
    border: 1px solid;
    white-space: nowrap;
  }

  .badge.ability {
    color: #6cf5b8; border-color: #6cf5b8;
    background: color-mix(in srgb, #6cf5b8 10%, var(--surface));
  }
  .badge.ability.ability-dim {
    color: var(--text-muted);
    border-color: var(--border);
    background: none;
    opacity: 0.45;
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
    font-size: 0.72rem;
    color: #f56cc8; border-color: #f56cc8;
    background: color-mix(in srgb, #f56cc8 10%, var(--surface));
  }
  .badge.priority-badge.suppressed {
    color: var(--text-muted); border-color: var(--border);
    background: none; opacity: 0.45; text-decoration: line-through;
  }
  .badge.prio-ability-badge {
    font-size: 0.72rem;
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
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 0.6rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    user-select: none;
    min-height: 36px;
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
  .toggle-pill.boost-pill { color: var(--text-muted); }
  .toggle-pill.boost-pill.active {
    color: #f5d76c; border-color: #f5d76c;
    background: color-mix(in srgb, #f5d76c 10%, var(--surface));
  }
  /* Mega pill: gradient border */
  .mega-pill {
    border: 1.5px solid transparent;
    background-clip: padding-box;
    position: relative;
  }
  .mega-pill::before {
    content: '';
    position: absolute;
    inset: -1.5px;
    border-radius: var(--radius-sm);
    background: linear-gradient(to right, #b0e000, #22cc55, #44ddee, #2255cc, #9933ee);
    z-index: -1;
  }
  .mega-pill.active {
    color: #f5c96c;
    background: color-mix(in srgb, #f5c96c 10%, var(--surface));
    background-clip: padding-box;
  }

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

  /* Regulation tabs */
  .reg-tabs {
    display: flex;
    gap: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    flex-shrink: 0;
  }
  .reg-tab {
    padding: 0 0.75rem;
    min-height: 44px;
    background: var(--surface);
    border: none;
    border-right: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.15s, background 0.15s;
  }
  .reg-tab:last-child { border-right: none; }
  .reg-tab:hover { color: var(--text); }
  .reg-tab.active {
    background: color-mix(in srgb, var(--accent) 15%, var(--surface));
    color: var(--accent);
  }
  .reg-tabs.loading { opacity: 0.5; pointer-events: none; }

  /* Moves toggle pill */
  .toggle-pill.moves-pill { color: var(--text-muted); }
  .toggle-pill.moves-pill.active {
    color: #a8d8a8;
    border-color: #a8d8a8;
    background: color-mix(in srgb, #a8d8a8 10%, var(--surface));
  }

  /* Move list panel */
  .move-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.35rem 0.1rem 0.1rem;
  }
  .move-chip {
    font-size: 0.78rem;
    padding: 0.15rem 0.55rem;
    border-radius: 100px;
    border: 1px solid var(--border);
    color: var(--text-muted);
    background: var(--surface);
    white-space: nowrap;
  }

  /* Likely Build: EV pill and item badge */
  .toggle-pill.ev-pill {
    color: #a8c8ff;
    border-color: #a8c8ff;
    cursor: default;
    pointer-events: auto;
  }
  .badge.item-badge {
    background: color-mix(in srgb, #a8c8ff 12%, transparent);
    border: 1px solid color-mix(in srgb, #a8c8ff 40%, transparent);
    color: #a8c8ff;
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
