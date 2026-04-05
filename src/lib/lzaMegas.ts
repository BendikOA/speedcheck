/**
 * Legends: ZA mega evolution overrides.
 * @pkmn/dex does not include these yet — populate with official stats when released (April 8 2026).
 * Each entry extends the base species (by id) with one or more mega forms.
 *
 * baseSpe values here are base Speed stats; max/neutral/minSpeed are computed at level 50.
 * Format: { baseId: string, megas: Array<{ id, name, types, baseSpe }> }
 */

import type { MegaStats } from './speedtiers';

// Level-50 stat formula: floor((2*base + 31 + floor(252/4)) * 50/100 + 5) * nature
// Jolly (+): floor(result * 1.1), Hardy (=): as-is, Brave (-): floor(result * 0.9)
function calcSpe(base: number, evs = 252, ivs = 31, level = 50) {
  return Math.floor((2 * base + ivs + Math.floor(evs / 4)) * level / 100 + 5);
}

export interface LZAMegaOverride {
  baseId: string;
  megas: Omit<MegaStats, 'maxSpeed' | 'neutralSpeed' | 'minSpeed'>[];
}

// ── Fill these in when stats are officially released April 8 2026 ─────────────
export const LZA_MEGA_OVERRIDES: LZAMegaOverride[] = [
  // Example format (delete this comment and add real entries):
  // {
  //   baseId: 'arcanine',
  //   megas: [{ id: 'arcaninelza', name: 'Arcanine-LZA', types: ['Fire'], baseSpe: 95 }],
  // },
];

/**
 * Expand LZA overrides into full MegaStats with computed speeds.
 * Call this in calcEntries to merge with dex-derived mega forms.
 */
export function getLZAMegas(baseId: string): MegaStats[] {
  const override = LZA_MEGA_OVERRIDES.find(o => o.baseId === baseId);
  if (!override) return [];

  return override.megas.map(m => {
    const neutral = calcSpe(m.baseSpe);
    return {
      ...m,
      maxSpeed:     Math.floor(neutral * 1.1),
      neutralSpeed: neutral,
      minSpeed:     Math.floor(calcSpe(m.baseSpe, 0, 0) * 0.9),
    };
  });
}
