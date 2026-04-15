import { writable } from 'svelte/store';
import type { SpeedEntry, GenNumber, NatureTier } from '$lib/speedtiers';

export interface StatSpread { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; }

export type TeamSlot = {
  entry:        SpeedEntry;
  scarf:        boolean;
  nature:       NatureTier;
  natureName?:  string;
  natureLocked?: boolean;
  // Full paste data (optional — only present when imported from a pokepaste or loaded from a saved team)
  item?:        string;
  ability?:     string;
  teraType?:    string;
  level?:       number;
  evs?:         StatSpread;
  ivs?:         StatSpread;
  moves?:       string[];
  nickname?:    string;
} | null;

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
