import type { Meta, StoryObj } from '@storybook/sveltekit';
import Autocomplete from '$lib/components/ui/Autocomplete/index.svelte';

const items = ['Landorus-Therian', 'Chien-Pao', 'Incineroar', 'Flutter Mane', 'Kyogre', 'Urshifu', 'Calyrex-Shadow', 'Zacian'];

const meta = {
  title: 'UI/Autocomplete',
  component: Autocomplete,
  argTypes: {
    placeholder: { control: 'text' },
    value: { control: 'text' },
  },
} satisfies Meta<Autocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { items, value: '', placeholder: 'Search Pokémon…' },
};

export const WithValue: Story = {
  args: { items, value: 'Incineroar', placeholder: 'Search Pokémon…' },
};

export const Empty: Story = {
  args: { items: [], value: '', placeholder: 'No items…' },
};
