import type { Meta, StoryObj } from '@storybook/sveltekit';
import TabGroup from '$lib/components/ui/TabGroup/index.svelte';

const meta = {
  title: 'UI/TabGroup',
  component: TabGroup,
  argTypes: {
    value: { control: 'text' },
  },
} satisfies Meta<TabGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      { label: 'Gen 9', value: 'gen9' },
      { label: 'Champions', value: 'champ' },
    ],
    value: 'gen9',
  },
};

export const ThreeTabs: Story = {
  args: {
    tabs: [
      { label: 'Speed', value: 'speed' },
      { label: 'Stats', value: 'stats' },
      { label: 'Moves', value: 'moves' },
    ],
    value: 'stats',
  },
  name: 'Three tabs',
};
