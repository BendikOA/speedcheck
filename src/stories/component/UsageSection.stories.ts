import type { Meta, StoryObj } from '@storybook/sveltekit';
import UsageSection from '$lib/components/ui/UsageSection/index.svelte';

const mockItems = [
  { name: 'Incineroar',   pct: 72.4 },
  { name: 'Landorus-T',   pct: 58.1 },
  { name: 'Flutter Mane', pct: 51.3 },
  { name: 'Chien-Pao',    pct: 44.8 },
  { name: 'Kyogre',       pct: 38.2 },
];

const meta = {
  title: 'UI/UsageSection',
  component: UsageSection,
  argTypes: {
    title: { control: 'text' },
    emptyText: { control: 'text' },
  },
} satisfies Meta<UsageSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'Pokémon Usage', items: mockItems },
};

export const Empty: Story = {
  args: { title: 'Pokémon Usage', items: [], emptyText: 'No data available.' },
};
