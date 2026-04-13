<script lang="ts">
  import './styles.css';
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { teamState } from "$lib/stores/teams";
  import type { TeamSlot } from "$lib/stores/teams";
  import {
    calcEffectiveSpeed,
    WEATHER_ABILITY,
    PROTO_ABILITY,
    DEFAULT_CONDITIONS,
  } from "$lib/speedtiers";
  import type { Conditions, NatureTier } from "$lib/speedtiers";
  import { spriteUrl } from "$lib/sprites";
  import {
    getPriorityMoves,
    getPriorityAbilities,
    loadPriorityCache,
    PRIORITY_MOVES,
    loadBoostCache,
    getMaxSpeedBoostStage,
  } from "$lib/priority";
  import type { PriorityMove, PriorityAbility } from "$lib/priority";
  import { tooltip } from "$lib/tooltip";
  import Pill from "$lib/components/ui/Pill/index.svelte";
  import Button from "$lib/components/ui/Button/index.svelte";
  import { displayName as shortName } from "$lib/displayName";
  import { abilityDesc, moveSummary } from "$lib/dexInfo";
  import {
    loadSmogonPriorityMoves,
    loadSmogonAbilities,
    loadSmogonMoves,
    loadSmogonBuilds,
    loadChampionsMoves,
    loadChampionsAbilities,
    loadChampionsBuilds,
    loadChampionsAbilitiesFull,
    loadChampionsMovesFull,
  } from "$lib/smogonUsage";
  import type {
    UsagePriorityMoves,
    UsageAbilities,
    UsageMoves,
    UsageBuilds,
    UsageAbilitiesFull,
    UsageMovesFull,
  } from "$lib/smogonUsage";

  const CHAMPIONS_FORMAT = "champions-ma";

  const GEN9_REGS = [
    { label: "Champions", format: CHAMPIONS_FORMAT },
    { label: "Reg I", format: "gen9vgc2026regi" },
  ];

  let priorityReady = false;
  let smogonReady = false;
  let selectedReg = GEN9_REGS[0].format;
  let smogonPriorityMoves: UsagePriorityMoves = {};
  let smogonAbilities: UsageAbilities = {};
  let smogonMoves: UsageMoves = {};
  let smogonBuilds: UsageBuilds = {};
  let champAbilitiesFull: UsageAbilitiesFull = {};
  let champMovesFull: UsageMovesFull = {};

  // ── Team data ──────────────────────────────────────────────────────────────
  let yourTeam: TeamSlot[] = Array(6).fill(null);
  let oppTeam: TeamSlot[] = Array(6).fill(null);

  async function loadUsageData(format: string) {
    if (format === CHAMPIONS_FORMAT) {
      const [moves, abilities, builds, abilitiesFull, movesFull] =
        await Promise.all([
          loadChampionsMoves(),
          loadChampionsAbilities(),
          loadChampionsBuilds(),
          loadChampionsAbilitiesFull(),
          loadChampionsMovesFull(),
        ]);
      smogonMoves = moves;
      smogonAbilities = abilities;
      smogonBuilds = builds;
      champAbilitiesFull = abilitiesFull;
      champMovesFull = movesFull;
      smogonPriorityMoves = {};
    } else {
      [smogonPriorityMoves, smogonAbilities, smogonMoves, smogonBuilds] =
        await Promise.all([
          loadSmogonPriorityMoves(9, format),
          loadSmogonAbilities(9, format),
          loadSmogonMoves(9, format),
          loadSmogonBuilds(9, format),
        ]);
      champAbilitiesFull = {};
      champMovesFull = {};
    }
  }

  onMount(async () => {
    const state = get(teamState);
    yourTeam = state.yourTeam;
    oppTeam = state.oppTeam;
    await Promise.all([loadPriorityCache(), loadBoostCache()]);
    priorityReady = true;
    await loadUsageData(selectedReg);
    smogonReady = true;
  });

  async function changeReg(format: string) {
    smogonReady = false;
    selectedReg = format;
    await loadUsageData(format);
    smogonReady = true;
    // Re-apply likely builds if active (data changed for new reg)
    if (likelyBuildsActive) {
      const applyFor = (
        side: "you" | "opp",
        field: Set<number>,
        team: TeamSlot[],
      ) => {
        field.forEach((i) => {
          const slot = team[i];
          if (!slot) return;
          const key = `${side}-${i}`;
          const build = smogonBuilds[slot.entry.id];
          if (!build) return;
          if (!(side === "you" && slot.natureLocked))
            fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === "Choice Scarf") fieldScarfs.set(key, true);
        });
      };
      applyFor("you", yourField, yourTeam);
      applyFor("opp", oppField, oppTeam);
      fieldNature = new Map(fieldNature);
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldScarfs = new Map(fieldScarfs);
    }
  }

  // ── Usage-based toggles (declared early — used in toggleField) ───────────
  let likelyItemsActive = false;
  let likelyMovesActive = false;
  let likelyAbilitiesActive = false;
  let likelyBuildsActive = false; // EV/Nature

  // ── Field selection ────────────────────────────────────────────────────────
  let yourField = new Set<number>();
  let oppField = new Set<number>();

  function toggleField(side: "you" | "opp", index: number) {
    const set = side === "you" ? yourField : oppField;
    const team = side === "you" ? yourTeam : oppTeam;
    const key = `${side}-${index}`;
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
      if (!fieldNature.has(key)) fieldNature.set(key, "=");
      // Auto-apply likely build if mode is active
      if (likelyBuildsActive && team[index]) {
        const build = smogonBuilds[team[index]!.entry.id];
        if (build) {
          if (!(side === "you" && team[index]!.natureLocked))
            fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === "Choice Scarf") fieldScarfs.set(key, true);
        }
      }
    }
    yourField = new Set(yourField);
    oppField = new Set(oppField);
    fieldScarfs = new Map(fieldScarfs);
    fieldParalysis = new Map(fieldParalysis);
    fieldNature = new Map(fieldNature);
    fieldSpeedEV = new Map(fieldSpeedEV);
  }

  // ── Per-field toggles ─────────────────────────────────────────────────────
  let fieldScarfs = new Map<string, boolean>();
  let fieldParalysis = new Map<string, boolean>();
  let fieldSpeedDown = new Map<string, boolean>(); // −1 stage from Icy Wind / Sticky Web
  let fieldProto = new Map<string, boolean>();
  let fieldNature = new Map<string, NatureTier>();
  let fieldCommander = new Map<string, boolean>();
  let fieldMega = new Map<string, number>(); // 0=base, 1=mega/megaX, 2=megaY
  let fieldSpeedBoost = new Map<string, number>(); // 0=off, 1=+1 stage, 2=+2 stages
  let fieldSpeedEV = new Map<string, number>(); // Spe EV from likely build (0-252)
  let fieldSpeedStage = new Map<string, number>(); // per-pokemon speed stage (negative allowed)

  /** Returns true if the item name is a mega stone (e.g. Charizardite X, Gengarite). */
  function isMegaStone(item: string | undefined): boolean {
    if (!item) return false;
    return /ite( [XY])?$/i.test(item);
  }

  function toggleTSlotScarf(side: "you" | "opp", i: number) {
    const team = side === "you" ? yourTeam : oppTeam;
    const slot = team[i];
    if (!slot) return;
    const newSlot = { ...slot, scarf: !slot.scarf };
    if (side === "you")
      yourTeam = yourTeam.map((s, idx) => (idx === i ? newSlot : s));
    else oppTeam = oppTeam.map((s, idx) => (idx === i ? newSlot : s));
    // Also sync fieldScarfs if this slot is currently on the field
    const fieldSet = side === "you" ? yourField : oppField;
    if (fieldSet.has(i)) {
      const key = `${side}-${i}`;
      // Scarf is mutually exclusive per side — mirror toggleFieldScarf logic
      fieldSet.forEach((fi) => fieldScarfs.set(`${side}-${fi}`, false));
      if (newSlot.scarf) fieldScarfs.set(key, true);
      fieldScarfs = new Map(fieldScarfs);
    }
  }

  function toggleFieldScarf(key: string, side: "you" | "opp") {
    const wasOn = fieldScarfs.get(key) ?? false;
    const fieldSet = side === "you" ? yourField : oppField;
    fieldSet.forEach((i) => fieldScarfs.set(`${side}-${i}`, false));
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
    const cur = fieldNature.get(key) ?? "=";
    // = (neutral) → + (positive) → - (negative) → = …
    const next: NatureTier = cur === "=" ? "+" : cur === "+" ? "-" : "=";
    fieldNature.set(key, next);
    fieldNature = new Map(fieldNature);
  }

  function toggleCommander(key: string) {
    fieldCommander.set(key, !(fieldCommander.get(key) ?? false));
    fieldCommander = new Map(fieldCommander);
  }

  function adjustSpeedStage(key: string, delta: number) {
    const cur = fieldSpeedStage.get(key) ?? 0;
    fieldSpeedStage.set(key, Math.max(-6, Math.min(6, cur + delta)));
    fieldSpeedStage = new Map(fieldSpeedStage);
  }

  function cycleMega(key: string, numForms: number) {
    const cur = fieldMega.get(key) ?? 0;
    fieldMega.set(key, (cur + 1) % (numForms + 1));
    fieldMega = new Map(fieldMega);
  }

  // ── Conditions ─────────────────────────────────────────────────────────────
  let cond: Conditions = { ...DEFAULT_CONDITIONS };

  function toggleWeather(w: "rain" | "sun" | "sand" | "snow") {
    const was = cond[w];
    cond = { ...cond, rain: false, sun: false, sand: false, snow: false };
    if (!was) cond[w] = true;
  }

  function toggleTerrain(t: "electric" | "grassy" | "psychic") {
    const was = cond[t];
    cond = { ...cond, electric: false, grassy: false, psychic: false };
    if (!was) cond[t] = true;
  }

  // ── Speed order ────────────────────────────────────────────────────────────
  type FieldRow = {
    key: string;
    side: "you" | "opp";
    slot: NonNullable<TeamSlot>;
    scarf: boolean;
    paralysis: boolean;
    nature: NatureTier;
    natureLocked: boolean;
    canProtoBoost: boolean;
    protoBoost: boolean;
    protoCondActive: boolean;
    protoLabel: string;
    canCommander: boolean;
    commander: boolean;
    megaForms: import("$lib/speedtiers").MegaStats[];
    megaIndex: number;
    effectiveSpeed: number;
    speedEV: number | undefined; // set when likely build is active
    weatherAbility: string | null; // always set if has a weather/terrain ability
    weatherTriggered: boolean; // true only when the relevant condition is active
    canSpeedBoost: boolean;
    maxBoostStage: number;
    speedBoostStage: number;
    speedDown: boolean;
    speedStage: number;
    hasMegaStone: boolean;
    priorityMoves: PriorityMove[];
    priorityAbilities: PriorityAbility[];
  };

  $: fieldRows = (() => {
    void priorityReady;
    void likelyMovesActive;
    void likelyAbilitiesActive;
    void likelyBuildsActive;

    const rows: FieldRow[] = [];

    const buildRow = (
      side: "you" | "opp",
      i: number,
      slot: NonNullable<TeamSlot>,
    ) => {
      const key = `${side}-${i}`;
      const scarf = fieldScarfs.get(key) ?? false;
      const paralysis = fieldParalysis.get(key) ?? false;
      const nature = fieldNature.get(key) ?? "+";
      const commander = fieldCommander.get(key) ?? false;

      // Proto/Quark: always show toggle (can be triggered by Booster Energy regardless of weather/terrain)
      const protoAbilityId = slot.entry.abilities.find((a) => PROTO_ABILITY[a]);
      const canProtoBoost = !!protoAbilityId;
      const protoBoost = canProtoBoost && (fieldProto.get(key) ?? false);
      const protoCondition = protoAbilityId
        ? PROTO_ABILITY[protoAbilityId]
        : null;
      const protoCondActive = !!protoCondition && !!cond[protoCondition];
      const protoLabel =
        protoAbilityId === "quarkdrive" ? "QD ×1.5" : "PS ×1.5";

      const canCommander = slot.entry.id === "dondozo";
      const megaForms = slot.entry.megaForms;
      const megaIndex = fieldMega.get(key) ?? 0;

      // When likelyAbilitiesActive, narrow to the top-used ability only (stored as display name → convert to id)
      const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const effectiveAbilities =
        likelyAbilitiesActive && smogonAbilities[slot.entry.id]
          ? [toId(smogonAbilities[slot.entry.id].name)]
          : slot.entry.abilities;

      // Weather/terrain ability — always find it, separately track if triggered
      const ABILITY_NAMES: Record<string, string> = {
        swiftswim: "Swift Swim",
        chlorophyll: "Chlorophyll",
        sandrush: "Sand Rush",
        slushrush: "Slush Rush",
        surgesurfer: "Surge Surfer",
      };
      const weatherAbilityId = !megaIndex
        ? (effectiveAbilities.find((a) => WEATHER_ABILITY[a]) ?? null)
        : null;
      const weatherAbility = weatherAbilityId
        ? (ABILITY_NAMES[weatherAbilityId] ?? weatherAbilityId)
        : null;
      const weatherTriggered =
        !!weatherAbilityId && !!cond[WEATHER_ABILITY[weatherAbilityId]!];

      const natureLocked = side === "you" && (slot.natureLocked ?? false);

      // Speed boost from moves (Dragon Dance, Agility, etc.)
      const maxBoostStage = getMaxSpeedBoostStage(slot.entry.id);
      const canSpeedBoost = maxBoostStage > 0;
      const speedBoostStage = canSpeedBoost
        ? (fieldSpeedBoost.get(key) ?? 0)
        : 0;

      // Priority moves: learnset-based normally, usage-filtered when likelyMovesActive
      const effectivePriorityMoves =
        likelyMovesActive && smogonPriorityMoves[slot.entry.id]
          ? smogonPriorityMoves[slot.entry.id]
              .map((id) => PRIORITY_MOVES[id])
              .filter((m): m is PriorityMove => !!m)
          : getPriorityMoves(slot.entry.id);

      const speedEV = fieldSpeedEV.get(key);
      const speedDown = fieldSpeedDown.get(key) ?? false;
      const speedStage = fieldSpeedStage.get(key) ?? 0;
      const hasMegaStone = isMegaStone(slot.item);

      rows.push({
        key,
        side,
        slot,
        scarf,
        paralysis,
        speedDown,
        speedStage,
        hasMegaStone,
        nature,
        natureLocked,
        canProtoBoost,
        protoBoost,
        protoCondActive,
        protoLabel,
        canCommander,
        commander,
        megaForms,
        megaIndex,
        weatherAbility,
        weatherTriggered,
        canSpeedBoost,
        maxBoostStage,
        speedBoostStage,
        speedEV,
        effectiveSpeed: (() => {
          let spd = calcEffectiveSpeed(
            slot.entry,
            side,
            {
              scarf,
              paralysis,
              speedDown,
              protoBoost,
              commander,
              natureTier: nature,
              megaIndex,
              speedBoostStage,
              speedEV,
            },
            cond,
          );
          if (speedStage > 0)
            spd = Math.floor(spd * (2 + speedStage) / 2);
          else if (speedStage < 0)
            spd = Math.floor(spd * 2 / (2 + Math.abs(speedStage)));
          return spd;
        })(),
        priorityMoves: effectivePriorityMoves,
        priorityAbilities: getPriorityAbilities(effectiveAbilities),
      });
    };

    yourField.forEach((i) => {
      const s = yourTeam[i];
      if (s) buildRow("you", i, s);
    });
    oppField.forEach((i) => {
      const s = oppTeam[i];
      if (s) buildRow("opp", i, s);
    });

    rows.sort((a, b) =>
      cond.trickRoom
        ? a.effectiveSpeed - b.effectiveSpeed
        : b.effectiveSpeed - a.effectiveSpeed,
    );

    return rows;
  })();

  function toggleLikelyMoves() {
    likelyMovesActive = !likelyMovesActive;
  }

  function toggleLikelyBuilds() {
    if (likelyBuildsActive) {
      // Clear EV overrides; reset natures to neutral
      yourField.forEach((i) => {
        fieldSpeedEV.delete(`you-${i}`);
        fieldNature.set(`you-${i}`, "=");
      });
      oppField.forEach((i) => {
        fieldSpeedEV.delete(`opp-${i}`);
        fieldNature.set(`opp-${i}`, "=");
      });
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldNature = new Map(fieldNature);
      likelyBuildsActive = false;
    } else {
      // Apply most common build to every fielded Pokémon
      const applyFor = (
        side: "you" | "opp",
        field: Set<number>,
        team: TeamSlot[],
      ) => {
        field.forEach((i) => {
          const slot = team[i];
          if (!slot) return;
          const key = `${side}-${i}`;
          const build = smogonBuilds[slot.entry.id];
          if (!build) return;
          if (!(side === "you" && slot.natureLocked))
            fieldNature.set(key, build.nature);
          fieldSpeedEV.set(key, build.speEV);
          if (build.item === "Choice Scarf") fieldScarfs.set(key, true);
        });
      };
      applyFor("you", yourField, yourTeam);
      applyFor("opp", oppField, oppTeam);
      fieldSpeedEV = new Map(fieldSpeedEV);
      fieldNature = new Map(fieldNature);
      fieldScarfs = new Map(fieldScarfs);
      likelyBuildsActive = true;
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetGame() {
    yourField = new Set();
    oppField = new Set();
    fieldScarfs = new Map();
    fieldParalysis = new Map();
    fieldProto = new Map();
    fieldNature = new Map();
    fieldCommander = new Map();
    fieldMega = new Map();
    fieldSpeedBoost = new Map();
    fieldSpeedEV = new Map();

    cond = { ...DEFAULT_CONDITIONS };
    likelyItemsActive = false;
    likelyMovesActive = false;
    likelyAbilitiesActive = false;
    likelyBuildsActive = false;
    goto("/");
  }
</script>

<svelte:head>
  <title>Turn Order Calculator — Turnadus | Pokémon VGC &amp; Champions</title>
  <meta
    name="description"
    content="Calculate Pokémon turn order for VGC and Pokémon Champions. Enter both teams, apply weather, terrain, and items to instantly see who moves first every turn."
  />
  <meta property="og:title" content="Turn Order Calculator — Turnadus" />
  <meta
    property="og:description"
    content="Calculate who goes first in any Pokémon Champions or VGC matchup. Real-time speed comparison with weather, terrain, and item support."
  />
  <meta property="og:url" content="https://turnadus.com/game" />
</svelte:head>

<div class="page">
  <!-- Top bar -->
  <div class="top-bar">
    <button class="reset-btn" on:click={resetGame}>← New Game</button>
    <div class="top-bar-right">
      {#if likelyAbilitiesActive || likelyItemsActive || likelyMovesActive || likelyBuildsActive}
        <div
          class="reg-tabs"
          class:loading={!smogonReady}
          use:tooltip={"Switch usage data source"}
        >
          {#each GEN9_REGS as reg}
            <button
              class="reg-tab"
              class:active={selectedReg === reg.format}
              on:click={() => changeReg(reg.format)}>{reg.label}</button
            >
          {/each}
        </div>
      {/if}
      <div class="reg-tabs usage-tabs">
        <button
          class="reg-tab"
          class:active={likelyAbilitiesActive}
          use:tooltip={likelyAbilitiesActive
            ? "Hiding ability usage — click to show"
            : "Show ability usage per Pokémon from usage stats"}
          on:click={() => (likelyAbilitiesActive = !likelyAbilitiesActive)}
          >Abilities</button
        >
        <button
          class="reg-tab"
          class:active={likelyItemsActive}
          use:tooltip={likelyItemsActive
            ? "Hiding most common item — click to show"
            : "Show most common item per Pokémon from usage stats"}
          on:click={() => (likelyItemsActive = !likelyItemsActive)}
          >Items</button
        >
        <button
          class="reg-tab"
          class:active={likelyMovesActive}
          use:tooltip={likelyMovesActive
            ? "Hiding most common moves — click to show"
            : "Show top 4 moves per Pokémon from usage stats"}
          on:click={toggleLikelyMoves}>Moves</button
        >
        <button
          class="reg-tab"
          class:active={likelyBuildsActive}
          use:tooltip={likelyBuildsActive
            ? "Reverting EV spread & nature — click to reset"
            : "Apply most common EV spread & nature per Pokémon from usage stats"}
          on:click={toggleLikelyBuilds}>EV/Nature</button
        >
      </div>
    </div>
  </div>

  <!-- Team rows -->
  <div class="teams">
    {#each [{ side: "you" as const, team: yourTeam, fieldSet: yourField, label: "Your Team" }, { side: "opp" as const, team: oppTeam, fieldSet: oppField, label: "Opponent" }] as { side, team, fieldSet, label }}
      <div class="team-row">
        <span
          class="team-label"
          class:you={side === "you"}
          class:opp={side === "opp"}
        >
          {label}
          <span class="pick-hint">pick 2</span>
        </span>
        <div class="team-slots">
          {#each team as slot, i}
            {@const slotKey = `${side}-${i}`}
            {@const megaIdx = fieldMega.get(slotKey) ?? 0}
            {@const activeMegaForm =
              slot && megaIdx > 0 ? slot.entry.megaForms[megaIdx - 1] : null}
            {@const displayName = activeMegaForm
              ? activeMegaForm.name
              : (slot?.entry.name ?? "")}
            {@const displayTypes = activeMegaForm
              ? activeMegaForm.types
              : (slot?.entry.types ?? [])}
            <div class="tslot-wrapper">
              <button
                class="tslot"
                class:has-mon={!!slot}
                class:on-field={fieldSet.has(i)}
                class:side-you={side === "you"}
                class:side-opp={side === "opp"}
                disabled={!slot}
                aria-pressed={fieldSet.has(i)}
                aria-label={slot
                  ? `${displayName} — ${fieldSet.has(i) ? "on field, click to remove" : "click to put on field"}`
                  : "Empty slot"}
                on:click={() => toggleField(side, i)}
              >
                {#if slot}
                  <img
                    src={spriteUrl(displayName)}
                    alt={displayName}
                    class="tslot-sprite"
                  />
                  <div class="tslot-types">
                    {#each displayTypes as t}
                      <span class="type-pip type-{t.toLowerCase()}">{t}</span>
                    {/each}
                  </div>
                {:else}
                  <span class="tslot-empty">—</span>
                {/if}
              </button>

              {#if slot}
                <div class="tslot-meta">
                  <span class="tslot-name">{shortName(displayName)}</span>
                  <div class="tslot-stats">
                    <span class="tslot-spe">{slot.entry.baseSpe}</span>
                    <Pill
                      color="#f5c96c"
                      active={slot.scarf}
                      interactive
                      on:click={() => toggleTSlotScarf(side, i)}>Scarf</Pill
                    >
                  </div>
                </div>
              {/if}
            </div>
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
        <Button
          variant="toggle"
          class="cond-btn"
          active={cond.trickRoom}
          tooltip={"Trick Room: reverses Speed order for 5 turns — slower Pokémon move first"}
          onClick={() => (cond = { ...cond, trickRoom: !cond.trickRoom })}
          >Trick Room</Button
        >
        <Button
          variant="toggle"
          class="cond-btn"
          active={cond.yourTailwind}
          tooltip={"Your Tailwind: doubles Speed for your side for 4 turns (×2)"}
          onClick={() => (cond = { ...cond, yourTailwind: !cond.yourTailwind })}
          >Your TW</Button
        >
        <Button
          variant="toggle"
          class="cond-btn"
          active={cond.oppTailwind}
          tooltip={"Opponent Tailwind: doubles Speed for the opponent's side for 4 turns (×2)"}
          onClick={() => (cond = { ...cond, oppTailwind: !cond.oppTailwind })}
          >Opp TW</Button
        >
      </div>
    </div>
    <div class="cond-group">
      <span class="cond-group-label">Weather</span>
      <div class="cond-group-btns">
        {#each [{ key: "rain" as const, label: "Rain", tip: "Rain: doubles Speed of Swift Swim users (Kingdra, Barraskewda, etc.)" }, { key: "sun" as const, label: "Sun", tip: "Sun: doubles Speed of Chlorophyll users (Venusaur, Lilligant, etc.) and activates Protosynthesis" }, { key: "sand" as const, label: "Sand", tip: "Sand: doubles Speed of Sand Rush users (Excadrill, Sandaconda, etc.)" }, { key: "snow" as const, label: "Snow", tip: "Snow: doubles Speed of Slush Rush users (Beartic, Cetitan, etc.)" }] as btn}
          <Button
            variant="toggle"
            class="cond-btn"
            active={cond[btn.key]}
            tooltip={btn.tip}
            onClick={() => toggleWeather(btn.key)}>{btn.label}</Button
          >
        {/each}
      </div>
    </div>
    <div class="cond-group">
      <span class="cond-group-label">Terrain</span>
      <div class="cond-group-btns">
        {#each [{ key: "electric" as const, label: "Electric", tip: "Electric Terrain: doubles Speed of Surge Surfer users (Raichu-Alola) and activates Quark Drive" }, { key: "grassy" as const, label: "Grassy", tip: "Grassy Terrain: gives Grassy Glide +1 priority. Halves damage from Earthquake/Bulldoze." }, { key: "psychic" as const, label: "Psychic", tip: "Psychic Terrain: blocks all +1 and higher priority moves targeting grounded Pokémon" }] as btn}
          <Button
            variant="toggle"
            class="cond-btn"
            active={cond[btn.key]}
            tooltip={btn.tip}
            onClick={() => toggleTerrain(btn.key)}>{btn.label}</Button
          >
        {/each}
      </div>
    </div>
  </div>

  <!-- Speed order -->
  <div class="speed-section">
    <div class="speed-header">
      <span class="section-title">
        Speed Order
        {#if cond.trickRoom}<Pill color="#c46cf5">Trick Room</Pill>{/if}
        {#if cond.yourTailwind}<Pill
            color="#52b44b"
            tooltip={"Your Tailwind: ×2 Speed for your side"}>My Tailwind</Pill
          >{/if}
        {#if cond.oppTailwind}<Pill
            color="#e8622d"
            tooltip={"Opponent Tailwind: ×2 Speed for opponent's side"}
            >Opp Tailwind</Pill
          >{/if}
      </span>
      {#if fieldRows.length === 0}
        <span class="empty-hint"
          >Click Pokémon above to put them on the field</span
        >
      {/if}
    </div>

    {#if fieldRows.length > 0}
      <div class="speed-list">
        {#each fieldRows as row, i}
          {@const activeMega =
            row.megaIndex > 0 ? row.megaForms[row.megaIndex - 1] : null}
          {@const displayName = activeMega
            ? activeMega.name
            : row.slot.entry.name}
          <div
            class="speed-row"
            class:side-you={row.side === "you"}
            class:side-opp={row.side === "opp"}
          >
            <span class="pos">{i + 1}</span>
            <img
              src={spriteUrl(displayName)}
              alt={displayName}
              class="row-sprite"
            />

            <div class="row-main">
              <div class="row-top">
                <span class="row-name">{displayName}</span>
                <div class="row-badges">
                  {#if row.megaIndex > 0}
                    {@const mf = row.megaForms[row.megaIndex - 1]}
                    <Pill
                      color="#f5d76c"
                      tooltip={`${mf?.name}: Base Speed ${mf?.baseSpe} (toggled via Mega button below)`}
                      >{mf?.name ?? "Mega"}</Pill
                    >
                  {/if}
                  {#if row.weatherAbility}
                    <Pill
                      color="#6cf5b8"
                      active={row.weatherTriggered}
                      tooltip={`${row.weatherAbility}: ×2 Speed${row.weatherTriggered ? " ✓ active" : " — inactive (no matching weather/terrain)"}`}
                      >{row.weatherAbility}</Pill
                    >
                  {/if}
                  {#if row.protoBoost}
                    <Pill
                      color="#6cf5e0"
                      tooltip={`${row.protoLabel === "QD ×1.5" ? "Quark Drive" : "Protosynthesis"}: ×1.5 Speed when Speed is the boosted stat`}
                      >{row.protoLabel}</Pill
                    >
                  {/if}
                  {#if row.commander}
                    <Pill
                      color="#6ca5f5"
                      tooltip={"Commander: Tatsugiri entered Dondozo's mouth — +2 Speed stages (×2)"}
                      >Cmd ×2</Pill
                    >
                  {/if}
                  {#if row.scarf}
                    <Pill color="#f5c96c" tooltip={"Choice Scarf: ×1.5 Speed"}
                      >Scarf ×1.5</Pill
                    >
                  {/if}
                  {#if row.paralysis}
                    <Pill color="#f5a06c" tooltip={"Paralysis: ×0.5 Speed"}
                      >PAR ×0.5</Pill
                    >
                  {/if}
                  {#each row.priorityMoves as pm}
                    {@const active =
                      !cond.psychic &&
                      (!pm.requiresCondition ||
                        cond[pm.requiresCondition as keyof typeof cond])}
                    {@const tipText = cond.psychic
                      ? `${pm.name}: blocked by Psychic Terrain (priority moves don't work on grounded Pokémon)`
                      : pm.requiresCondition &&
                          !cond[pm.requiresCondition as keyof typeof cond]
                        ? `${pm.name}: only has +${pm.priority} priority under ${pm.requiresCondition} terrain`
                        : `This Pokémon may know ${pm.name} — a +${pm.priority} priority move${pm.note ? ` (${pm.note})` : ""}`}
                    <Pill
                      color="#f56cc8"
                      {active}
                      strikethrough={!active}
                      tooltip={tipText}
                      >{pm.name} {pm.priority > 0 ? "+" : ""}{pm.priority}</Pill
                    >
                  {/each}
                  {#each row.priorityAbilities as pa}
                    <Pill color="#c46cf5" tooltip={`${pa.name}: ${pa.effect}`}
                      >{pa.name}</Pill
                    >
                  {/each}
                  {#if likelyAbilitiesActive && smogonAbilities[row.slot.entry.id]}
                    {@const ab = smogonAbilities[row.slot.entry.id]}
                    <Pill color="#d4a8ff" tooltip={ab.desc}>{ab.name}</Pill>
                  {/if}
                  {#if row.megaIndex > 0}
                    {@const stone = row.megaForms[row.megaIndex - 1].megaStone}
                    <Pill color="#a8c8ff" tooltip={`Mega Stone: ${stone}`}
                      >{stone}</Pill
                    >
                  {:else if likelyItemsActive}
                    {@const build = smogonBuilds[row.slot.entry.id]}
                    {#if build?.item && build.item !== "Choice Scarf"}
                      <Pill
                        color="#a8c8ff"
                        tooltip={`Most common item (${selectedReg === CHAMPIONS_FORMAT ? "Champions M-A" : "Smogon " + selectedReg}): ${build.item}`}
                        >{build.item}</Pill
                      >
                    {/if}
                  {/if}
                </div>
              </div>

              <div class="row-toggles">
                <!-- Nature: cycles = → + → - -->
                <button
                  class="toggle-pill nature-pill"
                  class:nature-pos={row.nature === "+"}
                  class:nature-neu={row.nature === "="}
                  class:nature-neg={row.nature === "-"}
                  on:click={() => cycleNature(row.key)}
                  use:tooltip={row.natureLocked
                    ? "Nature from pokepaste (known)"
                    : "Speed nature — click to cycle\n+ Positive (Timid/Jolly/Naive/Hasty): 252 EVs ×1.1 — max speed investment\n= Neutral: 0 EVs, no modifier — no speed investment\n− Negative (Brave/Quiet/Relaxed/Sassy): 0 EVs ×0.9 — TR min speed"}
                  >{row.nature === "+"
                    ? "+"
                    : row.nature === "="
                      ? "="
                      : "−"}Nat{#if likelyBuildsActive && !row.natureLocked}<span
                      class="nature-assumed">*</span
                    >{/if}</button
                >

                <!-- Spe EV chip (shown when Likely Build is active) -->
                {#if row.speedEV !== undefined}
                  <span
                    class="toggle-pill ev-pill"
                    use:tooltip={`Spe EVs from most common spread (Smogon ${selectedReg}): ${row.speedEV}`}
                    >{row.speedEV} EVs</span
                  >
                {/if}

                <!-- Scarf — hidden when mega evolved or holding a mega stone -->
                {#if row.megaIndex === 0 && !row.hasMegaStone}
                  <label
                    class="toggle-pill scarf-pill"
                    class:active={row.scarf}
                    use:tooltip={"Choice Scarf: multiplies Speed by ×1.5. Only one Scarf active per side at a time."}
                  >
                    <input
                      type="checkbox"
                      checked={row.scarf}
                      on:change={() => toggleFieldScarf(row.key, row.side)}
                    />
                    Scarf
                  </label>
                {/if}

                <!-- Paralysis -->
                <label
                  class="toggle-pill para par-pill"
                  class:active={row.paralysis}
                  use:tooltip={"Paralysis: multiplies Speed by ×0.5"}
                >
                  <input
                    type="checkbox"
                    checked={row.paralysis}
                    on:change={() => toggleFieldParalysis(row.key)}
                  />
                  PAR
                </label>

                <!-- Proto/Quark (only when condition is active) -->
                {#if row.canProtoBoost}
                  {@const protoName =
                    row.protoLabel === "QD ×1.5"
                      ? "Quark Drive"
                      : "Protosynthesis"}
                  {@const protoTrigger =
                    row.protoLabel === "QD ×1.5" ? "Electric Terrain" : "Sun"}
                  <label
                    class="toggle-pill proto"
                    class:active={row.protoBoost}
                    use:tooltip={`${protoName}: ×1.5 Speed when Speed is the highest stat. Activates in ${protoTrigger}${row.protoCondActive ? " ✓ active" : ""} or via Booster Energy. Toggle on if Speed is the boosted stat.`}
                  >
                    <input
                      type="checkbox"
                      checked={row.protoBoost}
                      on:change={() => toggleFieldProto(row.key)}
                    />
                    {row.protoLabel}
                  </label>
                {/if}

                <!-- Commander (Dondozo only) -->
                {#if row.canCommander}
                  <label
                    class="toggle-pill commander-pill"
                    class:active={row.commander}
                    use:tooltip={"Commander: when Tatsugiri uses Commander, Dondozo gains +2 in all stats including Speed (×2 effective)"}
                  >
                    <input
                      type="checkbox"
                      checked={row.commander}
                      on:change={() => toggleCommander(row.key)}
                    />
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
                    >{row.megaIndex > 0
                      ? row.megaForms[0].name
                      : "Mega"}</button
                  >
                {:else if row.megaForms.length > 1}
                  <button
                    class="toggle-pill mega-pill"
                    class:active={row.megaIndex > 0}
                    use:tooltip={`Cycle Mega forms — ${row.megaForms.map((f) => `${f.name} (Base ${f.baseSpe})`).join(" / ")}. Click to cycle.`}
                    on:click={() => cycleMega(row.key, row.megaForms.length)}
                    >{row.megaIndex === 0
                      ? "Mega X/Y"
                      : row.megaForms[row.megaIndex - 1].name}</button
                  >
                {/if}

                <!-- Per-pokemon speed stage -->
                <div class="stage-group">
                  <button class="toggle-pill stage-btn" on:click={() => adjustSpeedStage(row.key, -1)} use:tooltip={"−1 Speed stage"}>Spe −</button>
                  <button class="toggle-pill stage-btn" on:click={() => adjustSpeedStage(row.key, +1)} use:tooltip={"+1 Speed stage"}>Spe +</button>
                  <span class="stage-val">Stage {row.speedStage > 0 ? `+${row.speedStage}` : row.speedStage}</span>
                </div>
              </div>

              <!-- Abilities list panel -->
              {#if likelyAbilitiesActive}
                {@const activeMega =
                  row.megaIndex > 0 ? row.megaForms[row.megaIndex - 1] : null}
                {#if activeMega?.ability}
                  <div class="move-list">
                    <span
                      class="move-chip ability-chip"
                      use:tooltip={[
                        activeMega.ability,
                        abilityDesc(activeMega.ability),
                      ]
                        .filter(Boolean)
                        .join(": ")}>{activeMega.ability}</span
                    >
                  </div>
                {:else}
                  {@const fullList = champAbilitiesFull[row.slot.entry.id]}
                  {@const topAbility = smogonAbilities[row.slot.entry.id]}
                  {#if fullList?.length}
                    <div class="move-list">
                      {#each fullList as ab}
                        <span
                          class="move-chip ability-chip"
                          use:tooltip={[
                            ab.name,
                            abilityDesc(ab.name),
                            `${ab.pct}% of teams (${ab.count} recorded)`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          >{ab.name}
                          <span class="move-pct">{ab.pct}%</span></span
                        >
                      {/each}
                    </div>
                  {:else if topAbility}
                    <div class="move-list">
                      <span
                        class="move-chip ability-chip"
                        use:tooltip={[
                          topAbility.name,
                          abilityDesc(topAbility.name),
                          topAbility.desc,
                        ]
                          .filter(Boolean)
                          .join(" · ")}>{topAbility.name}</span
                      >
                    </div>
                  {/if}
                {/if}
              {/if}

              <!-- Move list panel -->
              {#if likelyMovesActive && smogonMoves[row.slot.entry.id]?.length}
                <div class="move-list">
                  {#each smogonMoves[row.slot.entry.id] as move, mi}
                    {@const moveFull = champMovesFull[row.slot.entry.id]?.[mi]}
                    <span
                      class="move-chip"
                      use:tooltip={[
                        moveSummary(move),
                        moveFull ? `${moveFull.pct}% of teams` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      >{move}{#if moveFull}
                        <span class="move-pct">{moveFull.pct}%</span>{/if}</span
                    >
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
  <div class="tooltip">
    Speed stats are assumed to be for level 50, all 31 IV pokemon with no EVs
    invested in speed. Enable the build button to see likely speed altering
    natures as well as your own from the pokepaste.
  </div>

