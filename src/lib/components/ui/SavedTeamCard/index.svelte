<script lang="ts">
  import './styles.css';
  import { createEventDispatcher } from 'svelte';
  import { iconStyle } from '$lib/sprites';
  import { savedTeams, type SavedTeam } from '$lib/stores/savedTeams';
  import Input from '$lib/components/ui/Input/index.svelte';
  import Button from '$lib/components/ui/Button/index.svelte';

  export let team: SavedTeam;

  const dispatch = createEventDispatcher<{ load: SavedTeam }>();

  let renaming = false;
  let renameValue = '';
  let gearOpen = false;

  function startRename() {
    renameValue = team.label;
    renaming = true;
  }

  function confirmRename() {
    if (renameValue.trim()) savedTeams.rename(team.id, renameValue.trim());
    renaming = false;
  }

  $: winPct = team.wins + team.losses > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : null;
</script>

<div class="saved-row">
  <!-- Top: label + sprites -->
  <div class="saved-top">
    <div class="saved-top-meta">
      {#if renaming}
        <Input
          name="rename-team"
          variant="accent"
          bind:value={renameValue}
          on:keydown={(e) => {
            if (e.key === 'Enter') confirmRename();
            if (e.key === 'Escape') renaming = false;
          }}
          on:blur={confirmRename}
        />
      {:else}
        <button class="saved-label" title="Click to rename" on:click={startRename}>
          {team.label}
          <svg class="rename-icon" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      {/if}
    </div>

    <div class="saved-slots">
      {#each team.yourTeam.filter(Boolean) as slot}
        <span
          style={iconStyle(slot!.name)}
          class="saved-sprite"
          role="img"
          aria-label={slot!.name}
          title={slot!.name}
        ></span>
      {/each}
    </div>
  </div>

  <!-- Bottom: record + actions -->
  <div class="saved-bottom">
    <div class="saved-record">
      <!-- Reset: visible on desktop, hidden on mobile (inside gear) -->
      {#if team.wins + team.losses > 0}
        <button
          class="record-reset desktop-only"
          aria-label="Reset record"
          title="Reset win/loss record"
          on:click={() => savedTeams.resetRecord(team.id)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
      {/if}
      <span class="record-stat">
        {team.wins}W {team.losses}L
        {#if winPct !== null}
          <span class="record-pct">{winPct}%</span>
        {/if}
      </span>
      <button class="record-btn win-btn" on:click={() => savedTeams.recordResult(team.id, 'win')}>W</button>
      <button class="record-btn loss-btn" on:click={() => savedTeams.recordResult(team.id, 'loss')}>L</button>
    </div>

    <div class="saved-actions">
      <Button variant="primary" size="sm" onClick={() => dispatch('load', team)}>Load</Button>

      <!-- Edit + Delete: always visible on desktop -->
      <a class="saved-edit desktop-only" href="/teams/{team.id}/edit" aria-label="Edit team" title="Edit team">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </a>
      <button
        class="saved-delete desktop-only"
        aria-label="Delete team"
        title="Delete team"
        on:click={() => savedTeams.remove(team.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>

      <!-- Gear: mobile only -->
      <button
        class="saved-gear mobile-only"
        class:gear-active={gearOpen}
        aria-label="More options"
        title="More options"
        on:click={() => (gearOpen = !gearOpen)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Gear tray: mobile only, shown when gear is open -->
  {#if gearOpen}
    <div class="gear-tray mobile-only">
      <a class="saved-edit" href="/teams/{team.id}/edit" aria-label="Edit team">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit
      </a>
      <button
        class="saved-delete"
        aria-label="Delete team"
        on:click={() => savedTeams.remove(team.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        Delete
      </button>
      {#if team.wins + team.losses > 0}
        <button
          class="record-reset"
          aria-label="Reset record"
          on:click={() => { savedTeams.resetRecord(team.id); gearOpen = false; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset record
        </button>
      {/if}
    </div>
  {/if}
</div>
