import type { PageLoad } from './$types';
import type { RecentTeamsData } from '$lib/types/recentTeams';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/recent-teams.json');
    if (!res.ok) return { recentTeams: null };
    const data: RecentTeamsData = await res.json();
    return { recentTeams: data };
  } catch {
    return { recentTeams: null };
  }
};
