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
  import type { TeamSlot as TeamSlotData } from "$lib/stores/teams";
  import { savedTeams } from "$lib/stores/savedTeams";
  import type { SavedTeam } from "$lib/stores/savedTeams";
  import PokemonPicker from "$lib/components/PokemonPicker/index.svelte";
  import Button from "$lib/components/ui/Button/index.svelte";
  import Input from "$lib/components/ui/Input/index.svelte";
  import TeamSlot from "$lib/components/ui/TeamSlot/index.svelte";
  import SavedTeamCard from "$lib/components/ui/SavedTeamCard/index.svelte";
  import TabGroup from "$lib/components/ui/TabGroup/index.svelte";
  import { loadSmogonOrder } from "$lib/smogonUsage";

  // Regulation M-A allowed Pokémon (Pokémon Champions)
  const REG_MA = new Set([
    "venusaur",
    "charizard",
    "blastoise",
    "beedrill",
    "pidgeot",
    "arbok",
    "pikachu",
    "raichu",
    "clefable",
    "ninetales",
    "arcanine",
    "alakazam",
    "machamp",
    "victreebel",
    "slowbro",
    "gengar",
    "kangaskhan",
    "starmie",
    "pinsir",
    "tauros",
    "gyarados",
    "ditto",
    "vaporeon",
    "jolteon",
    "flareon",
    "aerodactyl",
    "snorlax",
    "dragonite",
    "meganium",
    "typhlosion",
    "feraligatr",
    "ariados",
    "ampharos",
    "azumarill",
    "politoed",
    "espeon",
    "umbreon",
    "slowking",
    "forretress",
    "steelix",
    "scizor",
    "heracross",
    "skarmory",
    "houndoom",
    "tyranitar",
    "pelipper",
    "gardevoir",
    "sableye",
    "aggron",
    "medicham",
    "manectric",
    "sharpedo",
    "camerupt",
    "torkoal",
    "altaria",
    "milotic",
    "castform",
    "banette",
    "chimecho",
    "absol",
    "glalie",
    "torterra",
    "infernape",
    "empoleon",
    "luxray",
    "roserade",
    "rampardos",
    "bastiodon",
    "lopunny",
    "spiritomb",
    "garchomp",
    "lucario",
    "hippowdon",
    "toxicroak",
    "abomasnow",
    "weavile",
    "rhyperior",
    "leafeon",
    "glaceon",
    "gliscor",
    "mamoswine",
    "gallade",
    "froslass",
    "rotom",
    "serperior",
    "emboar",
    "samurott",
    "watchog",
    "liepard",
    "simisage",
    "simisear",
    "simipour",
    "excadrill",
    "audino",
    "conkeldurr",
    "whimsicott",
    "krookodile",
    "cofagrigus",
    "garbodor",
    "zoroark",
    "reuniclus",
    "vanilluxe",
    "emolga",
    "chandelure",
    "beartic",
    "stunfisk",
    "golurk",
    "hydreigon",
    "volcarona",
    "chesnaught",
    "delphox",
    "greninja",
    "diggersby",
    "talonflame",
    "vivillon",
    "floette",
    "florges",
    "pangoro",
    "furfrou",
    "meowstic",
    "aegislash",
    "aromatisse",
    "slurpuff",
    "clawitzer",
    "heliolisk",
    "tyrantrum",
    "aurorus",
    "sylveon",
    "hawlucha",
    "dedenne",
    "goodra",
    "klefki",
    "trevenant",
    "gourgeist",
    "avalugg",
    "noivern",
    "decidueye",
    "incineroar",
    "primarina",
    "toucannon",
    "crabominable",
    "lycanroc",
    "toxapex",
    "mudsdale",
    "araquanid",
    "salazzle",
    "tsareena",
    "oranguru",
    "passimian",
    "mimikyu",
    "drampa",
    "kommoo",
    "corviknight",
    "flapple",
    "appletun",
    "sandaconda",
    "polteageist",
    "hatterene",
    "mrrime",
    "runerigus",
    "alcremie",
    "morpeko",
    "dragapult",
    "wyrdeer",
    "kleavor",
    "basculegion",
    "sneasler",
    "meowscarada",
    "skeledirge",
    "quaquaval",
    "maushold",
    "garganacl",
    "armarouge",
    "ceruledge",
    "bellibolt",
    "scovillain",
    "espathra",
    "tinkaton",
    "palafin",
    "orthworm",
    "glimmora",
    "farigiraf",
    "kingambit",
    "sinistcha",
    "archaludon",
    "hydrapple",
  ]);

  let genFilter: GenNumber | null = null; // null = all gens
  let regMA = false; // Regulation M-A filter
  $: genNum = genFilter ?? (9 as GenNumber); // concrete gen for team state / saving
  let yourTeam: TeamSlotData[] = Array(6).fill(null);
  let oppTeam: TeamSlotData[] = Array(6).fill(null);
  let loadedTeamName: string = "";
  let pickerTarget: { side: "you" | "opp"; index: number } | null = null;
  let usageOrder: string[] = [];

  // When no gen filter, show all national dex Pokémon (gen 9 as widest set); otherwise gen-filtered
  // Optionally narrow to Regulation M-A allowed Pokémon
  let allEntries: SpeedEntry[] = [];
  $: {
    const base = genFilter ? buildSpeedTiers(genFilter) : buildAllTiers(9);
    allEntries = regMA
      ? base.filter((e: SpeedEntry) => REG_MA.has(e.id))
      : base;
  }

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
    const toSlot = (s: TeamSlotData) =>
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
    loadedTeamName = saved.label ?? "";
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
        importError = "No matching Pokémon found — check the paste.";
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

