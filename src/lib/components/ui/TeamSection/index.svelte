<script lang="ts">
  import './styles.scss';
  import { createEventDispatcher } from 'svelte';
  import Teamloader from '$lib/components/ui/Teamloader/index.svelte';
  import type { SavedTeam } from '$lib/stores/savedTeams';

  export let teams: SavedTeam[] = [];
  export let activeTeamId: string | null = null;

  const dispatch = createEventDispatcher<{ load: SavedTeam }>();
</script>

<div class="team-section">
  {#each teams as team, i (team.id)}
    {@const isDark = (Math.floor(i / 4) + (i % 4)) % 2 === 0}
    <Teamloader
      {team}
      active={isDark || team.id === activeTeamId}
      on:load={(e) => dispatch('load', e.detail)}
    />
  {/each}
</div>
