/** Normalized bounds of the map area on the birthday travel page (page 40). */
export const TRAVEL_MAP_PAGE_BOUNDS = {
  x: 0.055,
  y: 0.155,
  width: 0.89,
  height: 0.545,
} as const;

export const TRAVEL_MAP_PIN_SIZE = 0.028;

export const TRAVEL_MAP_COLORS = {
  land: '#F4C9BC',
  landStroke: '#E5A898',
  ocean: 'transparent',
  pin: '#D86B6B',
  pinStroke: '#FFFFFF',
  visited: '#E8919A',
} as const;

export type { TravelMapMarker } from '@/types/album-page-schema';

/** Simplified equirectangular world map (viewBox 360×180). */
export const TRAVEL_WORLD_MAP_VIEWBOX = { width: 360, height: 180 };

export const TRAVEL_CONTINENT_PATHS: { id: string; d: string }[] = [
  {
    id: 'north_america',
    d: 'M24,48 C35,32 58,28 78,34 L98,38 L112,52 L108,72 L92,82 L68,78 L42,68 L24,58 Z',
  },
  {
    id: 'south_america',
    d: 'M88,92 L104,88 L116,98 L112,118 L108,142 L98,158 L86,148 L82,118 Z',
  },
  {
    id: 'europe',
    d: 'M162,34 L178,30 L192,36 L188,48 L172,52 L160,46 Z',
  },
  {
    id: 'africa',
    d: 'M162,54 L188,50 L204,62 L208,88 L200,118 L182,128 L168,112 L158,82 Z',
  },
  {
    id: 'asia',
    d: 'M192,24 L248,18 L288,28 L296,48 L278,68 L242,72 L210,58 L192,40 Z',
  },
  {
    id: 'oceania',
    d: 'M262,108 L286,104 L302,112 L294,126 L270,128 L258,118 Z',
  },
  {
    id: 'greenland',
    d: 'M118,22 L138,18 L148,28 L142,38 L124,36 Z',
  },
  {
    id: 'japan',
    d: 'M286,44 L292,42 L294,50 L288,52 Z',
  },
  {
    id: 'uk',
    d: 'M154,36 L158,34 L160,40 L156,42 Z',
  },
];
