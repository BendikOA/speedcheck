import type { Meta, StoryObj } from '@storybook/sveltekit';
import Pill from '$lib/components/ui/Pill/index.svelte';

const meta = {
  title: 'UI/Pill',
  component: Pill,
  argTypes: {
    variant:       { control: 'select', options: ['primary', 'alt'] },
    color:         { control: 'color' },
    active:        { control: 'boolean' },
    interactive:   { control: 'boolean' },
    strikethrough: { control: 'boolean' },
    tooltip:       { control: 'text' },
  },
} satisfies Meta<Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { active: true },
  render: (args) => ({ Component: Pill, props: args, slot: 'Pill' }),
};

export const Colored: Story = {
  args: { color: '#f5c96c', active: true },
  name: 'Colored (Scarf yellow)',
  render: (args) => ({ Component: Pill, props: args, slot: 'Choice Scarf' }),
};

export const AltVariant: Story = {
  args: { color: '#a8c8ff', variant: 'alt', active: true },
  name: 'Alt variant (item)',
  render: (args) => ({ Component: Pill, props: args, slot: 'Life Orb' }),
};

export const Inactive: Story = {
  args: { color: '#f56cc8', active: false },
  render: (args) => ({ Component: Pill, props: args, slot: 'Inactive' }),
};

export const Strikethrough: Story = {
  args: { color: '#f56cc8', active: false, strikethrough: true },
  render: (args) => ({ Component: Pill, props: args, slot: 'Blocked' }),
};

export const Interactive: Story = {
  args: { color: '#6cf5b8', active: true, interactive: true },
  render: (args) => ({ Component: Pill, props: args, slot: 'Click me' }),
};

export const PriorityMove: Story = {
  args: { color: '#f56cc8', active: true },
  name: 'Priority move',
  render: (args) => ({ Component: Pill, props: args, slot: 'Fake Out' }),
};

export const WeatherAbility: Story = {
  args: { color: '#6cf5b8', active: true },
  name: 'Weather ability',
  render: (args) => ({ Component: Pill, props: args, slot: 'Drizzle' }),
};
