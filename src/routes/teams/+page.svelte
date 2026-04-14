<script lang="ts">
  import './styles.css';
  import { savedTeams } from '$lib/stores/savedTeams';
  import SavedTeamCard from '$lib/components/ui/SavedTeamCard/index.svelte';
  import TournamentTeamCard from '$lib/components/ui/TournamentTeamCard/index.svelte';
  import type { RecentTeamsData, RecentTournament, TournamentTeam } from '$lib/types/recentTeams';

  export let data: { recentTeams: RecentTeamsData | null };

  $: recentTeams = data.recentTeams;

  interface TournamentWinner {
    tournament: RecentTournament;
    team: TournamentTeam;
  }

  // Pick the winner (placement 1) from each tournament
  $: tournamentWinners = (recentTeams?.tournaments ?? []).reduce<TournamentWinner[]>((acc, t) => {
    const team = t.teams.find(tm => tm.placement === 1) ?? t.teams[0];
    if (team) acc.push({ tournament: t, team });
    return acc;
  }, []);
</script>

<svelte:head>
  <title>Teams — Speedcheck</title>
</svelte:head>

<div class="teams-page">

  <!-- ── Tournament Teams ─────────────────────────────────── -->
  <section class="teams-section">
    <div class="section-header">
      <h2 class="section-title">Top Tournament Teams</h2>
      {#if recentTeams}
        <span class="section-meta">
          Winners from the {tournamentWinners.length} most recent tournaments · updated {recentTeams.updated}
        </span>
      {/if}
    </div>

    {#if !recentTeams}
      <p class="teams-empty">No tournament data available yet. Run the scraper to populate this page.</p>
    {:else if tournamentWinners.length === 0}
      <p class="teams-empty">No tournaments found in the last 30 days.</p>
    {:else}
      <div class="teams-list">
        {#each tournamentWinners as { tournament, team }}
          <TournamentTeamCard
            tournamentName={tournament.name}
            tournamentDate={tournament.date}
            players={tournament.players}
            {team}
          />
        {/each}
      </div>
    {/if}
  </section>

  <!-- ── Your Saved Teams ──────────────────────────────────── -->
  <section class="saved-section">
    <div class="section-header">
      <h2 class="section-title">Your Saved Teams</h2>
    </div>

    {#if $savedTeams.length === 0}
      <p class="teams-empty">No saved teams yet. Build a team on the <a href="/">home page</a> or save one from above.</p>
    {:else}
      <div class="saved-list">
        {#each $savedTeams as team (team.id)}
          <SavedTeamCard {team} on:load={() => {}} />
        {/each}
      </div>
    {/if}
  </section>

</div>
