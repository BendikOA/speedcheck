import { writable } from 'svelte/store';
import type { SpeedEntry, GenNumber, NatureTier } from '$lib/speedtiers';

export type TeamSlot = { entry: SpeedEntry; scarf: boolean; nature: NatureTier } | null;

export interface TeamState {
  genNum: GenNumber;
  yourTeam: TeamSlot[];
  oppTeam: TeamSlot[];
}

export const teamState = writable<TeamState>({
  genNum: 9,
  yourTeam: Array(6).fill(null),
  oppTeam: Array(6).fill(null),
});