<svelte:head>
  <title>Turnadus — Pokémon Speed & Turn Order Tool for VGC & Champions</title>
  <meta
    name="description"
    content="Free Pokémon speed tier tool for VGC and Pokémon Champions. Build teams, import from Pokepaste, compare speeds, and see who goes first."
  />
  <meta
    property="og:title"
    content="Turnadus — Pokémon Speed & Turn Order Tool"
  />
  <meta
    property="og:description"
    content="Free Pokémon speed tier tool for VGC and Pokémon Champions. Build teams, import from Pokepaste, compare speeds, and see who goes first."
  />
  <meta property="og:url" content="https://turnadus.com/" />
</svelte:head>
<svelte:window
  on:keydown={(e) => {
    if (e.key === "Escape") {
      showImport = false;
      importError = "";
    }
  }}
/>

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

      <TabGroup
        tabs={[
          { label: "Your Team", value: "you" },
          { label: "Opponent", value: "opp" },
        ]}
        value={importSide}
        on:change={(e) => (importSide = e.detail as "you" | "opp")}
      />

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
        <Button
          variant="primary"
          size="sm"
          disabled={importLoading || !importText.trim()}
          onClick={doImport}>{importLoading ? "Loading…" : "Import"}</Button
        >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            showImport = false;
            importError = "";
            importText = "";
          }}>Cancel</Button
        >
      </div>
    </div>
  </div>
{/if}

