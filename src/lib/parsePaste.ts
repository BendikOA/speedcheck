import type { SpeedEntry, NatureTier } from '$lib/speedtiers';
import type { TeamSlot, StatSpread } from '$lib/stores/teams';

const SPEED_POS = new Set(['timid', 'jolly', 'naive', 'hasty']);
const SPEED_NEG = new Set(['brave', 'quiet', 'relaxed', 'sassy']);

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const STAT_KEYS: Record<string, keyof StatSpread> = {
  hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe',
};

/** Parse "244 HP / 36 Def / 92 Spe" into a StatSpread, with a given default for missing stats. */
function parseSpread(line: string, def: number): StatSpread {
  const spread: StatSpread = { hp: def, atk: def, def: def, spa: def, spd: def, spe: def };
  for (const segment of line.split('/')) {
    const m = segment.trim().match(/^(\d+)\s+(\w+)$/);
    if (!m) continue;
    const key = STAT_KEYS[m[2].toLowerCase()];
    if (key) spread[key] = parseInt(m[1], 10);
  }
  return spread;
}

/** Extract Pokémon name + item + optional nickname from the first line of a Showdown block. */
function parseName(firstLine: string): { name: string; item: string; nickname: string | undefined } {
  let raw = firstLine;
  let item = '';
  let nickname: string | undefined;

  if (raw.includes('@')) {
    const atIdx = raw.indexOf('@');
    item = raw.slice(atIdx + 1).trim();
    raw  = raw.slice(0, atIdx).trim();
  }

  // Strip gender marker "(M)" / "(F)"
  raw = raw.replace(/\s+\([MF]\)\s*$/, '').trim();

  // Nickname format: "Nickname (SpeciesName)"
  const nicknameMatch = raw.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
  if (nicknameMatch) {
    nickname = nicknameMatch[1].trim();
    raw      = nicknameMatch[2].trim();
  }

  return { name: raw, item, nickname };
}

/** Parse raw Showdown-format paste text into up to 6 TeamSlots. */
export function parsePaste(text: string, entries: SpeedEntry[]): TeamSlot[] {
  const byName = new Map(entries.map(e => [e.name.toLowerCase(), e]));
  const byId   = new Map(entries.map(e => [e.id, e]));

  function findEntry(name: string): SpeedEntry | undefined {
    const direct = byName.get(name.toLowerCase()) ?? byId.get(toId(name));
    if (direct) return direct;
    // Strip mega suffix and retry — pastes sometimes include "Metagross-Mega" etc.
    const baseName = name.replace(/-Mega(?:-[XY])?$/i, '').trim();
    if (baseName !== name) return byName.get(baseName.toLowerCase()) ?? byId.get(toId(baseName));
    return undefined;
  }

  const slots: TeamSlot[] = [];
  const blocks = text.trim().split(/\n\s*\n+/).filter(b => b.trim());

  for (const block of blocks) {
    if (slots.length >= 6) break;
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const { name: rawName, item, nickname } = parseName(lines[0]);
    const entry = findEntry(rawName);
    if (!entry) continue;

    const scarf = toId(item) === 'choicescarf';

    let nature: NatureTier    = '=';
    let natureName: string | undefined;
    let ability: string | undefined;
    let teraType: string | undefined;
    let level: number | undefined;
    let evs: StatSpread | undefined;
    let ivs: StatSpread | undefined;
    const moves: string[]     = [];

    for (const line of lines.slice(1)) {
      let m: RegExpMatchArray | null;

      if ((m = line.match(/^Ability:\s*(.+)$/i)))
        ability = m[1].trim();

      else if ((m = line.match(/^Level:\s*(\d+)$/i)))
        level = parseInt(m[1], 10);

      else if ((m = line.match(/^Tera\s*Type:\s*(.+)$/i)))
        teraType = m[1].trim();

      else if ((m = line.match(/^EVs:\s*(.+)$/i)))
        evs = parseSpread(m[1], 0);

      else if ((m = line.match(/^IVs:\s*(.+)$/i)))
        ivs = parseSpread(m[1], 31);

      else if ((m = line.match(/^(\w+)\s+Nature$/i))) {
        const nat = m[1].toLowerCase();
        natureName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
        nature = SPEED_POS.has(nat) ? '+' : SPEED_NEG.has(nat) ? '-' : '=';
      }

      else if (line.startsWith('- '))
        moves.push(line.slice(2).trim());
    }

    slots.push({
      entry,
      scarf,
      nature,
      natureName,
      natureLocked: true,
      item:     item     || undefined,
      ability,
      teraType,
      level,
      evs,
      ivs:      ivs,     // undefined if not in paste (all IVs assumed 31)
      moves:    moves.length ? moves : undefined,
      nickname,
    });
  }

  // Pad to 6 nulls
  while (slots.length < 6) slots.push(null);
  return slots as TeamSlot[];
}

/** Fetch paste text from a pokepast.es URL or return raw text as-is. */
export async function resolvePaste(input: string): Promise<string> {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/pokepast\.es\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const resp = await fetch(`https://pokepast.es/${urlMatch[1]}/json`, { signal: controller.signal });
      if (!resp.ok) throw new Error(`Pokepaste fetch failed: ${resp.status}`);
      const data = await resp.json();
      if (typeof data?.paste !== 'string') throw new Error('Unexpected response from pokepast.es');
      return data.paste;
    } finally {
      clearTimeout(timeout);
    }
  }
  return trimmed;
}
