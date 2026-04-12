<script lang="ts">
  import './styles.css';
  import { createEventDispatcher } from 'svelte';
  import { spriteUrl } from '$lib/sprites';
  import { savedTeams, type SavedTeam } from '$lib/stores/savedTeams';
  import Input from '$lib/components/ui/Input/index.svelte';

  export let team: SavedTeam;

  const dispatch = createEventDispatcher<{ load: SavedTeam }>();

  let renaming = false;
  let renameValue = '';

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
        <img
          src={spriteUrl(slot!.name)}
          alt={slot!.name}
          class="saved-sprite"
          title={slot!.name}
        />
      {/each}
    </div>
  </div>

  <!-- Bottom: record + actions -->
  <div class="saved-bottom">
    <div class="saved-record">
      {#if team.wins + team.losses > 0}
        <button
          class="record-reset"
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
      <button class="saved-load" on:click={() => dispatch('load', team)}>Load</button>
      <a class="saved-edit" href="/teams/{team.id}/edit" aria-label="Edit team" title="Edit team">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </a>
      <button
        class="saved-delete"
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
    </div>
  </div>
</div>
