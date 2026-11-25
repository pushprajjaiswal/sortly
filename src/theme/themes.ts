export type Theme = {
  id: string;
  name: string;
  price: number; // coins; 0 = free
  background: string;
  surface: string;
  tube: string;
  tubeBorder: string;
  text: string;
  subtext: string;
  accent: string;
  balls: string[]; // 12 colors, must be easy to tell apart
};

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Classic',
    price: 0,
    background: '#16213E',
    surface: '#1F2B4D',
    tube: 'rgba(255,255,255,0.06)',
    tubeBorder: 'rgba(255,255,255,0.55)',
    text: '#FFFFFF',
    subtext: '#A9B4D0',
    accent: '#FFC93C',
    balls: ['#E63946', '#2A9D8F', '#F4A261', '#457B9D', '#9B5DE5', '#F15BB5', '#00FF00', '#9ACD32', '#FFFFFF', '#8D6E63', '#FEE440', '#0000FF'],
  },
  {
    id: 'neon',
    name: 'Neon Night',
    price: 300,
    background: '#0B0B12',
    surface: '#171726',
    tube: 'rgba(0,255,200,0.05)',
    tubeBorder: '#00F5D4',
    text: '#F8F8FF',
    subtext: '#9D9DB8',
    accent: '#F72585',
    balls: ['#F72585', '#7209B7', '#8C5A4D', '#4CC9F0', '#00F5D4', '#B5FF3B', '#FFE600', '#FF8500', '#FF002B', '#FFFFFF', '#5F8C31', '#00468C'],
  },
  {
    id: 'candy',
    name: 'Candy Pop',
    price: 500,
    background: '#FFE5EC',
    surface: '#FFFFFF',
    tube: 'rgba(255,255,255,0.7)',
    tubeBorder: '#FB6F92',
    text: '#5A189A',
    subtext: '#9D4EDD',
    accent: '#FB6F92',
    balls: ['#FF006E', '#8338EC', '#3A86FF', '#FB5607', '#FFBE0B', '#06D6A0', '#118AB2', '#8C5F31', '#6A4C93', '#00FF00', '#FF80F4', '#80B918'],
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    price: 800,
    background: '#03045E',
    surface: '#023E8A',
    tube: 'rgba(144,224,239,0.08)',
    tubeBorder: '#90E0EF',
    text: '#CAF0F8',
    subtext: '#90E0EF',
    accent: '#FFD166',
    balls: ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#FF924C', '#EA00FF', '#52A675', '#F15BB5', '#FFFFFF', '#00F5D4', '#B5838D'],
  },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
