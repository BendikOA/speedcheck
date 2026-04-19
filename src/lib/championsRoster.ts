/**
 * Complete list of Pokémon species available in Pokémon Champions (187 total).
 * IDs match @pkmn/dex format: lowercase, alphanumeric only.
 * Source: official Champions Pokédex roster.
 *
 * Mega forms are not listed here — they are derived from the dex for each
 * base form and shown when Champions is selected in the tiers view.
 */
export const CHAMPIONS_ROSTER = new Set<string>([
  // Gen I
  'venusaur', 'charizard', 'blastoise', 'beedrill', 'pidgeot', 'arbok',
  'pikachu', 'raichu', 'clefable', 'ninetales', 'arcanine', 'alakazam',
  'machamp', 'victreebel', 'slowbro', 'gengar', 'kangaskhan', 'starmie',
  'pinsir', 'tauros', 'gyarados', 'ditto', 'vaporeon', 'jolteon', 'flareon',
  'aerodactyl', 'snorlax', 'dragonite',

  // Gen II
  'meganium', 'typhlosion', 'feraligatr', 'ariados', 'ampharos', 'azumarill',
  'politoed', 'espeon', 'umbreon', 'slowking', 'forretress', 'steelix',
  'scizor', 'heracross', 'skarmory', 'houndoom', 'tyranitar',

  // Gen III
  'pelipper', 'gardevoir', 'sableye', 'aggron', 'medicham', 'manectric',
  'sharpedo', 'camerupt', 'torkoal', 'altaria', 'milotic', 'castform',
  'banette', 'chimecho', 'absol', 'glalie',

  // Gen IV
  'torterra', 'infernape', 'empoleon', 'luxray', 'roserade', 'rampardos',
  'bastiodon', 'lopunny', 'spiritomb', 'garchomp', 'lucario', 'hippowdon',
  'toxicroak', 'abomasnow', 'weavile', 'rhyperior', 'leafeon', 'glaceon',
  'gliscor', 'mamoswine', 'gallade', 'froslass', 'rotom',

  // Gen V
  'serperior', 'emboar', 'samurott', 'watchog', 'liepard', 'simisage',
  'simisear', 'simipour', 'excadrill', 'audino', 'conkeldurr', 'whimsicott',
  'krookodile', 'cofagrigus', 'garbodor', 'zoroark', 'reuniclus', 'vanilluxe',
  'emolga', 'chandelure', 'beartic', 'stunfisk', 'golurk', 'hydreigon',
  'volcarona',

  // Gen VI
  'chesnaught', 'delphox', 'greninja', 'diggersby', 'talonflame', 'vivillon',
  'floetteeternal', 'florges', 'pangoro', 'furfrou', 'meowstic', 'aegislash',
  'aromatisse', 'slurpuff', 'clawitzer', 'heliolisk', 'tyrantrum', 'aurorus',
  'sylveon', 'hawlucha', 'dedenne', 'goodra', 'klefki', 'trevenant',
  'gourgeist', 'avalugg', 'noivern',

  // Gen VII
  'decidueye', 'incineroar', 'primarina', 'toucannon', 'crabominable',
  'lycanroc', 'toxapex', 'mudsdale', 'araquanid', 'salazzle', 'tsareena',
  'oranguru', 'passimian', 'mimikyu', 'drampa', 'kommoo',

  // Gen VIII
  'corviknight', 'flapple', 'appletun', 'sandaconda', 'polteageist',
  'hatterene', 'mrrime', 'runerigus', 'alcremie', 'morpeko', 'dragapult',

  // Gen IX
  'wyrdeer', 'kleavor', 'basculegion', 'sneasler', 'meowscarada', 'skeledirge',
  'quaquaval', 'maushold', 'garganacl', 'armarouge', 'ceruledge', 'bellibolt',
  'scovillain', 'espathra', 'tinkaton', 'palafin', 'orthworm', 'glimmora',
  'farigiraf', 'kingambit', 'sinistcha', 'archaludon', 'hydrapple',
]);
