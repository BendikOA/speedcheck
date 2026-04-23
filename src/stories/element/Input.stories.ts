import type { Meta, StoryObj } from '@storybook/sveltekit';
import Input from '$lib/components/ui/Input/index.svelte';

const meta = {
  title: 'UI/Input',
  component: Input,
  argTypes: {
    type:        { control: 'select', options: ['text', 'number', 'password', 'email'] },
    variant:     { control: 'select', options: ['default', 'accent'] },
    placeholder: { control: 'text' },
    value:       { control: 'text' },
    disabled:    { control: 'boolean' },
    required:    { control: 'boolean' },
  },
} satisfies Meta<Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { placeholder: 'Enter text…' },
};

export const Accent: Story = {
  args: { variant: 'accent', placeholder: 'Accent variant' },
};

export const WithValue: Story = {
  args: { value: 'Pikachu', placeholder: 'Pokémon name' },
  name: 'With value',
};

export const Disabled: Story = {
  args: { value: 'Disabled input', disabled: true },
};

export const NumberType: Story = {
  args: { type: 'number', placeholder: '0–252', value: '252' },
  name: 'Number type',
};
