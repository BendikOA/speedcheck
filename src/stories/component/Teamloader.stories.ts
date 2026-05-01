import type { Meta, StoryObj } from '@storybook/sveltekit';
import Teamloader from '$lib/components/ui/Teamloader/index.svelte';

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
  title: 'UI/Teamloader',
  component: Teamloader,
  argTypes: {
    active: { control: 'boolean' },
  },
} satisfies Meta<Teamloader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { team: mockTeam, active: false },
};

export const Active: Story = {
  args: { team: mockTeam, active: true },
};

export const PartialTeam: Story = {
  args: {
    team: {
      ...mockTeam,
      label: 'Unfinished Team',
      yourTeam: [
        mockTeam.yourTeam[0],
        mockTeam.yourTeam[1],
        null, null, null, null,
      ],
    },
    active: false,
  },
};
