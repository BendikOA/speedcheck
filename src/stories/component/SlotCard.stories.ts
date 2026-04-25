import type { Meta, StoryObj } from '@storybook/sveltekit';
import SlotCard from '$lib/components/ui/SlotCard/index.svelte';

const meta = {
  title: 'UI/SlotCard',
  component: SlotCard,
  argTypes: {
    name:        { control: 'text' },
    highlighted: { control: 'boolean' },
  },
} satisfies Meta<SlotCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { name: null, highlighted: false },
};

export const Filled: Story = {
  args: { name: 'Pikachu', highlighted: false },
};

export const Highlighted: Story = {
  args: { name: 'Pikachu', highlighted: true },
};
