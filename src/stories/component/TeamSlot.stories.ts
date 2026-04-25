import type { Meta, StoryObj } from '@storybook/sveltekit';
import TeamSlot from '$lib/components/ui/TeamSlot/index.svelte';

const mockSlot = {
  entry: { id: 'pikachu', name: 'Pikachu', baseSpe: 110, abilities: ['Static'], megaForms: [] },
  scarf: false,
  nature: '=',
  natureLocked: false,
};

const meta = {
  title: 'UI/TeamSlot',
  component: TeamSlot,
  argTypes: {
    slot:        { control: 'object' },
    highlighted: { control: 'boolean' },
  },
} satisfies Meta<TeamSlot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { slot: null, highlighted: false },
};

export const Filled: Story = {
  args: { slot: mockSlot, highlighted: false },
};

export const Highlighted: Story = {
  args: { slot: mockSlot, highlighted: true },
};

export const WithScarf: Story = {
  name: 'Filled — scarf active',
  args: { slot: { ...mockSlot, scarf: true }, highlighted: false },
};