<div class="page">
  <div class="page-header">
    <span class="page-title">Pokémon Select</span>
    <div class="header-filters">
      <button
        class="reg-ma-btn"
        class:active={regMA}
        on:click={() => (regMA = !regMA)}>Reg M-A</button
      >
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
    </div>
  </div>

  <div class="layout">
    <!-- Teams -->
    <div class="teams-col">
      {#each [{ side: "you" as const, team: yourTeam }, { side: "opp" as const, team: oppTeam }] as { side, team }}
        <div class="team-block">
          <span
            class="team-label"
            class:you={side === "you"}
            class:opp={side === "opp"}
          >
            {#if side === "you"}
              My Team{#if loadedTeamName}
                <span class="team-label-name">{loadedTeamName}</span>{/if}
            {:else}
              Opponent
            {/if}
          </span>
          <div class="slots">
            {#each team as slot, i}
              <TeamSlot
                {slot}
                on:pick={() => openPicker(side, i)}
                on:clear={() => clearSlot(side, i)}
                on:scarf={() => toggleScarf(side, i)}
              />
            {/each}
          </div>
        </div>
      {/each}

      <div class="action-row">
        <Button
          variant="primary"
          fullWidth={true}
          disabled={!canStart}
          onClick={startGame}
        >
          Start Game →
        </Button>
        <Button variant="secondary" onClick={() => (showImport = true)}>
          Import Paste
        </Button>
        {#if canSave}
          {#if showSaveInput}
            <div class="save-row">
              <Input
                id="save-label"
                name="save-label"
                placeholder="Team name…"
                bind:value={saveLabel}
                on:keydown={(e) =>
                  (e as unknown as KeyboardEvent).key === "Enter" &&
                  saveCurrentTeam()}
                autocomplete="off"
              />
              <Button variant="primary" size="sm" onClick={saveCurrentTeam}
                >Save</Button
              >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  showSaveInput = false;
                  saveLabel = "";
                }}>✕</Button
              >
            </div>
          {:else}
            <Button variant="secondary" onClick={() => (showSaveInput = true)}
              >Save Team</Button
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
          <SavedTeamCard {team} on:load={(e) => loadTeam(e.detail)} />
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
    font-family: var(--font-heading);
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--gb-2);
  }

  .header-filters {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reg-ma-btn {
    padding: 0 0.75rem;
    min-height: 44px;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    color: var(--gb-low-contrast);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s,
      background 0.15s;
    white-space: nowrap;
  }
  .reg-ma-btn:hover {
    color: var(--gb-2);
    border-color: var(--gb-low-contrast);
  }
  .reg-ma-btn.active {
    color: var(--accent-2);
    border-color: var(--accent-2);
    background: color-mix(in srgb, var(--accent-2) 10%, var(--gb-4));
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
    color: var(--gb-low-contrast);
  }
  .gen-select {
    padding: 0 2rem 0 0.75rem;
    appearance: none;
    -webkit-appearance: none;
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius-sm);
    color: var(--gb-2);
    font-size: 0.85rem;
    cursor: pointer;
    min-height: 44px;
    transition: border-color 0.15s;
  }
  .gen-select:focus {
    border-color: var(--gb-1);
  }

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
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: -0.005em;
  }

  .team-label.you {
    color: var(--gb-2);
  }

  .team-label-name {
    color: var(--gb-low-contrast);
    font-weight: 400;
    padding-left: 8px;
  }
  .team-label.opp {
    color: var(--gb-low-contrast);
  }

  .slots {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  @media (min-width: 700px) {
    .slots {
      gap: 16px;
    }
  }

  @media (max-width: 600px) {
    .slots {
      grid-template-columns: repeat(3, 1fr);
    }
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

  .save-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex: 1;
  }

  /* Saved teams list */
  .saved-section {
    margin-top: 2rem;
    border-top: 1px solid var(--gb-3);
    padding-top: 1.25rem;
  }

  .saved-title {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--gb-low-contrast);
    margin-bottom: 0.75rem;
  }

  .saved-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
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
    color: var(--gb-low-contrast);
    font-size: 1.1rem;
    cursor: pointer;
    min-height: 44px;
    min-width: 44px;
    padding: 0 0.75rem;
  }
  .modal-close:hover {
    color: var(--gb-2);
  }

  .import-textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--gb-3);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius);
    color: var(--gb-2);
    font-size: 0.82rem;
    font-family: monospace;
    resize: vertical;
    outline: none;
    line-height: 1.5;
  }
  .import-textarea:focus-visible {
    border-color: var(--gb-1);
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

  /* Speed preview sidebar */
  .preview-col {
    background: var(--gb-4);
    border: 1px solid var(--gb-3);
    border-radius: var(--radius);
    overflow: hidden;
    color: var(--gb-hi);
  }

  .preview-title {
    display: block;
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gb-hi);
    border-bottom: 1px solid var(--gb-3);
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
    border-bottom: 1px solid var(--gb-3);
    border-left: 3px solid transparent;
    font-size: 0.82rem;
  }

  .preview-row:last-child {
    border-bottom: none;
  }
  .preview-row.side-you {
    border-left-color: #52b44b;
  }
  .preview-row.side-opp {
    border-left-color: #e8622d;
  }

  .preview-rank {
    color: var(--gb-hi);
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
    color: var(--gb-hi);
    opacity: 70%;
    border-top: 1px solid var(--gb-5);
  }
</style>
