import type { NatureTier } from './speedtiers';
import type { StatSpread } from './stores/teams';

export interface NatureInfo {
  plus:  keyof StatSpread | null;
  minus: keyof StatSpread | null;
  tier:  NatureTier;
}

export const NATURE_TABLE: Record<string, NatureInfo> = {
  Hardy:   { plus: null,  minus: null,  tier: '=' },
  Lonely:  { plus: 'atk', minus: 'def', tier: '=' },
  Brave:   { plus: 'atk', minus: 'spe', tier: '-' },
  Adamant: { plus: 'atk', minus: 'spa', tier: '=' },
  Naughty: { plus: 'atk', minus: 'spd', tier: '=' },
  Bold:    { plus: 'def', minus: 'atk', tier: '=' },
  Docile:  { plus: null,  minus: null,  tier: '=' },
  Relaxed: { plus: 'def', minus: 'spe', tier: '-' },
  Impish:  { plus: 'def', minus: 'spa', tier: '=' },
  Lax:     { plus: 'def', minus: 'spd', tier: '=' },
  Timid:   { plus: 'spe', minus: 'atk', tier: '+' },
  Hasty:   { plus: 'spe', minus: 'def', tier: '+' },
  Serious: { plus: null,  minus: null,  tier: '=' },
  Jolly:   { plus: 'spe', minus: 'spa', tier: '+' },
  Naive:   { plus: 'spe', minus: 'spd', tier: '+' },
  Modest:  { plus: 'spa', minus: 'atk', tier: '=' },
  Mild:    { plus: 'spa', minus: 'def', tier: '=' },
  Quiet:   { plus: 'spa', minus: 'spe', tier: '-' },
  Bashful: { plus: null,  minus: null,  tier: '=' },
  Rash:    { plus: 'spa', minus: 'spd', tier: '=' },
  Calm:    { plus: 'spd', minus: 'atk', tier: '=' },
  Gentle:  { plus: 'spd', minus: 'def', tier: '=' },
  Sassy:   { plus: 'spd', minus: 'spe', tier: '-' },
  Careful: { plus: 'spd', minus: 'spa', tier: '=' },
  Quirky:  { plus: null,  minus: null,  tier: '=' },
};

export const ALL_NATURES = Object.keys(NATURE_TABLE);

/** Fallback nature name when none is stored (based on NatureTier) */
export const NATURE_FALLBACK: Record<NatureTier, string> = {
  '+': 'Timid',
  '=': 'Hardy',
  '-': 'Brave',
};

export function natureMult(natureName: string | undefined, stat: keyof StatSpread): number {
  if (!natureName) return 1.0;
  const n = NATURE_TABLE[natureName];
  if (!n) return 1.0;
  if (n.plus  === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1.0;
}

const STAT_NAMES: Record<string, string> = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

export function natureLabel(name: string): string {
  const n = NATURE_TABLE[name];
  if (!n || !n.plus) return name;
  return `${name} (+${STAT_NAMES[n.plus]}, −${STAT_NAMES[n.minus!]})`;
}
