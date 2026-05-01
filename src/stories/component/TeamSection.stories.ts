import type { Meta, StoryObj } from '@storybook/sveltekit';
import TeamSection from '$lib/components/ui/TeamSection/index.svelte';

const makeTeam = (id: string, label: string) => ({
  id,
  label,
  genNum: 9 as const,
  savedAt: Date.now(),
  wins: 0,
  losses: 0,
  yourTeam: [
    { id: 'landorus-therian', name: 'Landorus-Therian', scarf: false, nature: '=' as const },
    { id: 'chien-pao',        name: 'Chien-Pao',        scarf: false, nature: '=' as const },
    { id: 'incineroar',       name: 'Incineroar',       scarf: false, nature: '=' as const },
    { id: 'flutter-mane',     name: 'Flutter Mane',     scarf: false, nature: '=' as const },
    { id: 'kyogre',           name: 'Kyogre',           scarf: false, nature: '=' as const },
    { id: 'urshifu',          name: 'Urshifu',          scarf: false, nature: '=' as const },
  ],
});

const teams = [
  makeTeam('t1', 'Team 1 ladder'),
  makeTeam('t2', 'Reg M-A squad'),
  makeTeam('t3', 'Rain team'),
  makeTeam('t4', 'Sun offense'),
];

const meta = {
  title: 'UI/TeamSection',
  component: TeamSection,
  argTypes: {
    activeTeamId: { control: 'select', options: [null, ...teams.map(t => t.id)] },
  },
} satisfies Meta<TeamSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { teams, activeTeamId: null },
};

export const OneActive: Story = {
  args: { teams, activeTeamId: 't1' },
};

export const Empty: Story = {
  args: { teams: [], activeTeamId: null },
};

export const Single: Story = {
  args: { teams: [teams[0]], activeTeamId: 't1' },
};
