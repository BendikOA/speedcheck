import type { SavedTeamSlot } from './stores/savedTeams';
import { NATURE_FALLBACK } from './natures';

/**
 * Converts a team to Showdown/Poképaste export format.
 *
 * @param slots    Up to 6 SavedTeamSlot entries (null = empty)
 * @param options.evScale  Multiplier applied to EV values before output.
 *                         Pass 8 when slots use Champions EVs (0-32) so output
 *                         is in standard Showdown format (0-252). Default: 1.
 * @param options.hasTera  Include Tera Type line. Default: true.
 */
export function generatePaste(
  slots: (SavedTeamSlot | null)[],
  options: { evScale?: number; hasTera?: boolean } = {},
): string {
  const { evScale = 1, hasTera = true } = options;
  const blocks: string[] = [];

  for (const slot of slots) {
    if (!slot) continue;
    const lines: string[] = [];

    const np = slot.nickname ? `${slot.nickname} (${slot.name})` : slot.name;
    lines.push(slot.item ? `${np} @ ${slot.item}` : np);

    if (slot.ability) lines.push(`Ability: ${slot.ability}`);
    if (slot.level && slot.level !== 50) lines.push(`Level: ${slot.level}`);
    if (hasTera && slot.teraType) lines.push(`Tera Type: ${slot.teraType}`);

    if (slot.evs) {
      const e = slot.evs;
      const p: string[] = [];
      if (e.hp)  p.push(`${e.hp  * evScale} HP`);
      if (e.atk) p.push(`${e.atk * evScale} Atk`);
      if (e.def) p.push(`${e.def * evScale} Def`);
      if (e.spa) p.push(`${e.spa * evScale} SpA`);
      if (e.spd) p.push(`${e.spd * evScale} SpD`);
      if (e.spe) p.push(`${e.spe * evScale} Spe`);
      if (p.length) lines.push(`EVs: ${p.join(' / ')}`);
    }

    const natureName = slot.natureName ?? NATURE_FALLBACK[slot.nature ?? '='];
    lines.push(`${natureName} Nature`);

    if (slot.ivs) {
      const iv = slot.ivs;
      const p: string[] = [];
      if (iv.hp  !== 31) p.push(`${iv.hp} HP`);
      if (iv.atk !== 31) p.push(`${iv.atk} Atk`);
      if (iv.def !== 31) p.push(`${iv.def} Def`);
      if (iv.spa !== 31) p.push(`${iv.spa} SpA`);
      if (iv.spd !== 31) p.push(`${iv.spd} SpD`);
      if (iv.spe !== 31) p.push(`${iv.spe} Spe`);
      if (p.length) lines.push(`IVs: ${p.join(' / ')}`);
    }

    for (const m of slot.moves ?? []) { if (m) lines.push(`- ${m}`); }
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
