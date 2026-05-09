import { Vice } from '../types';

// `icon` is a MaterialCommunityIcons name. Browse: https://pictogrammers.com/library/mdi/
export const VICE_CATEGORIES: Vice[] = [
  { id: 'coffee',     label: 'Coffee',       icon: 'coffee',          searchQuery: 'coffee shop cafe',         placeTypes: ['cafe'] },
  { id: 'energy',     label: 'Energy drink', icon: 'lightning-bolt',  searchQuery: 'convenience store',        placeTypes: ['convenience_store', 'gas_station'] },
  { id: 'zyn',        label: 'Zyn',          icon: 'pill',            searchQuery: 'tobacco shop convenience', placeTypes: ['convenience_store'] },
  { id: 'cigarettes', label: 'Cigarettes',   icon: 'smoking',         searchQuery: 'smoke shop tobacco',       placeTypes: ['convenience_store'] },
  { id: 'beer',       label: 'Beer',         icon: 'beer',            searchQuery: 'bar brewery liquor store', placeTypes: ['bar', 'liquor_store'] },
  { id: 'wine',       label: 'Wine',         icon: 'glass-wine',      searchQuery: 'wine shop liquor store',   placeTypes: ['liquor_store'] },
  { id: 'cocktails',  label: 'Cocktails',    icon: 'glass-cocktail',  searchQuery: 'cocktail bar',             placeTypes: ['bar', 'night_club'] },
  { id: 'pastries',   label: 'Pastries',     icon: 'food-croissant',  searchQuery: 'bakery pastry cafe',       placeTypes: ['bakery', 'cafe'] },
  { id: 'donuts',     label: 'Donuts',       icon: 'circle-double',   searchQuery: 'donut shop bakery',        placeTypes: ['bakery'] },
  { id: 'ice_cream',  label: 'Ice cream',    icon: 'ice-cream',       searchQuery: 'ice cream shop',           placeTypes: ['food'] },
  { id: 'boba',       label: 'Boba',         icon: 'cup',             searchQuery: 'boba tea bubble tea',      placeTypes: ['cafe', 'food'] },
  { id: 'matcha',     label: 'Matcha',       icon: 'leaf',            searchQuery: 'matcha cafe tea shop',     placeTypes: ['cafe'] },
];
