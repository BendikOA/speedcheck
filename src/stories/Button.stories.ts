import type { Meta, StoryObj } from '@storybook/sveltekit';
import Button from '$lib/components/ui/Button/index.svelte';

const meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'toggle'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    active:   { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    tooltip:  { control: 'text' },
  },
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary', size: 'md', disabled: false },
};

export const Secondary: Story = {
  args: { variant: 'secondary', size: 'md' },
};

export const Danger: Story = {
  args: { variant: 'danger', size: 'md' },
};

export const Toggle: Story = {
  args: { variant: 'toggle', size: 'md', active: false },
};

export const ToggleActive: Story = {
  args: { variant: 'toggle', size: 'md', active: true },
  name: 'Toggle (active)',
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
};

export const Small: Story = {
  args: { variant: 'primary', size: 'sm' },
};

export const Large: Story = {
  args: { variant: 'primary', size: 'lg' },
};
