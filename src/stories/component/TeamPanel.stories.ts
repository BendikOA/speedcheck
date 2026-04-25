import type { Meta, StoryObj } from '@storybook/sveltekit';
import TeamPanel from '$lib/components/ui/TeamPanel/index.svelte';

const mockSlot = (name: string, spe: number) => ({
  entry: { id: name.toLowerCase(), name, baseSpe: spe, abilities: [], megaForms: [] },
  scarf: false,
  nature: '=',
  natureLocked: false,
});

const meta = {
  title: 'UI/TeamPanel',
  component: TeamPanel,
  argTypes: {
    label: { control: 'text' },
    color: { control: 'color' },
  },
} satisfies Meta<TeamPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    label: 'Your team',
    color: '#bcfd49',
    slots: Array(6).fill(null),
  },
};

export const Filled: Story = {
  args: {
    label: 'Your team',
    color: '#bcfd49',
    slots: [
      mockSlot('Fluttermane', 135),
      mockSlot('Incineroar', 60),
      mockSlot('Rillaboom', 85),
      mockSlot('Urshifu', 97),
      mockSlot('Landorus', 91),
      mockSlot('Amoonguss', 30),
    ],
  },
};

export const Opponent: Story = {
  args: {
    label: 'Opp team',
    color: '#fd7949',
    showSave: false,
    slots: Array(6).fill(null),
  },
};

export const Mixed: Story = {
  args: {
    label: 'Your team',
    color: '#bcfd49',
    slots: [
      mockSlot('Fluttermane', 135),
      mockSlot('Incineroar', 60),
      null,
      null,
      null,
      null,
    ],
  },
};
