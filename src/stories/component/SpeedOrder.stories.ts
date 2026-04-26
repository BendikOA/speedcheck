import type { Meta, StoryObj } from '@storybook/sveltekit';
import SpeedOrder from '$lib/components/ui/SpeedOrder/index.svelte';

const mockEntries = [
  { side: 'you'  as const, entry: { id: 'landorus-therian', name: 'Landorus-Therian', maxSpeed: 91,  baseSpeed: 91  }, speed: 252, scarf: false },
  { side: 'opp'  as const, entry: { id: 'chien-pao',        name: 'Chien-Pao',        maxSpeed: 135, baseSpeed: 135 }, speed: 205, scarf: false },
  { side: 'you'  as const, entry: { id: 'zamazenta',        name: 'Zamazenta',        maxSpeed: 138, baseSpeed: 138 }, speed: 198, scarf: false },
  { side: 'opp'  as const, entry: { id: 'tornadus-therian', name: 'Tornadus-Therian', maxSpeed: 121, baseSpeed: 121 }, speed: 179, scarf: false },
  { side: 'you'  as const, entry: { id: 'kyogre',           name: 'Kyogre',           maxSpeed: 90,  baseSpeed: 90  }, speed: 156, scarf: true  },
  { side: 'opp'  as const, entry: { id: 'indeedee-f',       name: 'Indeedee-F',       maxSpeed: 75,  baseSpeed: 75  }, speed: 150, scarf: false },
];

const meta = {
  title: 'UI/SpeedOrder',
  component: SpeedOrder,
  argTypes: {
    yourColor: { control: 'color' },
    oppColor:  { control: 'color' },
  },
} satisfies Meta<SpeedOrder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: mockEntries,
    yourColor: '#bcfd49',
    oppColor: '#fd7949',
  },
};

export const Empty: Story = {
  args: { entries: [] },
};
