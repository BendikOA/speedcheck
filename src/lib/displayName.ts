/**
 * Short display names for Pokémon whose full names overflow the team slot card.
 * The full name is always stored/used internally — this is purely cosmetic.
 */
const DISPLAY_NAMES: Record<string, string> = {
  // Urshifu
  'Urshifu-Rapid-Strike':      'Urshifu-RS',
  'Urshifu-Rapid-Strike-Gmax': 'Urshifu-RS-G',

  // Ogerpon forms
  'Ogerpon-Hearthflame':      'Ogerpon-Flame',
  'Ogerpon-Hearthflame-Tera': 'Ogerpon-Flame',
  'Ogerpon-Cornerstone':      'Ogerpon-Stone',
  'Ogerpon-Cornerstone-Tera': 'Ogerpon-Stone',
  'Ogerpon-Wellspring':       'Ogerpon-Well',
  'Ogerpon-Wellspring-Tera':  'Ogerpon-Well',
  'Ogerpon-Teal-Tera':        'Ogerpon-Teal',

  // Tauros-Paldea
  'Tauros-Paldea-Combat': 'Tauros-Combat',
  'Tauros-Paldea-Blaze':  'Tauros-Blaze',
  'Tauros-Paldea-Aqua':   'Tauros-Aqua',

  // Forces of Nature — Therian formes
  'Tornadus-Therian':  'Tornadus-T',
  'Thundurus-Therian': 'Thundurus-T',
  'Landorus-Therian':  'Landorus-T',
  'Enamorus-Therian':  'Enamorus-T',

  // Darmanitan
  'Darmanitan-Zen':       'Darmanitan-Z',
  'Darmanitan-Galar':     'Darmanitan-G',
  'Darmanitan-Galar-Zen': 'Darmanitan-GZ',

  // Crowned duo
  'Zacian-Crowned':    'Zacian-Crown',
  'Zamazenta-Crowned': 'Zamazenta-C',

  // Calyrex riders
  'Calyrex-Shadow': 'Calyrex-Shd',
  'Calyrex-Ice':    'Calyrex-Ice',

  // Necrozma
  'Necrozma-Dawn-Wings': 'Necrozma-Dawn',
  'Necrozma-Dusk-Mane':  'Necrozma-Dusk',

  // Misc long names
  'Giratina-Origin':    'Giratina-O',
  'Groudon-Primal':     'Groudon-P',
  'Kyogre-Primal':      'Kyogre-P',
  'Keldeo-Resolute':    'Keldeo-Res',
  'Meloetta-Pirouette': 'Meloetta-P',
  'Hoopa-Unbound':      'Hoopa-Unb',
  'Dudunsparce-Three-Segment': 'Dudunsparce-3',
  'Toxtricity-Low-Key': 'Toxtricity-LK',
};

/** Returns a short display label for the team slot, falling back to the full name. */
export function displayName(name: string): string {
  return DISPLAY_NAMES[name] ?? name;
}
