<script lang="ts">
  import './styles.css';
  import type { TeamSlot } from '$lib/stores/teams';
  import type { Conditions } from '$lib/speedtiers';
  import type { UsageMoves, UsageMovesFull } from '$lib/smogonUsage';
  import { runCalc, getMovesForSlot } from '$lib/damageCalc';
  import { spriteUrl } from '$lib/sprites';
  import { displayName as shortName } from '$lib/displayName';

  export let yourTeam: TeamSlot[];
  export let oppTeam: TeamSlot[];
  export let cond: Conditions;
  export let smogonMoves: UsageMoves = {};
  export let champMovesFull: UsageMovesFull = {};
  export let onclose: () => void = () => {};

  // Selection: one index from your team, one from opp team
  let selYou: number | null = null;
  let selOpp: number | null = null;

  $: atkSlot = selYou !== null ? yourTeam[selYou] : null;
  $: defSlot = selOpp !== null ? oppTeam[selOpp]  : null;

  $: atkMoves = atkSlot ? getMovesForSlot(atkSlot, smogonMoves, champMovesFull) : [];
  $: defMoves = defSlot ? getMovesForSlot(defSlot, smogonMoves, champMovesFull) : [];

  $: atkResults = (atkSlot && defSlot && atkMoves.length)
    ? runCalc(atkSlot, 'you', defSlot, atkMoves, cond)
    : [];
  $: defResults = (defSlot && atkSlot && defMoves.length)
    ? runCalc(defSlot, 'opp', atkSlot, defMoves, cond)
    : [];

  $: hasImportedAtk = !!atkSlot?.evs;
  $: hasImportedDef = !!defSlot?.evs;
  $: showEVNote = (atkSlot || defSlot) && (!hasImportedAtk || !hasImportedDef);

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

        {#if showEVNote}
          <p class="ev-note">
            {#if !hasImportedAtk && !hasImportedDef}
              No EV data — showing base stats (import a pokepaste for accurate results)
            {:else if !hasImportedAtk}
              {shortName(atkSlot.entry.name)}: no EV data (base stats used)
            {:else}
              {shortName(defSlot.entry.name)}: no EV data (base stats used)
            {/if}
          </p>
        {/if}

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
                      <td class="move-name">{r.moveName}</td>
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
                      <td class="move-name">{r.moveName}</td>
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
