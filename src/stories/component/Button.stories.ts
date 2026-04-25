import type { Meta, StoryObj } from '@storybook/sveltekit';
import Button from '$lib/components/ui/Button/index.svelte';

const meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant:   { control: 'select', options: ['primary', 'secondary', 'accent'] },
    size:      { control: 'select', options: ['sm', 'md'] },
    disabled:  { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Accent: Story = {
  args: { variant: 'accent' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
};

export const SmallSecondary: Story = {
  name: 'Small — outline',
  args: { variant: 'secondary', size: 'sm' },
};

export const SmallPrimary: Story = {
  name: 'Small — dark',
  args: { variant: 'primary', size: 'sm' },
};

export const SmallAccent: Story = {
  name: 'Small — green',
  args: { variant: 'accent', size: 'sm' },
};
