import type { Meta, StoryObj } from '@storybook/sveltekit';
import SavedTeamCard from '$lib/components/ui/SavedTeamCard/index.svelte';

const mockTeam = {
  id: 'abc123',
  label: 'Team 1 Ladder',
  genNum: 9 as const,
  savedAt: Date.now(),
  wins: 4,
  losses: 2,
  yourTeam: [
    { id: 'landorus-therian', name: 'Landorus-Therian', scarf: false, nature: '=' as const },
    { id: 'chien-pao',        name: 'Chien-Pao',        scarf: false, nature: '=' as const },
    { id: 'incineroar',       name: 'Incineroar',       scarf: false, nature: '=' as const },
    { id: 'flutter-mane',     name: 'Flutter Mane',     scarf: false, nature: '=' as const },
    { id: 'kyogre',           name: 'Kyogre',           scarf: false, nature: '=' as const },
    { id: 'urshifu',          name: 'Urshifu',          scarf: false, nature: '=' as const },
  ],
};

const meta = {
  title: 'UI/SavedTeamCard',
  component: SavedTeamCard,
} satisfies Meta<SavedTeamCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { team: mockTeam },
};

export const NoRecord: Story = {
  args: { team: { ...mockTeam, label: 'Fresh Team', wins: 0, losses: 0 } },
};

export const PartialTeam: Story = {
  args: {
    team: {
      ...mockTeam,
      label: 'Unfinished',
      yourTeam: [
        mockTeam.yourTeam[0],
        mockTeam.yourTeam[1],
        null, null, null, null,
      ],
    },
  },
};
