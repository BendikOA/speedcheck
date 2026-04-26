<script lang="ts">
  import './styles.scss';
  import { createEventDispatcher } from 'svelte';
  import { staticSpriteUrl } from '$lib/sprites';
  import type { SavedTeam } from '$lib/stores/savedTeams';
  import Button from '$lib/components/ui/Button/index.svelte';

  export let team: SavedTeam;

  const dispatch = createEventDispatcher<{ load: SavedTeam }>();
</script>

<div class="teamcard">
  <div class="teamcard-top">
    <div class="teamcard-meta">
      <span class="teamcard-name">{team.label}</span>
      <span class="teamcard-sub">Gen {team.genNum}</span>
    </div>
    <Button variant="secondary" size="sm" onClick={() => dispatch('load', team)}>Load</Button>
  </div>

  <div class="teamcard-bottom">
    <div class="teamcard-sprites">
      {#each team.yourTeam.filter(Boolean) as slot}
        <img
          class="teamcard-sprite"
          src={staticSpriteUrl(slot!.name)}
          alt={slot!.name}
          title={slot!.name}
          loading="lazy"
        />
      {/each}
    </div>
    <a class="teamcard-edit" href="/build?id={team.id}" aria-label="Edit team">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </a>
  </div>
</div>
