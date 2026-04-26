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
  import TeamPanel from "$lib/components/ui/TeamPanel/index.svelte";
  import SavedTeamCard from "$lib/components/ui/SavedTeamCard/index.svelte";
  import PasteModal from "$lib/components/ui/PasteModal/index.svelte";
  import PlayerIntro from "$lib/components/ui/PlayerIntro/index.svelte";
  import { browser } from "$app/environment";
  import { loadSmogonOrder } from "$lib/smogonUsage";
  import { CHAMPIONS_ROSTER } from "$lib/championsRoster";


  let genFilter: GenNumber | null = null; // null = all gens
  let regMA = browser && localStorage.getItem('regMA') === 'true'; // Regulation M-A filter
  $: if (browser) localStorage.setItem('regMA', String(regMA));
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
      ? base.filter((e: SpeedEntry) => CHAMPIONS_ROSTER.has(e.id) || CHAMPIONS_ROSTER.has(e.baseSpeciesId))
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
            natureName: s.natureName,
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
            natureName: s.natureName,
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
  let importError = "";
  let importLoading = false;

  async function doImport(rawText: string) {
    importError = "";
    importLoading = true;
    try {
      const text = await resolvePaste(rawText);
      const slots = parsePaste(text, buildAllTiers(9));
      const filled = slots.filter(Boolean);
      if (!filled.length) {
        importError = "No matching Pokémon found — check the paste.";
        return;
      }
      if (importSide === "you") yourTeam = slots;
      else oppTeam = slots;
      showImport = false;
    } catch (e: any) {
      importError = e?.message ?? "Failed to fetch paste.";
    } finally {
      importLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Turnadus — Pokémon Speed & Turn Order Tool for VGC & Champions</title>
  <meta name="description" content="Free Pokémon speed tier tool for VGC and Pokémon Champions. Build teams, import from Pokepaste, compare speeds, and see who goes first." />
  <link rel="canonical" href="https://turnadus.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Turnadus — Pokémon Speed & Turn Order Tool" />
  <meta property="og:description" content="Free Pokémon speed tier tool for VGC and Pokémon Champions. Build teams, import from Pokepaste, compare speeds, and see who goes first." />
  <meta property="og:url" content="https://turnadus.com/" />
  <meta property="og:image" content="https://turnadus.com/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Turnadus — Pokémon Speed & Turn Order Tool" />
  <meta name="twitter:description" content="Free Pokémon speed tier tool for VGC and Pokémon Champions. Build teams, import from Pokepaste, compare speeds, and see who goes first." />
  <meta name="twitter:image" content="https://turnadus.com/og-image.png" />
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

<PasteModal
  open={showImport}
  loading={importLoading}
  error={importError}
  placeholder="Paste a pokepast.es URL or raw Showdown export here…"
  on:close={() => { showImport = false; importError = ""; }}
  on:import={(e) => doImport(e.detail)}
/>

<div class="page">
  <PlayerIntro step="Step 1/2" title="Select Pokemon" />

  <div class="page-header">
    <span class="page-title">Pokémon Select</span>
    <div class="header-filters">
      <Button variant="secondary" onClick={() => (regMA = !regMA)}>Reg M-A</Button>
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
    <div class="teams-col">
      <TeamPanel
        label={loadedTeamName || "Your team"}
        color="#bcfd49"
        slots={yourTeam}
        on:pick={(e) => openPicker("you", e.detail.index)}
        on:clear={(e) => clearSlot("you", e.detail.index)}
        on:scarf={(e) => toggleScarf("you", e.detail.index)}
        on:save={() => (showSaveInput = true)}
        on:import={() => { importSide = "you"; showImport = true; }}
      />

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
          <Button variant="primary" size="sm" onClick={saveCurrentTeam}>Save</Button>
          <Button variant="secondary" size="sm" onClick={() => { showSaveInput = false; saveLabel = ""; }}>✕</Button>
        </div>
      {/if}

      <TeamPanel
        label="Opp team"
        color="#fd7949"
        slots={oppTeam}
        showSave={false}
        on:pick={(e) => openPicker("opp", e.detail.index)}
        on:clear={(e) => clearSlot("opp", e.detail.index)}
        on:scarf={(e) => toggleScarf("opp", e.detail.index)}
        on:import={() => { importSide = "opp"; showImport = true; }}
      />

      <div class="action-row">
        <Button
          variant="primary"
          fullWidth={true}
          disabled={!canStart}
          onClick={startGame}
        >
          Start Game →
        </Button>
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

