import type { Meta, StoryObj } from '@storybook/sveltekit';
import TournamentTeamCard from '$lib/components/ui/TournamentTeamCard/index.svelte';

const mockTeam = {
  placement: 1,
  player: 'Wolfe Glick',
  country: 'US',
  pokemon: [
    { id: 'miraidon',    name: 'Miraidon',    item: 'Booster Energy', ability: 'Hadron Engine',  tera: 'Electric', moves: ['Electro Drift', 'Draco Meteor', 'Volt Switch', 'Protect'] },
    { id: 'incineroar',  name: 'Incineroar',  item: 'Safety Goggles', ability: 'Intimidate',     tera: 'Fire',     moves: ['Flare Blitz', 'Knock Off', 'Fake Out', 'Parting Shot'] },
    { id: 'flutter-mane',name: 'Flutter Mane',item: 'Choice Specs',   ability: 'Protosynthesis', tera: 'Fairy',    moves: ['Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect'] },
    { id: 'rillaboom',   name: 'Rillaboom',   item: 'Assault Vest',   ability: 'Grassy Surge',   tera: 'Grass',    moves: ['Grassy Glide', 'Wood Hammer', 'Fake Out', 'U-turn'] },
    { id: 'urshifu',     name: 'Urshifu',     item: 'Focus Sash',     ability: 'Unseen Fist',    tera: 'Water',    moves: ['Surging Strikes', 'Close Combat', 'Detect', 'Aqua Jet'] },
    { id: 'amoonguss',   name: 'Amoonguss',   item: 'Rocky Helmet',   ability: 'Regenerator',    tera: 'Water',    moves: ['Spore', 'Pollen Puff', 'Rage Powder', 'Protect'] },
  ],
};

const meta = {
  title: 'UI/TournamentTeamCard',
  component: TournamentTeamCard,
  argTypes: {
    tournamentName: { control: 'text' },
    tournamentDate: { control: 'text' },
    players: { control: 'number' },
  },
} satisfies Meta<TournamentTeamCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tournamentName: 'NAIC 2024',
    tournamentDate: '2024-06-07',
    players: 1200,
    team: mockTeam,
  },
};

export const NoCountry: Story = {
  args: {
    tournamentName: 'Regional Championship',
    tournamentDate: '2024-03-15',
    players: 256,
    team: { ...mockTeam, country: null, placement: 2, player: 'Anonymous' },
  },
};
