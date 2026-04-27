import type { Meta, StoryObj } from '@storybook/sveltekit';
import Button from '$lib/components/ui/Button/index.svelte';

const meta = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant:   { control: 'select', options: ['primary', 'secondary', 'accent', 'brand'] },
    size:      { control: 'select', options: ['sm', 'md'] },
    disabled:  { control: 'boolean' },
    active:    { control: 'boolean' },
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

export const SecondaryActive: Story = {
  name: 'Secondary — active',
  args: { variant: 'secondary', active: true },
};

export const Accent: Story = {
  args: { variant: 'accent' },
};

export const Brand: Story = {
  args: { variant: 'brand' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
};

export const SmallPrimary: Story = {
  name: 'Small — primary',
  args: { variant: 'primary', size: 'sm' },
};

export const SmallSecondary: Story = {
  name: 'Small — secondary',
  args: { variant: 'secondary', size: 'sm' },
};

export const SmallAccent: Story = {
  name: 'Small — accent',
  args: { variant: 'accent', size: 'sm' },
};

export const SmallBrand: Story = {
  name: 'Small — brand',
  args: { variant: 'brand', size: 'sm' },
};
