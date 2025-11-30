import { PricePoint } from './types';

// Standard fallback curve mimicking typical Spanish PVPC daily fluctuation
// Low at night (00-07), High morning (10-14), High evening (19-22), Mid afternoon (15-17)
export const FALLBACK_PRICES: number[] = [
  0.08, 0.07, 0.06, 0.05, 0.05, 0.06, 0.08, 0.12, // 00-07
  0.15, 0.18, 0.22, 0.20, 0.18, 0.15, 0.12, 0.11, // 08-15
  0.12, 0.15, 0.20, 0.24, 0.25, 0.22, 0.15, 0.10  // 16-23
];

export const generateFallbackData = (isTomorrow: boolean): PricePoint[] => {
  return FALLBACK_PRICES.map((price, hour) => ({
    hour,
    price: price + (isTomorrow ? 0.02 : 0), // Slight variation for tomorrow
    isTomorrow,
    displayHour: `${hour.toString().padStart(2, '0')}:00`
  }));
};

export const API_ENDPOINT = 'https://api.preciodelaluz.org/v1/prices/all?zone=PCB';
export const ESIOS_SEARCH_URL = 'https://www.esios.ree.es/es/pvpc';

// EV Defaults
export const DEFAULT_BATTERY_CAPACITY = 10; // kWh (Requested default)
export const DEFAULT_CHARGING_POWER = 3.7; // kW (Requested default)
export const DEFAULT_PRICE = 0.10; // €/kWh (Requested default)
